"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Bot, Plus } from "lucide-react";

export function NavLinks({ running }: { running: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Revivals", icon: <Bot aria-hidden />, active: path === "/" || path.startsWith("/revivals"), dot: running, c: "red" },
    { href: "/lost", label: "Lost games", icon: <Archive aria-hidden />, active: path.startsWith("/lost"), c: "green" },
    { href: "/new", label: "Add a game", icon: <Plus aria-hidden />, active: path === "/new", c: "yellow" },
  ];
  return (
    <nav className="nav" aria-label="Main">
      {items.map((it) => (
        <Link key={it.label} href={it.href} className={`fx ${it.c}`} aria-current={it.active ? "page" : undefined} title={it.label}>
          {it.icon}
          <span className="label">{it.label}</span>
          {it.dot && <i className="dot live" role="img" aria-label="Agents are working" />}
        </Link>
      ))}
    </nav>
  );
}
