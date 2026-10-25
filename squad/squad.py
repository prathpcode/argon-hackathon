"""Run a squad of Managed Agent playtesters in one live multiplayer match and collect what they find.

usage: squad.py <public game URL> [--seconds 75] [--lead 120] [--names explorer,griefer,social]
Writes runs/<id>/state.json (for the dashboard), per-agent screenshots, session.mp4 and findings.json.
"""
import argparse
import json
import re
import sys
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "loop"))
from common import client, parse_json  # noqa: E402

HERE = Path(__file__).resolve().parent
AGENT_ID = (HERE / "agent_env.txt").read_text().split()[0]

PERSONAS = {
    "Explorer": "Visit every street through signposts and doors, walk to both ends of each street, climb platforms. "
                "Report street transitions that fail, invisible walls, falling out of the world, missing art, "
                "places you can't leave.",
    "Griefer": "Try to break the game: run off both edges, jump spam on platform edges, click objects rapidly, "
               "spam chat and emotes, use items repeatedly, stand inside other players. Report exploits "
               "(infinite resources/xp), stuck states, crashes, desync.",
    "Socialite": "Play with the other players: say hi, use emotes and the hi sign, follow another player (conga), "
                 "mine the same rock as someone else, gift items. Report anything that the other players don't "
                 "see, double messages, missing names, broken co-op bonuses.",
}

TASK = """You are playtester "{name}" in a live multiplayer match with other agent playtesters.
Game URL: {url}
Persona: {persona}
Write /workspace/bot.py for this persona (use api.look() to find things; act for the whole session; api.note()
every problem with what/where/how). Then run exactly:
python3 /workspace/squad/harness.py --url {url} --name {name} --bot /workspace/bot.py --seconds {seconds} --start-at {start_at} --persona "{name}"
The match starts at unix time {start_at}; the harness waits for it. Then review the screenshots and reply with the JSON."""


def run_agent(c, name, persona, url, seconds, start_at, out, state, lock):
    rec = state["agents"][name]
    host = urlparse(url).hostname
    try:
        it = c.interactions.create(
            agent=AGENT_ID,
            input=TASK.format(name=name, persona=persona, url=url, seconds=seconds, start_at=int(start_at)),
            environment={"type": "remote", "network": {"allowlist": [{"domain": host}]}},
            background=True,
        )
    except Exception as e:  # network config not accepted for forked agents -> plain fork
        rec["note"] = f"allowlist rejected ({str(e)[:80]}); using default network"
        it = c.interactions.create(
            agent=AGENT_ID,
            input=TASK.format(name=name, persona=persona, url=url, seconds=seconds, start_at=int(start_at)),
            environment="remote", background=True)
    rec.update(interaction=it.id, status=it.status)
    shots_seen = set()
    while True:
        time.sleep(8)
        try:
            it = c.interactions.get(id=rec["interaction"])
        except Exception:
            continue
        env = getattr(it, "environment_id", None)
        with lock:
            rec["status"], rec["env"] = it.status, env
            rec["elapsed"] = round(time.time() - state["started"])
            if time.time() < start_at:
                rec["phase"] = "writing bot"
            elif time.time() < start_at + seconds:
                rec["phase"] = "playing"
            else:
                rec["phase"] = "reporting"
        if env:
            try:
                files = c.environments.files.list(environment=env, path=f"workspace/out/{name}/shots").files
                new = sorted(f.path for f in files if f.path.endswith(".png") and f.path not in shots_seen)
                for p in new[-1:]:
                    data = c.environments.files.download(environment=env, path=p)
                    dest = out / name / "shots" / Path(p).name
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(data)
                    with lock:
                        rec["latest_shot"] = str(dest.relative_to(HERE))
                shots_seen.update(f.path for f in files)
            except Exception:
                pass
        if it.status not in ("in_progress", "queued"):
            break
    rec["phase"] = "done" if it.status == "completed" else it.status
    try:
        rep = parse_json(it.output_text or "")
    except Exception:
        rep = {"findings": [], "summary": (it.output_text or "")[:500]}
    rec["findings"], rec["summary"] = rep.get("findings", []), rep.get("summary", "")
    if rec.get("env"):
        for f in ("session.mp4", "result.json"):
            try:
                data = c.environments.files.download(environment=rec["env"], path=f"workspace/out/{name}/{f}")
                (out / name / f).parent.mkdir(parents=True, exist_ok=True)
                (out / name / f).write_bytes(data)
                rec[f.split(".")[0]] = str((out / name / f).relative_to(HERE))
            except Exception as e:
                rec.setdefault("missing", []).append(f"{f}: {str(e)[:60]}")
    u = it.usage
    rec["usage"] = {"in": u.total_input_tokens, "out": u.total_output_tokens} if u else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--seconds", type=int, default=75)
    ap.add_argument("--lead", type=int, default=120, help="seconds for agents to start and write bots")
    ap.add_argument("--names", default="Explorer,Griefer,Socialite")
    a = ap.parse_args()
    url = a.url.rstrip("/") + "/"
    run_id = time.strftime("%H%M%S")
    out = HERE / "runs" / run_id
    out.mkdir(parents=True, exist_ok=True)
    start_at = time.time() + a.lead
    names = a.names.split(",")
    state = {"run": run_id, "url": url, "started": time.time(), "start_at": start_at, "seconds": a.seconds,
             "agents": {n: {"name": n, "persona": PERSONAS[n], "phase": "starting"} for n in names}}
    lock = threading.Lock()
    c = client()

    def save():
        with lock:
            (out / "state.json").write_text(json.dumps(state, indent=1))
            (HERE / "runs" / "latest.txt").write_text(run_id)

    threads = [threading.Thread(target=run_agent, args=(c, n, PERSONAS[n], url, a.seconds, start_at, out, state, lock))
               for n in names]
    for t in threads:
        t.start()
    while any(t.is_alive() for t in threads):
        save()
        time.sleep(3)
    state["finished"] = time.time()
    save()
    findings = [dict(f, agent=n) for n, r in state["agents"].items() for f in r.get("findings", [])]
    (out / "findings.json").write_text(json.dumps(findings, indent=1))
    print(f"squad {run_id} done in {state['finished'] - state['started']:.0f}s: {len(findings)} findings")
    for n, r in state["agents"].items():
        print(f"  {n}: {r['phase']}  findings {len(r.get('findings', []))}  {r.get('summary', '')[:120]}")


if __name__ == "__main__":
    main()
