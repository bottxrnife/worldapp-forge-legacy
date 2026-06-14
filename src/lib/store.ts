/**
 * Client-side persistence (localStorage) for loyalty, activity, and orders —
 * the per-device state ported from the original app. World/ENS/Walrus hold the
 * shared/canonical data; this is the user's own running tally.
 */
export type LoyaltyRecord = { punches: number; points: number; redeemed: number };
export type ActivityKind = "purchase" | "redeem" | "order" | "claim";
export type ActivityEntry = {
  id: string;
  ens: string;
  title: string;
  kind: ActivityKind;
  amountUsd?: number;
  points?: number;
  note?: string;
  ts: number;
  simulated?: boolean;
};
export type OrderRecord = {
  id: string;
  ens: string;
  items: { name: string; qty: number }[];
  totalUsd: number;
  points: number;
  userHandle?: string;
  simulated?: boolean;
  ts: number;
};

const K = {
  loyalty: "forge.loyalty",
  activity: "forge.activity",
  orders: "forge.orders",
  transit: "forge.transit",
  transitRides: "forge.transitRides",
  fundraise: "forge.fundraise",
  parking: "forge.parking",
  credentials: "forge.credentials",
  votes: "forge.votes",
  tally: "forge.tally",
  supporters: "forge.supporters",
  unlocked: "forge.unlocked",
  deliverables: "forge.deliverables",
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function getLoyalty(): Record<string, LoyaltyRecord> {
  return read(K.loyalty, {} as Record<string, LoyaltyRecord>);
}
export function getLoyaltyFor(ens: string): LoyaltyRecord {
  return getLoyalty()[ens] ?? { punches: 0, points: 0, redeemed: 0 };
}
export function addStamp(ens: string, pointsEarned: number, total?: number): LoyaltyRecord {
  const all = getLoyalty();
  const cur = all[ens] ?? { punches: 0, points: 0, redeemed: 0 };
  const next: LoyaltyRecord = {
    punches: total ? Math.min(cur.punches + 1, total) : cur.punches + 1,
    points: cur.points + Math.max(0, Math.round(pointsEarned)),
    redeemed: cur.redeemed,
  };
  all[ens] = next;
  write(K.loyalty, all);
  return next;
}
export function addPoints(ens: string, pointsEarned: number): LoyaltyRecord {
  const all = getLoyalty();
  const cur = all[ens] ?? { punches: 0, points: 0, redeemed: 0 };
  const next = { ...cur, points: cur.points + Math.max(0, Math.round(pointsEarned)) };
  all[ens] = next;
  write(K.loyalty, all);
  return next;
}
export function redeemReward(ens: string): LoyaltyRecord {
  const all = getLoyalty();
  const cur = all[ens] ?? { punches: 0, points: 0, redeemed: 0 };
  const next = { punches: 0, points: cur.points, redeemed: cur.redeemed + 1 };
  all[ens] = next;
  write(K.loyalty, all);
  return next;
}
/** Spend accrued points (rewards marketplace). Returns false if not enough. */
export function spendPoints(ens: string, cost: number): boolean {
  const all = getLoyalty();
  const cur = all[ens] ?? { punches: 0, points: 0, redeemed: 0 };
  if (cur.points < cost) return false;
  all[ens] = { ...cur, points: cur.points - cost, redeemed: cur.redeemed + 1 };
  write(K.loyalty, all);
  return true;
}

export function getActivity(): ActivityEntry[] {
  return read(K.activity, [] as ActivityEntry[]);
}
export function recordActivity(e: Omit<ActivityEntry, "id" | "ts">): void {
  const all = getActivity();
  all.unshift({ id: cryptoId("ACT"), ts: Date.now(), ...e });
  write(K.activity, all.slice(0, 100));
}

export function getOrders(): OrderRecord[] {
  return read(K.orders, [] as OrderRecord[]);
}
export function addOrder(o: Omit<OrderRecord, "id" | "ts">): OrderRecord {
  const rec: OrderRecord = { id: cryptoId("ORD"), ts: Date.now(), ...o };
  const all = getOrders();
  all.unshift(rec);
  write(K.orders, all.slice(0, 100));
  return rec;
}

export function getTransitBalance(ens: string): number {
  return read(K.transit, {} as Record<string, number>)[ens] ?? 0;
}
export function addTransitBalance(ens: string, amount: number): number {
  const all = read(K.transit, {} as Record<string, number>);
  const next = (all[ens] ?? 0) + Math.max(0, amount);
  all[ens] = Math.round(next * 100) / 100;
  write(K.transit, all);
  return all[ens];
}

export function getFundraiserRaised(ens: string): number {
  return read(K.fundraise, {} as Record<string, number>)[ens] ?? 0;
}
export function addFundraiserRaised(ens: string, amount: number): number {
  const all = read(K.fundraise, {} as Record<string, number>);
  const next = (all[ens] ?? 0) + Math.max(0, amount);
  all[ens] = Math.round(next * 100) / 100;
  write(K.fundraise, all);
  return all[ens];
}

export type ParkingSession = { zone: string; minutes: number; expiresAt: number; plate?: string; startedAt?: number };
export function getParkingSession(ens: string): ParkingSession | null {
  return read(K.parking, {} as Record<string, ParkingSession>)[ens] ?? null;
}
export function setParkingSession(ens: string, session: ParkingSession): void {
  const all = read(K.parking, {} as Record<string, ParkingSession>);
  all[ens] = { startedAt: Date.now(), ...session };
  write(K.parking, all);
}
/** Add time to a live session (returns the new session, or null if none/expired). */
export function extendParkingSession(ens: string, addMinutes: number): ParkingSession | null {
  const all = read(K.parking, {} as Record<string, ParkingSession>);
  const cur = all[ens];
  if (!cur) return null;
  const base = Math.max(cur.expiresAt, Date.now());
  const next: ParkingSession = { ...cur, minutes: cur.minutes + addMinutes, expiresAt: base + addMinutes * 60_000 };
  all[ens] = next;
  write(K.parking, all);
  return next;
}

// ── Transit rides (tap-to-ride history; debits the stored balance) ──
export type Ride = { fareUsd: number; ts: number };
export function getTransitRides(ens: string): Ride[] {
  return read(K.transitRides, {} as Record<string, Ride[]>)[ens] ?? [];
}
export function addTransitRide(ens: string, fareUsd: number): { balance: number; rides: Ride[] } {
  const balances = read(K.transit, {} as Record<string, number>);
  const balance = Math.max(0, Math.round(((balances[ens] ?? 0) - fareUsd) * 100) / 100);
  balances[ens] = balance;
  write(K.transit, balances);
  const all = read(K.transitRides, {} as Record<string, Ride[]>);
  const rides = [{ fareUsd, ts: Date.now() }, ...(all[ens] ?? [])].slice(0, 20);
  all[ens] = rides;
  write(K.transitRides, all);
  return { balance, rides };
}

// ── Credentials (one-per-human issued artifact: raffle entry, ticket, RSVP, membership, dues proof) ──
export type Credential = {
  kind: "entry" | "pass" | "rsvp" | "membership" | "member";
  serial: string;
  code: string;
  ts: number;
  partySize?: number;
  tier?: string;
  validThru?: number;
  meta?: Record<string, string>;
};
export function getCredential(ens: string): Credential | null {
  return read(K.credentials, {} as Record<string, Credential>)[ens] ?? null;
}
/** Issue once per device/human. Idempotent: returns the existing credential if already held. */
export function issueCredential(ens: string, cred: Omit<Credential, "ts">): Credential {
  const all = read(K.credentials, {} as Record<string, Credential>);
  if (all[ens]) return all[ens];
  const rec: Credential = { ...cred, ts: Date.now() };
  all[ens] = rec;
  write(K.credentials, all);
  return rec;
}

// ── Votes (one-per-human ballot + a live local tally seeded from the proposal) ──
export type VoteRecord = { choice: string; ts: number };
export function getVote(ens: string): VoteRecord | null {
  return read(K.votes, {} as Record<string, VoteRecord>)[ens] ?? null;
}
export function getTally(ens: string): Record<string, number> | null {
  return read(K.tally, {} as Record<string, Record<string, number>>)[ens] ?? null;
}
export function recordVote(
  ens: string,
  choice: string,
  baseTally: Record<string, number>,
): { vote: VoteRecord; tally: Record<string, number> } {
  const votes = read(K.votes, {} as Record<string, VoteRecord>);
  const tallies = read(K.tally, {} as Record<string, Record<string, number>>);
  if (votes[ens]) return { vote: votes[ens], tally: tallies[ens] ?? baseTally };
  const tally = { ...baseTally };
  tally[choice] = (tally[choice] ?? 0) + 1;
  votes[ens] = { choice, ts: Date.now() };
  tallies[ens] = tally;
  write(K.votes, votes);
  write(K.tally, tallies);
  return { vote: votes[ens], tally };
}

// ── Supporter wall (fundraisers / round-ups: who chipped in) ──
export type Supporter = { handle: string; amountUsd: number; ts: number };
export function getSupporters(ens: string): Supporter[] {
  return read(K.supporters, {} as Record<string, Supporter[]>)[ens] ?? [];
}
export function addSupporter(ens: string, s: { handle: string; amountUsd: number }): Supporter[] {
  const all = read(K.supporters, {} as Record<string, Supporter[]>);
  const list = [{ ...s, ts: Date.now() }, ...(all[ens] ?? [])].slice(0, 100);
  all[ens] = list;
  write(K.supporters, all);
  return list;
}

// ── Paywall unlocks (Article Unlock — pay once, stay unlocked) ──
export function isUnlocked(ens: string): boolean {
  return !!read(K.unlocked, {} as Record<string, number>)[ens];
}
export function markUnlocked(ens: string): void {
  const all = read(K.unlocked, {} as Record<string, number>);
  all[ens] = Date.now();
  write(K.unlocked, all);
}

// ── Agent deliverables (Agents sparks produce a structured artifact you can re-open) ──
export type DeliverableSection = { heading: string; body: string };
export type Deliverable = {
  id: string;
  ens: string;
  sparkName: string;
  agentName?: string;
  agentEns?: string;
  kind: string;
  title: string;
  sections: DeliverableSection[];
  brief?: string;
  ts: number;
  simulated?: boolean;
};
export function getDeliverables(): Deliverable[] {
  return read(K.deliverables, [] as Deliverable[]);
}
export function getDeliverable(id: string): Deliverable | null {
  return getDeliverables().find((d) => d.id === id) ?? null;
}
export function saveDeliverable(d: Omit<Deliverable, "id" | "ts">): Deliverable {
  const rec: Deliverable = { id: cryptoId("DLV"), ts: Date.now(), ...d };
  const all = getDeliverables();
  all.unshift(rec);
  write(K.deliverables, all.slice(0, 50));
  return rec;
}

/** Short human-facing code for credentials/passes (e.g. "7Q2K9F"). */
export function genCode(len = 6): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

function cryptoId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${rand.toUpperCase()}`;
}
