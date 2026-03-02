import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.tokyo-night",
    name: "Tokyo Night",
    author: "enkia",
    description: "A clean dark theme inspired by the lights of Tokyo at night — neon blue accents.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#1A1B26", "#7AA2F7", "#C0CAF5"],
    category: "cool",
    downloads: 16700,
    rating: 4.8,
    colors: {
      "--bg-app": "#1A1B26",
      "--bg-panel": "linear-gradient(145deg, #24283B, #1A1B26)",
      "--bg-panel-inset": "#16161E",
      "--text-primary": "#C0CAF5",
      "--text-secondary": "#9AA5CE",
      "--text-tertiary": "#565F89",
      "--text-on-accent": "#1A1B26",
      "--accent-primary": "#7AA2F7",
      "--accent-pressed": "#7DCFFF",
      "--border-light": "rgba(122, 162, 247, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #24283B",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #24283B",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #24283B",
      "--graph-node": "#3B4261",
      "--graph-link": "#414868",
      "--code-bg": "#16161E",
      "--tooltip-bg": "#24283B",
      "--tooltip-text": "#C0CAF5",
      "--tooltip-border": "rgba(122, 162, 247, 0.15)",
    },
  }

export default theme
