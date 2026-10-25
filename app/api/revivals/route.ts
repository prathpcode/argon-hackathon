import { NextResponse } from "next/server";
import { getLost, youtubeId, youtubeUrl } from "@/lib/archive";
import { createRun, listRuns, startRun } from "@/lib/runs";
import type { Revival } from "@/lib/run-types";

export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function GET() {
  return NextResponse.json(listRuns());
}

/** Start a revival: an archive game (lostId) or a new one by name, with optional YouTube links. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Couldn't read that. Try again." }, { status: 400 });
  const lost = getLost(str(body.lostId, 64));
  const urls: string[] = [];
  for (const raw of Array.isArray(body.videos) ? body.videos : []) {
    if (!str(raw, 300)) continue;
    const id = youtubeId(str(raw, 300));
    if (!id) return NextResponse.json({ error: `“${str(raw, 60)}” isn't a YouTube link.` }, { status: 400 });
    if (!urls.includes(youtubeUrl(id))) urls.push(youtubeUrl(id));
  }
  const year = (v: unknown) => (Number.isInteger(Number(v)) && Number(v) > 1970 ? Number(v) : null);
  const revival: Revival = lost
    ? { lostId: lost.id, name: lost.name, developer: lost.developer, platform: lost.platform, genre: lost.genre, released: lost.year_released, lost: lost.year_lost }
    : { name: str(body.name, 80), developer: str(body.developer, 80) || undefined, platform: str(body.platform, 60) || undefined, released: year(body.released), lost: year(body.lost) };
  if (!revival.name) return NextResponse.json({ error: "Name the game first." }, { status: 400 });
  revival.videos = urls.slice(0, 4);
  if (str(body.memories, 4000)) revival.memories = str(body.memories, 4000);
  const id = createRun(revival);
  startRun(id);
  return NextResponse.json({ id });
}
