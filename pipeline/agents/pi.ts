import fs from "node:fs";
import path from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import type { Run } from "./run";

/**
 * Every agent in a revival is a pi session. runAgent() streams what it does into the run's event log:
 * an "agent" line when it starts and ends (tokens, seconds), and an "act" line for each thing it does
 * (a tool call and its result, or something it says), which the UI shows live.
 */

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const AGENT_DIR = path.join(ROOT, "data", ".pi");

function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

let runtime: Promise<ModelRuntime> | null = null;
function modelRuntime() {
  runtime ??= (async () => {
    loadEnv();
    fs.mkdirSync(AGENT_DIR, { recursive: true });
    const rt = await ModelRuntime.create({ authPath: path.join(AGENT_DIR, "auth.json"), modelsPath: path.join(AGENT_DIR, "models.json") });
    if (process.env.GEMINI_API_KEY) await rt.setRuntimeApiKey("google", process.env.GEMINI_API_KEY);
    return rt;
  })();
  return runtime;
}

/** Keep file tools inside the agent's workspace; optionally make some files read-only. */
function sandbox(dir: string, readOnly: (rel: string) => boolean) {
  return (pi: any) => {
    pi.on("tool_call", async (event: any) => {
      const p = event.input?.path;
      if (typeof p !== "string") return undefined;
      const resolved = path.resolve(dir, p);
      if (resolved !== dir && !resolved.startsWith(dir + path.sep)) return { block: true, reason: "Only files inside your workspace are available." };
      if ((event.toolName === "write" || event.toolName === "edit") && readOnly(path.relative(dir, resolved))) return { block: true, reason: "That file is read-only." };
      return undefined;
    });
  };
}

export type AgentSpec = {
  id: string;
  stage: string;
  role: "builder" | "fixer" | "tester";
  name: string;
  brief: string;
  round?: number;
  focus?: string;
  cwd: string;
  system: string;
  prompt: string;
  tools: string[];
  custom: ToolDefinition<any, any>[];
  readOnly?: (rel: string) => boolean;
  /** Called after each prompt; return a follow-up prompt to keep the agent going, or null when it's finished. */
  check?: () => Promise<string | null>;
  maxFollowUps?: number;
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function extractError(raw: string) {
  try {
    const outer = JSON.parse(raw);
    const inner = typeof outer?.error?.message === "string" ? JSON.parse(outer.error.message) : null;
    return inner?.error?.message || outer?.error?.message || raw;
  } catch {
    return raw;
  }
}

/**
 * What a write or edit put in a file, saved beside the run (code/<agent>/<call>.json) so the UI can show the
 * exact code without it riding along in every event. Returns the path the act points at.
 */
function saveCode(run: Run, agent: string, call: string, tool: string, args: any): string | undefined {
  let body: { path: string; content?: string; edits?: { oldText: string; newText: string }[] } | null = null;
  if (tool === "write" && typeof args?.content === "string") body = { path: args.path, content: args.content };
  else if (tool === "edit") {
    const edits = typeof args?.edits === "string" ? safeJson(args.edits) : args?.edits ?? (args?.oldText !== undefined ? [args] : null);
    if (Array.isArray(edits)) body = { path: args.path, edits: edits.map((x: any) => ({ oldText: String(x.oldText ?? ""), newText: String(x.newText ?? "") })) };
  }
  if (!body) return undefined;
  const rel = path.join("code", agent.replace(/[^\w-]/g, "_"), `${call.replace(/[^\w-]/g, "_")}.json`);
  run.writeJson(body, rel);
  return rel;
}

const safeJson = (s: string) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/**
 * The model's thinking as it streams: live/<agent>.json holds the thought in progress (rewritten a few times a
 * second, for the UI to show as it's typed), and each finished thought is logged as a "think" act.
 */
function liveThinking(run: Run, agent: string) {
  const file = path.join("live", `${agent.replace(/[^\w-]/g, "_")}.json`);
  let text = "", last = 0, timer: NodeJS.Timeout | null = null;
  const flush = () => {
    timer = null;
    last = Date.now();
    run.writeJson({ text, t: last / 1000 }, file);
  };
  return {
    add(delta: string) {
      text += delta;
      if (!timer) timer = setTimeout(flush, Math.max(0, 300 - (Date.now() - last)));
    },
    end() {
      if (timer) clearTimeout(timer);
      const t = text.trim();
      if (t) {
        const m = /^\s*\*\*(.+?)\*\*\s*([\s\S]*)$/.exec(t);
        run.emit("act", { agent, kind: "think", title: (m ? m[1] : t.split("\n")[0]).trim().slice(0, 120), text: (m ? m[2] : t.split("\n").slice(1).join("\n")).trim().slice(0, 1200) });
      }
      text = "";
      flush();
    },
  };
}

export async function runAgent(run: Run, spec: AgentSpec, label: (tool: string, args: any) => string): Promise<string> {
  const t0 = Date.now();
  const tokens = { tokens_in: 0, tokens_out: 0 };
  const { id } = spec;
  run.emit("agent", { id, stage: spec.stage, role: spec.role, name: spec.name, brief: spec.brief, round: spec.round, focus: spec.focus, status: "running", started: t0 / 1000 });
  let session: Awaited<ReturnType<typeof createAgentSession>>["session"] | null = null;
  let lastText = "";
  try {
    const rt = await modelRuntime();
    const modelId = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const model = rt.getModel("google", modelId);
    if (!model) throw new Error(`Model google/${modelId} is not available. Check GEMINI_MODEL in .env.`);
    const loader = new DefaultResourceLoader({
      cwd: spec.cwd,
      agentDir: AGENT_DIR,
      noExtensions: true,
      noSkills: true,
      noPromptTemplates: true,
      noThemes: true,
      noContextFiles: true,
      systemPromptOverride: () => spec.system,
      appendSystemPromptOverride: () => [],
      extensionFactories: [sandbox(spec.cwd, spec.readOnly ?? (() => false)), (pi: any) => spec.custom.forEach((t) => pi.registerTool(t))],
    } as any);
    await loader.reload();
    ({ session } = await createAgentSession({
      cwd: spec.cwd,
      agentDir: AGENT_DIR,
      model,
      modelRuntime: rt,
      thinkingLevel: "medium",
      tools: [...spec.tools, ...spec.custom.map((t) => t.name)],
      resourceLoader: loader,
      sessionManager: SessionManager.inMemory(spec.cwd),
      settingsManager: SettingsManager.inMemory({ retry: { enabled: true, maxRetries: 3 }, compaction: { enabled: true } } as any),
    } as any));

    let error = "";
    const thinking = liveThinking(run, id);
    session.subscribe((event: any) => {
      if (event.type === "message_update") {
        const e = event.assistantMessageEvent;
        if (e?.type === "thinking_delta") thinking.add(e.delta);
        else if (e?.type === "thinking_end") thinking.end();
      } else if (event.type === "tool_execution_start") {
        const code = saveCode(run, id, event.toolCallId, event.toolName, event.args);
        run.emit("act", { agent: id, call: event.toolCallId, kind: "tool", tool: event.toolName, label: label(event.toolName, event.args), status: "running", code });
      } else if (event.type === "tool_execution_end") {
        const text = event.result?.content?.find?.((c: any) => c.type === "text")?.text;
        const d = event.result?.details ?? {};
        run.emit("act", {
          agent: id,
          call: event.toolCallId,
          kind: "tool",
          tool: event.toolName,
          status: event.isError || d.failed ? "error" : "done",
          detail: d.summary ?? (event.isError && typeof text === "string" ? clip(text, 240) : undefined),
          img: d.img,
        });
      } else if (event.type === "message_end" && event.message?.role === "assistant") {
        const m = event.message;
        if (m.usage) {
          tokens.tokens_in += m.usage.input ?? 0;
          tokens.tokens_out += m.usage.output ?? 0;
          run.emit("agent", { id, ...tokens });
        }
        if (m.stopReason === "error" && m.errorMessage) error = extractError(m.errorMessage);
        const said = (m.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("").trim();
        if (said) {
          lastText = said;
          run.emit("act", { agent: id, kind: "say", text: clip(said, 700) });
        }
      }
    });

    let prompt: string | null = spec.prompt;
    for (let turn = 0; prompt && turn <= (spec.maxFollowUps ?? 2); turn++) {
      error = "";
      await session.prompt(prompt);
      if (error) throw new Error(error);
      prompt = spec.check ? await spec.check() : null;
    }
    run.emit("agent", { id, status: "done", secs: Math.round((Date.now() - t0) / 1000), ...tokens });
    return lastText;
  } catch (e: any) {
    run.emit("agent", { id, status: "error", secs: Math.round((Date.now() - t0) / 1000), detail: clip(String(e?.message ?? e), 300), ...tokens });
    throw e;
  } finally {
    session?.dispose();
  }
}
