"""Stage 3: rebuild the game as a multiplayer browser game in one long-decode pass, continuing the watch interaction."""
import re

from common import call

PROMPT = """Now rebuild this game so people can play it together again, using what the footage showed you
(your index, rules and areas above), and sensible choices where it is silent.

Deliver a small multi-file project. Output each file as:
=== FILE: <relative path> ===
<full file contents>
and nothing else between files. Files:
1. public/index.html — the complete client: one self-contained file (inline JS/CSS, no libraries,
   no external assets), drawn on a canvas in the original's perspective and camera.
2. server.js — a ZERO-dependency Node 22 server (only built-in modules: http, crypto, fs, path):
   serves public/ and implements the WebSocket protocol itself (handshake + framing) for real-time
   multiplayer: player join/leave, position/animation sync, chat if the original had it, and shared world
   state (whatever the footage shows players sharing). Port from PORT env, default 8090.
3. README.md — how to run, controls, and a table mapping each implemented feature to the footage
   timestamp it came from.

Rebuild everything the footage shows, not a toy:
- Every level/area you identified, connected as seen, each with its own look, layout and props.
- The player character with its animations and controls, the HUD and menus laid out as in the footage.
- Every enemy/NPC and interaction seen, items and their effects, scoring, progression, win and lose.
- Procedural original art in the spirit of the footage. Do NOT use the original game's name, logo or
  trademarks anywhere; give the game a new name.
- Works solo if the server isn't reachable; with the server, everyone in the same area sees each other.
- Fixed-timestep simulation (60 Hz), seeded RNG (?seed=), player name from ?name=, and window.__events
  telemetry ({{t, type, ...}}) for area change, pickups, item use, score/meter change, death/win,
  chat, player join/leave.
- Expose the game state as window globals (e.g. window.State with the camera and player) so tests can read it.
- Mark guesses with "// GUESS: ..." comments."""


def run_stage(run):
    rev = run.revival
    watch_id = run.path("watch_id.txt").read_text().strip()
    it, text = call(run, "rebuild", stage="rebuild", role="builder", name="Builder",
                    brief=f"Rebuilding {rev['name']} as a multiplayer browser game, with the footage still in context.",
                    input=PROMPT, previous_interaction_id=watch_id, every=10,
                    generation_config={"max_output_tokens": 400000, "thinking_level": "high"})
    run.path("rebuild_raw.txt").write_text(text)
    out = run.path("game")
    files = re.findall(r"=== FILE: (.+?) ===\n(.*?)(?=\n=== FILE: |\Z)", text, re.S)
    for path, body in files:
        body = re.sub(r"^```\w*\n|\n```\s*$", "", body.strip()) + "\n"
        p = out / path.strip()
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body)
    if not (out / "public" / "index.html").exists() or not (out / "server.js").exists():
        raise RuntimeError("The builder's output was missing index.html or server.js.")
    title = re.search(r"<title>(.*?)</title>", (out / "public" / "index.html").read_text(), re.S)
    run.write_json({"title": title.group(1).strip() if title else None, "files": [p.strip() for p, _ in files]}, "build.json")
    size = sum(len(b) for _, b in files)
    return f"{len(files)} files, {size // 1000}k characters"
