"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { youtubeId } from "@/lib/links";
import type { LostGame } from "@/lib/archive";
import { LostCard } from "./LostCard";

const hasThumb = (g: LostGame) => g.footage_examples.some((u) => youtubeId(u));

export function LostGrid({ games, categories }: { games: LostGame[]; categories: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  // Games with a thumbnail first, archive order otherwise.
  const ordered = useMemo(() => [...games.filter(hasThumb), ...games.filter((g) => !hasThumb(g))], [games]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ordered.filter((g) => (!cat || g.category === cat || g.also_in?.includes(cat)) && (!needle || `${g.name} ${g.developer} ${g.platform} ${g.genre}`.toLowerCase().includes(needle)));
  }, [ordered, q, cat]);
  return (
    <>
      <div className="filter-row">
        <label className="search">
          <Search aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lost games" aria-label="Search lost games" />
        </label>
        <div className="chips">
          <button className="chip" aria-pressed={!cat} onClick={() => setCat(null)}>All</button>
          {Object.entries(categories).map(([k, label]) => (
            <button key={k} className="chip" aria-pressed={cat === k} onClick={() => setCat(cat === k ? null : k)}>{label}</button>
          ))}
        </div>
      </div>
      {shown.length ? <div className="grid">{shown.map((g) => <LostCard key={g.id} game={g} />)}</div> : <p className="empty-note">No lost game matches that.</p>}
    </>
  );
}
