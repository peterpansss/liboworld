/**
 * Design tokens for the landing site.
 *
 * This file is the SHIPPED copy of `shared/tokens/colors.ts` from the
 * Claude-Libo monorepo. It's inlined here (rather than imported) because
 * GitHub Actions builds `libo-landing` in isolation, with no access to the
 * parent monorepo. Keep this in sync manually with the monorepo source of
 * truth at `Claude-Libo/shared/tokens/colors.ts`.
 *
 * CSS custom properties in index.css mirror these values — if you change a
 * color here, update index.css :root block to match (or vice-versa).
 */

export const darkColors = {
  bg: '#080808',
  bg2: '#0E0E0E',
  bg3: '#141414',
  bg4: '#1A1A1A',
  accent: '#CAFF00',
  accent2: '#9BC800',
  accentDim: 'rgba(202,255,0,0.12)',
  text: '#FFFFFF',
  muted: '#8A9BB0',
  dim: '#4A5568',
  border: 'rgba(255,255,255,0.07)',
  card: 'rgba(255,255,255,0.08)',
  error: '#F87171',
  errorDim: 'rgba(248,113,113,0.15)',
  success: '#22c55e',
  successDim: 'rgba(34,197,94,0.15)',
  warning: '#eab308',
  warningDim: 'rgba(234,179,8,0.15)',
  overlay: 'rgba(0,0,0,0.6)',
  overlayLight: 'rgba(255,255,255,0.2)',
} as const;

export const lightColors = {
  bg: '#F5F5F5',
  bg2: '#EEEEEE',
  bg3: '#E8E8E8',
  bg4: '#DDDDDD',
  accent: '#7A9900',
  accent2: '#5C7300',
  accentDim: 'rgba(122,153,0,0.10)',
  text: '#1A1A1A',
  muted: '#5A6A7A',
  dim: '#8A95A0',
  border: 'rgba(0,0,0,0.08)',
  card: 'rgba(0,0,0,0.03)',
  error: '#DC2626',
  errorDim: 'rgba(220,38,38,0.12)',
  success: '#16a34a',
  successDim: 'rgba(22,163,74,0.12)',
  warning: '#ca8a04',
  warningDim: 'rgba(202,138,4,0.12)',
  overlay: 'rgba(0,0,0,0.4)',
  overlayLight: 'rgba(0,0,0,0.08)',
} as const;

export const webExtras = {
  bgDeep: '#050505',
  bgElevated: '#1c1c1c',
  accentText: '#080B10',
  diffBeginner: '#4AC878',
  diffBeginnerBg: 'rgba(74,200,120,0.15)',
  diffIntermediate: '#C8AE4A',
  diffIntermediateBg: 'rgba(200,174,74,0.15)',
  diffAdvanced: '#C84A4A',
  diffAdvancedBg: 'rgba(200,74,74,0.15)',
} as const;

export const colors = darkColors;
export type ColorTheme = typeof darkColors;
