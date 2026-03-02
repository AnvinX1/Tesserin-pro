import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.ayu-light",
    name: "Ayu Light",
    author: "dempfi",
    description: "A simple light theme with bright, vibrant orange accent — clean and modern.",
    version: "1.0.0",
    mode: "light",
    preview: ["#FAFAFA", "#FF9940", "#5C6166"],
    category: "minimal",
    downloads: 7600,
    rating: 4.4,
    colors: {
      "--bg-app": "#FAFAFA",
      "--bg-panel": "linear-gradient(145deg, #FFFFFF, #F3F3F3)",
      "--bg-panel-inset": "#F0F0F0",
      "--text-primary": "#5C6166",
      "--text-secondary": "#8A9199",
      "--text-tertiary": "#ABB0B6",
      "--text-on-accent": "#FAFAFA",
      "--accent-primary": "#FF9940",
      "--accent-pressed": "#F2590D",
      "--border-light": "rgba(255, 255, 255, 0.7)",
      "--border-dark": "rgba(92, 97, 102, 0.06)",
      "--panel-outer-shadow": "6px 6px 16px rgba(0,0,0,0.04), -4px -4px 12px rgba(255, 255, 255, 0.8)",
      "--btn-shadow": "3px 3px 8px rgba(0,0,0,0.03), -3px -3px 8px rgba(255, 255, 255, 0.7)",
      "--input-inner-shadow": "inset 2px 2px 6px rgba(0,0,0,0.04), inset -2px -2px 6px rgba(255, 255, 255, 0.7)",
      "--graph-node": "#E7E8E9",
      "--graph-link": "#D4D5D6",
      "--code-bg": "#F0F0F0",
      "--tooltip-bg": "#5C6166",
      "--tooltip-text": "#FAFAFA",
      "--tooltip-border": "rgba(255, 255, 255, 0.1)",
    },
  }

export default theme
