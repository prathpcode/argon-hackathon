import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Type } from "typebox";
import type { ToolDefinition } from "@earendil-works/pi-coding-agent";
import type { Run } from "./run";

const exec = promisify(execFile);
const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PYTHON = path.join(ROOT, "pipeline", ".venv", "bin", "python");

/** ask_footage: the agents' window onto the original game. Runs pipeline/ask.py (Gemini, footage in context). */
export function footageTool(run: Run, latestShot?: () => string | null): ToolDefinition<any, any> {
  const videos = (run.exists("footage.json") ? run.readJson<{ key: string; title?: string; seconds?: number }[]>("footage.json") : [])
    .map((v) => `${v.key} = "${v.title ?? "video"}"${v.seconds ? ` (${Math.floor(v.seconds / 60)}:${String(v.seconds % 60).padStart(2, "0")})` : ""}`)
    .join("; ");
  return {
    name: "ask_footage",
    label: "Ask the footage",
    description:
      `Ask a question about the ORIGINAL game, answered by a model watching its gameplay footage (${videos || "no videos"}). ` +
      "Use it for exact looks, layouts, timings, behaviours and feel. Optionally narrow it to a clip (video key + seconds) for precise detail, " +
      (latestShot ? "and set compare_screen to attach your latest screenshot of the rebuild so the answer compares the two." : "or attach screenshot files from your workspace."),
    promptSnippet: "ask_footage: ask about the original game's footage",
    parameters: Type.Object({
      question: Type.String(),
      video: Type.Optional(Type.String({ description: "Video key, e.g. A" })),
      start: Type.Optional(Type.Number({ description: "Clip start, seconds" })),
      end: Type.Optional(Type.Number({ description: "Clip end, seconds" })),
      compare_screen: Type.Optional(Type.Boolean()),
    }),
    execute: async (_id, p: { question: string; video?: string; start?: number; end?: number; compare_screen?: boolean }) => {
      const args = [path.join(ROOT, "pipeline", "ask.py"), run.dir, p.question];
      if (p.video && p.start !== undefined) args.push("--clip", `${p.video}:${p.start}-${p.end ?? p.start + 20}`);
      const shot = p.compare_screen && latestShot ? latestShot() : null;
      if (shot && fs.existsSync(shot)) args.push("--image", shot);
      try {
        const { stdout } = await exec(PYTHON, args, { cwd: path.join(ROOT, "pipeline"), timeout: 300_000, maxBuffer: 4 << 20 });
        const lines = stdout.trim().split("\n");
        const answer = lines.slice(0, -1).join("\n").trim() || lines.join("\n");
        return { content: [{ type: "text" as const, text: answer }], details: { summary: answer.slice(0, 200) } };
      } catch (e: any) {
        const msg = String(e.stderr || e.message).trim().split("\n").at(-1) ?? "failed";
        return { content: [{ type: "text" as const, text: `The footage couldn't answer: ${msg}` }], details: { summary: msg.slice(0, 160), failed: true } };
      }
    },
  };
}
