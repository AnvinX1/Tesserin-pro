/**
 * Keyboard Shortcuts System
 *
 * Manages customizable keyboard shortcuts with defaults and user overrides.
 * Shortcuts are stored in localStorage for persistence.
 */

import { getSetting, setSetting } from "./storage-client"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ShortcutDefinition {
  /** Unique action identifier */
  id: string
  /** Display label */
  label: string
  /** Default key combo (e.g. "Ctrl+K") */
  defaultKeys: string
  /** Category for UI grouping */
  category: "navigation" | "panels" | "editor" | "ai"
}

export interface ShortcutBinding {
  id: string
  keys: string
}

/* ------------------------------------------------------------------ */
/*  Default shortcuts                                                  */
/* ------------------------------------------------------------------ */

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  { id: "search-palette",    label: "Search / Command Palette", defaultKeys: "Ctrl+K",       category: "navigation" },
  { id: "export-panel",      label: "Export Note",              defaultKeys: "Ctrl+E",       category: "panels" },
  { id: "template-manager",  label: "Template Manager",         defaultKeys: "Ctrl+T",       category: "panels" },
  { id: "toggle-backlinks",  label: "Toggle Backlinks",         defaultKeys: "Ctrl+Shift+B", category: "panels" },
  { id: "version-history",   label: "Version History",          defaultKeys: "Ctrl+Shift+H", category: "panels" },
  { id: "quick-capture",     label: "Quick Capture",            defaultKeys: "Ctrl+Shift+D", category: "panels" },
  { id: "references",        label: "Reference Manager",        defaultKeys: "Ctrl+Shift+R", category: "panels" },
  { id: "toggle-split",      label: "Toggle Split View",        defaultKeys: "Ctrl+\\",      category: "editor" },
  // Window management — registered as global shortcuts in the Electron main process
  { id: "window-fullscreen", label: "Toggle Full Screen",        defaultKeys: "F11",          category: "navigation" },
  { id: "window-minimize",   label: "Minimize Window",           defaultKeys: "Ctrl+M",       category: "navigation" },
  { id: "window-maximize",   label: "Maximize / Restore Window", defaultKeys: "Ctrl+Shift+F", category: "navigation" },
  { id: "window-snap-left",  label: "Snap Window Left Half",     defaultKeys: "Super+Left",   category: "navigation" },
  { id: "window-snap-right", label: "Snap Window Right Half",    defaultKeys: "Super+Right",  category: "navigation" },
  { id: "window-snap-max",   label: "Snap Window Maximize",      defaultKeys: "Super+Up",     category: "navigation" },
  { id: "window-snap-restore",label: "Restore / Minimize Window",defaultKeys: "Super+Down",   category: "navigation" },
  // Split pane divider keyboard resize — active when a split is open
  { id: "split-shrink",      label: "Shrink Primary Pane",       defaultKeys: "Ctrl+ArrowLeft",  category: "editor" },
  { id: "split-grow",        label: "Grow Primary Pane",         defaultKeys: "Ctrl+ArrowRight", category: "editor" },
]

/* ------------------------------------------------------------------ */
/*  Parse & match helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Parse a shortcut string like "Ctrl+Shift+K" into its components.
 */
export function parseShortcut(keys: string): { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean; key: string } {
  const parts = keys.split("+").map((p) => p.trim())
  const result = { ctrl: false, shift: false, alt: false, meta: false, key: "" }
  for (const part of parts) {
    const lower = part.toLowerCase()
    if (lower === "ctrl" || lower === "cmd") result.ctrl = true
    else if (lower === "shift") result.shift = true
    else if (lower === "alt" || lower === "option") result.alt = true
    else if (lower === "meta") result.meta = true
    else result.key = part
  }
  return result
}

/**
 * Check if a keyboard event matches a shortcut string.
 */
export function matchesShortcut(e: KeyboardEvent, keys: string): boolean {
  const parsed = parseShortcut(keys)
  const mod = e.metaKey || e.ctrlKey
  if (parsed.ctrl && !mod) return false
  if (parsed.shift && !e.shiftKey) return false
  if (parsed.alt && !e.altKey) return false
  // Compare key case-insensitively, handle special keys
  const eventKey = e.key === "\\" ? "\\" : e.key
  return eventKey.toLowerCase() === parsed.key.toLowerCase()
}

/**
 * Format a shortcut string for display (prettify).
 */
export function formatShortcutDisplay(keys: string): string {
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.userAgent)
  return keys
    .replace(/Ctrl/gi, isMac ? "⌘" : "Ctrl")
    .replace(/Shift/gi, isMac ? "⇧" : "Shift")
    .replace(/Alt/gi, isMac ? "⌥" : "Alt")
    .replace(/\+/g, " + ")
}

/**
 * Convert a keyboard event to a shortcut string (for capturing new bindings).
 */
export function eventToShortcutString(e: KeyboardEvent): string | null {
  // Ignore modifier-only presses
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push("Ctrl")
  if (e.shiftKey) parts.push("Shift")
  if (e.altKey) parts.push("Alt")

  // Normalize key
  let key = e.key
  if (key === " ") key = "Space"
  else if (key.length === 1) key = key.toUpperCase()

  parts.push(key)
  return parts.join("+")
}

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "shortcuts.custom"

/**
 * Load custom shortcut overrides from settings.
 */
export async function loadCustomShortcuts(): Promise<Record<string, string>> {
  try {
    const raw = await getSetting(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

/**
 * Save custom shortcut overrides to settings.
 */
export async function saveCustomShortcuts(overrides: Record<string, string>): Promise<void> {
  await setSetting(STORAGE_KEY, JSON.stringify(overrides))
}

/**
 * Get the effective key binding for a shortcut (custom override or default).
 */
export function getEffectiveBinding(
  shortcutId: string,
  customOverrides: Record<string, string>,
): string {
  if (customOverrides[shortcutId]) return customOverrides[shortcutId]
  const def = DEFAULT_SHORTCUTS.find((s) => s.id === shortcutId)
  return def?.defaultKeys ?? ""
}
