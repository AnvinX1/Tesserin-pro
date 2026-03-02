# Contributing a Theme

Tesserin uses an **Obsidian-style** theme system — each theme lives in its own
file, making it easy to contribute, review, and maintain independently.

## Directory Structure

```
lib/themes/
  types.ts              ← type definitions (ThemeColors, ThemeStyles, TesserinTheme)
  helpers.ts            ← persistence, lookup, CSS generation
  registry.ts           ← collects builtin + community arrays
  index.ts              ← barrel re-export
  builtin/              ← built-in themes (maintained by core team)
    obsidian-black.ts
    warm-ivory.ts
    index.ts
  community/            ← community themes — ADD YOUR THEME HERE
    nord-frost.ts
    dracula.ts
    ...
    index.ts
```

## Adding a New Theme

### 1. Create your theme file

Create a new file in `lib/themes/community/` named after your theme in
**kebab-case** (e.g. `my-awesome-theme.ts`):

```ts
import type { TesserinTheme } from "../types"

const theme: TesserinTheme = {
  id: "community.my-awesome-theme",   // must be unique, prefixed "community."
  name: "My Awesome Theme",
  author: "Your Name",
  description: "A short description of your theme.",
  version: "1.0.0",
  mode: "dark",                       // "dark" or "light"
  preview: ["#1a1a2e", "#e94560", "#eaeaea"],  // [bg, accent, text] for card preview
  category: "colorful",               // see ThemeCategory in types.ts
  downloads: 0,
  rating: 0,
  colors: {
    "--bg-app": "#1a1a2e",
    "--bg-panel": "linear-gradient(145deg, #252545, #1a1a2e)",
    "--bg-panel-inset": "#12122a",
    "--text-primary": "#eaeaea",
    "--text-secondary": "#a0a0b0",
    "--text-tertiary": "#606078",
    "--text-on-accent": "#1a1a2e",
    "--accent-primary": "#e94560",
    "--accent-pressed": "#c73050",
    "--border-light": "rgba(233, 69, 96, 0.08)",
    "--border-dark": "rgba(0, 0, 0, 0.5)",
    "--panel-outer-shadow": "5px 5px 15px rgba(0,0,0,0.4), -1px -1px 4px #252545",
    "--btn-shadow": "4px 4px 8px rgba(0,0,0,0.4), -1px -1px 3px #252545",
    "--input-inner-shadow": "inset 2px 2px 5px rgba(0,0,0,0.4), inset -1px -1px 2px #252545",
    "--graph-node": "#303050",
    "--graph-link": "#252545",
    "--code-bg": "#12122a",
    "--tooltip-bg": "#252545",
    "--tooltip-text": "#eaeaea",
    "--tooltip-border": "rgba(233, 69, 96, 0.15)",
  },
  // Optional — structural overrides for special look-and-feel:
  // styles: {
  //   "--radius-panel": "0px",      // brutalism = 0, clay = 24px, glass = 16px
  //   "--radius-btn": "0px",
  //   "--radius-inset": "0px",
  //   "--border-width": "3px",
  //   "--backdrop-blur": "blur(16px)",   // glass themes only
  //   "--btn-hover-lift": "-2px",
  //   "--btn-active-press": "1px",
  //   "--scrollbar-radius": "10px",
  //   "--accent-glow": "0 0 20px rgba(233, 69, 96, 0.15)",
  // },
}

export default theme
```

### 2. Register your theme

Open `lib/themes/community/index.ts` and add your import + array entry:

```ts
import myAwesomeTheme from "./my-awesome-theme"

export const COMMUNITY_THEMES: TesserinTheme[] = [
  // ...existing themes...
  myAwesomeTheme,
]
```

### 3. Build & test

```bash
pnpm run build      # make sure it compiles
pnpm run dev        # preview your theme in Settings → Themes
```

### 4. Submit a PR

Open a pull request with just **two files changed**:
1. Your new theme file (`lib/themes/community/my-awesome-theme.ts`)
2. The community index (`lib/themes/community/index.ts`)

## Theme Categories

| Category      | Description                              | Typical `styles` |
|---------------|------------------------------------------|-------------------|
| `dark`        | General dark themes                      | defaults          |
| `light`       | General light themes                     | defaults          |
| `colorful`    | Vibrant, multi-hued                      | defaults          |
| `minimal`     | Clean, understated                       | defaults          |
| `warm`        | Earthy, amber, orange tones              | defaults          |
| `cool`        | Blue, cyan, arctic tones                 | defaults          |
| `monochrome`  | Single-hue, grayscale                    | `radius: 12/8/8`  |
| `brutalism`   | Hard edges, thick borders, flat          | `radius: 0, border: 3px` |
| `glass`       | Frosted translucent, backdrop-blur       | `blur(16px), radius: 16/12/12` |
| `clay`        | Puffy, soft-rounded, tactile             | `radius: 24/18/16` |
| `retro`       | CRT / vintage / terminal                 | `radius: 4/3/3, border: 2px, glow` |
| `pastel`      | Soft candy colors                        | `radius: 22/16/16` |

## Color Token Reference

Every theme **must** define all 20 color tokens in the `colors` object.
See [types.ts](lib/themes/types.ts) → `ThemeColors` for the full list.

## Style Token Reference (optional)

The `styles` object is optional. If omitted, the theme uses the default
skeuomorphic styling (20px panels, 14px buttons). Override selectively:

| Token                   | Default     | Description                    |
|------------------------|-------------|--------------------------------|
| `--radius-panel`       | `20px`      | Panel border-radius            |
| `--radius-btn`         | `14px`      | Button border-radius           |
| `--radius-inset`       | `14px`      | Inset input border-radius      |
| `--border-width`       | `1px`       | Global border thickness        |
| `--backdrop-blur`      | `none`      | Glass blur effect              |
| `--btn-hover-lift`     | `-2px`      | Button hover Y-translate       |
| `--btn-active-press`   | `1px`       | Button active Y-translate      |
| `--scrollbar-radius`   | `10px`      | Scrollbar thumb radius         |
| `--accent-glow`        | `none`      | Glow on active buttons         |
