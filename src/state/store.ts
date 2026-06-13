import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { SEED_LISTINGS } from '../data/seeds';
import type { ApiMessage } from '../services/agent';
import { SimulationResult } from '../services/execution';
import type { WalletSnapshot } from '../services/wallet';
import { setActivePalette, ThemeMode } from '../theme';
import { DappListing, DappManifest } from '../types';

export type UiMessage =
  | { kind: 'chat'; role: 'user' | 'assistant'; text: string }
  | { kind: 'activity'; label: string }
  | { kind: 'card' };

const KEYS = {
  theme: 'dappdock.theme',
  loyalty: 'dappdock.loyalty',
  activity: 'dappdock.activity',
  saved: 'dappdock.saved',
  listings: 'dappdock.listings',
  reviews: 'dappdock.reviews',
};

/** Per-dapp loyalty pass: stamps toward the current reward, lifetime points, rewards claimed. */
export type LoyaltyRecord = { punches: number; points: number; redeemed: number };

/** A single entry in the user's activity / receipts feed. */
/** A one-per-human review, keyed by the World ID nullifier that authored it. */
export type Review = { rating: number; text: string; nullifier: string; ts: number };

export type ActivityEntry = {
  id: string;
  ens: string;
  title: string;
  kind: 'purchase' | 'redeem' | 'review' | 'send' | 'receive';
  amountUsd?: number;
  points?: number;
  note?: string;
  ts: number;
  live?: boolean;
  explorerUrl?: string;
};

/** Demo head-start so the punch card isn't empty on first open. */
const LOYALTY_SEED: Record<string, LoyaltyRecord> = {
  'burgerblock.dappdock.eth': { punches: 7, points: 6450, redeemed: 2 },
};

async function persistJSON(key: string, value: unknown) {
  try {
    const json = JSON.stringify(value);
    if (Platform.OS === 'web') localStorage.setItem(key, json);
    else await SecureStore.setItemAsync(key, json);
  } catch {
    // non-fatal: this slice just won't persist
  }
}

async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw =
      Platform.OS === 'web' ? localStorage.getItem(key) : await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Restore the saved theme before first paint settles; called from _layout. */
export async function loadThemePreference() {
  try {
    const saved =
      Platform.OS === 'web'
        ? localStorage.getItem(KEYS.theme)
        : await SecureStore.getItemAsync(KEYS.theme);
    if (saved === 'dark' || saved === 'light') {
      setActivePalette(saved);
      useApp.setState({ themeMode: saved });
    }
  } catch {
    // keep default
  }
}

/**
 * Restore persisted slices (loyalty, activity, saved, user listings).
 * Theme is restored separately so its palette side-effect runs before first paint.
 */
export async function loadPersistedState() {
  const [loyalty, activity, savedEns, userListings, reviews] = await Promise.all([
    loadJSON<Record<string, LoyaltyRecord>>(KEYS.loyalty),
    loadJSON<ActivityEntry[]>(KEYS.activity),
    loadJSON<string[]>(KEYS.saved),
    loadJSON<DappListing[]>(KEYS.listings),
    loadJSON<Record<string, Review[]>>(KEYS.reviews),
  ]);
  const patch: Partial<AppState> = {};
  if (loyalty) patch.loyalty = { ...LOYALTY_SEED, ...loyalty };
  if (activity) patch.activity = activity;
  if (savedEns) patch.savedEns = savedEns;
  if (reviews) patch.reviews = reviews;
  if (userListings && userListings.length) {
    patch.userListings = userListings;
    patch.listings = [...userListings, ...SEED_LISTINGS];
  }
  if (Object.keys(patch).length) useApp.setState(patch);
}

/** @deprecated use loadPersistedState — kept so older call sites still compile during migration */
export async function loadLoyaltyState() {
  await loadPersistedState();
}

type AppState = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  verified: boolean;
  verifiedSimulated: boolean;
  setVerified: (v: { verified: boolean; simulated: boolean }) => void;
  wallet: WalletSnapshot | null;
  setWallet: (w: WalletSnapshot) => void;
  loyalty: Record<string, LoyaltyRecord>;
  addStamp: (ens: string, points: number) => void;
  redeemReward: (ens: string, cardSize: number) => void;
  spendPoints: (ens: string, cost: number, rewardLabel: string) => boolean;

  activity: ActivityEntry[];
  recordActivity: (e: Omit<ActivityEntry, 'id' | 'ts'>) => void;
  savedEns: string[];
  toggleSave: (ens: string) => void;
  isSaved: (ens: string) => boolean;
  reviews: Record<string, Review[]>;
  submitReview: (ens: string, r: Review) => void;
  listings: DappListing[];
  userListings: DappListing[];
  builderCredits: number;
  publishedCount: number;
  addListing: (l: DappListing) => void;
  markPublished: () => void;
  apiHistory: ApiMessage[];
  messages: UiMessage[];
  agentBusy: boolean;
  pushMessage: (m: UiMessage) => void;
  setAgentBusy: (b: boolean) => void;
  draft: DappManifest | null;
  draftPublishedLive: boolean;
  simulation: SimulationResult | null;
  setDraft: (m: DappManifest) => void;
  setDraftPublishedLive: (live: boolean) => void;
  setSimulation: (s: SimulationResult) => void;
};

export const useApp = create<AppState>((set, get) => ({
  themeMode: 'light',
  setThemeMode: (mode) => {
    setActivePalette(mode);
    persistJSON(KEYS.theme, mode);
    set({ themeMode: mode });
  },

  verified: false,
  verifiedSimulated: false,
  setVerified: ({ verified, simulated }) => set({ verified, verifiedSimulated: simulated }),

  wallet: null,
  setWallet: (wallet) => set({ wallet }),

  loyalty: LOYALTY_SEED,
  addStamp: (ens, points) => {
    const prev = get().loyalty[ens] ?? { punches: 0, points: 0, redeemed: 0 };
    const loyalty = {
      ...get().loyalty,
      [ens]: { ...prev, punches: prev.punches + 1, points: prev.points + points },
    };
    persistJSON(KEYS.loyalty, loyalty);
    set({ loyalty });
  },
  redeemReward: (ens, cardSize) => {
    const prev = get().loyalty[ens] ?? { punches: 0, points: 0, redeemed: 0 };
    const loyalty = {
      ...get().loyalty,
      [ens]: { ...prev, punches: Math.max(0, prev.punches - cardSize), redeemed: prev.redeemed + 1 },
    };
    persistJSON(KEYS.loyalty, loyalty);
    set({ loyalty });
  },

  spendPoints: (ens, cost, rewardLabel) => {
    const prev = get().loyalty[ens] ?? { punches: 0, points: 0, redeemed: 0 };
    if (prev.points < cost) return false;
    const loyalty = {
      ...get().loyalty,
      [ens]: { ...prev, points: prev.points - cost },
    };
    persistJSON(KEYS.loyalty, loyalty);
    set({ loyalty });
    get().recordActivity({
      ens,
      title: rewardLabel,
      kind: 'redeem',
      points: -cost,
    });
    return true;
  },

  activity: [],
  recordActivity: (e) => {
    const entry: ActivityEntry = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      ts: Date.now(),
      ...e,
    };
    const activity = [entry, ...get().activity].slice(0, 100);
    persistJSON(KEYS.activity, activity);
    set({ activity });
  },

  savedEns: [],
  toggleSave: (ens) => {
    const cur = get().savedEns;
    const savedEns = cur.includes(ens) ? cur.filter((x) => x !== ens) : [ens, ...cur];
    persistJSON(KEYS.saved, savedEns);
    set({ savedEns });
  },
  isSaved: (ens) => get().savedEns.includes(ens),

  reviews: {},
  submitReview: (ens, r) => {
    const existing = get().reviews[ens] ?? [];
    const next = [r, ...existing.filter((x) => x.nullifier !== r.nullifier)];
    const reviews = { ...get().reviews, [ens]: next };
    persistJSON(KEYS.reviews, reviews);
    set({ reviews });
  },

  listings: SEED_LISTINGS,
  userListings: [],
  builderCredits: 3,
  publishedCount: 0,
  addListing: (l) => {
    const userListings = [l, ...get().userListings];
    persistJSON(KEYS.listings, userListings);
    set({ userListings, listings: [l, ...get().listings] });
  },
  markPublished: () =>
    set({ builderCredits: get().builderCredits - 1, publishedCount: get().publishedCount + 1 }),

  apiHistory: [],
  messages: [],
  agentBusy: false,
  pushMessage: (m) => set({ messages: [...get().messages, m] }),
  setAgentBusy: (agentBusy) => set({ agentBusy }),

  draft: null,
  draftPublishedLive: false,
  simulation: null,
  setDraft: (draft) => set({ draft }),
  setDraftPublishedLive: (live) => set({ draftPublishedLive: live }),
  setSimulation: (simulation) => set({ simulation }),
}));

/** True when a listing with this ENS actually exists (vs. findListing's fallback). */
export function hasListing(ens: string | undefined): boolean {
  return useApp.getState().listings.some((l) => l.manifest.ensName === ens);
}

export function findListing(ens: string | undefined): DappListing {
  const listings = useApp.getState().listings;
  return listings.find((l) => l.manifest.ensName === ens) ?? listings[0];
}

/** Pure store search: match query against name/description/category/creator/one-liner. */
export function filterListings(listings: DappListing[], query: string): DappListing[] {
  const q = query.trim().toLowerCase();
  if (!q) return listings;
  return listings.filter((l) => {
    const m = l.manifest;
    return (
      m.name.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.creator.toLowerCase().includes(q) ||
      l.oneLiner.toLowerCase().includes(q)
    );
  });
}

export function listingFromManifest(manifest: DappManifest): DappListing {
  const monogram = manifest.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return {
    manifest,
    monogram,
    runtimeTitle: manifest.name,
    oneLiner: manifest.description.split('.')[0] + '.',
    rating: 5.0,
    runs: 0,
    reviews: 0,
    recency: 'Just now',
    featured: false,
    section: 'recent',
  };
}
