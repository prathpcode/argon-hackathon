import { ARCHIVE, CATEGORIES } from "@/lib/archive";
import { LostGrid } from "@/components/LostGrid";

export default function LostGames() {
  return (
    <main className="main">
      <div className="section-head">
        <h2>Lost games</h2>
        <span className="count">{ARCHIVE.length}</span>
      </div>
      <LostGrid games={ARCHIVE} categories={CATEGORIES} />
    </main>
  );
}
