import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.github-dark",
    name: "GitHub Dark",
    author: "primer",
    description: "GitHub's official dark theme — familiar, clean and professional.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#0D1117", "#58A6FF", "#C9D1D9"],
    category: "minimal",
    downloads: 17200,
    rating: 4.7,
    colors: {
      "--bg-app": "#0D1117",
      "--bg-panel": "linear-gradient(145deg, #161B22, #0D1117)",
      "--bg-panel-inset": "#010409",
      "--text-primary": "#C9D1D9",
      "--text-secondary": "#8B949E",
      "--text-tertiary": "#484F58",
      "--text-on-accent": "#0D1117",
      "--accent-primary": "#58A6FF",
      "--accent-pressed": "#1F6FEB",
      "--border-light": "rgba(88, 166, 255, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.6)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.5), -1px -1px 4px #21262D",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.5), -1px -1px 3px #21262D",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px #161B22",
      "--graph-node": "#21262D",
      "--graph-link": "#30363D",
      "--code-bg": "#010409",
      "--tooltip-bg": "#161B22",
      "--tooltip-text": "#C9D1D9",
      "--tooltip-border": "rgba(88, 166, 255, 0.12)",
    },
  }

export default theme
