import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
    id: "community.catppuccin-latte",
    name: "Catppuccin Latte",
    author: "Catppuccin",
    description: "The lightest Catppuccin flavor — pastel accents on a creamy paper-white canvas.",
    version: "1.3.0",
    mode: "light",
    preview: ["#EFF1F5", "#8839EF", "#4C4F69"],
    category: "colorful",
    downloads: 11200,
    rating: 4.7,
    colors: {
      "--bg-app": "#EFF1F5",
      "--bg-panel": "linear-gradient(145deg, #EFF1F5, #E6E9EF)",
      "--bg-panel-inset": "#E6E9EF",
      "--text-primary": "#4C4F69",
      "--text-secondary": "#6C6F85",
      "--text-tertiary": "#9CA0B0",
      "--text-on-accent": "#EFF1F5",
      "--accent-primary": "#8839EF",
      "--accent-pressed": "#7287FD",
      "--border-light": "rgba(255, 255, 255, 0.65)",
      "--border-dark": "rgba(76, 79, 105, 0.06)",
      "--panel-outer-shadow": "6px 6px 16px rgba(156, 160, 176, 0.2), -4px -4px 12px rgba(255, 255, 255, 0.7)",
      "--btn-shadow": "3px 3px 8px rgba(156, 160, 176, 0.15), -3px -3px 8px rgba(255, 255, 255, 0.65)",
      "--input-inner-shadow": "inset 2px 2px 6px rgba(156, 160, 176, 0.15), inset -2px -2px 6px rgba(255, 255, 255, 0.65)",
      "--graph-node": "#DCE0E8",
      "--graph-link": "#BCC0CC",
      "--code-bg": "#E6E9EF",
      "--tooltip-bg": "#5C5F77",
      "--tooltip-text": "#EFF1F5",
      "--tooltip-border": "rgba(255, 255, 255, 0.1)",
    },
  }

export default theme
