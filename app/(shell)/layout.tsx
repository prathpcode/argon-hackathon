import { TopBar } from "@/components/TopBar";
import { Sidebar } from "@/components/Sidebar";
import { listRuns } from "@/lib/runs";

export const dynamic = "force-dynamic";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const running = listRuns().some((r) => r.status === "running");
  return (
    <>
      <TopBar />
      <Sidebar running={running} />
      {children}
    </>
  );
}
