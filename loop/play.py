"""Run every testable scenario against a running build, recording each player; plus a quick smoke check."""
import asyncio
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.async_api import async_playwright

KEYS = {"Space": " ", "space": " ", "Spacebar": " "}
VIEW = {"width": 1280, "height": 720}


async def smoke(browser, base, out):
    """Load once solo: console errors, first-screen screenshot, initial events."""
    ctx = await browser.new_context(viewport=VIEW)
    page = await ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    await page.goto(f"{base}?name=Smoke&seed=42")
    await page.wait_for_timeout(2500)
    await page.screenshot(path=str(out / "smoke.png"))
    events = await page.evaluate("(window.__events||[]).slice(0,50)")
    await ctx.close()
    return {"errors": errors, "events": events}


async def run_step(page, step, w2c):
    do = step["do"]
    if do == "wait":
        await page.wait_for_timeout(step.get("ms", 500))
    elif do == "key":
        key = KEYS.get(step["key"], step["key"])
        if step.get("ms", 0) > 0:
            await page.keyboard.down(key)
            await page.wait_for_timeout(step["ms"])
            await page.keyboard.up(key)
        else:
            await page.keyboard.press(key)
    elif do == "click_world":
        pt = await page.evaluate(f"(() => {{ const x = {step['x']}, y = {step['y']}; return ({w2c}); }})()")
        await page.mouse.click(pt["x"], pt["y"])
    elif do == "click_text":
        await page.get_by_text(step["text"], exact=False).first.click(timeout=3000)
    elif do == "click":
        await page.click(step["selector"], timeout=3000)
    elif do == "type":
        await page.fill(step["selector"], step["text"], timeout=3000)
        if step.get("enter"):
            await page.press(step["selector"], "Enter")
    elif do == "eval":
        await page.evaluate(f"(() => {{ {step['js']} }})()")
    elif do == "expect":
        ok = await page.evaluate(f"(() => {{ try {{ return !!({step['js']}); }} catch (e) {{ return 'ERR ' + e; }} }})()")
        return {"expect": step.get("desc", step["js"]), "ok": ok is True, "value": ok}
    return None


async def run_scenario(browser, sc, base, w2c, out, sem):
    async with sem:
        n = sc.get("players", 1)
        names = sc.get("names") or [f"P{i}" for i in range(n)]
        params = sc.get("url_params", "seed=42")
        ctxs, pages, errors = [], [], []
        tmp = Path(tempfile.mkdtemp())
        for i in range(n):
            ctx = await browser.new_context(viewport=VIEW, record_video_dir=str(tmp / str(i)), record_video_size=VIEW)
            page = await ctx.new_page()
            page.on("pageerror", lambda e, i=i: errors.append(f"p{i} pageerror: {e}"))
            page.on("console", lambda m, i=i: m.type == "error" and errors.append(f"p{i} {m.text}"))
            await page.goto(f"{base}?name={names[i]}&{params}")
            ctxs.append(ctx)
            pages.append(page)
            await page.wait_for_timeout(700)
        await pages[0].wait_for_timeout(1500)
        expects, step_errors = [], []
        for k, step in enumerate(sc["steps"]):
            page = pages[min(step.get("player", 0), n - 1)]
            try:
                r = await asyncio.wait_for(run_step(page, step, w2c), timeout=30)
                if r:
                    expects.append(r)
            except Exception as e:
                step_errors.append(f"step {k} {step.get('do')}: {str(e).splitlines()[0][:160]}")
        await pages[0].wait_for_timeout(800)
        events = [await p.evaluate("(window.__events||[]).slice(-80)") for p in pages]
        videos = []
        for i, (ctx, page) in enumerate(zip(ctxs, pages)):
            webm = await page.video.path()
            await ctx.close()
            mp4 = out / f"{sc['id']}_p{i}.mp4"
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", webm, "-c:v", "libx264",
                            "-pix_fmt", "yuv420p", "-crf", "30", "-preset", "veryfast", str(mp4)], check=True)
            videos.append(mp4.name)
        shutil.rmtree(tmp, ignore_errors=True)
        res = {"id": sc["id"], "rule_index": sc["rule_index"], "videos": videos, "errors": errors,
               "step_errors": step_errors, "expects": expects, "events": events}
        ok = sum(e["ok"] for e in expects)
        print(f"  {sc['id']:40} expects {ok}/{len(expects)}  step_err {len(step_errors)}  console_err {len(errors)}", flush=True)
        return res


async def main(scen_path, base, out_dir, only=None):
    plan = json.loads(Path(scen_path).read_text())
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    todo = [s for s in plan["scenarios"] if s["testable"] and (not only or s["id"] in only)]
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        sm = await smoke(browser, base, out)
        print(f"smoke: {len(sm['errors'])} console errors", flush=True)
        sem = asyncio.Semaphore(4)
        results = await asyncio.gather(*(run_scenario(browser, s, base, plan["world_to_client"], out, sem) for s in todo))
        await browser.close()
    (out / "play.json").write_text(json.dumps({"smoke": sm, "results": results}, indent=1))
    return {"smoke": sm, "results": results}


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:] or None))
