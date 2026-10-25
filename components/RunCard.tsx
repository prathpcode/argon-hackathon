import Link from "next/link";
import { ytThumb, youtubeId, years } from "@/lib/links";
import type { RunSummary } from "@/lib/run-types";

const STAGE_LABEL = { find: "Finding footage", watch: "Watching", build: "Remaking", playtest: "Playtesting" } as const;

export function RunCard({ run }: { run: RunSummary }) {
  const yt = run.footage ? youtubeId(run.footage) : null;
  const label = run.status === "running" ? (run.stage ? STAGE_LABEL[run.stage] : "Starting") : run.status === "done" || run.status === "stopped" ? "Done" : run.status === "error" ? "Needs attention" : "Queued";
  return (
    <Link href={`/revivals/${run.id}`} className="card">
      <div className="thumb">
        {run.shot ? <img src={`/api/revivals/${run.id}/file?p=${encodeURIComponent(run.shot)}`} alt="" loading="lazy" /> : yt ? <img src={ytThumb(yt)} alt="" loading="lazy" /> : <div className="thumb-empty" />}
        <span className={`tag-badge ${run.status}`}>
          {run.status === "running" && <i className="pulse" aria-hidden />}
          {label}
        </span>
        {run.best && (
          <span className="score-badge">
            Fun {run.best.fun} · Faithful {run.best.faithful}
          </span>
        )}
      </div>
      <div className="card-title">{run.revival.name}</div>
      <div className="card-sub">{[years(run.revival.released, run.revival.lost), run.revival.platform].filter(Boolean).join(" · ")}</div>
    </Link>
  );
}
