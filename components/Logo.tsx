import Link from "next/link";

/** Revive's mark: four fastext keys, red green yellow cyan, the way a teletext remote lays them out. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} aria-hidden="true" className="mark-svg" shapeRendering="crispEdges">
      <rect x="0" y="0" width="10" height="10" fill="var(--red)" />
      <rect x="12" y="0" width="10" height="10" fill="var(--green)" />
      <rect x="0" y="12" width="10" height="10" fill="var(--yellow)" />
      <rect x="12" y="12" width="10" height="10" fill="var(--cyan)" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="brand" aria-label="Revive home">
      <Mark />
      <span>REVIVE</span>
    </Link>
  );
}
