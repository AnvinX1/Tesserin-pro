import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.gruvbox-dark",
    name: "Gruvbox Dark",
    author: "morhetz",
    description: "Retro warm scheme with earthy orange tones — high contrast, easy on the eyes.",
    version: "1.1.0",
    mode: "dark",
    preview: ["#282828", "#FE8019", "#EBDBB2"],
    category: "warm",
    downloads: 13400,
    rating: 4.7,
    colors: {
      "--bg-app": "#282828",
      "--bg-panel": "linear-gradient(145deg, #3C3836, #282828)",
      "--bg-panel-inset": "#1D2021",
      "--text-primary": "#EBDBB2",
      "--text-secondary": "#A89984",
      "--text-tertiary": "#7C6F64",
      "--text-on-accent": "#282828",
      "--accent-primary": "#FE8019",
      "--accent-pressed": "#D65D0E",
      "--border-light": "rgba(254, 128, 25, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #3C3836",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #3C3836",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #3C3836",
      "--graph-node": "#504945",
      "--graph-link": "#665C54",
      "--code-bg": "#1D2021",
      "--tooltip-bg": "#3C3836",
      "--tooltip-text": "#EBDBB2",
      "--tooltip-border": "rgba(254, 128, 25, 0.12)",
    },
  }

export default theme
