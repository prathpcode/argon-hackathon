"""Rebuild the lost game in one long-decode pass, continuing the interaction that watched the footage."""
import re
import time

from google import genai

PROMPT = """Now rebuild this game so it can be played again, using only what the footage showed you
(the rules above) and sensible choices where the footage is silent.

Output ONE complete, self-contained HTML file (inline JS and CSS, no external assets, no libraries),
drawn with the 2D canvas — the original is a 2D side-view game. Requirements:
- Every screen and mode from the rules: title screen → camera pan down → egg hatches on a pedestal →
  creature editor (spine/vertebra dragging, part palette with categories and pages, part placement,
  paint mode with swatches, complexity meter, name box, undo/redo/reset) → totem training minigame
  (cart of three totem heads firing orbs, green timing ring, click to deflect, score, segmented
  progress bar, level-complete overlay, increasing difficulty, part unlocks on level up).
- Draw all art procedurally in your own original style. Do NOT use the names "Spore", "Spore Hero",
  "EA" or any of their logos or trademarks anywhere. Call the game "Hatchling 2D".
- Creature parts must be real data (type, attach point, colour) so the creature built in the editor is
  the creature that plays the minigame, with its parts drawn and animated.
- Fixed-timestep simulation (60 Hz) independent of frame rate; seeded RNG via ?seed= URL param.
- Telemetry for automated testing: push events to window.__events as {t, type, ...} for screen changes,
  part added/removed, colour change, orb fired, orb deflected, orb missed, score change, level complete.
- Where you had to guess something the footage doesn't show, leave a short code comment
  "// GUESS: ..." at that spot.
Return only the HTML file."""

client = genai.Client()
watch_id = open("watch_id.txt").read().strip()

t0 = time.time()
interaction = client.interactions.create(
    model="gemini-4-argon",
    previous_interaction_id=watch_id,
    input=PROMPT,
    background=True,
    generation_config={"max_output_tokens": 150000, "thinking_level": "high"},
)
print("id:", interaction.id, flush=True)
while interaction.status in ("in_progress", "queued"):
    time.sleep(5)
    interaction = client.interactions.get(id=interaction.id)
    print(f"  {time.time() - t0:5.0f}s {interaction.status}", flush=True)

total = time.time() - t0
text = "".join(
    c.text for step in interaction.steps if step.type == "model_output"
    for c in step.content if c.type == "text"
)
m = re.search(r"```(?:html)?\s*\n(.*?)```", text, re.S)
html = m.group(1) if m else text
open("hatchling.html", "w").write(html)
open("rebuild_id.txt", "w").write(interaction.id)
u = interaction.usage
hops = sum(1 for s in interaction.steps if s.type == "model_output")
print(f"status: {interaction.status}  TOTAL: {total:.0f}s  model_output steps: {hops}")
print(f"input tokens: {u.total_input_tokens} (cached {u.total_cached_tokens})  output: {u.total_output_tokens}  thought: {u.total_thought_tokens}")
print(f"saved hatchling.html ({len(html)} chars, {html.count('// GUESS')} GUESS comments)")
