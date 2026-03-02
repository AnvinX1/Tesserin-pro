/**
 * Theme Helpers
 *
 * Persistence utilities for the Tesserin theme system — install/uninstall,
 * active theme tracking, and CSS generation.
 */

import { getSetting, setSetting } from "@/lib/storage-client"
import type { TesserinTheme } from "./types"
import { ALL_THEMES, BUILTIN_THEMES } from "./registry"

/* ------------------------------------------------------------------ */
/*  Installed themes (localStorage)                                     */
/* ------------------------------------------------------------------ */

const INSTALLED_KEY = "tesserin:installed-themes"

/** Get the list of installed community theme IDs */
export function getInstalledThemeIds(): string[] {
  try {
    const raw = localStorage.getItem(INSTALLED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Mark a community theme as installed */
export function installTheme(themeId: string): void {
  const ids = getInstalledThemeIds()
  if (!ids.includes(themeId)) {
    ids.push(themeId)
    localStorage.setItem(INSTALLED_KEY, JSON.stringify(ids))
  }
}

/** Uninstall a community theme */
export function uninstallTheme(themeId: string): void {
  const ids = getInstalledThemeIds().filter((id) => id !== themeId)
  localStorage.setItem(INSTALLED_KEY, JSON.stringify(ids))
}

/** Check if a theme is installed */
export function isThemeInstalled(themeId: string): boolean {
  if (BUILTIN_THEMES.some((t) => t.id === themeId)) return true
  return getInstalledThemeIds().includes(themeId)
}

/* ------------------------------------------------------------------ */
/*  Active theme (persisted via settings)                               */
/* ------------------------------------------------------------------ */

/** Get the active theme ID from settings (defaults to "tesserin.obsidian-black") */
export async function getActiveThemeId(): Promise<string> {
  const val = await getSetting("appearance.customTheme")
  return val || "tesserin.obsidian-black"
}

/** Set the active theme */
export async function setActiveThemeId(themeId: string): Promise<void> {
  await setSetting("appearance.customTheme", themeId)
}

/* ------------------------------------------------------------------ */
/*  Lookup & CSS generation                                             */
/* ------------------------------------------------------------------ */

/** Resolve a theme by ID */
export function getThemeById(id: string): TesserinTheme | undefined {
  return ALL_THEMES.find((t) => t.id === id)
}

/** Generate CSS custom property overrides for a theme */
export function generateThemeCSS(theme: TesserinTheme): string {
  const selector = theme.mode === "dark" ? ".theme-dark" : ".theme-light"
  const colorProps = Object.entries(theme.colors)
    .map(([key, value]) => `    ${key}: ${value};`)
    .join("\n")
  const styleProps = theme.styles
    ? Object.entries(theme.styles)
        .filter(([, v]) => v !== undefined)
        .map(([key, value]) => `    ${key}: ${value};`)
        .join("\n")
    : ""
  const allProps = styleProps ? `${colorProps}\n${styleProps}` : colorProps
  return `${selector} {\n${allProps}\n}`
}
