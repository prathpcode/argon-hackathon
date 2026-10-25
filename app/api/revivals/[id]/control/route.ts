import { NextResponse } from "next/server";
import { getRun, playRun, startRun, stopRun } from "@/lib/runs";

export const dynamic = "force-dynamic";

/** resume | stop | play (starts the best build's own server and returns its port). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getRun(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { action } = await req.json().catch(() => ({}));
  if (action === "resume") startRun(id);
  else if (action === "stop") stopRun(id);
  else if (action === "play") {
    const port = await playRun(id);
    return port ? NextResponse.json({ port }) : NextResponse.json({ error: "There's no build to play yet." }, { status: 409 });
  } else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
