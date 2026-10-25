"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

export function NewRevivalForm() {
  const router = useRouter();
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
      body: JSON.stringify(Object.fromEntries(f)),
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
      <label className="field">
        <span>Developer</span>
        <input name="developer" maxLength={80} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn-violet" disabled={busy}>
        {busy ? <Loader2 className="spin" aria-hidden /> : <Sparkles aria-hidden />} Start the revival
      </button>
    </form>
  );
}
