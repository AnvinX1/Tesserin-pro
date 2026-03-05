"use client"

import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from "react"
import { getSetting, setSetting } from "@/lib/storage-client"
import { getThemeById, generateThemeCSS, getActiveThemeId } from "@/lib/theme-store"/**
 * TesserinThemeContext
 *
 * Provides a centralized, reactive theme toggle for the Tesserin
 * skeuomorphic design system. The two palettes are:
 *
 *  - **Ceramic White** (light) – soft shadows, warm inset panels
 *  - **Obsidian Black** (dark) – deep shadow depth, matte-black panels
 *
 * CSS custom properties are injected via a `<style>` block so that
 * every descendant can reference `var(--bg-app)`, `var(--accent-primary)`,
 * etc. without any build-time configuration.
 */

interface ThemeContextValue {
  /** `true` when the Obsidian (dark) palette is active */
  isDark: boolean
  /** Toggle between Ceramic White (Warm Ivory) and Obsidian Black */
  toggleTheme: () => void
  /** Explicitly set the theme string */
  setTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: () => { },
  setTheme: () => { },
})

/** Hook to consume the Tesserin theme context */
export const useTesserinTheme = () => useContext(ThemeContext)

/* ------------------------------------------------------------------ */
/*  CSS custom-property definitions for both palettes                  */
/* ------------------------------------------------------------------ */

const THEME_STYLES = `
  :root {
    --transition-speed: 0.4s;
    /* Structural defaults — overridden by custom themes */
    --radius-panel: 20px;
    --radius-btn: 14px;
    --radius-inset: 14px;
    --border-width: 1px;
    --backdrop-blur: none;
    --btn-hover-lift: -2px;
    --btn-active-press: 1px;
    --panel-border-bottom: var(--border-dark);
    --inset-border-bottom: rgba(255,255,255,0.5);
    --scrollbar-radius: 10px;
    --accent-glow: none;
  }

  .theme-dark {
    /* OBSIDIAN BLACK PALETTE */
    --bg-app: #050505;
    --bg-panel: linear-gradient(145deg, #111111, #080808);
    --bg-panel-inset: #000000;
    --bg-menu-obsidian: #0a0a0a;
    --text-on-obsidian: #ededed;

    --text-primary: #ededed;
    --text-secondary: #888888;
    --text-tertiary: #666666;
    --text-on-accent: #000000;

    --accent-primary: #FACC15;
    --accent-pressed: #EAB308;

    --border-light: rgba(255, 255, 255, 0.06);
    --border-dark: rgba(0, 0, 0, 0.8);

    --panel-outer-shadow: 5px 5px 15px #000000, -1px -1px 4px #1c1c1c;
    --btn-shadow: 4px 4px 8px #000000, -1px -1px 3px #1f1f1f;
    --input-inner-shadow: inset 2px 2px 5px #000000, inset -1px -1px 2px #1a1a1a;

    --graph-node: #333333;
    --graph-link: #333333;
    --code-bg: #000000;

    --tooltip-bg: #1a1a1a;
    --tooltip-text: #ededed;
    --tooltip-border: rgba(255, 255, 255, 0.08);
  }

  .theme-light {
    /* WARM IVORY PALETTE — soft parchment feel */
    --bg-app: #f8f6f1;
    --bg-panel: linear-gradient(145deg, #faf8f4, #f3f0e8);
    --bg-panel-inset: #eee9dc;
    --bg-menu-obsidian: #1a1a1b;
    --text-on-obsidian: #f5f3ed;

    --text-primary: #33302b;
    --text-secondary: #6e6960;
    --text-tertiary: #9e9889;
    --text-on-accent: #2c2517;

    --accent-primary: #d4a829;
    --accent-pressed: #c49b22;

    --border-light: rgba(255, 255, 255, 0.65);
    --border-dark: rgba(120, 100, 70, 0.08);

    --panel-outer-shadow: 6px 6px 16px rgba(195, 187, 170, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.7);
    --btn-shadow: 3px 3px 8px rgba(195, 187, 170, 0.3), -3px -3px 8px rgba(255, 255, 255, 0.65);
    --input-inner-shadow: inset 2px 2px 6px rgba(195, 187, 170, 0.3), inset -2px -2px 6px rgba(255, 255, 255, 0.65);

    --graph-node: #ddd8cc;
    --graph-link: #ccc7bb;
    --code-bg: #f5f3ed;

    --tooltip-bg: #3d3a35;
    --tooltip-text: #f5f3ed;
    --tooltip-border: rgba(255, 255, 255, 0.1);
  }

  /* ------------------------------------------------------------------ */
  /*  Skeuomorphic utility classes (use CSS custom properties)           */
  /* ------------------------------------------------------------------ */

  .skeuo-panel {
    background: var(--bg-panel);
    box-shadow: var(--panel-outer-shadow);
    border: var(--border-width) solid var(--border-light);
    border-bottom-color: var(--panel-border-bottom);
    border-radius: var(--radius-panel);
    backdrop-filter: var(--backdrop-blur);
    -webkit-backdrop-filter: var(--backdrop-blur);
    transition: all var(--transition-speed);
  }

  .skeuo-inset {
    background: var(--bg-panel-inset);
    box-shadow: var(--input-inner-shadow);
    border-radius: var(--radius-inset);
    border: var(--border-width) solid transparent;
    border-bottom-color: var(--inset-border-bottom);
    backdrop-filter: var(--backdrop-blur);
    -webkit-backdrop-filter: var(--backdrop-blur);
    transition: all var(--transition-speed);
  }

  .skeuo-btn {
    background: var(--bg-panel);
    box-shadow: var(--btn-shadow);
    color: var(--text-secondary);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    border: var(--border-width) solid var(--border-light);
    border-bottom-color: var(--panel-border-bottom);
    border-radius: var(--radius-btn);
    backdrop-filter: var(--backdrop-blur);
    -webkit-backdrop-filter: var(--backdrop-blur);
    cursor: pointer;
  }

  .skeuo-btn:active, .skeuo-btn.active {
    box-shadow: var(--input-inner-shadow), var(--accent-glow);
    color: var(--text-on-accent);
    background: var(--accent-primary);
    transform: translateY(var(--btn-active-press));
    border-color: transparent;
  }

  .skeuo-btn:hover:not(.active):not(:active) {
    transform: translateY(var(--btn-hover-lift));
    color: var(--text-primary);
  }

  /* Custom scrollbar */
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: var(--text-tertiary);
    border-radius: 10px;
    border: 2px solid var(--bg-app);
  }

  /* LED indicator (used in AudioDeck) */
  .led-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
    box-shadow: 0 0 5px #ef4444, inset 1px 1px 2px rgba(255,255,255,0.5);
    border: 1px solid rgba(0,0,0,0.2);
  }
  .led-indicator.on {
    background-color: #22c55e;
    box-shadow: 0 0 8px #22c55e, inset 1px 1px 2px rgba(255,255,255,0.8);
  }

  /* Loading bar animation */
  @keyframes progress {
    0% { width: 0%; }
    100% { width: 100%; }
  }

  /* Loading screen animations */
  @keyframes loading-progress {
    0%   { width: 0%; }
    100% { width: 100%; }
  }

  @keyframes loading-pulse {
    0%, 100% { opacity: 0.4; transform: translate(-50%, -60%) scale(1); }
    50%      { opacity: 1; transform: translate(-50%, -60%) scale(1.15); }
  }

  @keyframes loading-float {
    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
    50%      { transform: translateY(-18px) scale(1.3); opacity: 0.7; }
  }

  /* ── Global UI readability ────────────────────────────────── */
  html {
    /* Use 18px root instead of browser default 16px.
       All rem-based Tailwind utilities (text-xs, text-sm, etc.)
       and spacing scale up proportionally without breaking
       viewport-height layouts (no zoom overflow). */
    font-size: 18px;
  }

  .theme-dark, .theme-light {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Floor tiny pixel text sizes for comfortable reading */
  .text-\[9px\]  { font-size: 11px !important; }
  .text-\[10px\] { font-size: 12px !important; }
  .text-\[11px\] { font-size: 13px !important; }

  /* ── Pane header — glassmorphic compact bar ─────────────── */
  .pane-header {
    background: color-mix(in srgb, var(--bg-panel-flat, var(--bg-panel)) 85%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  /* ── Editor prose typography ─────────────────────────────── */
  .prose-tesserin {
    line-height: 1.8;
    letter-spacing: -0.01em;
  }
  .prose-tesserin h1 { letter-spacing: -0.025em; }
  .prose-tesserin h2 { letter-spacing: -0.02em; }
  .prose-tesserin p { margin-top: 0.75em; margin-bottom: 0.75em; }
  .prose-tesserin blockquote { margin-top: 1em; margin-bottom: 1em; }
  .prose-tesserin pre { margin-top: 1em; margin-bottom: 1em; }
  .prose-tesserin ul, .prose-tesserin ol { margin-top: 0.5em; margin-bottom: 0.5em; }
`

/* ------------------------------------------------------------------ */
/*  Provider component                                                 */
/* ------------------------------------------------------------------ */

interface ThemeProviderProps {
  children: React.ReactNode
}

export function TesserinThemeProvider({
  children,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState(() => {
    // Attempt synchronous hydration from browser localStorage to prevent flash
    try {
      if (typeof window !== "undefined") {
        const stored = window.localStorage.getItem("tesserin:settings")
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed["appearance.theme"]) return parsed["appearance.theme"]
        }
      }
    } catch { }
    return "dark"
  })

  useEffect(() => {
    getSetting("appearance.theme").then((val) => {
      if (val) setThemeState(val)
    })
    // Restore custom theme CSS overrides on mount
    getActiveThemeId().then((themeId) => {
      const theme = getThemeById(themeId)
      if (theme) {
        const cssId = "tesserin-custom-theme"
        let el = document.getElementById(cssId)
        if (!el) {
          el = document.createElement("style")
          el.id = cssId
          document.head.appendChild(el)
        }
        el.textContent = generateThemeCSS(theme)
      }
    })
  }, [])

  const isDark = theme === "dark"

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setThemeState(newTheme)
    setSetting("appearance.theme", newTheme).catch()
  }, [theme])

  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme)
    setSetting("appearance.theme", newTheme).catch()
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, setTheme }}>
      <ThemeStyles />
      <div className={theme === "dark" ? "theme-dark" : "theme-light"}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

/** Injects theme CSS once into <head> and never re-renders */
function ThemeStyles() {
  const injected = useRef(false)
  useEffect(() => {
    if (injected.current) return
    injected.current = true
    if (!document.getElementById('tesserin-theme-styles')) {
      const style = document.createElement('style')
      style.id = 'tesserin-theme-styles'
      style.textContent = THEME_STYLES
      document.head.appendChild(style)
    }
  }, [])
  return null
}
