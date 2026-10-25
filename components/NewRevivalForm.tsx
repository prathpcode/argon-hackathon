"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, X } from "lucide-react";

export function NewRevivalForm() {
  const router = useRouter();
  const [videos, setVideos] = useState([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const res = await fetch("/api/revivals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(f), videos: videos.filter((v) => v.trim()) }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/revivals/${data.id}`);
    else {
      setError(data.error ?? "That didn't start. Try again.");
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>Game</span>
        <input name="name" required maxLength={80} placeholder="Club Penguin" autoFocus />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Developer</span>
          <input name="developer" maxLength={80} />
        </label>
        <label className="field">
          <span>Platform</span>
          <input name="platform" maxLength={60} placeholder="Browser, Flash" />
        </label>
        <label className="field small">
          <span>Released</span>
          <input name="released" inputMode="numeric" maxLength={4} />
        </label>
        <label className="field small">
          <span>Shut down</span>
          <input name="lost" inputMode="numeric" maxLength={4} />
        </label>
      </div>
      <div className="field">
        <span>Gameplay videos <i>optional, up to 4</i></span>
        {videos.map((v, i) => (
          <div key={i} className="input-row">
            <input value={v} onChange={(e) => setVideos(videos.map((x, j) => (j === i ? e.target.value : x)))} placeholder="https://www.youtube.com/watch?v=…" />
            {videos.length > 1 && (
              <button type="button" className="icon-btn" aria-label="Remove" onClick={() => setVideos(videos.filter((_, j) => j !== i))}>
                <X aria-hidden />
              </button>
            )}
          </div>
        ))}
        {videos.length < 4 && (
          <button type="button" className="soft-pill" onClick={() => setVideos([...videos, ""])}>
            <Plus aria-hidden /> Another video
          </button>
        )}
      </div>
      <label className="field">
        <span>What you remember <i>optional</i></span>
        <textarea name="memories" rows={3} maxLength={4000} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn-violet" disabled={busy}>
        {busy ? <Loader2 className="spin" aria-hidden /> : <Sparkles aria-hidden />} Start the revival
      </button>
    </form>
  );
}
