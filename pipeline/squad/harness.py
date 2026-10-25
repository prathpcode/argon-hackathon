"""Play harness that lives in the Managed Agent playtesters' sandbox. Works with any game built on the Argon
kit (window.State, window.__events, ?name= ?room= ?seed=).

An agent writes bot.py with `async def run(api)` and runs:
  python3 /workspace/squad/harness.py --url URL --name NAME --bot bot.py --seconds 75 --start-at EPOCH
Everything lands in /workspace/out/NAME/: session.mp4, shots/*.png, result.json.
"""
import argparse
import asyncio
import importlib.util
import json
import shutil
import subprocess
import time
from pathlib import Path

from playwright.async_api import async_playwright

LOOK = """() => { try {
  const seen = new WeakSet();
  const trim = (v, d) => {
    if (v === null || typeof v !== "object") return typeof v === "number" ? Math.round(v * 100) / 100 : v;
    if (seen.has(v) || d > 2) return Array.isArray(v) ? `[${v.length}]` : "{..}";
    seen.add(v);
    if (Array.isArray(v)) return v.slice(0, 12).map(x => trim(x, d + 1));
    const o = {}; for (const k of Object.keys(v).slice(0, 30)) { if (typeof v[k] !== "function") o[k] = trim(v[k], d + 1); } return o;
  };
  return {state: trim(window.State || {}, 0), recent: (window.__events || []).slice(-10),
          canvas: [...document.querySelectorAll("canvas")].map(c => c.getBoundingClientRect()).map(r => [r.x, r.y, r.width, r.height])[0] || null};
} catch (e) { return {error: String(e)}; } }"""

W2C = """(x, y) => { const c = document.getElementById('game-canvas'); const r = c.getBoundingClientRect();
  return {x: r.left + (x - State.camera.x) * (r.width / c.width), y: r.top + (y - State.camera.y) * (r.height / c.height)}; }"""


class Api:
    def __init__(self, page, out, t0):
        self.page, self.out, self.t0, self.notes = page, out, t0, []

    def elapsed(self):
        return round(time.time() - self.t0, 1)

    async def wait(self, ms):
        await self.page.wait_for_timeout(ms)

    async def key(self, key, ms=0):
        key = {"Space": " ", "space": " "}.get(key, key)
        if ms > 0:
            await self.page.keyboard.down(key)
            await self.page.wait_for_timeout(ms)
            await self.page.keyboard.up(key)
        else:
            await self.page.keyboard.press(key)

    async def click(self, x, y):
        await self.page.mouse.click(x, y)

    async def type(self, text):
        await self.page.keyboard.type(text)

    async def click_world(self, x, y):
        pt = await self.page.evaluate(f"({W2C})({x}, {y})")
        await self.page.mouse.click(pt["x"], pt["y"])

    async def click_text(self, text):
        try:
            await self.page.get_by_text(text, exact=False).first.click(timeout=2000)
            return True
        except Exception:
            return False

    async def chat(self, text):
        """Best effort: the first text input on the page, then Enter."""
        box = self.page.locator("input[type=text], textarea").first
        await box.fill(text, timeout=2000)
        await box.press("Enter")

    async def look(self):
        return await self.page.evaluate(LOOK)

    async def shot(self, label=""):
        p = self.out / "shots" / f"{self.elapsed():06.1f}{('_' + label) if label else ''}.png"
        await self.page.screenshot(path=str(p))
        return str(p)

    def note(self, finding, severity="medium"):
        """Record something that looks wrong, with the time it happened."""
        self.notes.append({"t": self.elapsed(), "severity": severity, "finding": finding})


async def main(a):
    out = Path(a.out_root) / a.name
    shutil.rmtree(out, ignore_errors=True)
    (out / "shots").mkdir(parents=True)
    spec = importlib.util.spec_from_file_location("bot", a.bot)
    bot = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bot)
    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 960, "height": 540}, record_video_dir=str(out / "raw"),
                                        record_video_size={"width": 960, "height": 540})
        page = await ctx.new_page()
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        await page.goto(f"{a.url}?name={a.name}&room={a.room}&seed={a.seed}", wait_until="load")
        await page.wait_for_timeout(2000)
        if a.start_at:  # everyone starts together so the squad shares one match
            await page.wait_for_timeout(max(0, (a.start_at - time.time()) * 1000))
        api = Api(page, out, time.time())
        frames0 = await page.evaluate("window.__frames = 0, requestAnimationFrame(function f(){window.__frames++; requestAnimationFrame(f)}), 0")

        async def shots():
            while True:
                await asyncio.sleep(10)
                await api.shot()

        ticker = asyncio.create_task(shots())
        try:
            await asyncio.wait_for(bot.run(api), timeout=a.seconds)
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            api.note(f"bot crashed: {e!r}", "bot")
        ticker.cancel()
        await api.shot("final")
        fps = (await page.evaluate("window.__frames")) / max(api.elapsed(), 1)
        result = {"name": a.name, "persona": a.persona, "seconds": api.elapsed(), "fps": round(fps, 1),
                  "notes": api.notes, "errors": errors[:30], "final": await api.look(),
                  "events": await page.evaluate("(window.__events||[]).slice(-150)")}
        webm = await page.video.path()
        await ctx.close()
        await browser.close()
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    "-crf", "30", "-preset", "veryfast", str(out / "session.mp4")], check=False)
    (out / "result.json").write_text(json.dumps(result, indent=1))
    print(json.dumps({k: result[k] for k in ("name", "seconds", "fps", "notes", "errors")}, indent=1))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--bot", required=True)
    ap.add_argument("--persona", default="")
    ap.add_argument("--seconds", type=float, default=75)
    ap.add_argument("--start-at", type=float, default=0)
    ap.add_argument("--seed", default="42")
    ap.add_argument("--room", default="squad")
    ap.add_argument("--out-root", default="/workspace/out")
    asyncio.run(main(ap.parse_args()))
