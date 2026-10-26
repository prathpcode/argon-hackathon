"""One-time: build the Managed Agent playtester sandbox (Chromium + harness), test it, fork it into an agent.

usage: setup.py [test game dir]   (any Revive kit game; default: runs/blockor-io-2/game)
Writes pipeline/squad/agent.json with the agent id.
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import ROOT, client  # noqa: E402

AGENT_ID = "argon-playtester"
HERE = Path(__file__).resolve().parent

SETUP = """Prepare this sandbox as a reusable game-playtesting machine. Do exactly this, fixing anything that fails:
1. pip install playwright, then `python3 -m playwright install --with-deps chromium`. Make sure ffmpeg is installed.
2. Smoke test: start the test game with `cd /workspace/testgame && PORT=8000 node server.js &`, then run
   python3 /workspace/squad/harness.py --url http://localhost:8000/ --name SetupTest --bot /workspace/squad/example_bot.py --seconds 15
   It must print JSON and create /workspace/out/SetupTest/session.mp4 and result.json. Stop the node server after.
3. Reply with the fps the harness reported and whether session.mp4 exists."""

SYSTEM = """You are a fast multiplayer game playtester in a sandbox that already has Playwright, Chromium, ffmpeg and a
play harness at /workspace/squad/harness.py. Do not reinstall anything and do not read the harness beyond what the
task gives you. Be quick: write the bot from the template in the task, run the harness once, look at 2-3 screenshots
in /workspace/out/<name>/shots and result.json, and reply with JSON only:
{"name": str, "findings": [{"t": seconds, "severity": "low|medium|high", "finding": str, "repro": str}], "summary": str}
Only report problems you actually observed."""


def main():
    game = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "runs" / "blockor-io-2" / "game")
    sources = [{"type": "inline", "content": (HERE / f).read_text(), "target": f"/workspace/squad/{f}"}
               for f in ("harness.py", "example_bot.py")]
    for p in sorted(game.rglob("*")):
        if p.is_file() and p.suffix in (".js", ".html", ".css", ".json") and "node_modules" not in p.parts:
            sources.append({"type": "inline", "content": p.read_text(), "target": f"/workspace/testgame/{p.relative_to(game)}"})
    c = client()
    t0 = time.time()
    it = c.interactions.create(agent="antigravity-preview-09-2026", input=SETUP, background=True,
                               environment={"type": "remote", "sources": sources})
    print("setup:", it.id, flush=True)
    while it.status in ("in_progress", "queued"):
        time.sleep(10)
        it = c.interactions.get(id=it.id)
    print(f"setup {it.status} in {time.time() - t0:.0f}s, env {it.environment_id}\n{it.output_text}", flush=True)
    if it.status != "completed":
        raise SystemExit(1)
    try:
        c.agents.delete(id=AGENT_ID)
    except Exception:
        pass
    c.agents.create(id=AGENT_ID, base_agent="antigravity-preview-09-2026", system_instruction=SYSTEM,
                    base_environment=it.environment_id)
    (HERE / "agent.json").write_text(json.dumps({"id": AGENT_ID, "environment": it.environment_id}))
    print("agent:", AGENT_ID)


if __name__ == "__main__":
    main()
