import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.ocean-deep",
    name: "Ocean Deep",
    author: "Tesserin Community",
    description: "Deep ocean blues — from midnight navy to bioluminescent cyan. Dive in.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#061821", "#00BCD4", "#B2EBF2"],
    category: "cool",
    downloads: 13100,
    rating: 4.7,
    colors: {
      "--bg-app": "#061821",
      "--bg-panel": "linear-gradient(145deg, #0A2A38, #061821)",
      "--bg-panel-inset": "#041018",
      "--text-primary": "#B2EBF2",
      "--text-secondary": "#4DD0E1",
      "--text-tertiary": "#1A7A8A",
      "--text-on-accent": "#061821",
      "--accent-primary": "#00BCD4",
      "--accent-pressed": "#0097A7",
      "--border-light": "rgba(0, 188, 212, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #0A2A38",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #0A2A38",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #0A2A38",
      "--graph-node": "#0E3748",
      "--graph-link": "#0A2A38",
      "--code-bg": "#041018",
      "--tooltip-bg": "#0A2A38",
      "--tooltip-text": "#B2EBF2",
      "--tooltip-border": "rgba(0, 188, 212, 0.15)",
    },
  }

export default theme
