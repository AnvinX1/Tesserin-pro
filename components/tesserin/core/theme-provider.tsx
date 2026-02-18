"use client"

import React, { createContext, useContext, useCallback } from "react"

/**
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
  /** Toggle between Ceramic White and Obsidian Black */
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  toggleTheme: () => {},
})

/** Hook to consume the Tesserin theme context */
export const useTesserinTheme = () => useContext(ThemeContext)

/* ------------------------------------------------------------------ */
/*  CSS custom-property definitions for both palettes                  */
/* ------------------------------------------------------------------ */

const THEME_STYLES = `
  :root { --transition-speed: 0.4s; }

  .theme-dark {
    /* OBSIDIAN BLACK PALETTE */
    --bg-app: #050505;
    --bg-panel: linear-gradient(145deg, #111111, #080808);
    --bg-panel-inset: #000000;

    --text-primary: #ededed;
    --text-secondary: #888888;
    --text-tertiary: #444444;
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
  }

  .theme-light {
    /* CERAMIC WHITE PALETTE */
    --bg-app: #eef2f6;
    --bg-panel: linear-gradient(145deg, #ffffff, #f0f0f0);
    --bg-panel-inset: #e2e6ea;

    --text-primary: #1a1c20;
    --text-secondary: #64748b;
    --text-tertiary: #94a3b8;
    --text-on-accent: #1a1c20;

    --accent-primary: #FACC15;
    --accent-pressed: #EAB308;

    --border-light: #ffffff;
    --border-dark: #d1d9e6;

    --panel-outer-shadow: 12px 12px 24px #cbd5e1, -12px -12px 24px #ffffff;
    --btn-shadow: 6px 6px 12px #cbd5e1, -6px -6px 12px #ffffff;
    --input-inner-shadow: inset 5px 5px 10px #cbd5e1, inset -5px -5px 10px #ffffff;

    --graph-node: #cbd5e1;
    --graph-link: #e2e8f0;
    --code-bg: #f8fafc;
  }

  /* ------------------------------------------------------------------ */
  /*  Skeuomorphic utility classes                                       */
  /* ------------------------------------------------------------------ */

  .skeuo-panel {
    background: var(--bg-panel);
    box-shadow: var(--panel-outer-shadow);
    border: 1px solid var(--border-light);
    border-bottom-color: var(--border-dark);
    border-radius: 20px;
    transition: all var(--transition-speed);
  }

  .skeuo-inset {
    background: var(--bg-panel-inset);
    box-shadow: var(--input-inner-shadow);
    border-radius: 14px;
    border: 1px solid transparent;
    border-bottom-color: rgba(255,255,255,0.5);
    transition: all var(--transition-speed);
  }

  .skeuo-btn {
    background: var(--bg-panel);
    box-shadow: var(--btn-shadow);
    color: var(--text-secondary);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--border-light);
    border-bottom-color: var(--border-dark);
    border-radius: 14px;
    cursor: pointer;
  }

  .skeuo-btn:active, .skeuo-btn.active {
    box-shadow: var(--input-inner-shadow);
    color: var(--text-on-accent);
    background: var(--accent-primary);
    transform: translateY(1px);
    border-color: transparent;
  }

  .skeuo-btn:hover:not(.active):not(:active) {
    transform: translateY(-2px);
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

  /* Spin-reverse keyframe for the logo */
  @keyframes animate-spin-reverse {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  /* Loading bar animation */
  @keyframes progress {
    0% { width: 0%; }
    100% { width: 100%; }
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
  // Tesserin is strictly dark mode (Obsidian Black)
  const isDark = true
  const toggleTheme = useCallback(() => {}, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className="theme-dark">
        {/* Inject custom properties into the document */}
        <style dangerouslySetInnerHTML={{ __html: THEME_STYLES }} />
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
