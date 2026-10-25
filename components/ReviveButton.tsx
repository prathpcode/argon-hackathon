"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

export function ReviveButton({ lostId, label }: { lostId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function go() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/revivals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lostId }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/revivals/${data.id}`);
    else {
      setError(data.error ?? "That didn't start. Try again.");
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn-violet play-btn" onClick={go} disabled={busy}>
        {busy ? <Loader2 className="spin" aria-hidden /> : <Sparkles aria-hidden />} {label}
      </button>
      {error && <p className="form-error">{error}</p>}
    </>
  );
}
