/**
 * Theme Types
 *
 * Shared type definitions for the Tesserin theme system.
 * If you're contributing a new theme, your file just needs to export
 * an object satisfying the `TesserinTheme` interface.
 */

/* ------------------------------------------------------------------ */
/*  Color tokens                                                        */
/* ------------------------------------------------------------------ */

export interface ThemeColors {
  "--bg-app": string
  "--bg-panel": string
  "--bg-panel-inset": string
  "--text-primary": string
  "--text-secondary": string
  "--text-tertiary": string
  "--text-on-accent": string
  "--accent-primary": string
  "--accent-pressed": string
  "--border-light": string
  "--border-dark": string
  "--panel-outer-shadow": string
  "--btn-shadow": string
  "--input-inner-shadow": string
  "--graph-node": string
  "--graph-link": string
  "--code-bg": string
  "--tooltip-bg": string
  "--tooltip-text": string
  "--tooltip-border": string
}

/* ------------------------------------------------------------------ */
/*  Structural / layout overrides                                       */
/* ------------------------------------------------------------------ */

/** Optional structural style overrides per theme (uses defaults if omitted). */
export interface ThemeStyles {
  "--radius-panel"?: string
  "--radius-btn"?: string
  "--radius-inset"?: string
  "--border-width"?: string
  "--backdrop-blur"?: string
  "--btn-hover-lift"?: string
  "--btn-active-press"?: string
  "--panel-border-bottom"?: string
  "--inset-border-bottom"?: string
  "--scrollbar-radius"?: string
  "--accent-glow"?: string
}

/* ------------------------------------------------------------------ */
/*  Theme definition                                                    */
/* ------------------------------------------------------------------ */

export interface TesserinTheme {
  /** Unique identifier, e.g. "community.my-theme" */
  id: string
  /** Human-readable name */
  name: string
  /** Author / contributor name */
  author: string
  /** Short description shown in the theme browser */
  description: string
  /** Semver version string */
  version: string
  /** Base mode — determines which CSS selector gets the overrides */
  mode: "dark" | "light"
  /** Color token overrides */
  colors: ThemeColors
  /** Structural overrides (border-radius, blur, etc.) */
  styles?: ThemeStyles
  /** Three hex colors for the preview card: [bg, accent, text] */
  preview: [string, string, string]
  /** Download count (community themes) */
  downloads?: number
  /** Rating 0-5 */
  rating?: number
  /** Category for filtering in the theme browser */
  category?: ThemeCategory
}

export type ThemeCategory =
  | "all"
  | "dark"
  | "light"
  | "colorful"
  | "minimal"
  | "warm"
  | "cool"
  | "monochrome"
  | "brutalism"
  | "glass"
  | "clay"
  | "retro"
  | "pastel"
