/**
 * loyalty_service — derived loyalty helpers (tiers, totals).
 *
 * Points accrue per-dapp in the store's `loyalty` map; these helpers turn raw
 * point totals into the McDonald's-style tier ladder the Rewards hub shows.
 */
import { LoyaltyRecord } from '../state/store';

export type Tier = { name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'; min: number; accent: string };

/** Tier ladder by lifetime points. `accent` keys into a soft badge color. */
export const TIERS: Tier[] = [
  { name: 'Bronze', min: 0, accent: '#A9743B' },
  { name: 'Silver', min: 2500, accent: '#8C93A6' },
  { name: 'Gold', min: 7500, accent: '#C79A1E' },
  { name: 'Platinum', min: 20000, accent: '#3C6E8F' },
];

/** Resolve a points total to its tier plus progress toward the next one. */
export function tierFor(points: number): {
  tier: Tier;
  next: Tier | null;
  toNext: number;
  progress: number; // 0–1 within the current tier band
} {
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (points >= TIERS[i].min) idx = i;
  const tier = TIERS[idx];
  const next = TIERS[idx + 1] ?? null;
  const toNext = next ? Math.max(0, next.min - points) : 0;
  const span = next ? next.min - tier.min : 1;
  const progress = next ? Math.min(1, (points - tier.min) / span) : 1;
  return { tier, next, toNext, progress };
}

/** Sum points across every loyalty pass the user holds. */
export function totalPoints(loyalty: Record<string, LoyaltyRecord>): number {
  return Object.values(loyalty).reduce((sum, r) => sum + (r.points ?? 0), 0);
}

/** Passes the user has actually engaged with (any stamps, points, or redemptions). */
export function activePasses(
  loyalty: Record<string, LoyaltyRecord>
): Array<{ ens: string; record: LoyaltyRecord }> {
  return Object.entries(loyalty)
    .filter(([, r]) => r.punches > 0 || r.points > 0 || r.redeemed > 0)
    .map(([ens, record]) => ({ ens, record }))
    .sort((a, b) => b.record.points - a.record.points);
}
