/** Deterministic per-app identity: an accent color + emoji, so each mini-app
 *  reads as distinct (like real app icons) instead of a uniform tile. */

const ACCENTS = [
  "#3450A1", // blue
  "#1B7A45", // green
  "#A14034", // rust
  "#8A6A12", // gold
  "#6D28D9", // violet
  "#0E7490", // teal
  "#BE185D", // pink
  "#C2410C", // orange
];

export function appAccent(ens: string): string {
  let h = 0;
  for (const ch of ens) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

const BY_KEY: Record<string, string> = {
  dues: "🧾",
  cafe: "☕",
  coffee: "☕",
  bean: "☕",
  split: "➗",
  vote: "🗳️",
  dao: "🗳️",
  poll: "🗳️",
  raffle: "🎟️",
  lottery: "🎟️",
  tip: "💛",
  jar: "💛",
  menu: "🍔",
  bistro: "🍽️",
  diner: "🍽️",
  food: "🍽️",
  parking: "🅿️",
  transit: "🚇",
  ticket: "🎫",
  rsvp: "🎫",
  event: "🎫",
  save: "🐷",
  saving: "🐷",
  member: "🪪",
  pass: "🪪",
  run: "🏃",
  club: "🏃",
  charity: "❤️",
  donate: "❤️",
  fund: "🎗️",
  red: "🧧",
  lucky: "🧧",
  agent: "🤖",
};

const BY_CAT: Record<string, string> = {
  Finance: "💸",
  Community: "👥",
  Agents: "🤖",
  Events: "🎫",
  Tools: "🛠️",
};

export function appEmoji(ens: string, category?: string): string {
  const label = ens.split(".")[0].toLowerCase();
  for (const k of Object.keys(BY_KEY)) if (label.includes(k)) return BY_KEY[k];
  return (category && BY_CAT[category]) || "✨";
}

/** Hex → rgba with alpha, for soft tinted backgrounds. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
