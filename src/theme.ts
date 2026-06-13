export type ThemeMode = 'light' | 'dark';

/**
 * Light palette — tuned for more contrast than the original handoff values:
 * darker secondary text, deeper soft-blues, stronger dividers, and a slightly
 * dimmer app background so white cards separate clearly.
 */
const light = {
  bg: '#EDEFF5',
  surface: '#FFFFFF',
  blueSoft: '#CFDDFF',
  blueSoftDeep: '#B3C9FF',
  blueInk: '#0E1638',
  blueBody: '#1B2A55',
  blueMeta: '#33457F',
  blueLink: '#2843A8',
  accent: '#86A4F4',
  text: '#070B18',
  text2: '#4A5468',
  text3: '#788096',
  textBody: '#161D33',
  textNote: '#303A56',
  divider: '#D5D9E3',
  dividerSoft: '#E6E9F0',
  cta: '#000000',
  ctaText: '#FFFFFF',
  successBg: '#CDEEDC',
  success: '#0E6B38',
  successStrong: '#1E9D58',
  warnBg: '#FCEBBC',
  warn: '#705409',
  dangerBg: '#F8D7D1',
  danger: '#8C2F23',
  segBg: '#DCDFE9',
  stepIdleBg: '#E1E4EC',
  stepIdleNum: '#8A92A6',
  inkPanel: '#16204A',
  // Text + surfaces that sit ON the dark `inkPanel` (which stays dark in BOTH
  // themes), so these are identical across light/dark. Tokenized here because
  // they were previously repeated as raw hex (#B8C6F2 / #9FB0DA / #8C9BCB) in
  // ~20 places — centralizing keeps the dark-panel language coherent.
  onInk: '#FFFFFF', // primary text on ink
  onInkLabel: '#B8C6F2', // bright uppercase label / accent text
  onInkDim: '#9FB0DA', // secondary text
  onInkFaint: '#8C9BCB', // tertiary / idle text
  onInkChip: 'rgba(255,255,255,0.12)', // pill / chip surface on ink
  onInkHair: 'rgba(255,255,255,0.12)', // hairline divider on ink
  onInkTrack: 'rgba(255,255,255,0.14)', // progress-track on ink
  white: '#FFFFFF',
};

export type Palette = typeof light;

/** Dark palette — same roles, inverted surfaces, lifted blues for legibility. */
const dark: Palette = {
  bg: '#0B0E17',
  surface: '#171B28',
  blueSoft: '#243156',
  blueSoftDeep: '#2E3F6E',
  blueInk: '#E5EBFF',
  blueBody: '#C7D2F2',
  blueMeta: '#94A6DB',
  blueLink: '#92ADF5',
  accent: '#86A4F4',
  text: '#F2F4FA',
  text2: '#9AA3B8',
  text3: '#6E7689',
  textBody: '#D9DDE8',
  textNote: '#B1B8C9',
  divider: '#2B3142',
  dividerSoft: '#212737',
  cta: '#FFFFFF',
  ctaText: '#0B0E17',
  successBg: '#123322',
  success: '#52CE8C',
  successStrong: '#2FB873',
  warnBg: '#352B0E',
  warn: '#E5BC51',
  dangerBg: '#371711',
  danger: '#E5826F',
  segBg: '#1E2433',
  stepIdleBg: '#232938',
  stepIdleNum: '#5C6478',
  inkPanel: '#1D2845',
  // On-ink tokens — identical to light (the ink panel is dark in both themes).
  onInk: '#FFFFFF',
  onInkLabel: '#B8C6F2',
  onInkDim: '#9FB0DA',
  onInkFaint: '#8C9BCB',
  onInkChip: 'rgba(255,255,255,0.12)',
  onInkHair: 'rgba(255,255,255,0.12)',
  onInkTrack: 'rgba(255,255,255,0.14)',
  white: '#FFFFFF',
};

const palettes: Record<ThemeMode, Palette> = { light, dark };

let activePalette: Palette = light;

/**
 * Swap the palette `C` resolves against. Components read `C.x` during render,
 * so anything that re-renders after this call picks up the new colors — every
 * route screen subscribes to `themeMode` in the store for exactly that.
 */
export function setActivePalette(mode: ThemeMode) {
  activePalette = palettes[mode];
}

/** Background colour for a mode without switching the active palette — used by
 *  the theme-change crossfade overlay so it can fade from the previous bg. */
export function bgFor(mode: ThemeMode): string {
  return palettes[mode].bg;
}

/** Theme tokens. A proxy so the same import works for both light and dark. */
export const C: Palette = new Proxy({} as Palette, {
  get: (_target, key) => activePalette[key as keyof Palette],
});

/**
 * Corner-radius scale. The app previously used a scattered set of radii
 * (11/12/13/14/16/18/20/21/22/24/26/28); this is the canonical ladder so new
 * UI stays on a consistent rhythm:
 *   xs control insets · sm inner chips/buttons · md inputs · lg list rows ·
 *   xl cards · xxl hero/feature panels · pill fully-rounded.
 */
export const RADIUS = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 22,
  xxl: 26,
  pill: 999,
} as const;

/** Geist family name for a given weight. */
export function font(weight: 400 | 500 | 600 | 700 | 800): string {
  switch (weight) {
    case 400: return 'Geist_400Regular';
    case 500: return 'Geist_500Medium';
    case 600: return 'Geist_600SemiBold';
    case 700: return 'Geist_700Bold';
    case 800: return 'Geist_800ExtraBold';
  }
}

/** letterSpacing in px for an em value at a font size. */
export const ls = (em: number, size: number) => em * size;

/**
 * The active background as an `rgba()` string with the given alpha. Use as the
 * transparent stop of a fade-to-bg gradient so it tracks the current theme
 * (avoids both the light-mode haze in dark mode and the iOS "transparent black"
 * grey ghost). Read during render so it repaints on theme toggle.
 */
export function bgWithAlpha(alpha: number): string {
  const hex = activePalette.bg.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
