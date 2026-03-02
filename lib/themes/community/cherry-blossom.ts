import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.cherry-blossom",
    name: "Cherry Blossom",
    author: "Tesserin Community",
    description: "Japanese sakura inspired — soft blush pinks and dusty rose on warm cream.",
    version: "1.0.0",
    mode: "light",
    preview: ["#FFF8F0", "#E8788A", "#5C2434"],
    category: "warm",
    downloads: 9900,
    rating: 4.6,
    colors: {
      "--bg-app": "#FFF8F0",
      "--bg-panel": "linear-gradient(145deg, #FFF8F0, #FFEEE0)",
      "--bg-panel-inset": "#FFE0D0",
      "--text-primary": "#5C2434",
      "--text-secondary": "#8C4A5A",
      "--text-tertiary": "#B87A88",
      "--text-on-accent": "#FFFFFF",
      "--accent-primary": "#E8788A",
      "--accent-pressed": "#D45A6C",
      "--border-light": "rgba(255, 255, 255, 0.65)",
      "--border-dark": "rgba(92, 36, 52, 0.05)",
      "--panel-outer-shadow": "6px 6px 16px rgba(232,120,138,0.1), -4px -4px 12px rgba(255,255,255,0.7)",
      "--btn-shadow": "3px 3px 8px rgba(232,120,138,0.08), -3px -3px 8px rgba(255,255,255,0.65)",
      "--input-inner-shadow": "inset 2px 2px 6px rgba(232,120,138,0.08), inset -2px -2px 6px rgba(255,255,255,0.6)",
      "--graph-node": "#FFD0D8",
      "--graph-link": "#FFC0C8",
      "--code-bg": "#FFEEE0",
      "--tooltip-bg": "#5C2434",
      "--tooltip-text": "#FFF8F0",
      "--tooltip-border": "rgba(232, 120, 138, 0.2)",
    },
  }

export default theme
