import Link from "next/link";
import { Plus } from "lucide-react";
import { Logo } from "./Logo";

export function TopBar() {
  return (
    <header className="topbar">
      <Logo />
      <div className="topbar-center" />
      <div className="topbar-right">
        <Link href="/new" className="btn-violet">
          <Plus aria-hidden /> Revive a game
        </Link>
      </div>
    </header>
  );
}
