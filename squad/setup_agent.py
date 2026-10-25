"""One-time: build the playtester sandbox (Chromium + harness), test it, fork it into a managed agent."""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "loop"))
from common import client, wait  # noqa: E402

AGENT_ID = "glitch-playtester"
HERE = Path(__file__).resolve().parent
GAME = HERE.parent / "glitch-example" / "giants-reverie" / "public" / "index.html"

SETUP = """Prepare this sandbox as a reusable game-playtesting machine. Do exactly this, fixing anything that fails:
1. pip install playwright, then `python3 -m playwright install --with-deps chromium`.
2. Make sure ffmpeg is installed (apt-get install -y ffmpeg if missing).
3. Smoke test: serve /workspace/squad/testgame on http://localhost:8000 (python3 -m http.server in the background),
   then run: python3 /workspace/squad/harness.py --url http://localhost:8000/index.html --name SetupTest
   --bot /workspace/squad/example_bot.py --seconds 20
   It must print JSON and create /workspace/out/SetupTest/session.mp4 and result.json. Stop the http server after.
4. Reply with: the playwright and chromium versions, the fps the harness reported, and whether session.mp4 exists."""

SYSTEM = """You are a fast multiplayer game playtester running in a sandbox that already has Playwright, Chromium,
ffmpeg and a play harness at /workspace/squad/harness.py (read its docstring and the Api class once; do not
reinstall anything). Workflow, keep it to as few steps as possible:
1. Write /workspace/bot.py: `async def run(api)` implementing your persona's play style using api.look(),
   api.key(), api.click_world(), api.click_text(), api.chat(), api.wait(), api.shot(), and api.note(...) for
   anything that looks broken, wrong or exploitable (be specific: what, where, how to reproduce).
2. Run the harness exactly as the task says (it waits for the shared start time, plays, records).
3. Look at 2-4 screenshots in /workspace/out/<name>/shots and result.json.
4. Reply with JSON only: {"name": str, "persona": str, "findings": [{"t": seconds, "severity": "low|medium|high",
   "finding": str, "repro": str}], "summary": str}. Only report problems you actually observed."""


def main():
    c = client()
    t0 = time.time()
    it = c.interactions.create(
        agent="antigravity-preview-09-2026",
        input=SETUP,
        environment={"type": "remote", "sources": [
            {"type": "inline", "content": (HERE / "harness.py").read_text(), "target": "/workspace/squad/harness.py"},
            {"type": "inline", "content": (HERE / "example_bot.py").read_text(), "target": "/workspace/squad/example_bot.py"},
            {"type": "inline", "content": GAME.read_text(), "target": "/workspace/squad/testgame/index.html"},
        ]},
        background=True,
    )
    print("setup interaction:", it.id, flush=True)
    it, secs = wait(c, it, "setup", every=10)
    print(f"setup {it.status} in {secs:.0f}s, env {it.environment_id}")
    print(it.output_text)
    try:
        c.agents.delete(id=AGENT_ID)
    except Exception:
        pass
    agent = c.agents.create(id=AGENT_ID, base_agent="antigravity-preview-09-2026",
                            system_instruction=SYSTEM, base_environment=it.environment_id)
    print("agent:", agent.id, "| total", round(time.time() - t0), "s")
    (HERE / "agent_env.txt").write_text(f"{AGENT_ID}\n{it.environment_id}\n")


if __name__ == "__main__":
    main()
