"""Rebuild Glitch as a multiplayer browser game in one long-decode pass, continuing the watch interaction."""
import re
import time
from pathlib import Path

from google import genai

PROMPT = """Now rebuild this game so people can play it together again, using what the footage showed you
(your index, rules and streets above), and sensible choices where it is silent.

Deliver a small multi-file project. Output each file as:
=== FILE: <relative path> ===
<full file contents>
and nothing else between files. Files:
1. public/index.html — the complete client: one self-contained file (inline JS/CSS, no libraries,
   no external assets), 2D canvas, side-scrolling with parallax.
2. server.js — a ZERO-dependency Node 22 server (only built-in modules: http, crypto, fs, path):
   serves public/ and implements the WebSocket protocol itself (handshake + framing) for real-time
   multiplayer: player join/leave, position/animation sync, chat, emotes, shared street state
   (resource depletion/regrowth, co-mining), street changes. Port from PORT env, default 8090.
3. README.md — how to run, controls, and a table mapping each implemented feature to the footage
   timestamp it came from.

Rebuild everything the footage shows, not a toy:
- All 5 streets you identified, connected by signposts/doors as seen, each with its own art style,
  parallax layers, platforms/ladders, props, shrines, vendors.
- Player avatar with customisation, walk/run/jump/climb animations, the HUD (energy, mood, iMG/XP,
  currants, level), inventory bar with item slots, the top-left menus.
- Every creature/NPC and interaction seen (with their verbs), resources and harvesting/mining incl.
  co-mining bonuses, items and their effects (potions shrink/embiggen, ale +mood, sparkle powder),
  emotes (hi/bye signs with mood match bonus), chat bubbles + chat panel, conga/follow, gifting,
  music blocks that play sound, Magic Rock street-style switching, vendor shop UI, giant appearances
  with overlay messages, skills panel.
- Procedural original art in the spirit of the footage. Do NOT use the name "Glitch", the Glitch logo
  or "Tiny Speck" anywhere; call the game "Giants' Reverie".
- Works solo if the server isn't reachable; with the server, everyone on a street sees each other.
- Fixed-timestep simulation (60 Hz), seeded RNG (?seed=), and window.__events telemetry
  ({t, type, ...}) for street change, harvest, item use, emote, chat, player join/leave, score/meter change.
- Mark guesses with "// GUESS: ..." comments."""

client = genai.Client()
watch_id = Path("glitch/watch_id.txt").read_text().strip()
t0 = time.time()
it = client.interactions.create(
    model="gemini-4-argon",
    previous_interaction_id=watch_id,
    input=PROMPT,
    background=True,
    generation_config={"max_output_tokens": 400000, "thinking_level": "high"},
)
print("id:", it.id, flush=True)
while it.status in ("in_progress", "queued"):
    time.sleep(10)
    it = client.interactions.get(id=it.id)
    print(f"  {time.time() - t0:5.0f}s {it.status}", flush=True)

total = time.time() - t0
text = "".join(c.text for s in it.steps if s.type == "model_output" for c in s.content if c.type == "text")
Path("glitch/rebuild_raw.txt").write_text(text)
Path("glitch/rebuild_id.txt").write_text(it.id)
out = Path("glitch/giants-reverie")
for path, body in re.findall(r"=== FILE: (.+?) ===\n(.*?)(?=\n=== FILE: |\Z)", text, re.S):
    body = re.sub(r"^```\w*\n|\n```\s*$", "", body.strip()) + "\n"
    p = out / path.strip()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(body)
    print(f"wrote {p} ({len(body)} chars, {body.count('GUESS')} GUESS)")
u = it.usage
hops = sum(1 for s in it.steps if s.type == "model_output")
print(f"status: {it.status}  TOTAL: {total:.0f}s  model_output steps (hops): {hops}")
print(f"input tokens: {u.total_input_tokens} (cached {u.total_cached_tokens})  output: {u.total_output_tokens}  thought: {u.total_thought_tokens}")
