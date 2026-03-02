import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "tesserin.obsidian-black",
    name: "Obsidian Black",
    author: "Tesserin",
    description: "The default dark theme — deep blacks with matte shadows and golden accents.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#050505", "#FACC15", "#ededed"],
    colors: {
      "--bg-app": "#050505",
      "--bg-panel": "linear-gradient(145deg, #111111, #080808)",
      "--bg-panel-inset": "#000000",
      "--text-primary": "#ededed",
      "--text-secondary": "#888888",
      "--text-tertiary": "#666666",
      "--text-on-accent": "#000000",
      "--accent-primary": "#FACC15",
      "--accent-pressed": "#EAB308",
      "--border-light": "rgba(255, 255, 255, 0.06)",
      "--border-dark": "rgba(0, 0, 0, 0.8)",
      "--panel-outer-shadow": "5px 5px 15px #000000, -1px -1px 4px #1c1c1c",
      "--btn-shadow": "4px 4px 8px #000000, -1px -1px 3px #1f1f1f",
      "--input-inner-shadow": "inset 2px 2px 5px #000000, inset -1px -1px 2px #1a1a1a",
      "--graph-node": "#333333",
      "--graph-link": "#333333",
      "--code-bg": "#000000",
      "--tooltip-bg": "#1a1a1a",
      "--tooltip-text": "#ededed",
      "--tooltip-border": "rgba(255, 255, 255, 0.08)",
    },
  }

export default theme
