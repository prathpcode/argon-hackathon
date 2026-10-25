import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import type { Act, Agent, Footage, Revival, Round, RunState, RunSummary, Squad, StageId, StageState, Verify } from "./run-types";

/**
 * Revivals are run folders: pipeline/revive.py finds and watches the footage, then pi agents
 * (pipeline/agents/main.ts) build and playtest the game. This file reads them for the UI and starts,
 * stops and serves them. events.jsonl is the source of truth for what the agents did.
 */
export const RUNS = path.join(process.cwd(), "runs");
const PYTHON = path.join(process.cwd(), "pipeline", ".venv", "bin", "python");
const STAGES: StageId[] = ["find", "watch", "build", "playtest"];
const ACTS_KEPT = 80;

const read = <T,>(...p: string[]): T | null => {
  try {
    return JSON.parse(fs.readFileSync(path.join(RUNS, ...p), "utf8")) as T;
  } catch {
    return null;
  }
};

export const runDir = (id: string) => (/^[\w-]+$/.test(id) ? path.join(RUNS, id) : null);

function alive(id: string) {
  try {
    const pid = Number(fs.readFileSync(path.join(RUNS, id, "pid"), "utf8"));
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

type Event = { t: number; type: string; [k: string]: unknown };

function events(id: string): Event[] {
  try {
    return fs.readFileSync(path.join(RUNS, id, "events.jsonl"), "utf8").split("\n").filter(Boolean).flatMap((l) => {
      try {
        return [JSON.parse(l) as Event];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

/** Fold the event log into stages, agents (with what each did) and playtest rounds. */
function fold(id: string) {
  const evs = events(id);
  const stages = Object.fromEntries(STAGES.map((s) => [s, { status: "waiting" } as StageState])) as Record<StageId, StageState>;
  const agents = new Map<string, Agent>();
  const calls = new Map<string, Act>();
  const rounds = new Map<number, { status: Round["status"]; fun?: number; faithful?: number }>();
  let error: string | null = null, done = false, startedAt: number | null = null, endedAt: number | null = null, shot: string | null = null;
  for (const e of evs) {
    if (e.type === "start") {
      startedAt ??= e.t;
      error = null;
      done = false;
    } else if (e.type === "stage") {
      const s = stages[e.stage as StageId];
      if (!s) continue;
      s.status = e.status as StageState["status"];
      if (e.detail) s.detail = e.detail as string;
      if (e.status === "running") s.startedAt ??= e.t;
      else s.endedAt = e.t;
    } else if (e.type === "agent") {
      const { t, type, ...rest } = e;
      const prev = agents.get(e.id as string);
      if (!prev && !STAGES.includes(e.stage as StageId)) continue; // agents of the old one-shot pipeline
      if (prev) Object.assign(prev, rest, { updatedAt: t });
      else agents.set(e.id as string, { acts: [], actCount: 0, shot: null, startedAt: t, ...rest, updatedAt: t } as unknown as Agent);
    } else if (e.type === "act") {
      const a = agents.get(e.agent as string);
      if (!a) continue;
      a.updatedAt = e.t;
      if (e.img) a.shot = shot = e.img as string;
      const key = e.call ? `${e.agent}:${e.call}` : null;
      const prev = key ? calls.get(key) : undefined;
      if (prev) {
        Object.assign(prev, { status: e.status, detail: e.detail, img: e.img });
        continue;
      }
      const act: Act = { id: key ?? `${e.agent}:${a.actCount}`, t: e.t, kind: e.kind as Act["kind"], tool: e.tool as string, label: e.label as string, title: e.title as string, text: e.text as string, status: e.status as Act["status"], detail: e.detail as string, img: e.img as string, code: e.code as string };
      if (key) calls.set(key, act);
      a.acts.push(act);
      a.actCount++;
    } else if (e.type === "round") {
      const prev = rounds.get(e.round as number);
      rounds.set(e.round as number, { ...prev, status: e.status as Round["status"], ...(e.fun !== undefined ? { fun: e.fun as number, faithful: e.faithful as number } : {}) });
    } else if (e.type === "error") error = e.message as string;
    else if (e.type === "done") done = true;
    endedAt = e.t;
  }
  for (const a of agents.values()) {
    if (a.acts.length > ACTS_KEPT) a.acts = a.acts.slice(-ACTS_KEPT);
  }
  return { stages, agents: [...agents.values()], rounds, error, done, startedAt, endedAt, shot };
}

function status(id: string, f: ReturnType<typeof fold>): RunSummary["status"] {
  if (alive(id)) return "running";
  if (f.done) return "done";
  if (f.error) return "error";
  return f.startedAt ? "stopped" : "queued";
}

export function listRuns(): RunSummary[] {
  if (!fs.existsSync(RUNS)) return [];
  return fs.readdirSync(RUNS).filter((id) => fs.existsSync(path.join(RUNS, id, "revival.json"))).map((id) => summary(id, fold(id))!).filter(Boolean)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

function bestRound(id: string) {
  try {
    return Number(fs.readFileSync(path.join(RUNS, id, "rounds", "BEST"), "utf8").trim()) || null;
  } catch {
    return null;
  }
}

function summary(id: string, f: ReturnType<typeof fold>): RunSummary | null {
  const revival = read<Revival>(id, "revival.json");
  if (!revival) return null;
  const footage = read<Footage[]>(id, "footage.json") ?? [];
  const b = bestRound(id);
  const rep = b ? read<{ fun: number; faithful: number }>(id, "rounds", String(b), "report.json") : null;
  const stage = STAGES.findLast((s) => f.stages[s].status !== "waiting") ?? null;
  const build = read<{ by?: string; title: string }>(id, "build.json");
  return {
    id, revival, status: status(id, f), stage,
    best: rep && b ? { round: b, fun: rep.fun, faithful: rep.faithful } : null,
    footage: footage[0]?.url ?? revival.videos?.[0] ?? null,
    shot: f.shot,
    updatedAt: f.endedAt,
    title: build?.by === "pi" ? build.title : null,
  };
}

export function getRun(id: string): RunState | null {
  const f = fold(id);
  const s = summary(id, f);
  if (!s) return null;
  const spec = read<{ rules?: unknown[]; areas?: unknown[] }>(id, "spec.json");
  const rounds: Round[] = [...f.rounds.entries()].sort(([a], [b]) => a - b).map(([round, r]) => {
    const rep = read<Pick<Round, "reports" | "issues" | "fun" | "faithful">>(id, "rounds", String(round), "report.json");
    const verify = read<Verify>(id, "rounds", String(round), "verify.json");
    const squad = read<Squad>(id, "rounds", String(round), "squad.json");
    return { round, status: r.status, fun: rep?.fun ?? r.fun, faithful: rep?.faithful ?? r.faithful, reports: rep?.reports ?? [], issues: rep?.issues ?? [], verify, squad };
  });
  return {
    ...s,
    stages: f.stages,
    agents: f.agents,
    error: f.error,
    startedAt: f.startedAt,
    footageList: read<Footage[]>(id, "footage.json") ?? [],
    rules: spec?.rules?.length ?? 0,
    areas: spec?.areas?.length ?? 0,
    rounds,
    hasGame: !!gameDir(id),
  };
}

/** The game people play: the best playtested round's snapshot, else the builder's latest. */
function gameDir(id: string) {
  const b = bestRound(id);
  const built = read<{ by?: string }>(id, "build.json")?.by === "pi" ? path.join(RUNS, id, "game") : null;
  const dirs = [b ? path.join(RUNS, id, "rounds", String(b), "game") : null, built];
  return dirs.find((d) => d && fs.existsSync(path.join(d, "public", "index.html")) && fs.existsSync(path.join(d, "server.js"))) ?? null;
}

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "game";

export function createRun(revival: Revival) {
  fs.mkdirSync(RUNS, { recursive: true });
  let id = slug(revival.name);
  for (let n = 2; fs.existsSync(path.join(RUNS, id)); n++) id = `${slug(revival.name)}-${n}`;
  fs.mkdirSync(path.join(RUNS, id));
  fs.writeFileSync(path.join(RUNS, id, "revival.json"), JSON.stringify({ ...revival, createdAt: Date.now() }, null, 1));
  return id;
}

/** Start (or resume) the pipeline for a run, detached so it outlives a dev-server reload. */
export function startRun(id: string) {
  const dir = runDir(id);
  if (!dir || alive(id)) return;
  const out = fs.openSync(path.join(dir, "log.txt"), "a");
  const child = spawn(PYTHON, [path.join(process.cwd(), "pipeline", "revive.py"), dir], {
    cwd: path.join(process.cwd(), "pipeline"),
    detached: true,
    stdio: ["ignore", out, out],
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  fs.writeFileSync(path.join(dir, "pid"), String(child.pid));
  child.unref();
}

export function stopRun(id: string) {
  const dir = runDir(id);
  if (!dir) return;
  try {
    const pid = Number(fs.readFileSync(path.join(dir, "pid"), "utf8"));
    process.kill(-pid, "SIGTERM");
  } catch {}
  fs.rmSync(path.join(dir, "pid"), { force: true });
}

// ---------------------------------------------------------------- playing a revival

const g = globalThis as unknown as { __argonGames?: Map<string, { port: number; proc: ChildProcess }> };
const games = (g.__argonGames ??= new Map());

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });

/** Start the best build's own server (it serves the client and the multiplayer socket) and return its port. */
export async function playRun(id: string) {
  const dir = runDir(id);
  if (!dir) return null;
  const running = games.get(id);
  if (running && running.proc.exitCode === null) return running.port;
  const game = gameDir(id);
  if (!game) return null;
  const port = await freePort();
  const proc = spawn("node", ["server.js"], { cwd: game, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  games.set(id, { port, proc });
  for (let i = 0; i < 50; i++) {
    const ok = await fetch(`http://127.0.0.1:${port}/`).then((r) => r.ok, () => false);
    if (ok) return port;
    await new Promise((r) => setTimeout(r, 200));
  }
  return port;
}
