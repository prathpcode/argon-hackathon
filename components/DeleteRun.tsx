"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function DeleteRun({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm(`Delete "${name}"? This removes the whole run.`)) return;
    setBusy(true);
    const res = await fetch(`/api/revivals/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setBusy(false);
  }
  return (
    <button className="del" onClick={go} disabled={busy} aria-label={`Delete ${name}`} title="Delete">
      {busy ? <Loader2 className="spin" aria-hidden /> : <Trash2 aria-hidden />}
    </button>
  );
}
