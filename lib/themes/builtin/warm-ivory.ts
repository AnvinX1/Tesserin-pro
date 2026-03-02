import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "tesserin.warm-ivory",
    name: "Warm Ivory",
    author: "Tesserin",
    description: "A soft parchment-feel light theme — warm tones, easy on the eyes.",
    version: "1.0.0",
    mode: "light",
    preview: ["#f8f6f1", "#d4a829", "#33302b"],
    colors: {
      "--bg-app": "#f8f6f1",
      "--bg-panel": "linear-gradient(145deg, #faf8f4, #f3f0e8)",
      "--bg-panel-inset": "#eee9dc",
      "--text-primary": "#33302b",
      "--text-secondary": "#6e6960",
      "--text-tertiary": "#9e9889",
      "--text-on-accent": "#2c2517",
      "--accent-primary": "#d4a829",
      "--accent-pressed": "#c49b22",
      "--border-light": "rgba(255, 255, 255, 0.65)",
      "--border-dark": "rgba(120, 100, 70, 0.08)",
      "--panel-outer-shadow": "6px 6px 16px rgba(195, 187, 170, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.7)",
      "--btn-shadow": "3px 3px 8px rgba(195, 187, 170, 0.3), -3px -3px 8px rgba(255, 255, 255, 0.65)",
      "--input-inner-shadow": "inset 2px 2px 6px rgba(195, 187, 170, 0.3), inset -2px -2px 6px rgba(255, 255, 255, 0.65)",
      "--graph-node": "#ddd8cc",
      "--graph-link": "#ccc7bb",
      "--code-bg": "#f5f3ed",
      "--tooltip-bg": "#3d3a35",
      "--tooltip-text": "#f5f3ed",
      "--tooltip-border": "rgba(255, 255, 255, 0.1)",
    },
  }

export default theme
