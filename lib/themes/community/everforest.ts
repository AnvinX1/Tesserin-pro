import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.everforest",
    name: "Everforest",
    author: "sainnhe",
    description: "A green-based color scheme inspired by natural forests — gentle and comfortable.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#2D353B", "#A7C080", "#D3C6AA"],
    category: "warm",
    downloads: 10500,
    rating: 4.6,
    colors: {
      "--bg-app": "#2D353B",
      "--bg-panel": "linear-gradient(145deg, #374145, #2D353B)",
      "--bg-panel-inset": "#272E33",
      "--text-primary": "#D3C6AA",
      "--text-secondary": "#9DA9A0",
      "--text-tertiary": "#7A8478",
      "--text-on-accent": "#2D353B",
      "--accent-primary": "#A7C080",
      "--accent-pressed": "#83C092",
      "--border-light": "rgba(167, 192, 128, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.4)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.3), -1px -1px 4px #374145",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.3), -1px -1px 3px #374145",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.3), inset -1px -1px 2px #374145",
      "--graph-node": "#475258",
      "--graph-link": "#414B50",
      "--code-bg": "#272E33",
      "--tooltip-bg": "#374145",
      "--tooltip-text": "#D3C6AA",
      "--tooltip-border": "rgba(167, 192, 128, 0.12)",
    },
  }

export default theme
