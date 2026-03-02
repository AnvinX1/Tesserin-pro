/**
 * Theme Store — Backward-compatible re-export
 *
 * All theme logic has been split into lib/themes/ for maintainability.
 * This file re-exports everything so existing imports still work.
 *
 * @see lib/themes/index.ts
 */

export {
  type ThemeColors,
  type ThemeStyles,
  type TesserinTheme,
  type ThemeCategory,
  BUILTIN_THEMES,
  COMMUNITY_THEMES,
  ALL_THEMES,
  getInstalledThemeIds,
  installTheme,
  uninstallTheme,
  isThemeInstalled,
  getActiveThemeId,
  setActiveThemeId,
  getThemeById,
  generateThemeCSS,
} from "./themes"
