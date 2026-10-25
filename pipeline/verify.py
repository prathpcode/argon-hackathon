"""Footage check: does a round's game do what the original footage shows, rule by rule?

usage: verify.py runs/<id> <round> <game dir>

1. Scenarios (once per revival, runs/<id>/scenarios.json): Argon turns every footage rule into a short scripted
   play-through of the rebuild, plus the window of the original video that shows the rule.
2. Play: each scenario runs in a real browser against the round's game (its own server), recorded.
3. Judge: Argon watches the original window next to the recording and rules match / mismatch / unclear.
   Rules that flipped since the previous round are judged twice more and the majority decides.
Writes rounds/<round>/verify.json (read by the UI and by the round loop) and logs every agent in events.jsonl.
"""
import asyncio
import base64
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from common import MODEL, Run, client, output_text, parse_json, usage

STEPS = """Each scenario is driven by a real browser (Playwright) with trusted input. Step vocabulary:
  {"do":"wait","ms":N}
  {"do":"key","key":"<KeyboardEvent.key e.g. ArrowRight, a, Space>","ms":N}   hold N ms (0 = tap)
  {"do":"click_world","x":X,"y":Y}        click a point in WORLD coordinates (converted with world_to_client)
  {"do":"click_text","text":"..."}         click the visible element whose text matches (menus, buttons)
  {"do":"click","selector":"css"}          click a DOM element
  {"do":"type","selector":"css","text":"...","enter":true}
  {"do":"eval","js":"..."}                 SETUP ONLY (e.g. move next to an object); never fake the behaviour under test
  {"do":"expect","js":"<expression -> boolean>","desc":"..."}   assertion on window.State / window.__events
Any step may carry "player": i (0-based) for multiplayer scenarios. Players join the same room and seed in order."""

PLAN = """You are writing an automated check of a game rebuilt from footage of a lost original. For every rule below,
write a scenario that makes the rebuild show that rule, and pick the window of the ORIGINAL footage that shows it.

{steps}

The game keeps this contract: URL params ?name= ?room= ?seed=, window.State (live state incl. camera),
window.__events ({{t, type, ...}}), keyboard and mouse input, first screen leads into play with one key or click.

Return JSON only:
{{"world_to_client": "<JS expression with variables x, y (world coords) returning {{x, y}} in viewport CSS pixels>",
 "start": [steps that get from the first screen into play],
 "scenarios": [{{"id": "short_snake_case", "rule_index": int, "rule": str, "testable": bool, "why_not": str|null,
   "original": {{"video": "A", "start": seconds, "end": seconds}},   // 8-25 s of the ORIGINAL showing the rule
   "players": 1|2|3, "steps": [...], "look_for": str}}]}}
Keep each scenario under ~20 s of play. Prefer real input over eval.

FOOTAGE: {footage}
RULES (index: rule, evidence):
{rules}

CODE:
{code}"""

JUDGE = """You are checking a game rebuilt from footage of a lost original, one rule at a time.
Clip 1 is the ORIGINAL ({video} {start}s-{end}s). The other clip(s) are the REBUILD, recorded while a test played
this scenario (one clip per player).
Rule: {rule}
Should be visible if it matches: {look_for}
Assertions: {expects}
Test step errors (the test itself may be broken): {step_errors}
Console errors: {errors}
"match" = the rebuild shows the same behaviour, layout, UI and feedback for this rule (art may be redrawn).
"mismatch" = it visibly differs or is missing. "unclear" = the test didn't exercise it or the clips don't show it.
JSON only: {{"verdict": "match"|"mismatch"|"unclear", "original_shows": str, "rebuild_shows": str,
"difference": str, "fix": str}}"""

VIEW = {"width": 1280, "height": 720}
KEYS = {"Space": " ", "space": " ", "Spacebar": " "}


def game_files(game):
    files = sorted(str(p.relative_to(game)) for p in Path(game).rglob("*")
                   if p.suffix in (".html", ".js", ".css") and "node_modules" not in p.parts)
    return [f for f in files if f.startswith("public/") or f == "server.js"]


def logged(run, id, rnd, name, brief, inputs, **config):
    """One Argon call shown as an agent of this round in the UI."""
    c = client()
    t0 = time.time()
    run.agent(id, stage="playtest", role="verifier", name=name, brief=brief, round=rnd, status="running", started=round(t0, 2))
    try:
        it = c.interactions.create(model=MODEL, input=inputs, background=True, generation_config=config)
        while it.status in ("in_progress", "queued"):
            time.sleep(4)
            it = c.interactions.get(id=it.id)
        if it.status not in ("completed", "incomplete"):
            raise RuntimeError(f"{name} {it.status}")
        run.agent(id, status="done", secs=round(time.time() - t0), **usage(it))
        return output_text(it)
    except Exception as e:
        run.agent(id, status="error", secs=round(time.time() - t0), detail=str(e)[:300])
        raise


def scenarios(run, rnd, game):
    path = run.path("scenarios.json")
    if path.exists():
        return json.loads(path.read_text())
    spec = run.read_json("spec.json")
    footage = run.read_json("footage.json") or []
    rules = "\n".join(f"{i}: {r['rule']} ({', '.join(r.get('evidence', []))})" for i, r in enumerate(spec["rules"]))
    code = "\n\n".join(f"=== FILE: {f} ===\n{(Path(game) / f).read_text()}" for f in game_files(game))
    text = logged(run, f"verify:{rnd}:plan", rnd, "Scenario writer",
                  f"Turning {len(spec['rules'])} footage rules into scripted play-throughs",
                  PLAN.format(steps=STEPS, footage=", ".join(f"{v['key']}={v.get('title', '')}" for v in footage),
                              rules=rules, code=code),
                  thinking_level="medium", max_output_tokens=120000)
    plan = parse_json(text)
    path.write_text(json.dumps(plan, indent=1))
    return plan


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def serve(game):
    port = free_port()
    proc = subprocess.Popen(["node", "server.js"], cwd=game, env=dict(os.environ, PORT=str(port)),
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(60):
        try:
            urllib.request.urlopen(f"http://localhost:{port}/", timeout=1)
            return proc, port
        except Exception:
            time.sleep(0.2)
    proc.kill()
    raise RuntimeError("game server did not start")


async def step(page, s, w2c):
    do = s["do"]
    if do == "wait":
        await page.wait_for_timeout(s.get("ms", 500))
    elif do == "key":
        k = KEYS.get(s["key"], s["key"])
        if s.get("ms", 0) > 0:
            await page.keyboard.down(k)
            await page.wait_for_timeout(s["ms"])
            await page.keyboard.up(k)
        else:
            await page.keyboard.press(k)
    elif do == "click_world":
        pt = await page.evaluate(f"(() => {{ const x = {s['x']}, y = {s['y']}; return ({w2c}); }})()")
        await page.mouse.click(pt["x"], pt["y"])
    elif do == "click_text":
        await page.get_by_text(s["text"], exact=False).first.click(timeout=3000)
    elif do == "click":
        await page.click(s["selector"], timeout=3000)
    elif do == "type":
        await page.fill(s["selector"], s["text"], timeout=3000)
        if s.get("enter"):
            await page.press(s["selector"], "Enter")
    elif do == "eval":
        await page.evaluate(f"(() => {{ {s['js']} }})()")
    elif do == "expect":
        ok = await page.evaluate(f"(() => {{ try {{ return !!({s['js']}); }} catch (e) {{ return 'ERR ' + e; }} }})()")
        return {"expect": s.get("desc", s["js"]), "ok": ok is True}


async def play_one(browser, sc, plan, base, room, out, sem):
    async with sem:
        n = sc.get("players", 1)
        tmp = Path(tempfile.mkdtemp())
        ctxs, pages, errors = [], [], []
        for i in range(n):
            ctx = await browser.new_context(viewport=VIEW, record_video_dir=str(tmp / str(i)), record_video_size=VIEW)
            page = await ctx.new_page()
            page.on("pageerror", lambda e, i=i: errors.append(f"p{i}: {e}"))
            page.on("console", lambda m, i=i: m.type == "error" and errors.append(f"p{i}: {m.text}"))
            await page.goto(f"{base}?name=Tester{i + 1}&room={room}-{sc['id']}&seed=42")
            await page.wait_for_timeout(800)
            for s in plan.get("start", []):
                try:
                    await asyncio.wait_for(step(page, s, plan["world_to_client"]), timeout=10)
                except Exception:
                    pass
            ctxs.append(ctx)
            pages.append(page)
        await pages[0].wait_for_timeout(1200)
        expects, step_errors = [], []
        for k, s in enumerate(sc["steps"]):
            try:
                r = await asyncio.wait_for(step(pages[min(s.get("player", 0), n - 1)], s, plan["world_to_client"]), timeout=25)
                if r:
                    expects.append(r)
            except Exception as e:
                step_errors.append(f"step {k} {s.get('do')}: {str(e).splitlines()[0][:150]}")
        await pages[0].wait_for_timeout(600)
        videos = []
        for i, (ctx, page) in enumerate(zip(ctxs, pages)):
            webm = await page.video.path()
            await ctx.close()
            mp4 = out / f"{sc['id']}_p{i}.mp4"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p",
                            "-crf", "30", "-preset", "veryfast", str(mp4)], check=False)
            videos.append(mp4)
        shutil.rmtree(tmp, ignore_errors=True)
        return {"id": sc["id"], "videos": videos, "errors": errors[:8], "step_errors": step_errors, "expects": expects}


async def play_all(todo, plan, base, room, out):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        sem = asyncio.Semaphore(4)
        res = await asyncio.gather(*(play_one(browser, sc, plan, base, room, out, sem) for sc in todo))
        await browser.close()
    return {r["id"]: r for r in res}


def judge(run, rnd, sc, res, footage, n=0):
    o = sc["original"]
    parts = [{"type": "video", "uri": footage[o["video"]],
              "processing": {"type": "static", "start_offset": f"{o['start']}s", "end_offset": f"{o['end']}s", "fps": 2}}]
    for v in res["videos"]:
        if Path(v).exists():
            parts.append({"type": "video", "data": base64.b64encode(Path(v).read_bytes()).decode(), "mime_type": "video/mp4"})
    parts.append({"type": "text", "text": JUDGE.format(video=o["video"], start=o["start"], end=o["end"], rule=sc["rule"],
                  look_for=sc.get("look_for", ""), expects=json.dumps(res["expects"])[:1200],
                  step_errors=res["step_errors"][:5], errors=res["errors"][:5])})
    try:
        c = client()
        it = c.interactions.create(model=MODEL, input=parts, generation_config={"thinking_level": "low"})
        v = parse_json(it.output_text)
    except Exception as e:
        v = {"verdict": "unclear", "difference": f"judge failed: {str(e)[:160]}"}
    expects_ok = all(e["ok"] for e in res["expects"]) if res["expects"] else None
    v["pass"] = v.get("verdict") == "match" and expects_ok is not False and not res["errors"]
    return v


def main(run_path, rnd, game):
    run = Run(run_path)
    rnd = int(rnd)
    game = Path(game).resolve()
    out = run.path("rounds", str(rnd), "verify")
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    plan = scenarios(run, rnd, game)
    todo = [s for s in plan["scenarios"] if s.get("testable") and s.get("original", {}).get("video")]
    footage = {v["key"]: v["url"] for v in (run.read_json("footage.json") or [])}
    todo = [s for s in todo if s["original"]["video"] in footage]

    # Play every scenario against this round's game, on its own server.
    pid = f"verify:{rnd}:play"
    run.agent(pid, stage="playtest", role="verifier", name="Footage check", round=rnd, status="running",
              brief=f"Playing {len(todo)} footage scenarios against round {rnd}", started=round(time.time(), 2))
    proc, port = serve(game)
    try:
        played = asyncio.run(play_all(todo, plan, f"http://localhost:{port}/", f"v{rnd}", out))
    finally:
        proc.kill()
    run.agent(pid, status="done", secs=round(time.time() - t0))

    # Judge each rule against its moment in the original footage.
    jid = f"verify:{rnd}:judge"
    run.agent(jid, stage="playtest", role="verifier", name="Footage judge", round=rnd, status="running",
              brief=f"Comparing {len(todo)} moments of the original with the rebuild", started=round(time.time(), 2))
    with ThreadPoolExecutor(8) as ex:
        verdicts = list(ex.map(lambda s: judge(run, rnd, s, played[s["id"]], footage), todo))

    # A single verdict can flip between runs: re-judge flips against the previous round, majority decides.
    prev = run.read_json("rounds", str(rnd - 1), "verify.json") if rnd > 1 else None
    before = {r["id"]: r["pass"] for r in (prev or {}).get("rules", [])}
    flips = [i for i, (s, v) in enumerate(zip(todo, verdicts)) if s["id"] in before and v["pass"] != before[s["id"]]]
    if flips:
        with ThreadPoolExecutor(8) as ex:
            again = list(ex.map(lambda job: judge(run, rnd, todo[job[0]], played[todo[job[0]]["id"]], footage)["pass"],
                                [(i, k) for i in flips for k in range(2)]))
        for n, i in enumerate(flips):
            votes = [verdicts[i]["pass"], again[2 * n], again[2 * n + 1]]
            verdicts[i]["votes"] = votes
            verdicts[i]["pass"] = sum(votes) >= 2
    run.agent(jid, status="done", secs=round(time.time() - t0))

    rules = []
    for s, v in zip(todo, verdicts):
        o = s["original"]
        rules.append({"id": s["id"], "rule_index": s["rule_index"], "rule": s["rule"], "pass": v["pass"],
                      "verdict": v.get("verdict"), "votes": v.get("votes"), "original": o,
                      "original_url": f"{footage[o['video']]}&t={int(o['start'])}",
                      "original_shows": v.get("original_shows", ""), "rebuild_shows": v.get("rebuild_shows", ""),
                      "difference": v.get("difference", ""), "fix": v.get("fix", ""),
                      "video": str(Path(played[s["id"]]["videos"][0]).relative_to(run.dir)) if played[s["id"]]["videos"] else None,
                      "step_errors": played[s["id"]]["step_errors"]})
    matched = sum(r["pass"] for r in rules)
    lost = sorted(i for i, ok in before.items() if ok and not next((r["pass"] for r in rules if r["id"] == i), True))
    result = {"round": rnd, "matched": matched, "total": len(rules), "lost": lost, "secs": round(time.time() - t0), "rules": rules}
    run.write_json(result, "rounds", str(rnd), "verify.json")
    run.emit("verify", round=rnd, matched=matched, total=len(rules), lost=len(lost))
    print(f"[verify] round {rnd}: {matched}/{len(rules)} rules match the footage ({len(lost)} lost) in {result['secs']}s", flush=True)


if __name__ == "__main__":
    main(*sys.argv[1:4])
