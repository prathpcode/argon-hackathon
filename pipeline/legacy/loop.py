"""Stage 5, the improvement loop: play scenarios -> compare with original footage -> fix -> repeat, never regressing."""
import asyncio
import os
import shutil
import socket
import subprocess
import time
import urllib.request

import compare
import fix
import play

ROUNDS = int(os.environ.get("REVIVE_ROUNDS", "3"))
BATCH = int(os.environ.get("REVIVE_BATCH", "8"))


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def start_server(game, port):
    proc = subprocess.Popen(["node", "server.js"], cwd=game, env=dict(os.environ, PORT=str(port)),
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://localhost:{port}/", timeout=1)
            return proc
        except Exception:
            time.sleep(0.2)
    proc.kill()
    raise RuntimeError("the game's server did not start")


def evaluate(run, rnd, rdir, plan, sources):
    port = free_port()
    proc = start_server(rdir / "game", port)
    try:
        played = asyncio.run(play.main(run, rnd, plan, f"http://localhost:{port}/", rdir / "play"))
    finally:
        proc.kill()
    return played["smoke"], compare.main(run, rnd, plan, played, sources, rdir / "play")


def score(verdicts):
    return sum(v["pass"] for v in verdicts)


def run_stage(run):
    sources = {v["key"]: v["url"] for v in run.read_json("footage.json")}
    loop = run.path("loop")
    history = run.read_json("loop", "history.json") or []

    # Round 0: measure the build as it is (reused when resuming).
    r0 = loop / "round_0"
    plan = run.read_json("scenarios.json")
    if (r0 / "play" / "verdicts.json").exists():
        smoke = run.read_json("loop", "round_0", "play", "play.json")["smoke"]
        verdicts = run.read_json("loop", "round_0", "play", "verdicts.json")
    else:
        t0 = time.time()
        shutil.rmtree(r0, ignore_errors=True)
        shutil.copytree(run.path("game"), r0 / "game")
        smoke, verdicts = evaluate(run, 0, r0, plan, sources)
        history = [{"round": 0, "score": score(verdicts), "total": len(verdicts), "accepted": True, "secs": round(time.time() - t0)}]
        run.write_json(history, "loop", "history.json")
    run.emit("round", round=0, score=score(verdicts), total=len(verdicts), accepted=True)
    best = {"round": 0, "dir": r0, "verdicts": verdicts, "smoke": smoke}
    run.path("loop", "BEST").write_text("round_0")

    regressions, stale = None, 0
    for k in range(1, ROUNDS + 1):
        if score(best["verdicts"]) == len(best["verdicts"]):
            break
        t0 = time.time()
        rk = loop / f"round_{k}"
        shutil.rmtree(rk, ignore_errors=True)
        shutil.copytree(best["dir"] / "game", rk / "game")
        plan = run.read_json("scenarios.json")
        run.stage("test", "running", f"Round {k}: fixing {len(best['verdicts']) - score(best['verdicts'])} failing rules")
        proposal = fix.propose(run, k, rk / "game", best["verdicts"], best["smoke"], plan, regressions, limit=BATCH)
        run.write_json(proposal, "loop", f"round_{k}", "proposal.json")
        applied, failed = fix.apply_edits(rk / "game", proposal.get("edits", []))
        for u in proposal.get("scenario_updates", []):
            for s in plan["scenarios"]:
                if s["id"] == u["id"]:
                    s["steps"] = u["steps"]
        run.write_json(plan, "scenarios.json")

        smoke, verdicts = evaluate(run, k, rk, plan, sources)
        was = {v["id"] for v in best["verdicts"] if v["pass"]}
        now = {v["id"] for v in verdicts if v["pass"]}
        lost = sorted(was - now)
        accepted = not lost and score(verdicts) >= score(best["verdicts"])
        history.append({"round": k, "score": score(verdicts), "total": len(verdicts), "accepted": accepted,
                        "regressions": lost, "newly_passing": sorted(now - was), "edits_applied": len(applied),
                        "edits_failed": len(failed), "secs": round(time.time() - t0)})
        run.write_json(history, "loop", "history.json")
        run.emit("round", round=k, score=score(verdicts), total=len(verdicts), accepted=accepted,
                 regressions=lost, newly_passing=sorted(now - was))
        if accepted:
            stale = 0 if score(verdicts) > score(best["verdicts"]) else stale + 1
            best = {"round": k, "dir": rk, "verdicts": verdicts, "smoke": smoke}
            run.path("loop", "BEST").write_text(rk.name)
            regressions = None
        else:
            stale += 1
            regressions = [f"{i}: passed before, failed after your edit -> " +
                           next((v.get("difference", "") for v in verdicts if v["id"] == i), "") for i in lost] or \
                          "score did not improve"
        if stale >= 2:
            break
    return f"{score(best['verdicts'])} of {len(best['verdicts'])} rules match the original"
