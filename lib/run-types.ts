/** Shapes of a revival run as the UI sees it. Safe for client components (no node imports). */

export type StageId = "find" | "watch" | "build" | "playtest";

export type Revival = {
  name: string;
  lostId?: string;
  developer?: string;
  platform?: string;
  genre?: string;
  released?: number | null;
  lost?: number | null;
  memories?: string;
  videos?: string[];
  createdAt?: number;
};

export type StageState = { status: "waiting" | "running" | "done" | "error"; detail?: string; startedAt?: number; endedAt?: number };

/** One thing an agent did: a tool call (with its result once it ends) or something it said. */
export type Act = {
  id: string;
  t: number;
  /** tool: a tool call. say: what the agent said. think: a reasoning summary (title + text). note: something it found. */
  kind: "tool" | "say" | "think" | "note";
  tool?: string;
  label?: string;
  title?: string;
  text?: string;
  status?: "running" | "done" | "error";
  detail?: string;
  img?: string;
  /** For a write or edit: the run file holding exactly what it wrote ({path, content} or {path, edits}). */
  code?: string;
};

export type Agent = {
  id: string;
  stage: StageId;
  role: "researcher" | "watcher" | "builder" | "fixer" | "tester";
  name: string;
  brief: string;
  status: "running" | "done" | "error";
  round?: number;
  focus?: "fun" | "fidelity" | "together";
  detail?: string;
  secs?: number;
  tokens_in?: number;
  tokens_out?: number;
  videos?: string[];
  startedAt: number;
  updatedAt: number;
  acts: Act[];
  actCount: number;
  shot: string | null;
  /** While its game is open: each player's screencast frame (run files, rewritten a few times a second). */
  live?: string[];
};

export type Footage = { key: string; url: string; title?: string; channel?: string; seconds?: number | null };

export type Issue = { severity: "high" | "medium" | "low"; kind: string; title: string; detail: string; evidence?: string; by?: string };

export type TesterReport = { tester: "fun" | "fidelity" | "together"; fun: number; fidelity: number; summary: string; issues: Issue[]; best: string[] };

/** One footage rule, played in the rebuild and judged against its moment in the original (pipeline/verify.py). */
export type VerifyRule = {
  id: string; rule: string; pass: boolean; verdict?: string; votes?: boolean[];
  original: { video: string; start: number; end: number }; original_url: string;
  original_shows: string; rebuild_shows: string; difference: string; video: string | null;
};

export type Verify = { round: number; matched: number; total: number; lost: string[]; rules: VerifyRule[] };

/** Managed Agents that played the round together over the internet (pipeline/squad/run.py). */
export type SquadAgent = { summary: string; persona?: string; secs?: number; shots?: string[];
  findings: { t?: number; severity: string; finding: string; repro?: string }[] };
export type Squad = { round: number; agents: Record<string, SquadAgent> };

export type Round = {
  round: number;
  status: "testing" | "tested" | "fixing" | "fixed";
  fun?: number;
  fidelity?: number;
  reports: TesterReport[];
  issues: Issue[];
  verify?: Verify | null;
  squad?: Squad | null;
};

export type RunSummary = {
  id: string;
  revival: Revival;
  title: string | null;
  status: "queued" | "running" | "done" | "error" | "stopped";
  stage: StageId | null;
  best: { round: number; fun: number; fidelity: number } | null;
  footage: string | null;
  /** The latest screenshot any agent took of the rebuild. */
  shot: string | null;
  updatedAt: number | null;
};

export type RunState = RunSummary & {
  stages: Record<StageId, StageState>;
  agents: Agent[];
  error: string | null;
  startedAt: number | null;
  footageList: Footage[];
  rules: number;
  areas: number;
  rounds: Round[];
  hasGame: boolean;
};
