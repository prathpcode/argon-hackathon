"use client";

import { useEffect, useState } from "react";

/** The header clock every teletext page carried, ticking each second. */
export function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <span className="clock" aria-hidden>--:--:--</span>;
  const day = now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  return (
    <span className="clock" aria-hidden>
      <span className="clock-day">{day}</span> {time}
    </span>
  );
}
