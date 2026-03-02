import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.forest-moss",
    name: "Forest Moss",
    author: "Tesserin Community",
    description: "Deep woodland greens — like sunlight filtering through an ancient forest canopy.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#0D1F12", "#7CB342", "#C5E1A5"],
    category: "warm",
    downloads: 7400,
    rating: 4.4,
    colors: {
      "--bg-app": "#0D1F12",
      "--bg-panel": "linear-gradient(145deg, #1A3020, #0D1F12)",
      "--bg-panel-inset": "#08150C",
      "--text-primary": "#C5E1A5",
      "--text-secondary": "#8BC34A",
      "--text-tertiary": "#558B2F",
      "--text-on-accent": "#0D1F12",
      "--accent-primary": "#7CB342",
      "--accent-pressed": "#689F38",
      "--border-light": "rgba(124, 179, 66, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #1A3020",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #1A3020",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #1A3020",
      "--graph-node": "#2E5034",
      "--graph-link": "#1A3020",
      "--code-bg": "#08150C",
      "--tooltip-bg": "#1A3020",
      "--tooltip-text": "#C5E1A5",
      "--tooltip-border": "rgba(124, 179, 66, 0.12)",
    },
  }

export default theme
