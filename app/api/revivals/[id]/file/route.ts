import fs from "node:fs";
import path from "node:path";
import { runDir } from "@/lib/runs";

const TYPES: Record<string, string> = { ".mp4": "video/mp4", ".webm": "video/webm", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".txt": "text/plain" };

/** A file from a run folder (recordings, screenshots), with Range support so videos can seek. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const dir = runDir((await params).id);
  const rel = new URL(req.url).searchParams.get("p") ?? "";
  const file = dir && path.resolve(dir, rel);
  const type = TYPES[path.extname(rel)];
  if (!file || !type || !file.startsWith(dir + path.sep) || !fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const size = fs.statSync(file).size;
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") ?? "");
  if (range) {
    const start = Number(range[1] || 0), end = Math.min(size - 1, range[2] ? Number(range[2]) : size - 1);
    const buf = Buffer.alloc(end - start + 1);
    const fd = fs.openSync(file, "r");
    fs.readSync(fd, buf, 0, buf.length, start);
    fs.closeSync(fd);
    return new Response(new Uint8Array(buf), { status: 206, headers: { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": String(buf.length) } });
  }
  return new Response(new Uint8Array(fs.readFileSync(file)), { headers: { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": String(size) } });
}
