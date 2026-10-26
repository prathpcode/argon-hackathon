/**
 * The agent half of a revival, after the footage is found and watched (pipeline/revive.py runs this):
 *   build:     a pi builder agent writes the game from SPEC.md, playing it as it goes.
 *   playtest:  each round, three pi playtesters play a snapshot for real in a browser (fun, fidelity,
 *              multiplayer) and report; the builder fixes what they found; repeat. The best round is kept.
 * Each step is skipped when its output exists, so a stopped run resumes where it left off.
 *
 * usage: tsx pipeline/agents/main.ts runs/<id>
 */
import fs from "node:fs";
import path from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { Type } from "typebox";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import { Run } from "./run";
import { runAgent } from "./pi";
import { closeBrowser, Playtest } from "./browser";
import { footageTool } from "./footage";
import { builderPrompt, builderSystem, fixerPrompt, specMarkdown, TESTERS, testerPrompt, testerSystem } from "./prompts";

const ROUNDS = Number(process.env.ARGON_ROUNDS || 3);
const KIT = path.join(import.meta.dirname, "..", "kit");
const DOCS = new Set(["SPEC.md", "KIT.md", "PLAYTEST.md"]);

type Issue = { severity: "high" | "medium" | "low"; kind: string; title: string; detail: string; evidence?: string; by?: string };
type Report = { tester: string; fun: number; fidelity: number; summary: string; issues: Issue[]; best: string[] };
type Verify = { round: number; matched: number; total: number; lost: string[]; rules: { id: string; rule: string; pass: boolean; original: { video: string; start: number; end: number }; original_url: string; original_shows: string; rebuild_shows: string; difference: string; fix: string }[] };

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PYTHON = path.join(ROOT, "pipeline", ".venv", "bin", "python");
const exec = promisify(execFile);

/** The footage check (pipeline/verify.py): every footage rule played and judged against its moment in the
 *  original. Runs beside the playtesters on the same snapshot; a failure here never fails the round. */
async function verifyRound(run: Run, round: number, game: string): Promise<Verify | null> {
  try {
    await exec(PYTHON, [path.join(ROOT, "pipeline", "verify.py"), run.dir, String(round), game],
      { cwd: path.join(ROOT, "pipeline"), timeout: 40 * 60_000, maxBuffer: 16 << 20 });
    return run.readJson("rounds", String(round), "verify.json");
  } catch (e: any) {
    run.emit("error", { stage: "playtest", message: clip(`Footage check, round ${round}: ${String(e?.message ?? e)}`, 300) });
    return null;
  }
}

/** Managed Agents can play when the agent is set up for this API key (pipeline/squad/setup.py) and cloudflared
 *  is installed. ARGON_SQUAD=0 turns them off. */
function squadReady(): boolean {
  if (process.env.ARGON_SQUAD === "0" || !fs.existsSync(path.join(ROOT, "pipeline", "squad", "agent.json"))) return false;
  try {
    return spawnSync("cloudflared", ["--version"], { stdio: "ignore" }).status === 0;
  } catch {
    return false;
  }
}

/** Who playtests a round. Fidelity is the footage check's job (rule by rule against the original, not opinion);
 *  multiplayer is the Managed Agent squad's, playing over the real internet. The local multiplayer tester only
 *  stands in when the squad can't run on this machine. The fun tester always plays. */
function roundTesters() {
  const squad = squadReady();
  return TESTERS.filter((t) => t.key === "fun" || (t.key === "together" && !squad));
}

/** Managed Agents play the round's snapshot together over the internet through a temporary tunnel
 *  (pipeline/squad/run.py). Their findings join the round's issues. */
async function squadRound(run: Run, round: number, game: string): Promise<Issue[]> {
  if (!squadReady()) return [];
  try {
    await exec(PYTHON, [path.join(ROOT, "pipeline", "squad", "run.py"), run.dir, String(round), game],
      { cwd: path.join(ROOT, "pipeline"), timeout: 30 * 60_000, maxBuffer: 16 << 20 });
    const sq = run.readJson("rounds", String(round), "squad.json");
    return Object.entries(sq?.agents ?? {}).flatMap(([name, a]: [string, any]) => (a.findings ?? []).map((f: any) => ({
      severity: (["high", "medium", "low"].includes(f.severity) ? f.severity : "medium") as Issue["severity"],
      kind: "squad", title: clip(String(f.finding ?? ""), 110), detail: `${f.finding} Repro: ${f.repro ?? ""}`,
      evidence: `${name}, Managed Agent, ${f.t ?? "?"}s into the match`, by: "squad",
    })));
  } catch (e: any) {
    run.emit("error", { stage: "playtest", message: clip(`Managed Agent squad, round ${round}: ${String(e?.message ?? e)}`, 300) });
    return [];
  }
}

/** Rules the footage check failed become the most important issues for the builder, regressions first. */
function footageIssues(v: Verify | null): Issue[] {
  if (!v) return [];
  return v.rules.filter((r) => !r.pass).map((r) => ({
    severity: "high" as const,
    kind: v.lost.includes(r.id) ? "regression" : "fidelity",
    title: `${v.lost.includes(r.id) ? "Regression: " : ""}${clip(r.rule, 110)}`,
    detail: `Original (${r.original.video} ${r.original.start}-${r.original.end}s): ${r.original_shows} | Rebuild: ${r.rebuild_shows} | ${r.difference}${r.fix ? ` | Fix: ${r.fix}` : ""}`,
    evidence: r.original_url,
    by: "footage",
  })).sort((a, b) => (a.kind === "regression" ? 0 : 1) - (b.kind === "regression" ? 0 : 1));
}

const ARROWS: Record<string, string> = { ArrowRight: "→", ArrowLeft: "←", ArrowUp: "↑", ArrowDown: "↓", " ": "Space", Space: "Space" };
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function label(tool: string, a: any): string {
  const file = typeof a?.path === "string" ? a.path.replace(/^\.\//, "") : "";
  switch (tool) {
    case "read": return file === "SPEC.md" ? "Reading the footage notes" : file === "PLAYTEST.md" ? "Reading the playtest reports" : `Reading ${file}`;
    case "write": return `Writing ${file}`;
    case "edit": return `Editing ${file}`;
    case "ls": case "find": case "grep": return "Looking through the files";
    case "check_game": return "Checking the game";
    case "open_game": return a?.players > 1 ? `Opening the game with ${a.players} players` : "Opening the game";
    case "look": return "Looking at the screen";
    case "inspect": return "Reading the game state";
    case "ask_footage": return `Asking the footage: ${clip(String(a?.question ?? "").replace(/\s+/g, " "), 90)}`;
    case "report": return "Writing the report";
    case "input": {
      const steps: any[] = Array.isArray(a?.steps) ? a.steps : [];
      const parts = steps.slice(0, 4).map((s) => {
        const keys = (s.keys ?? []).map((k: string) => ARROWS[k] ?? k).join("+");
        if (s.do === "hold") return `${keys} ${((s.ms ?? 300) / 1000).toFixed(1)}s`;
        if (s.do === "tap") return keys;
        if (s.do === "click") return "click";
        if (s.do === "type") return `“${clip(String(s.text ?? ""), 24)}”`;
        return null;
      }).filter(Boolean);
      return `${a?.player ? `Player ${a.player + 1}: ` : ""}${parts.join(", ") || "Waiting"}${steps.length > 4 ? "…" : ""}`;
    }
    default: return tool;
  }
}

function setUpWorkspace(run: Run) {
  // Runs from the one-shot pipeline keep their old outputs under legacy/.
  if (run.exists("build.json") && run.readJson("build.json").by !== "pi") {
    fs.mkdirSync(run.path("legacy"), { recursive: true });
    for (const f of ["game", "loop", "scenarios.json", "build.json", "rebuild_raw.txt"]) if (run.exists(f)) fs.renameSync(run.path(f), run.path("legacy", f));
  }
  const game = run.path("game");
  fs.mkdirSync(path.join(game, "public"), { recursive: true });
  for (const f of ["server.js", "public/net.js"]) if (!fs.existsSync(path.join(game, f))) fs.copyFileSync(path.join(KIT, f), path.join(game, f));
  fs.copyFileSync(path.join(KIT, "KIT.md"), path.join(game, "KIT.md"));
  fs.writeFileSync(path.join(game, "SPEC.md"), specMarkdown(run.revival.name, run.readJson("spec.json")));
  return game;
}

/** check_game plus the play tools, for the builder working on its own game. */
function builderTools(run: Run, id: string, game: string) {
  const pt = new Playtest(run, game, id);
  const check: ToolDefinition<any, any> = {
    name: "check_game",
    label: "Check the game",
    description: "Syntax-check every file, start the server, load the game with two players, press a few keys, and report console errors, a missing test contract or a crashed server. Returns player 1's screen. Must pass before you finish.",
    promptSnippet: "check_game: the gate; run after every meaningful change",
    parameters: Type.Object({}),
    execute: async () => {
      const { problems, result } = await pt.check();
      const head = problems.length ? `FAILED\n- ${problems.join("\n- ")}` : "PASSED";
      if (!result) return { content: [{ type: "text" as const, text: head }], details: { summary: problems[0]?.slice(0, 200), failed: true } };
      return { content: [{ type: "text" as const, text: head }, ...result.content], details: { img: result.details.img, summary: problems.length ? `${problems.length} problem${problems.length === 1 ? "" : "s"}` : "Passed", failed: problems.length > 0 } };
    },
  };
  return { pt, tools: [check, ...pt.tools(), footageTool(run, () => pt.last)] };
}

async function builderGate(pt: Playtest, game: string) {
  if (!fs.existsSync(path.join(game, "PLAN.md"))) return "Write PLAN.md first, then build the game.";
  const { problems } = await pt.check();
  return problems.length ? `check_game fails. Fix these, play to confirm, then run check_game:\n- ${problems.join("\n- ")}` : null;
}

async function build(run: Run) {
  const game = setUpWorkspace(run);
  const id = "builder";
  const { pt, tools } = builderTools(run, id, game);
  try {
    const summary = await runAgent(run, {
      id, stage: "build", role: "builder", name: "Builder",
      brief: `Writing the revival of ${run.revival.name} from the footage notes, playing it as it goes.`,
      cwd: game, system: builderSystem(run.revival.name), prompt: builderPrompt(run.revival.name),
      tools: ["read", "write", "edit", "ls", "grep", "find"], custom: tools,
      readOnly: (rel) => DOCS.has(rel), check: () => builderGate(pt, game), maxFollowUps: 3,
    }, label);
    const title = /<title>(.*?)<\/title>/s.exec(fs.readFileSync(path.join(game, "public", "index.html"), "utf8"))?.[1]?.trim() ?? null;
    run.writeJson({ by: "pi", title, summary, at: Date.now() }, "build.json");
    return title ? `Built “${title}”` : "Built";
  } finally {
    await pt.close();
  }
}

async function playtester(run: Run, round: number, t: (typeof TESTERS)[number], dir: string): Promise<Report | null> {
  const id = `test:${round}:${t.key}`;
  const pt = new Playtest(run, dir, id, true);
  let report: Report | null = null;
  const reportTool: ToolDefinition<any, any> = {
    name: "report",
    label: "Report",
    description: "Submit your playtest report. Call once, when you have played enough.",
    parameters: Type.Object({
      fun: Type.Number({ minimum: 1, maximum: 10 }),
      fidelity: Type.Number({ minimum: 1, maximum: 10 }),
      summary: Type.String(),
      issues: Type.Array(Type.Object({ severity: Type.String({ description: "high | medium | low" }), kind: Type.String({ description: "bug | fun | fidelity | multiplayer" }), title: Type.String(), detail: Type.String(), evidence: Type.Optional(Type.String()) })),
      best: Type.Array(Type.String()),
    }),
    execute: async (_id, p: any) => {
      report = { tester: t.key, fun: p.fun, fidelity: p.fidelity, summary: p.summary, best: p.best ?? [], issues: (p.issues ?? []).map((i: Issue) => ({ ...i, by: t.key })) };
      return { content: [{ type: "text" as const, text: "Report received. You're done." }], details: { summary: `Fun ${p.fun} · Fidelity ${p.fidelity} · ${p.issues?.length ?? 0} issues` } };
    },
  };
  try {
    await runAgent(run, {
      id, stage: "playtest", role: "tester", name: t.name, brief: t.brief, round, focus: t.key,
      cwd: dir, system: testerSystem(run.revival.name, t.focus), prompt: testerPrompt(),
      tools: ["read", "ls", "grep"], custom: [...pt.tools(), footageTool(run, () => pt.last), reportTool],
      readOnly: () => true, check: async () => (report ? null : "Call report now with what you found."), maxFollowUps: 2,
    }, label);
  } catch (e) {
    console.error(`${t.name} failed:`, e);
  } finally {
    await pt.close();
    const videos = path.join(run.path("shots", id.replace(/[^\w-]+/g, "_")), "video");
    if (fs.existsSync(videos)) run.emit("agent", { id, videos: fs.readdirSync(videos).filter((f) => f.endsWith(".webm")).map((f) => run.rel(path.join(videos, f))) });
  }
  return report;
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0);
const ORDER = { high: 0, medium: 1, low: 2 } as Record<string, number>;

function playtestMarkdown(round: number, reports: Report[], verify: Verify | null = null, extra: Issue[] = []) {
  const lines = [`# Playtest round ${round}`, ""];
  if (verify) {
    lines.push(`## Footage check: ${verify.matched}/${verify.total} rules match the original`, "",
      "Each rule was played in your game and compared with its moment in the original footage. Fix these first,",
      "regressions (rules that matched last round) before anything else. Use ask_footage with the clip to see the original.", "");
    footageIssues(verify).forEach((i, n) => lines.push(`${n + 1}. [${i.kind}] ${i.title}: ${i.detail} (${i.evidence})`));
    lines.push("");
  }
  for (const r of reports) {
    lines.push(`## ${TESTERS.find((t) => t.key === r.tester)?.name}: fun ${r.fun}/10, fidelity ${r.fidelity}/10`, "", r.summary, "");
    if (r.best.length) lines.push("Keep:", ...r.best.map((b) => `- ${b}`), "");
  }
  lines.push("## Issues, most severe first", "");
  [...reports.flatMap((r) => r.issues), ...extra].sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3)).forEach((i, n) => {
    lines.push(`${n + 1}. [${i.severity}, ${i.kind}] ${i.title}: ${i.detail}${i.evidence ? ` (evidence: ${i.evidence})` : ""}`);
  });
  return lines.join("\n");
}

async function playtest(run: Run) {
  const game = run.path("game");
  let summary = "";
  for (let r = 1; r <= ROUNDS; r++) {
    const rdir = run.path("rounds", String(r));
    if (!run.exists("rounds", String(r), "report.json")) {
      fs.rmSync(rdir, { recursive: true, force: true });
      fs.mkdirSync(rdir, { recursive: true });
      fs.cpSync(game, path.join(rdir, "game"), { recursive: true });
      run.emit("round", { round: r, status: "testing" });
      const footage = verifyRound(run, r, path.join(rdir, "game"));
      const squad = squadRound(run, r, path.join(rdir, "game"));
      const reports = (await Promise.all(roundTesters().map((t) => playtester(run, r, t, path.join(rdir, "game"))))).filter((x): x is Report => !!x);
      if (!reports.length) throw new Error(`Every playtester in round ${r} failed.`);
      const verify = await footage;
      const others = [...reports.flatMap((x) => x.issues), ...(await squad)].sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3));
      const issues = [...footageIssues(verify), ...others];
      const result = { round: r, fun: mean(reports.map((x) => x.fun)), fidelity: mean(reports.map((x) => x.fidelity)), reports, issues,
        verify: verify ? { matched: verify.matched, total: verify.total, lost: verify.lost.length } : null };
      run.writeJson(result, "rounds", String(r), "report.json");
      fs.writeFileSync(path.join(rdir, "PLAYTEST.md"), playtestMarkdown(r, reports, verify, others.filter((i) => i.by === "squad")));
      run.emit("round", { round: r, status: "tested", fun: result.fun, fidelity: result.fidelity, issues: issues.length, high: issues.filter((i) => i.severity === "high").length,
        ...(verify ? { matched: verify.matched, total: verify.total } : {}) });
      pickBest(run);
    }
    const report = run.readJson("rounds", String(r), "report.json");
    summary = `Fun ${report.fun} · Fidelity ${report.fidelity}`;
    if (r < ROUNDS && !run.exists("rounds", String(r), "fixed")) {
      fs.copyFileSync(path.join(rdir, "PLAYTEST.md"), path.join(game, "PLAYTEST.md"));
      const id = `fixer:${r}`;
      const { pt, tools } = builderTools(run, id, game);
      try {
        run.emit("round", { round: r, status: "fixing" });
        await runAgent(run, {
          id, stage: "playtest", role: "fixer", name: "Builder", round: r,
          brief: `Fixing what round ${r}'s playtesters found: ${report.issues.length} issues.`,
          cwd: game, system: builderSystem(run.revival.name), prompt: fixerPrompt(r, "PLAYTEST.md"),
          tools: ["read", "write", "edit", "ls", "grep", "find"], custom: tools,
          readOnly: (rel) => DOCS.has(rel), check: () => builderGate(pt, game), maxFollowUps: 2,
        }, label);
      } finally {
        await pt.close();
      }
      fs.writeFileSync(path.join(rdir, "fixed"), String(Date.now()));
      run.emit("round", { round: r, status: "fixed" });
    }
  }
  return summary;
}

/** The round people play: footage rules matched count most (checked against the original, not opinion), then fun.
 *  Without a footage check it falls back to the playtesters' fidelity score. */
function pickBest(run: Run) {
  const dir = run.path("rounds");
  let best: { r: string; score: number } | null = null;
  for (const r of fs.readdirSync(dir)) {
    if (!run.exists("rounds", r, "report.json")) continue;
    const rep = run.readJson("rounds", r, "report.json");
    const fidelity = rep.verify?.total ? (rep.verify.matched / rep.verify.total) * 20 : rep.fidelity;
    const score = fidelity + rep.fun * 1.2 - rep.issues.filter((i: Issue) => i.severity === "high" && i.by !== "footage").length * 0.3;
    if (!best || score > best.score) best = { r, score };
  }
  if (best) fs.writeFileSync(path.join(dir, "BEST"), best.r);
}

async function main() {
  const run = new Run(process.argv[2]);
  const stages: [string, () => Promise<string>, () => boolean][] = [
    ["build", () => build(run), () => run.exists("build.json") && run.readJson("build.json").by === "pi"],
    ["playtest", () => playtest(run), () => false],
  ];
  for (const [name, fn, done] of stages) {
    if (done()) {
      run.stage(name, "done", "kept from the last run");
      continue;
    }
    run.stage(name, "running");
    try {
      run.stage(name, "done", await fn());
    } catch (e: any) {
      run.emit("error", { stage: name, message: clip(String(e?.message ?? e), 500) });
      run.stage(name, "error", clip(String(e?.message ?? e), 300));
      await closeBrowser();
      process.exit(1);
    }
  }
  await closeBrowser();
}

main();
