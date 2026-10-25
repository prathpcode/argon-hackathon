"""Argon watches all surviving footage of Glitch: timeline index first, then a timestamped rules spec."""
import json
import re
import time

from google import genai

VIDEOS = [
    ("A", "https://www.youtube.com/watch?v=VfzE_fIxEVg", "The last hour of Glitch the Game (recorded at shutdown, Dec 2012, 61:41)"),
    ("B", "https://www.youtube.com/watch?v=ecoYEgVAWmE", "Glitch Gameplay (Nov 2011, 7:24)"),
]

PROMPT = """You are watching the only surviving gameplay footage of Glitch, a 2D side-scrolling browser MMO
by Tiny Speck that was shut down in December 2012. Videos: """ + "; ".join(f"{k} = {d}" for k, _, d in VIDEOS) + """.

Part 1 — timeline index. Walk through each video start to end and split it into segments
(video, mm:ss–mm:ss, what is on screen: which location/street, what the player is doing, which UI is
open, how many other players are visible). Flag segments with no useful gameplay.

Part 2 — rules spec for rebuilding the game, from the footage only. Each rule tied to the timestamp(s)
that show it. Cover at least: player avatar (look, animations, movement speed, jump, ladders/platforms),
camera and parallax, street layout and how streets connect (signposts, exits), every creature/NPC seen
and every interaction with it, resources (trees, rocks, plants) and harvesting, items and inventory UI,
currencies, energy/mood/XP meters, skills and learning, quests, crafting/tools, housing, chat and other
players (presence, chat bubbles, emotes, parties), menus and HUD layout, sounds/music if audible.
Mark each rule "seen" or "inferred".

Reply with JSON only:
{"index": [{"video": str, "range": str, "location": str, "activity": str, "players_visible": int|null,
  "useful": bool}],
 "rules": [{"area": str, "rule": str, "evidence": [str], "confidence": "seen"|"inferred"}],
 "streets": [{"name": str, "evidence": [str], "description": str}],
 "unknowns": [str]}"""

client = genai.Client()
inputs = [{"type": "video", "uri": u} for _, u, _ in VIDEOS] + [{"type": "text", "text": PROMPT}]
t0 = time.time()
it = client.interactions.create(
    model="gemini-4-argon",
    input=inputs,
    background=True,
    generation_config={"thinking_level": "high", "max_output_tokens": 65536},
)
print("id:", it.id, flush=True)
while it.status in ("in_progress", "queued"):
    time.sleep(10)
    it = client.interactions.get(id=it.id)
    print(f"  {time.time() - t0:5.0f}s {it.status}", flush=True)

u = it.usage
print(f"status: {it.status}  TOTAL: {time.time() - t0:.0f}s  id: {it.id}")
if it.status != "completed":
    print("error:", getattr(it, "error", None))
    raise SystemExit(1)
print(f"input tokens: {u.total_input_tokens} (cached {u.total_cached_tokens})  output: {u.total_output_tokens}  thought: {u.total_thought_tokens}")
print("input by modality:", u.input_tokens_by_modality)
text = "".join(c.text for s in it.steps if s.type == "model_output" for c in s.content if c.type == "text")
spec = json.loads(re.search(r"\{.*\}", text, re.S).group(0))
json.dump(spec, open("glitch/spec.json", "w"), indent=1)
open("glitch/watch_id.txt", "w").write(it.id)
print(f'index segments: {len(spec["index"])}  rules: {len(spec["rules"])}  streets: {len(spec["streets"])}  unknowns: {len(spec["unknowns"])}')
