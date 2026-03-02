# Contributing a Tesserin Plugin

Thanks for your interest in extending Tesserin! Each plugin lives in its own file
and exports a single `TesserinPlugin` object as the **default export**.

## Directory layout

```
lib/plugins/
├── types.ts              # Shared type definitions
├── registry.ts           # Runtime registry, sandbox API, React hook
├── index.ts              # Barrel re-export
├── builtin/              # Core plugins (ship enabled)
│   ├── word-count.ts
│   ├── daily-quote.ts
│   ├── backlinks.ts
│   └── index.ts
├── workspace/            # Optional workspace tabs
│   ├── kanban.ts
│   ├── daily-notes.ts
│   ├── timeline.ts
│   └── index.ts
├── community/            # Community-contributed plugins
│   ├── pomodoro-timer.ts
│   ├── reading-list.ts
│   ├── …
│   └── index.ts
└── CONTRIBUTING.md       # ← you are here
```

## Quick start

1. **Create a new file** in `lib/plugins/community/` named after your plugin
   (e.g. `my-plugin.ts`).

2. **Implement the `TesserinPlugin` interface**:

```ts
import React from "react"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const myPlugin: TesserinPlugin = {
  manifest: {
    id: "community.my-plugin",          // must be unique
    name: "My Plugin",
    version: "1.0.0",
    description: "What it does in one sentence.",
    author: "Your Name",
    permissions: ["ui:notify", "commands"],  // only request what you need
  },

  activate(api: TesserinPluginAPI) {
    // Register commands, panels, status-bar widgets, etc.
    api.registerCommand({
      id: "hello",
      label: "Say Hello",
      category: "My Plugin",
      execute() {
        api.ui.showNotice("Hello from my plugin!")
      },
    })
  },

  deactivate() {
    // Optional cleanup
  },
}

export default myPlugin
```

3. **Register your plugin** in `lib/plugins/community/index.ts`:

```ts
import myPlugin from "./my-plugin"

// Add to the imports ↑ and to the COMMUNITY_PLUGINS array ↓
export const COMMUNITY_PLUGINS: TesserinPlugin[] = [
  // … existing plugins …
  myPlugin,
]
```

4. **Build & test**: `pnpm build` — make sure there are no errors.

## Available permissions

| Permission        | Grants access to                         |
| ----------------- | ---------------------------------------- |
| `vault:read`      | List / read notes                        |
| `vault:write`     | Create / update / delete notes           |
| `settings:read`   | Read plugin settings                     |
| `settings:write`  | Write plugin settings                    |
| `ui:notify`       | Show toast notifications, navigate tabs  |
| `commands`        | Register command-palette entries          |
| `panels`          | Register sidebar / workspace panels      |
| `sam:tools`       | Register SAM (AI assistant) tools        |
| `events`          | Subscribe to note lifecycle events       |

Only request the permissions your plugin actually needs — the sandbox enforces
this at runtime with rate limiting (120 API calls / minute, 30 writes / minute).

## Guidelines

- **One plugin per file** — keep things self-contained.
- **Use `React.createElement`** instead of JSX to avoid requiring a JSX transform
  in every file.
- **No side effects at module scope** — all work should happen inside `activate()`.
- **Clean up in `deactivate()`** — remove intervals, listeners, etc.
- **Keep dependencies minimal** — `react` and `react-icons/fi` are available;
  avoid pulling in heavy libraries.
- **File name = kebab-case of your plugin name** (`my-plugin.ts`).
- **Plugin ID format**: `community.<kebab-name>` (e.g. `community.my-plugin`).
