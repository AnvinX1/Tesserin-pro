import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.material-ocean",
    name: "Material Ocean",
    author: "Tesserin Community",
    description: "Material Design ocean variant — deep navy with coral and teal material accents.",
    version: "1.0.0",
    mode: "dark",
    preview: ["#0F111A", "#84FFFF", "#A6ACCD"],
    category: "minimal",
    downloads: 15100,
    rating: 4.8,
    colors: {
      "--bg-app": "#0F111A",
      "--bg-panel": "linear-gradient(145deg, #181A29, #0F111A)",
      "--bg-panel-inset": "#090B12",
      "--text-primary": "#A6ACCD",
      "--text-secondary": "#717CB4",
      "--text-tertiary": "#464B5D",
      "--text-on-accent": "#0F111A",
      "--accent-primary": "#84FFFF",
      "--accent-pressed": "#80CBC4",
      "--border-light": "rgba(132, 255, 255, 0.06)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #181A29",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #181A29",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #181A29",
      "--graph-node": "#1F2233",
      "--graph-link": "#292D3E",
      "--code-bg": "#090B12",
      "--tooltip-bg": "#181A29",
      "--tooltip-text": "#A6ACCD",
      "--tooltip-border": "rgba(132, 255, 255, 0.12)",
    },
  }

export default theme
