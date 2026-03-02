import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.catppuccin-mocha",
    name: "Catppuccin Mocha",
    author: "Catppuccin",
    description: "Soothing pastel theme with warm undertones — the darkest Catppuccin flavor.",
    version: "1.3.0",
    mode: "dark",
    preview: ["#1E1E2E", "#CBA6F7", "#CDD6F4"],
    category: "colorful",
    downloads: 21800,
    rating: 4.9,
    colors: {
      "--bg-app": "#1E1E2E",
      "--bg-panel": "linear-gradient(145deg, #302D41, #1E1E2E)",
      "--bg-panel-inset": "#181825",
      "--text-primary": "#CDD6F4",
      "--text-secondary": "#BAC2DE",
      "--text-tertiary": "#6C7086",
      "--text-on-accent": "#1E1E2E",
      "--accent-primary": "#CBA6F7",
      "--accent-pressed": "#B4BEFE",
      "--border-light": "rgba(203, 166, 247, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.4)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.35), -1px -1px 4px #302D41",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.35), -1px -1px 3px #302D41",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.35), inset -1px -1px 2px #302D41",
      "--graph-node": "#45475A",
      "--graph-link": "#585B70",
      "--code-bg": "#181825",
      "--tooltip-bg": "#302D41",
      "--tooltip-text": "#CDD6F4",
      "--tooltip-border": "rgba(203, 166, 247, 0.15)",
    },
  }

export default theme
