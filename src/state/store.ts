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

const THEME_KEY = 'dappdock.theme';
const LOYALTY_KEY = 'dappdock.loyalty';

/** Per-dapp loyalty pass: stamps toward the current reward, lifetime points, rewards claimed. */
export type LoyaltyRecord = { punches: number; points: number; redeemed: number };

/** Demo head-start so the punch card isn't empty on first open. */
const LOYALTY_SEED: Record<string, LoyaltyRecord> = {
  'burgerblock.dappdock.eth': { punches: 7, points: 6450, redeemed: 2 },
};

async function persistTheme(mode: ThemeMode) {
  try {
    if (Platform.OS === 'web') localStorage.setItem(THEME_KEY, mode);
    else await SecureStore.setItemAsync(THEME_KEY, mode);
  } catch {
    // non-fatal: theme just won't persist
  }
}

async function persistLoyalty(loyalty: Record<string, LoyaltyRecord>) {
  try {
    const json = JSON.stringify(loyalty);
    if (Platform.OS === 'web') localStorage.setItem(LOYALTY_KEY, json);
    else await SecureStore.setItemAsync(LOYALTY_KEY, json);
  } catch {
    // non-fatal: stamps just won't persist
  }
}

/** Restore saved loyalty passes; called from _layout alongside the theme. */
export async function loadLoyaltyState() {
  try {
    const saved =
      Platform.OS === 'web'
        ? localStorage.getItem(LOYALTY_KEY)
        : await SecureStore.getItemAsync(LOYALTY_KEY);
    if (saved) {
      useApp.setState({ loyalty: { ...LOYALTY_SEED, ...JSON.parse(saved) } });
    }
  } catch {
    // keep seed
  }
}

/** Restore the saved theme before first paint settles; called from _layout. */
export async function loadThemePreference() {
  try {
    const saved =
      Platform.OS === 'web'
        ? localStorage.getItem(THEME_KEY)
        : await SecureStore.getItemAsync(THEME_KEY);
    if (saved === 'dark' || saved === 'light') {
      setActivePalette(saved);
      useApp.setState({ themeMode: saved });
    }
  } catch {
    // keep default
  }
}

type AppState = {
  // appearance
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  // session / World ID
  verified: boolean;
  verifiedSimulated: boolean;
  setVerified: (v: { verified: boolean; simulated: boolean }) => void;

  // embedded wallet
  wallet: WalletSnapshot | null;
  setWallet: (w: WalletSnapshot) => void;

  // loyalty passes (punch cards / points per dapp)
  loyalty: Record<string, LoyaltyRecord>;
  addStamp: (ens: string, points: number) => void;
  redeemReward: (ens: string, cardSize: number) => void;

  // store catalogue
  listings: DappListing[];
  builderCredits: number;
  publishedCount: number;
  addListing: (l: DappListing) => void;
  markPublished: () => void;

  // agent conversation
  apiHistory: ApiMessage[];
  messages: UiMessage[];
  agentBusy: boolean;
  pushMessage: (m: UiMessage) => void;
  setAgentBusy: (b: boolean) => void;

  // generated draft
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
    persistTheme(mode);
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
    persistLoyalty(loyalty);
    set({ loyalty });
  },
  redeemReward: (ens, cardSize) => {
    const prev = get().loyalty[ens] ?? { punches: 0, points: 0, redeemed: 0 };
    const loyalty = {
      ...get().loyalty,
      [ens]: { ...prev, punches: Math.max(0, prev.punches - cardSize), redeemed: prev.redeemed + 1 },
    };
    persistLoyalty(loyalty);
    set({ loyalty });
  },

  listings: SEED_LISTINGS,
  builderCredits: 3,
  publishedCount: 0,
  addListing: (l) => set({ listings: [l, ...get().listings] }),
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

export function findListing(ens: string | undefined): DappListing {
  const listings = useApp.getState().listings;
  return listings.find((l) => l.manifest.ensName === ens) ?? listings[0];
}

/** Wrap a freshly drafted manifest as a store listing once published. */
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
