import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.sunset-blaze",
    name: "Sunset Blaze",
    author: "Tesserin Community",
    description: "Fiery sunset gradient — warm oranges and deep magentas on a dusky canvas.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#1A0A14", "#FF6B35", "#FFD5C2"],
    category: "warm",
    downloads: 10800,
    rating: 4.6,
    colors: {
      "--bg-app": "#1A0A14",
      "--bg-panel": "linear-gradient(145deg, #2D1422, #1A0A14)",
      "--bg-panel-inset": "#12060E",
      "--text-primary": "#FFD5C2",
      "--text-secondary": "#D4937A",
      "--text-tertiary": "#8C5A4A",
      "--text-on-accent": "#1A0A14",
      "--accent-primary": "#FF6B35",
      "--accent-pressed": "#E85D2C",
      "--border-light": "rgba(255, 107, 53, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #2D1422",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #2D1422",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #2D1422",
      "--graph-node": "#4A2030",
      "--graph-link": "#3A1525",
      "--code-bg": "#12060E",
      "--tooltip-bg": "#2D1422",
      "--tooltip-text": "#FFD5C2",
      "--tooltip-border": "rgba(255, 107, 53, 0.15)",
    },
  }

export default theme
