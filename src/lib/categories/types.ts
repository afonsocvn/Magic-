export const CATEGORIES = [
  "land",
  "ramp",
  "draw",
  "removal",
  "wipe",
  "counter",
  "protection",
  "tutor",
  "recursion",
  "wincon",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  land: "Terrenos",
  ramp: "Rampa",
  draw: "Card draw",
  removal: "Remoção pontual",
  wipe: "Board wipes",
  counter: "Counters",
  protection: "Proteção",
  tutor: "Tutors",
  recursion: "Recursão",
  wincon: "Wincons",
};

export function isCategory(s: string): s is Category {
  return (CATEGORIES as readonly string[]).includes(s);
}
