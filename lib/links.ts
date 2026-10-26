/** Footage links and year spans: no data, so client components can import them freely. */

const YT = /^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/;

/** The 11-character id of a YouTube video link, or null when it isn't one. */
export function youtubeId(url: string) {
  return YT.exec(url.trim())?.[1] ?? null;
}

export const youtubeUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/** A still YouTube serves for every video: the cover (hqdefault) or one of its auto-captured frames (hq1–hq3). */
export const youtubeStill = (id: string, which: "hqdefault" | "maxresdefault" | "hq1" | "hq2" | "hq3" = "hqdefault") => `https://i.ytimg.com/vi/${id}/${which}.jpg`;

/** The same still through Revive's own origin, cached on disk. */
export const ytThumb = (id: string, which: "hqdefault" | "maxresdefault" | "hq1" | "hq2" | "hq3" = "hqdefault") => `/api/yt/${id}?f=${which}`;

export function years(released?: number | null, lost?: number | null) {
  if (released && lost) return released === lost ? String(lost) : `${released}–${lost}`;
  if (lost) return `lost ${lost}`;
  return released ? `${released}–` : "";
}

export const searchFootage = (name: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} gameplay`)}`;
