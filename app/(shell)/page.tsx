import { listRuns } from "@/lib/runs";
import { ARCHIVE, CATEGORIES } from "@/lib/archive";
import { RunCard } from "@/components/RunCard";
import { LostGrid } from "@/components/LostGrid";

export default function Home() {
  const runs = listRuns();
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
          <h2>Lost games</h2>
          <span className="count">{ARCHIVE.length}</span>
        </div>
        <LostGrid games={ARCHIVE} categories={CATEGORIES} />
      </section>
    </main>
  );
}
