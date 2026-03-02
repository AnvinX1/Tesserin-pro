import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.synthwave-84",
    name: "Synthwave '84",
    author: "Robb Owen",
    description: "Retro-futuristic neon glow theme — hot pink and cyan on deep purple.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#262335", "#FF7EDB", "#FFFFFF"],
    category: "colorful",
    downloads: 12100,
    rating: 4.6,
    colors: {
      "--bg-app": "#262335",
      "--bg-panel": "linear-gradient(145deg, #34294F, #262335)",
      "--bg-panel-inset": "#1E1A30",
      "--text-primary": "#FFFFFF",
      "--text-secondary": "#BBBBBB",
      "--text-tertiary": "#6D5E8D",
      "--text-on-accent": "#262335",
      "--accent-primary": "#FF7EDB",
      "--accent-pressed": "#36F9F6",
      "--border-light": "rgba(255, 126, 219, 0.1)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #34294F",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #34294F",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #34294F",
      "--graph-node": "#403552",
      "--graph-link": "#6D5E8D",
      "--code-bg": "#1E1A30",
      "--tooltip-bg": "#34294F",
      "--tooltip-text": "#FFFFFF",
      "--tooltip-border": "rgba(255, 126, 219, 0.2)",
    },
  }

export default theme
