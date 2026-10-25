import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "./Logo";
import { Clock } from "./Clock";

export function TopBar() {
  return (
    <header className="topbar">
      <span className="page-no">P100</span>
      <Logo />
      <div className="topbar-center" />
      <Clock />
      <div className="topbar-right">
        <Link href="/new" className="btn-violet">
          <Plus aria-hidden /> Revive a game
        </Link>
      </div>
    </header>
  );
}
