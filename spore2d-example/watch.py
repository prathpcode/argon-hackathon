"""Argon watches the surviving footage of a lost game and writes a timestamped rules spec."""
import json
import re
import time

from google import genai

# Windows around the segments the search reported (seconds into each full video).
SOURCES = [
    {"uri": "https://www.youtube.com/watch?v=lp0_vK-OJKc", "start": 1230, "end": 1530},
    {"uri": "https://www.youtube.com/watch?v=QNjylVpEVwk", "start": 1060, "end": 1260},
]

PROMPT = """These clips come from two lost-media videos. Somewhere in them is the only surviving footage
of "Spore 2D" (Spore Creature Creator 2-D), a 2009 promotional Flash game whose files no longer run.

Step 1 — find the footage. For each clip, give the exact ranges (timestamps in the full video, mm:ss)
that show actual Spore 2D gameplay or its UI, and nothing else. If neither clip shows Spore 2D,
say so and stop.

Step 2 — reverse-engineer the game from that footage only. Write the rules someone would need to
rebuild it, each tied to the timestamp that shows it. Cover: screens/modes, the creature editor
(parts, placement, colours), the training/minigame (what is fired, from where, how the player
responds, scoring, levelling, unlocks), controls, camera/perspective, visual style, UI layout, sounds
if audible. Mark anything you are inferring rather than seeing as "inferred".

Reply with JSON only:
{"footage": [{"video": str, "ranges": [str], "what": str}],
 "found": bool,
 "rules": [{"area": str, "rule": str, "evidence": "video mm:ss", "confidence": "seen"|"inferred"}],
 "unknowns": [str]}"""

client = genai.Client()
inputs = [
    {"type": "video", "uri": s["uri"],
     "processing": {"type": "static", "start_offset": f"{s['start']}s", "end_offset": f"{s['end']}s", "fps": 2}}
    for s in SOURCES
]
t0 = time.time()
interaction = client.interactions.create(
    model="gemini-4-argon",
    input=inputs + [{"type": "text", "text": PROMPT}],
    generation_config={"thinking_level": "medium"},
)
u = interaction.usage
print(f"status: {interaction.status}  latency: {time.time() - t0:.1f}s  id: {interaction.id}")
print(f"input tokens: {u.total_input_tokens}  output: {u.total_output_tokens}  thought: {u.total_thought_tokens}")
text = interaction.output_text
m = re.search(r"\{.*\}", text, re.S)
spec = json.loads(m.group(0))
json.dump(spec, open("spec.json", "w"), indent=1)
open("watch_id.txt", "w").write(interaction.id)
print(json.dumps(spec, indent=1))
