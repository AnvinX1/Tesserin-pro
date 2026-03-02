import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.moonlight",
    name: "Moonlight",
    author: "atomiks",
    description: "A dark theme with navy blues and soft purple highlights — dreamy and serene.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#1B1E2B", "#82AAFF", "#C8D3F5"],
    category: "cool",
    downloads: 8900,
    rating: 4.5,
    colors: {
      "--bg-app": "#1B1E2B",
      "--bg-panel": "linear-gradient(145deg, #222436, #1B1E2B)",
      "--bg-panel-inset": "#131421",
      "--text-primary": "#C8D3F5",
      "--text-secondary": "#A9B8E8",
      "--text-tertiary": "#636DA6",
      "--text-on-accent": "#1B1E2B",
      "--accent-primary": "#82AAFF",
      "--accent-pressed": "#C099FF",
      "--border-light": "rgba(130, 170, 255, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.4)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.35), -1px -1px 4px #222436",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.35), -1px -1px 3px #222436",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.35), inset -1px -1px 2px #222436",
      "--graph-node": "#2F334D",
      "--graph-link": "#3B4261",
      "--code-bg": "#131421",
      "--tooltip-bg": "#222436",
      "--tooltip-text": "#C8D3F5",
      "--tooltip-border": "rgba(130, 170, 255, 0.15)",
    },
  }

export default theme
