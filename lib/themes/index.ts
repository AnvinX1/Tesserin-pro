/**
 * Tesserin Theme System
 *
 * Barrel export — everything consumers need is re-exported from here.
 *
 * Directory layout:
 *   lib/themes/
 *     types.ts          — ThemeColors, ThemeStyles, TesserinTheme, ThemeCategory
 *     helpers.ts        — persistence, lookup, CSS generation
 *     registry.ts       — collects built-in + community into arrays
 *     index.ts          — (this file) barrel re-export
 *     builtin/          — one file per built-in theme
 *     community/        — one file per community theme (contributors add here)
 *
 * To add a new community theme, create a file in community/ that
 * default-exports a TesserinTheme, then add it to community/index.ts.
 * See CONTRIBUTING.md for full instructions.
 */

// Types
export type {
  ThemeColors,
  ThemeStyles,
  TesserinTheme,
  ThemeCategory,
} from "./types"

// Theme collections
export {
  BUILTIN_THEMES,
  COMMUNITY_THEMES,
  ALL_THEMES,
} from "./registry"

// Helpers
export {
  getInstalledThemeIds,
  installTheme,
  uninstallTheme,
  isThemeInstalled,
  getActiveThemeId,
  setActiveThemeId,
  getThemeById,
  generateThemeCSS,
} from "./helpers"
