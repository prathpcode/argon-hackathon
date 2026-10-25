import { NavLinks } from "./NavLinks";

export function Sidebar({ running }: { running: boolean }) {
  return (
    <aside className="sidebar">
      <NavLinks running={running} />
    </aside>
  );
}
