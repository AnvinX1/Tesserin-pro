import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.cyberpunk",
    name: "Cyberpunk 2077",
    author: "Tesserin Community",
    description: "Neon yellow on deep dark — electric cyberpunk vibes with high voltage accents.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#0A0A12", "#F9E900", "#E0E0E8"],
    category: "colorful",
    downloads: 16800,
    rating: 4.8,
    colors: {
      "--bg-app": "#0A0A12",
      "--bg-panel": "linear-gradient(145deg, #14141F, #0A0A12)",
      "--bg-panel-inset": "#06060C",
      "--text-primary": "#E0E0E8",
      "--text-secondary": "#9090A0",
      "--text-tertiary": "#505068",
      "--text-on-accent": "#0A0A12",
      "--accent-primary": "#F9E900",
      "--accent-pressed": "#00D4FF",
      "--border-light": "rgba(249, 233, 0, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.6)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.5), -1px -1px 4px #14141F, 0 0 30px rgba(249,233,0,0.02)",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.5), -1px -1px 3px #14141F",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.5), inset -1px -1px 2px #14141F",
      "--graph-node": "#F9E900",
      "--graph-link": "#1A1A28",
      "--code-bg": "#06060C",
      "--tooltip-bg": "#14141F",
      "--tooltip-text": "#E0E0E8",
      "--tooltip-border": "rgba(249, 233, 0, 0.15)",
    },
  }

export default theme
