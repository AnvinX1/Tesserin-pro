import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.rose-pine",
    name: "Rosé Pine",
    author: "mvllow",
    description: "All natural pine, faux fur and a bit of soho vibes — muted rose and gold tones.",
    version: "2.0.0",
    mode: "dark",
    preview: ["#191724", "#EBBCBA", "#E0DEF4"],
    category: "warm",
    downloads: 14300,
    rating: 4.7,
    colors: {
      "--bg-app": "#191724",
      "--bg-panel": "linear-gradient(145deg, #26233A, #191724)",
      "--bg-panel-inset": "#1F1D2E",
      "--text-primary": "#E0DEF4",
      "--text-secondary": "#908CAA",
      "--text-tertiary": "#6E6A86",
      "--text-on-accent": "#191724",
      "--accent-primary": "#EBBCBA",
      "--accent-pressed": "#F6C177",
      "--border-light": "rgba(235, 188, 186, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.4)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.35), -1px -1px 4px #26233A",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.35), -1px -1px 3px #26233A",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.35), inset -1px -1px 2px #26233A",
      "--graph-node": "#403D52",
      "--graph-link": "#524F67",
      "--code-bg": "#1F1D2E",
      "--tooltip-bg": "#26233A",
      "--tooltip-text": "#E0DEF4",
      "--tooltip-border": "rgba(235, 188, 186, 0.15)",
    },
  }

export default theme
