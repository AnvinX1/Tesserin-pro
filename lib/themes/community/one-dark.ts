import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.one-dark",
    name: "One Dark Pro",
    author: "binaryify",
    description: "Atom's iconic One Dark theme — balanced contrast with vibrant syntax-inspired accents.",
    version: "3.0.0",
    mode: "dark",
    preview: ["#282C34", "#61AFEF", "#ABB2BF"],
    category: "dark",
    downloads: 19800,
    rating: 4.8,
    colors: {
      "--bg-app": "#282C34",
      "--bg-panel": "linear-gradient(145deg, #2C313A, #282C34)",
      "--bg-panel-inset": "#21252B",
      "--text-primary": "#ABB2BF",
      "--text-secondary": "#848B98",
      "--text-tertiary": "#5C6370",
      "--text-on-accent": "#282C34",
      "--accent-primary": "#61AFEF",
      "--accent-pressed": "#528BFF",
      "--border-light": "rgba(97, 175, 239, 0.08)",
      "--border-dark": "rgba(0, 0, 0, 0.5)",
      "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #2C313A",
      "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #2C313A",
      "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #2C313A",
      "--graph-node": "#3E4451",
      "--graph-link": "#4B5263",
      "--code-bg": "#21252B",
      "--tooltip-bg": "#2C313A",
      "--tooltip-text": "#ABB2BF",
      "--tooltip-border": "rgba(97, 175, 239, 0.12)",
    },
  }

export default theme
