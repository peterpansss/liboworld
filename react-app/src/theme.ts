/**
 * Design tokens for the landing site, imported from the shared monorepo tokens.
 *
 * Usage in components:
 *   import { colors, webExtras } from '../theme';
 *
 * CSS custom properties in index.css mirror these values.
 * If you change a color here, update index.css :root block to match
 * (or vice-versa). The shared/tokens/colors.ts file is the source of truth.
 */

export { darkColors as colors, lightColors, webExtras } from '../../../shared/tokens/colors.ts';
export type { ColorTheme } from '../../../shared/tokens/colors.ts';
