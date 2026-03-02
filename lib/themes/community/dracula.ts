import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.dracula",
    name: "Dracula",
    author: "Zeno Rocha",
    description: "The iconic Dracula color scheme — purple accents on a deep charcoal canvas.",
    version: "2.0.0",
    mode: "dark",
    preview: ["#282A36", "#BD93F9", "#F8F8F2"],
    category: "dark",
    downloads: 24500,
    rating: 4.9,
    colors: {
      "--bg-app": "#282A36",
      "--bg-panel": "linear-gradient(145deg, #343746, #282A36)",
      "--bg-panel-inset": "#21222C",
      "--text-primary": "#F8F8F2",
      "--text-secondary": "#BFBFBF",
      "--text-tertiary": "#6272A4",
      "--text-on-accent": "#282A36",
      "--accent-primary": "#BD93F9",
      "--accent-pressed": "#A77BF3",
      "--border-light": "rgba(189, 147, 249, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #383A4A",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #383A4A",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #343746",
      "--graph-node": "#44475A",
      "--graph-link": "#6272A4",
      "--code-bg": "#21222C",
      "--tooltip-bg": "#343746",
      "--tooltip-text": "#F8F8F2",
      "--tooltip-border": "rgba(189, 147, 249, 0.15)",
    },
  }

export default theme
