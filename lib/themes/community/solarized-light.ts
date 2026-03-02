import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.solarized-light",
    name: "Solarized Light",
    author: "Ethan Schoonover",
    description: "Solarized light variant — warm cream base with precision-calibrated accent colors.",
    version: "1.0.0",
    mode: "light",
    preview: ["#FDF6E3", "#B58900", "#657B83"],
    category: "warm",
    downloads: 9800,
    rating: 4.5,
    colors: {
      "--bg-app": "#FDF6E3",
      "--bg-panel": "linear-gradient(145deg, #FDF6E3, #EEE8D5)",
      "--bg-panel-inset": "#EEE8D5",
      "--text-primary": "#657B83",
      "--text-secondary": "#839496",
      "--text-tertiary": "#93A1A1",
      "--text-on-accent": "#FDF6E3",
      "--accent-primary": "#B58900",
      "--accent-pressed": "#CB4B16",
      "--border-light": "rgba(255, 255, 255, 0.6)",
      "--border-dark": "rgba(101, 123, 131, 0.08)",
      "--panel-outer-shadow": "6px 6px 16px rgba(181, 137, 0, 0.08), -4px -4px 12px rgba(255, 255, 255, 0.7)",
      "--btn-shadow": "3px 3px 8px rgba(181, 137, 0, 0.06), -3px -3px 8px rgba(255, 255, 255, 0.6)",
      "--input-inner-shadow": "inset 2px 2px 6px rgba(181, 137, 0, 0.08), inset -2px -2px 6px rgba(255, 255, 255, 0.6)",
      "--graph-node": "#EEE8D5",
      "--graph-link": "#93A1A1",
      "--code-bg": "#EEE8D5",
      "--tooltip-bg": "#586E75",
      "--tooltip-text": "#FDF6E3",
      "--tooltip-border": "rgba(255, 255, 255, 0.1)",
    },
  }

export default theme
