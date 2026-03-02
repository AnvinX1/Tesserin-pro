import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.nord-frost",
    name: "Nord Frost",
    author: "Arctic Studio",
    description: "Inspired by the Nord palette — cool blues and muted arctic tones for focused writing.",
    version: "1.2.0",
    mode: "dark",
    preview: ["#2E3440", "#88C0D0", "#ECEFF4"],
    category: "cool",
    downloads: 18200,
    rating: 4.8,
    colors: {
      "--bg-app": "#2E3440",
      "--bg-panel": "linear-gradient(145deg, #3B4252, #2E3440)",
      "--bg-panel-inset": "#272C36",
      "--text-primary": "#ECEFF4",
      "--text-secondary": "#D8DEE9",
      "--text-tertiary": "#7b88a1",
      "--text-on-accent": "#2E3440",
      "--accent-primary": "#88C0D0",
      "--accent-pressed": "#81A1C1",
      "--border-light": "rgba(136, 192, 208, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.4)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.3), -1px -1px 4px #434C5E",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.3), -1px -1px 3px #434C5E",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.3), inset -1px -1px 2px #3B4252",
      "--graph-node": "#4C566A",
      "--graph-link": "#434C5E",
      "--code-bg": "#272C36",
      "--tooltip-bg": "#3B4252",
      "--tooltip-text": "#ECEFF4",
      "--tooltip-border": "rgba(136, 192, 208, 0.12)",
    },
  }

export default theme
