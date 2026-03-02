import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.solarized-dark",
    name: "Solarized Dark",
    author: "Ethan Schoonover",
    description: "The timeless Solarized dark palette — precision colors designed for readability.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#002B36", "#B58900", "#839496"],
    category: "warm",
    downloads: 15600,
    rating: 4.6,
    colors: {
      "--bg-app": "#002B36",
      "--bg-panel": "linear-gradient(145deg, #073642, #002B36)",
      "--bg-panel-inset": "#00212B",
      "--text-primary": "#839496",
      "--text-secondary": "#657B83",
      "--text-tertiary": "#586E75",
      "--text-on-accent": "#002B36",
      "--accent-primary": "#B58900",
      "--accent-pressed": "#CB4B16",
      "--border-light": "rgba(181, 137, 0, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #073642",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #073642",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #073642",
      "--graph-node": "#073642",
      "--graph-link": "#586E75",
      "--code-bg": "#00212B",
      "--tooltip-bg": "#073642",
      "--tooltip-text": "#839496",
      "--tooltip-border": "rgba(181, 137, 0, 0.12)",
    },
  }

export default theme
