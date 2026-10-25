import data from "@/datasets/lost-games.json";
import { youtubeId } from "./links";

export * from "./links";

/** One shut-down game from the researched archive (datasets/lost-games.json). */
export type LostGame = {
  id: string;
  score: number | null;
  name: string;
  year_released: number | null;
  year_lost: number | null;
  developer: string;
  platform: string;
  category: string;
  genre: string;
  how_lost: string;
  status: "lost" | "mostly-lost" | "uncertain" | "revived";
  revival_check: string;
  footage_volume: string;
  footage_examples: string[];
  rebuild_difficulty: number;
  argon_fit: number;
  why_interesting: string;
  sources: string[];
  confidence: string;
  also_in?: string[];
};

export const ARCHIVE = data.games as LostGame[];
export const ARCHIVE_DATE = data.generated;

export const CATEGORIES: Record<string, string> = {
  web: "Web & Flash",
  mobile: "Mobile",
  "cloud-online": "Online",
  "arcade-misc": "Arcade",
  ugc: "Made by players",
};

export const STATUS_LABEL: Record<LostGame["status"], string> = {
  lost: "Lost",
  "mostly-lost": "Mostly lost",
  uncertain: "Uncertain",
  revived: "Revived by fans",
};

export function getLost(id: string) {
  return ARCHIVE.find((g) => g.id === id) ?? null;
}

/** Every archive game's teletext page number: P101 onward, in archive order. */
export const pageOf = (id: string) => 101 + ARCHIVE.findIndex((g) => g.id === id);

/** The game's YouTube footage, in archive order. */
export function footageIds(g: LostGame) {
  return g.footage_examples.map(youtubeId).filter((id): id is string => !!id);
}
