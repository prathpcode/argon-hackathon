import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { footageIds, getLost, STATUS_LABEL, years, ytThumb, youtubeUrl } from "@/lib/archive";
import { listRuns } from "@/lib/runs";
import { ReviveButton } from "@/components/ReviveButton";
import { RunCard } from "@/components/RunCard";

export default async function LostGamePage({ params }: { params: Promise<{ id: string }> }) {
  const game = getLost((await params).id);
  if (!game) notFound();
  const ids = footageIds(game);
  const runs = listRuns().filter((r) => r.revival.lostId === game.id);
  return (
    <main className="main">
      <div className="game-hero">
        <div className="thumb">{ids[0] ? <img src={ytThumb(ids[0], "maxresdefault")} alt="" /> : <div className="thumb-empty" />}</div>
        <div className="game-info">
          <h1>{game.name}</h1>
          <div className="by">{[game.developer, game.platform, years(game.year_released, game.year_lost)].filter(Boolean).join(" · ")}</div>
          <ReviveButton lostId={game.id} label={runs.length ? "Revive again" : "Revive it"} />
          <dl className="facts">
            <div><dt>Status</dt><dd>{STATUS_LABEL[game.status]}</dd></div>
            <div><dt>Footage</dt><dd>{game.footage_volume}</dd></div>
            <div><dt>Difficulty</dt><dd>{game.rebuild_difficulty}/5</dd></div>
          </dl>
        </div>
      </div>
      {runs.length > 0 && (
        <section className="about">
          <h2>Revivals</h2>
          <div className="grid">{runs.map((r) => <RunCard key={r.id} run={r} />)}</div>
        </section>
      )}
      <section className="about">
        <h2>How it was lost</h2>
        <p>{game.how_lost}</p>
      </section>
      {ids.length > 0 && (
        <section className="about">
          <h2>Surviving footage</h2>
          <div className="footage-row">
            {ids.map((id) => (
              <a key={id} href={youtubeUrl(id)} target="_blank" rel="noreferrer" className="thumb">
                <img src={ytThumb(id)} alt="" loading="lazy" />
                <span className="corner"><ExternalLink aria-hidden /></span>
              </a>
            ))}
          </div>
        </section>
      )}
      <p className="back"><Link href="/lost">All lost games</Link></p>
    </main>
  );
}
