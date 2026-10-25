import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listRuns } from "@/lib/runs";
import { ARCHIVE } from "@/lib/archive";
import { RunCard } from "@/components/RunCard";
import { LostCard } from "@/components/LostCard";

export default function Home() {
  const runs = listRuns();
  const picks = ARCHIVE.filter((g) => g.footage_examples.length && !runs.some((r) => r.revival.lostId === g.id)).slice(0, 6);
  return (
    <main className="main">
      <section className="section">
        <div className="section-head">
          <h2>Revivals</h2>
          {runs.length > 0 && <span className="count">{runs.length}</span>}
        </div>
        {runs.length ? (
          <div className="grid">{runs.map((r) => <RunCard key={r.id} run={r} />)}</div>
        ) : (
          <p className="empty-note">No revivals yet. Pick a lost game below.</p>
        )}
      </section>
      <section className="section">
        <div className="section-head">
          <h2>Worth reviving</h2>
          <Link href="/lost" className="see-all">
            All {ARCHIVE.length} lost games <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="grid">{picks.map((g) => <LostCard key={g.id} game={g} />)}</div>
      </section>
    </main>
  );
}
