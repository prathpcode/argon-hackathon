import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { chromium, type Browser, type BrowserContext, type CDPSession, type Page } from "playwright";
import { Type } from "typebox";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { Run } from "./run";

/**
 * Real play: the game's own server plus a browser with up to three players, driven by an agent through tools.
 * Every screenshot is saved under shots/<agent>/ and logged, so the UI shows what each agent sees. While the game
 * is open, each player's page is also screencast to live/<agent>.p<n>.jpg a few times a second, so the UI can show
 * the play as it happens, and so a look never waits on a fresh screenshot (slow when many pages render in software).
 */

const exec = promisify(execFile);
const VIEW = { width: 1280, height: 720 };
const KEY: Record<string, string> = { space: " ", spacebar: " ", " ": " ", esc: "Escape", enter: "Enter", return: "Enter", up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight", shift: "Shift", ctrl: "Control", tab: "Tab" };
const key = (k: string) => KEY[k.toLowerCase()] ?? (k.length === 1 ? k.toLowerCase() : k);

let shared: Promise<Browser> | null = null;
const browser = () => (shared ??= chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] }));
export async function closeBrowser() {
  if (shared) await (await shared).close().catch(() => {});
  shared = null;
}

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });

// Runs in the page. A plain string: tsx's helpers don't exist there.
const OBSERVE = `(from) => {
  const seen = new WeakSet();
  const json = (v, n) => {
    try {
      const s = JSON.stringify(v, (_k, x) => {
        if (typeof x === "number") return Math.round(x * 100) / 100;
        if (typeof x === "function") return undefined;
        if (x && typeof x === "object") {
          if (seen.has(x)) return undefined;
          seen.add(x);
          if (Array.isArray(x) && x.length > 12) return [...x.slice(0, 12), "…" + (x.length - 12) + " more"];
        }
        return x;
      });
      return s && s.length > n ? s.slice(0, n) + "…" : s;
    } catch (e) { return String(e); }
  };
  const ev = Array.isArray(window.__events) ? window.__events : [];
  return { state: json(window.State, 900), events: ev.slice(from).slice(-25).map((e) => json(e, 160)), count: ev.length };
}`;

const INSPECT = `(js) => {
  try {
    const v = (0, eval)(js);
    const s = JSON.stringify(v, (_k, x) => (typeof x === "function" ? undefined : x));
    return s === undefined ? "undefined" : s.slice(0, 3000);
  } catch (e) { return "Error: " + e.message; }
}`;

const text = (t: string, details: Record<string, unknown> = {}) => ({ content: [{ type: "text" as const, text: t }], details });

/** One page's screencast: keeps the latest frame and writes it to `file` at most every 250ms (atomically). */
class Cast {
  private last: { buf: Buffer; at: number } | null = null;
  private written = 0;
  private timer: NodeJS.Timeout | null = null;

  private constructor(private cdp: CDPSession | null, readonly file: string) {}

  static async start(page: Page, file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const cdp = await page.context().newCDPSession(page).catch(() => null);
    const cast = new Cast(cdp, file);
    if (!cdp) return cast;
    cdp.on("Page.screencastFrame", (f: any) => {
      cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
      cast.last = { buf: Buffer.from(f.data, "base64"), at: Date.now() };
      if (!cast.timer) cast.timer = setTimeout(() => cast.flush(), Math.max(0, 250 - (Date.now() - cast.written)));
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 55, maxWidth: 960, maxHeight: 540, everyNthFrame: 2 }).catch(() => {});
    return cast;
  }

  private flush() {
    this.timer = null;
    if (!this.last) return;
    this.written = Date.now();
    const tmp = `${this.file}.tmp`;
    try {
      fs.writeFileSync(tmp, this.last.buf);
      fs.renameSync(tmp, this.file);
    } catch {}
  }

  /** The latest frame if it is newer than maxAge ms. */
  frame(maxAge: number) {
    return this.last && Date.now() - this.last.at <= maxAge ? this.last.buf : undefined;
  }

  async stop() {
    if (this.timer) clearTimeout(this.timer);
    await this.cdp?.send("Page.stopScreencast").catch(() => {});
    await this.cdp?.detach().catch(() => {});
  }
}

export class Playtest {
  private proc: ChildProcess | null = null;
  private serverLog = "";
  private port = 0;
  private contexts: BrowserContext[] = [];
  private pages: Page[] = [];
  private errors: string[][] = [];
  private seen: number[] = [];
  private casts: Cast[] = [];
  private shot = 0;
  private readonly shotDir: string;
  room = "";
  last: string | null = null;

  constructor(private run: Run, readonly gameDir: string, private agentId: string, private record = false) {
    this.shotDir = run.path("shots", agentId.replace(/[^\w-]+/g, "_"));
    fs.mkdirSync(this.shotDir, { recursive: true });
  }

  private async startServer() {
    this.stopServer();
    this.port = await freePort();
    this.serverLog = "";
    const proc = spawn("node", ["server.js"], { cwd: this.gameDir, env: { ...process.env, PORT: String(this.port) }, stdio: ["ignore", "pipe", "pipe"] });
    proc.stdout!.on("data", (d) => (this.serverLog = (this.serverLog + d).slice(-3000)));
    proc.stderr!.on("data", (d) => (this.serverLog = (this.serverLog + d).slice(-3000)));
    this.proc = proc;
    for (let i = 0; i < 50; i++) {
      if (proc.exitCode !== null) break;
      if (await fetch(`http://127.0.0.1:${this.port}/`).then((r) => r.ok, () => false)) return;
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(`The game's server did not start.${this.serverLog ? `\n${this.serverLog.slice(-1200)}` : ""}`);
  }

  private stopServer() {
    if (this.proc && this.proc.exitCode === null) this.proc.kill();
    this.proc = null;
  }

  async open(players = 1) {
    await this.closePages();
    await this.startServer();
    const b = await browser();
    this.room = `t${Date.now().toString(36)}`;
    for (let i = 0; i < Math.max(1, Math.min(3, players)); i++) {
      const ctx = await b.newContext({ viewport: VIEW, ...(this.record ? { recordVideo: { dir: path.join(this.shotDir, "video"), size: { width: 640, height: 360 } } } : {}) });
      const page = await ctx.newPage();
      const errs: string[] = [];
      page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
      page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
      await page.goto(`http://127.0.0.1:${this.port}/?name=Player${i + 1}&room=${this.room}&seed=42`, { waitUntil: "load", timeout: 15000 }).catch((e) => errs.push(`load: ${e.message}`));
      this.contexts.push(ctx);
      this.pages.push(page);
      this.errors.push(errs);
      this.seen.push(0);
      this.casts.push(await Cast.start(page, this.run.path("live", `${this.agentId.replace(/[^\w-]+/g, "_")}.p${i}.jpg`)));
      await page.waitForTimeout(400);
    }
    this.run.emit("agent", { id: this.agentId, live: this.casts.map((c) => this.run.rel(c.file)) });
    await this.pages[0].waitForTimeout(1200);
  }

  private async closePages() {
    if (this.casts.length) this.run.emit("agent", { id: this.agentId, live: [] });
    for (const c of this.casts) await c.stop();
    this.casts = [];
    for (const c of this.contexts) await c.close().catch(() => {});
    this.contexts = [];
    this.pages = [];
    this.errors = [];
    this.seen = [];
  }

  async close() {
    await this.closePages();
    this.stopServer();
  }

  private page(player = 0) {
    const p = this.pages[player];
    if (!p) throw new Error(this.pages.length ? `There are only ${this.pages.length} players (0-${this.pages.length - 1}).` : "Open the game first with open_game.");
    return p;
  }

  /** Screenshot + what changed: new __events, console errors, a compact window.State. */
  async observe(player = 0, note = "") {
    const page = this.page(player);
    const file = path.join(this.shotDir, `${String(++this.shot).padStart(3, "0")}.jpg`);
    // A fresh screenshot when the page can draw one quickly; else the screencast's latest frame.
    const recent = this.casts[player]?.frame(1500);
    const buf = (await page.screenshot({ type: "jpeg", quality: 62, timeout: recent ? 4000 : 12000 }).catch(() => null)) ?? this.casts[player]?.frame(Infinity);
    if (!buf) throw new Error("The page did not draw a frame. It may be stuck in a loop; read window.State or the console errors.");
    fs.writeFileSync(file, buf);
    this.last = file;
    const info = await page
      .evaluate<{ state: string; events: string[]; count: number }>(`(${OBSERVE})(${this.seen[player]})`)
      .catch((e) => ({ state: `unreadable: ${e.message}`, events: [] as string[], count: this.seen[player] }));
    this.seen[player] = info.count;
    const errs = this.errors[player].splice(0);
    const lines = [
      note,
      `Player ${player} of ${this.pages.length}.`,
      info.events.length ? `New __events: ${info.events.join(" ")}` : "No new __events.",
      `window.State: ${info.state ?? "missing"}`,
      errs.length ? `CONSOLE ERRORS: ${errs.slice(0, 6).join(" | ").slice(0, 1200)}` : "",
    ].filter(Boolean);
    return {
      content: [{ type: "text" as const, text: lines.join("\n") }, { type: "image" as const, data: buf.toString("base64"), mimeType: "image/jpeg" }],
      details: { img: this.run.rel(file), summary: errs.length ? `${errs.length} console error${errs.length === 1 ? "" : "s"}` : info.events.length ? `${info.events.length} events` : undefined, failed: errs.length > 0, errors: errs },
    };
  }

  /** The builder's gate: syntax, server start, page load, a little input, no console errors, the test contract present. */
  async check() {
    const problems: string[] = [];
    const files = [path.join(this.gameDir, "server.js"), ...listJs(path.join(this.gameDir, "public"))];
    for (const f of files) {
      await exec(process.execPath, ["--check", f], { timeout: 10000 }).catch((e) => problems.push(`Syntax error in ${path.relative(this.gameDir, f)}:\n${String(e.stderr || e.message).slice(0, 800)}`));
    }
    if (!fs.existsSync(path.join(this.gameDir, "public", "index.html"))) problems.push("public/index.html is missing.");
    if (problems.length) return { problems, result: null };
    try {
      await this.open(2);
      const p = this.page(0);
      await p.mouse.click(VIEW.width / 2, VIEW.height / 2);
      for (const k of ["Enter", " ", "ArrowRight", "ArrowLeft", "ArrowUp", "d", "a", "w"]) {
        await p.keyboard.down(k);
        await p.waitForTimeout(140);
        await p.keyboard.up(k);
      }
      await p.waitForTimeout(800);
      const contract = await p.evaluate(() => ({ state: typeof (window as any).State === "object" && (window as any).State !== null, events: Array.isArray((window as any).__events), canvas: !!document.querySelector("canvas") }));
      if (!contract.state) problems.push("window.State is missing (see KIT.md).");
      if (!contract.events) problems.push("window.__events is missing (see KIT.md).");
      const others = this.errors[1].splice(0);
      const result = await this.observe(0, "Player 1 after clicking and pressing a few keys:");
      problems.push(...((result.details.errors as string[]) ?? []).map((e) => `Console error: ${e.slice(0, 400)}`), ...others.map((e) => `Console error (player 2): ${e.slice(0, 400)}`));
      if (this.proc?.exitCode !== null) problems.push(`The server crashed:\n${this.serverLog.slice(-1000)}`);
      return { problems, result };
    } catch (e: any) {
      problems.push(String(e.message ?? e).slice(0, 1200));
      return { problems, result: null };
    } finally {
      await this.close();
    }
  }

  tools(): ToolDefinition<any, any>[] {
    return [
      {
        name: "open_game",
        executionMode: "sequential",
        label: "Open the game",
        description: "Start the game's server and open it in a real browser with 1-3 players in the same room (fresh page load). Returns player 0's screen. Call again to restart after code changes.",
        promptSnippet: "open_game: start the game in a browser with 1-3 players",
        parameters: Type.Object({ players: Type.Optional(Type.Number({ minimum: 1, maximum: 3 })) }),
        execute: async (_id, p: { players?: number }) => {
          await this.open(p.players ?? 1);
          return this.observe(0, `Opened with ${this.pages.length} player${this.pages.length === 1 ? "" : "s"} (room ${this.room}).`);
        },
      },
      {
        name: "input",
        executionMode: "sequential",
        label: "Play",
        description:
          "Send real keyboard/mouse input to one player, in order, then return that player's screen. Steps: {do:'hold', keys:['ArrowRight','Space'], ms:800} holds keys together; {do:'tap', keys:['Space']}; {do:'click', x, y} in page pixels (1280x720); {do:'type', text, enter}; {do:'wait', ms}. The game keeps running between your calls, so batch a few seconds of play per call.",
        promptSnippet: "input: play the game with real key holds, taps, clicks and typing",
        parameters: Type.Object({
          steps: Type.Array(
            Type.Object({
              do: Type.String({ description: "hold | tap | click | type | wait" }),
              keys: Type.Optional(Type.Array(Type.String())),
              ms: Type.Optional(Type.Number()),
              x: Type.Optional(Type.Number()),
              y: Type.Optional(Type.Number()),
              text: Type.Optional(Type.String()),
              enter: Type.Optional(Type.Boolean()),
            }),
          ),
          player: Type.Optional(Type.Number()),
        }),
        execute: async (_id, p: { steps: any[]; player?: number }) => {
          const page = this.page(p.player ?? 0);
          for (const s of p.steps.slice(0, 30)) {
            const keys = (s.keys ?? []).map(key);
            if (s.do === "hold" || s.do === "tap") {
              for (const k of keys) await page.keyboard.down(k);
              await page.waitForTimeout(s.do === "tap" ? 60 : Math.min(s.ms ?? 300, 8000));
              for (const k of [...keys].reverse()) await page.keyboard.up(k);
            } else if (s.do === "click") await page.mouse.click(s.x ?? 640, s.y ?? 360);
            else if (s.do === "type") {
              await page.keyboard.type(String(s.text ?? ""), { delay: 20 });
              if (s.enter) await page.keyboard.press("Enter");
            } else if (s.do === "wait") await page.waitForTimeout(Math.min(s.ms ?? 300, 8000));
          }
          return this.observe(p.player ?? 0);
        },
      },
      {
        name: "look",
        executionMode: "sequential",
        label: "Look",
        description: "Return a player's screen now, with new __events, window.State and console errors.",
        parameters: Type.Object({ player: Type.Optional(Type.Number()) }),
        execute: async (_id, p: { player?: number }) => this.observe(p.player ?? 0),
      },
      {
        name: "inspect",
        executionMode: "sequential",
        label: "Inspect",
        description: "Evaluate a JS expression in a player's page and return the JSON result (read game state, or set up a situation to test; never use it to fake what you are judging).",
        parameters: Type.Object({ js: Type.String(), player: Type.Optional(Type.Number()) }),
        execute: async (_id, p: { js: string; player?: number }) => {
          const out = await this.page(p.player ?? 0)
            .evaluate<string>(`(${INSPECT})(${JSON.stringify(p.js)})`)
            .catch((e) => `Error: ${e.message}`);
          return text(out, { summary: clip(p.js, 60) });
        },
      },
    ];
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function listJs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? listJs(path.join(dir, d.name)) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : []));
}
