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

/** Theme tokens. A proxy so the same import works for both light and dark. */
export const C: Palette = new Proxy({} as Palette, {
  get: (_target, key) => activePalette[key as keyof Palette],
});

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
