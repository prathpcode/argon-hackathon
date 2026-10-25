"""Managed Agent squad for one playtest round: the round's game goes online through a temporary tunnel, and
Gemini Managed Agents (each in its own Google-hosted sandbox, network limited to that tunnel) play it together
over the real internet with different personas, then report what they found.

usage: run.py runs/<id> <round> <game dir>     (needs pipeline/squad/agent.json from setup.py, and cloudflared)
Writes rounds/<round>/squad.json; logs each agent, its live screenshots and its findings in events.jsonl.
"""
import json
import re
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from common import Run, client, parse_json  # noqa: E402
from verify import serve  # noqa: E402

HERE = Path(__file__).resolve().parent
SECONDS = 75
PERSONAS = {
    "Explorer": "Go everywhere: every area, both edges of the world, every exit and door, every platform. Report places "
                "you can't reach or leave, invisible walls, falling out of the world, missing art, transitions that fail.",
    "Griefer": "Try to break it: spam inputs, run off edges, stand inside other players, use items or abilities "
               "repeatedly, click everything rapidly. Report exploits (infinite score or resources), stuck states, desync.",
    "Socialite": "Play with the others: find the other players, do everything players can do together (chat, emote, "
                 "follow, trade, compete, co-op). Report anything other players don't see, broken co-op, overlapping names.",
}
TASK = """You are playtester "{name}" in a live multiplayer match with: {squad}. Game: {url}
Persona: {persona}
Write /workspace/bot.py from this template, filling in only the persona part:

import time
SQUAD = {squad_list}
async def run(api):
    t0 = time.time()
    while time.time() - t0 < 90:   # wait until the whole squad has joined, so we play together
        seen = await api.look()
        if len(str(seen.get("state", {{}}))) and sum(n in str(seen) for n in SQUAD) >= len(SQUAD):
            break
        await api.wait(1000)
    while True:
        seen = await api.look()   # {{"state": window.State (trimmed), "recent": last events, "canvas": [x, y, w, h]}}
        # --- persona: one step, then api.note("what is wrong, where, how to reproduce", "high"|"medium"|"low") ---
        # api.key("ArrowRight", 800), api.key("Space"), api.click(x, y), api.click_text("..."), api.type("..."), api.chat("hi")
        await api.wait(400)

Then run exactly: python3 /workspace/squad/harness.py --url {url} --name {name} --room {room} --bot /workspace/bot.py --seconds {seconds}
Then look at 2-3 screenshots in /workspace/out/{name}/shots and reply with the JSON."""


def tunnel(port):
    proc = subprocess.Popen(["cloudflared", "tunnel", "--url", f"http://localhost:{port}", "--no-autoupdate"],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    t0 = time.time()
    for line in proc.stdout:
        m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
        if m:
            url = m.group(0) + "/"
            threading.Thread(target=lambda: [None for _ in proc.stdout], daemon=True).start()
            for _ in range(20):  # wait until the public URL actually serves the game
                try:
                    import urllib.request
                    urllib.request.urlopen(url, timeout=5)
                    return proc, url
                except Exception:
                    time.sleep(2)
            return proc, url
        if time.time() - t0 > 40:
            break
    proc.kill()
    raise RuntimeError("cloudflared did not give a URL")


def agent(run, rnd, name, url, room, squad, findings, lock):
    c = client()
    aid = f"squad:{rnd}:{name}"
    agent_id = json.loads((HERE / "agent.json").read_text())["id"]
    t0 = time.time()
    run.agent(aid, stage="playtest", role="squad", name=f"{name} (Managed Agent)", round=rnd, status="running",
              brief=PERSONAS[name].split(":")[0], started=round(t0, 2))
    task = TASK.format(name=name, persona=PERSONAS[name], url=url, room=room, seconds=SECONDS,
                       squad=", ".join(squad), squad_list=repr(squad))
    host = urlparse(url).hostname
    try:
        try:
            it = c.interactions.create(agent=agent_id, input=task, background=True,
                                       environment={"type": "remote", "network": {"allowlist": [{"domain": host}]}})
        except Exception:
            it = c.interactions.create(agent=agent_id, input=task, background=True, environment="remote")
        seen, n = set(), 0
        while it.status in ("in_progress", "queued"):
            time.sleep(8)
            it = c.interactions.get(id=it.id)
            env = getattr(it, "environment_id", None)
            if not env:
                continue
            try:  # newest screenshot from the sandbox, shown live in the UI
                files = c.environments.files.list(environment=env, path=f"workspace/out/{name}/shots").files
                new = sorted(f.path for f in files if f.path.endswith(".png") and f.path not in seen)
                seen.update(f.path for f in files)
                if new:
                    n += 1
                    rel = f"shots/squad_{rnd}_{name}/{n:03d}.png"
                    run.path(rel).parent.mkdir(parents=True, exist_ok=True)
                    run.path(rel).write_bytes(c.environments.files.download(environment=env, path=new[-1]))
                    run.act(aid, "tool", call=f"shot{n}", tool="look", label="Playing over the internet", status="done", img=rel)
            except Exception:
                pass
        rep = parse_json(it.output_text or "{}") if it.status == "completed" else {}
        found = rep.get("findings", [])
        for f in found:
            run.act(aid, "note", text=f"{f.get('severity', '')}: {f.get('finding', '')}"[:240])
        shots = sorted(str(f.relative_to(run.dir)) for f in run.path(f"shots/squad_{rnd}_{name}").glob("*.png"))
        with lock:
            findings[name] = {"summary": rep.get("summary", ""), "findings": found, "shots": shots,
                              "secs": round(time.time() - t0), "persona": PERSONAS[name]}
        u = it.usage
        run.agent(aid, status="done" if it.status == "completed" else "error", secs=round(time.time() - t0),
                  **({"tokens_in": u.total_input_tokens or 0, "tokens_out": u.total_output_tokens or 0} if u else {}))
    except Exception as e:
        run.agent(aid, status="error", secs=round(time.time() - t0), detail=str(e)[:300])


def main(run_path, rnd, game):
    run = Run(run_path)
    rnd = int(rnd)
    proc, port = serve(Path(game).resolve())
    tun = None
    try:
        tun, url = tunnel(port)
        squad, findings, lock = list(PERSONAS), {}, threading.Lock()
        threads = [threading.Thread(target=agent, args=(run, rnd, n, url, f"squad{rnd}", squad, findings, lock)) for n in squad]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
    finally:
        if tun:
            tun.kill()  # the game is only public while the squad plays
        proc.kill()
    run.write_json({"round": rnd, "agents": findings}, "rounds", str(rnd), "squad.json")
    total = sum(len(v["findings"]) for v in findings.values())
    print(f"[squad] round {rnd}: {total} findings from {len(findings)} Managed Agents", flush=True)


if __name__ == "__main__":
    main(*sys.argv[1:4])
