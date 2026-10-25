import { notFound } from "next/navigation";
import { getRun } from "@/lib/runs";
import { Workshop } from "@/components/Workshop";

export default async function RevivalPage({ params }: { params: Promise<{ id: string }> }) {
  const run = getRun((await params).id);
  if (!run) notFound();
  return (
    <main className="main">
      <Workshop initial={run} />
    </main>
  );
}
