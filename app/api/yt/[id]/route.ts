import fs from "node:fs";
import path from "node:path";

type Ctx = { params: Promise<{ id: string }> };

const CACHE = path.join(process.cwd(), "data", "yt");
const FRAMES = new Set(["hqdefault", "hq1", "hq2", "hq3", "maxresdefault"]);

/**
 * A YouTube video's cover or one of its auto-captured frames, served from this origin and cached on disk.
 * Not every video has a full-size cover, so maxresdefault falls back to hqdefault.
 */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const which = new URL(req.url).searchParams.get("f") ?? "hqdefault";
  if (!/^[\w-]{11}$/.test(id) || !FRAMES.has(which)) return new Response("Not found", { status: 404 });
  const file = path.join(CACHE, `${id}-${which}.jpg`);
  let buf: Buffer | null = fs.existsSync(file) ? fs.readFileSync(file) : null;
  if (!buf) {
    const get = (f: string) => fetch(`https://i.ytimg.com/vi/${id}/${f}.jpg`, { signal: AbortSignal.timeout(8000) }).catch(() => null);
    let res = await get(which);
    if (!res?.ok && which === "maxresdefault") res = await get("hqdefault");
    if (!res?.ok) return new Response("Not found", { status: 404 });
    buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(CACHE, { recursive: true });
    fs.writeFileSync(file, buf);
  }
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800" } });
}
