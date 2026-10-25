import Link from "next/link";
import { ytThumb, years, youtubeId } from "@/lib/links";
import type { LostGame } from "@/lib/archive";

export function LostCard({ game }: { game: LostGame }) {
  const yt = game.footage_examples.map(youtubeId).find(Boolean);
  return (
    <Link href={`/lost/${game.id}`} className="card lost">
      <div className="thumb">{yt ? <img src={ytThumb(yt)} alt="" loading="lazy" /> : <div className="thumb-empty" />}</div>
      <div className="card-title">{game.name}</div>
      <div className="card-sub">{[years(game.year_released, game.year_lost), game.platform].filter(Boolean).join(" · ")}</div>
    </Link>
  );
}
