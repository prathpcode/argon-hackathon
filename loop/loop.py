"""The improvement loop: play scenarios -> compare with original footage -> fix -> repeat, never regressing.

usage: loop.py <config.json> [--rounds N] [--approve]
"""
import argparse
import asyncio
import json
import os
import shutil
import subprocess
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import compare
import fix
import play
from common import HERE, load_config, load_env


def start_server(cfg, game, port):
    env = dict(os.environ, PORT=str(port))
    proc = subprocess.Popen(["node", cfg["server"]], cwd=game, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try:
            urllib.request.urlopen(f"http://localhost:{port}/", timeout=1)
            return proc
        except Exception:
            time.sleep(0.2)
    proc.kill()
    raise RuntimeError("server did not start")


def evaluate(cfg, game, scen_path, rdir):
    proc = start_server(cfg, game, cfg["port"])
    try:
        base = f"http://localhost:{cfg['port']}{cfg['page']}"
        print("play:", flush=True)
        played = asyncio.run(play.main(scen_path, base, rdir / "play"))
    finally:
        proc.kill()
    print("compare:", flush=True)
    verdicts = compare.main(scen_path, cfg["sources"], rdir / "play")
    return played["smoke"], verdicts


def score(verdicts):
    return sum(v["pass"] for v in verdicts)


def confirm_flips(cfg, scen_path, rdir, verdicts, best_verdicts, extra=2):
    """A single model verdict can flip between runs. Re-judge every rule whose pass/fail changed against the
    best round `extra` more times on the same recording; the majority of all judgements decides."""
    before = {v["id"]: v["pass"] for v in best_verdicts}
    flips = [v for v in verdicts if v["id"] in before and v["pass"] != before[v["id"]]]
    if not flips:
        return verdicts
    plan = {s["id"]: s for s in json.loads(Path(scen_path).read_text())["scenarios"]}
    played = {r["id"]: r for r in json.loads((rdir / "play" / "play.json").read_text())["results"]}
    c = compare.client()
    print(f"confirm: re-judging {len(flips)} flipped rules x{extra}", flush=True)
    jobs = [(v, n) for v in flips for n in range(extra)]
    with ThreadPoolExecutor(8) as ex:
        again = list(ex.map(lambda job: compare.judge(c, plan[job[0]["id"]], played[job[0]["id"]],
                                                      cfg["sources"], rdir / "play")["pass"], jobs))
    for v in flips:
        votes = [v["pass"]] + [ok for (w, _), ok in zip(jobs, again) if w is v]
        v["votes"] = votes
        v["pass"] = sum(votes) * 2 > len(votes)
        print(f"  {v['id']:40} votes {votes} -> {'PASS' if v['pass'] else 'FAIL'}", flush=True)
    (rdir / "play" / "verdicts.json").write_text(json.dumps(verdicts, indent=1))
    return verdicts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("config")
    ap.add_argument("--rounds", type=int, default=3)
    ap.add_argument("--approve", action="store_true", help="show each edit and ask before applying")
    ap.add_argument("--batch", type=int, default=8, help="failing rules to fix per round")
    ap.add_argument("--resume", action="store_true", help="reuse an existing round_0 measurement")
    a = ap.parse_args()
    load_env()
    cfg = load_config(a.config)
    run = HERE / "runs" / cfg["name"]
    run.mkdir(parents=True, exist_ok=True)
    scen_path = run / "scenarios.json"
    if not scen_path.exists():
        shutil.copy(Path(a.config).with_suffix(".scenarios.json"), scen_path)
    history = []

    # Round 0: measure the build as it is.
    r0 = run / "round_0"
    t0 = time.time()
    if a.resume and (r0 / "play" / "verdicts.json").exists():
        smoke = json.loads((r0 / "play" / "play.json").read_text())["smoke"]
        verdicts = json.loads((r0 / "play" / "verdicts.json").read_text())
    else:
        shutil.rmtree(r0, ignore_errors=True)
        shutil.copytree(cfg["game_dir"], r0 / "game")
        smoke, verdicts = evaluate(cfg, r0 / "game", scen_path, r0)
    best = {"round": 0, "dir": r0, "verdicts": verdicts, "smoke": smoke}
    history.append({"round": 0, "score": score(verdicts), "total": len(verdicts), "accepted": True,
                    "secs": round(time.time() - t0)})
    print(f"ROUND 0: {score(verdicts)}/{len(verdicts)} rules match", flush=True)

    regressions, stale, owed = None, 0, []
    for k in range(1, a.rounds + 1):
        t0 = time.time()
        rk = run / f"round_{k}"
        plan = json.loads(scen_path.read_text())
        if a.resume and (rk / "play" / "verdicts.json").exists() and (rk / "proposal.json").exists():
            print(f"ROUND {k}: reusing measured round", flush=True)
            proposal = json.loads((rk / "proposal.json").read_text())
            applied, failed = proposal.get("edits", []), []
            smoke = json.loads((rk / "play" / "play.json").read_text())["smoke"]
            verdicts = json.loads((rk / "play" / "verdicts.json").read_text())
        if not (a.resume and (rk / "play" / "verdicts.json").exists() and (rk / "proposal.json").exists()):
            shutil.rmtree(rk, ignore_errors=True)
            shutil.copytree(best["dir"] / "game", rk / "game")
            print(f"ROUND {k}: asking for fixes ({len(best['verdicts']) - score(best['verdicts'])} failing)", flush=True)
            proposal = fix.propose(cfg, rk / "game", best["verdicts"], best["smoke"], plan, regressions,
                                   limit=a.batch, raw_path=rk / "proposal_raw.txt", priority=owed)
            (rk / "proposal.json").write_text(json.dumps(proposal, indent=1))
            edits = proposal.get("edits", [])
            if a.approve:
                for e in edits:
                    print(f"\n--- {e['file']} ({', '.join(e.get('rule_ids') or [])}): {e.get('why')}\n- {e['old'][:400]}\n+ {e['new'][:400]}")
                if input("apply these edits? [y/N] ").strip().lower() != "y":
                    print("rejected by user; stopping")
                    break
            applied, failed = fix.apply_edits(rk / "game", edits)
            for u in proposal.get("scenario_updates", []):
                for s in plan["scenarios"]:
                    if s["id"] == u["id"]:
                        s["steps"] = u["steps"]
            scen_path.write_text(json.dumps(plan, indent=1))
            print(f"  edits applied {len(applied)}, failed {len(failed)}, scenario updates {len(proposal.get('scenario_updates', []))}", flush=True)

            smoke, verdicts = evaluate(cfg, rk / "game", scen_path, rk)
        verdicts = confirm_flips(cfg, scen_path, rk, verdicts, best["verdicts"])
        was = {v["id"] for v in best["verdicts"] if v["pass"]}
        now = {v["id"] for v in verdicts if v["pass"]}
        lost = sorted(was - now)
        # Keep a round when its net score improves; anything it broke is owed and fixed first next round.
        accepted = score(verdicts) > score(best["verdicts"])
        history.append({"round": k, "score": score(verdicts), "total": len(verdicts), "accepted": accepted,
                        "regressions": lost, "newly_passing": sorted(now - was), "edits_applied": len(applied),
                        "edits_failed": len(failed), "fix_usage": proposal.get("_usage"),
                        "secs": round(time.time() - t0)})
        print(f"ROUND {k}: {score(verdicts)}/{len(verdicts)}  new {sorted(now - was)}  regressions {lost}  "
              f"{'ACCEPTED' if accepted else 'REVERTED'}", flush=True)
        if accepted:
            stale = 0 if score(verdicts) > score(best["verdicts"]) else stale + 1
            best = {"round": k, "dir": rk, "verdicts": verdicts, "smoke": smoke}
            owed = lost
            regressions = [f"{i}: passed before your last edit and fails now -> " +
                           next((v.get("difference", "") for v in verdicts if v["id"] == i), "") for i in lost] or None
        else:
            stale += 1
            regressions = [f"{i}: passed before, failed after your edit -> " +
                           next((v.get("difference", "") for v in verdicts if v["id"] == i), "") for i in lost] or \
                          "score did not improve"
        (run / "history.json").write_text(json.dumps(history, indent=1))
        if score(best["verdicts"]) == len(best["verdicts"]) or stale >= 2:
            break

    (run / "history.json").write_text(json.dumps(history, indent=1))
    (run / "BEST").write_text(str(best["dir"].name))
    print("\nround  score   accepted  secs")
    for h in history:
        print(f"{h['round']:5}  {h['score']:2}/{h['total']:<3}  {str(h['accepted']):8}  {h['secs']}")
    print(f"best: {best['dir']}")


if __name__ == "__main__":
    main()
