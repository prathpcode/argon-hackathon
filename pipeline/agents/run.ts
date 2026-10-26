import fs from "node:fs";
import path from "node:path";

/** One revival's folder, runs/<id>/, and its event log (events.jsonl), the same one the Python stages write. */
export class Run {
  readonly dir: string;
  readonly id: string;

  constructor(dir: string) {
    this.dir = path.resolve(dir);
    this.id = path.basename(this.dir);
  }

  get revival(): { name: string; developer?: string; platform?: string; genre?: string; memories?: string } {
    return this.readJson("revival.json");
  }

  path(...parts: string[]) {
    return path.join(this.dir, ...parts);
  }

  exists(...parts: string[]) {
    return fs.existsSync(this.path(...parts));
  }

  readJson<T = any>(...parts: string[]): T {
    return JSON.parse(fs.readFileSync(this.path(...parts), "utf8"), (_k, v) => {
      // Rounds from before the rename say "faithful".
      if (v && typeof v === "object" && !Array.isArray(v) && "faithful" in v && !("fidelity" in v)) return { ...v, fidelity: v.faithful };
      return v;
    });
  }

  writeJson(data: unknown, ...parts: string[]) {
    fs.mkdirSync(path.dirname(this.path(...parts)), { recursive: true });
    fs.writeFileSync(this.path(...parts), JSON.stringify(data, null, 1));
  }

  emit(type: string, fields: Record<string, unknown> = {}) {
    fs.appendFileSync(this.path("events.jsonl"), JSON.stringify({ t: Math.round(Date.now() / 10) / 100, type, ...fields }) + "\n");
  }

  stage(stage: string, status: "running" | "done" | "error", detail?: string) {
    this.emit("stage", { stage, status, detail });
    console.log(`[${stage}] ${status}${detail ? `: ${detail}` : ""}`);
  }

  /** Path relative to the run folder, for the UI's file route. */
  rel(p: string) {
    return path.relative(this.dir, p);
  }
}
