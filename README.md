<div align="center">

<img src="build/tesserinmain.png" width="96" alt="Tesserin logo" />

# Tesserin

### *Think deeper. Write freely.*

**AI-native knowledge workspace — local-first, offline-capable, beautifully crafted.**

Knowledge graphs · Reference manager · Block references · AI chat · Canvas · Kanban — all in one desktop app.

[![CI](https://github.com/AnvinX1/Tesserin-pro/actions/workflows/ci.yml/badge.svg)](https://github.com/AnvinX1/Tesserin-pro/actions/workflows/ci.yml)
[![Release](https://github.com/AnvinX1/Tesserin-pro/actions/workflows/release.yml/badge.svg)](https://github.com/AnvinX1/Tesserin-pro/actions/workflows/release.yml)
[![License: Tesserin Pro](https://img.shields.io/badge/License-Tesserin%20Pro-blueviolet.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848F.svg?logo=electron)](https://www.electronjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)

</div>

---

## 📥 Download

**Get the latest release for your platform — click to download:**

<div align="center">

| Platform | Download | Format |
|----------|----------|--------|
| <img src="https://img.shields.io/badge/Windows-0078D4?style=flat-square&logo=windows11&logoColor=white" /> | [**Tesserin-Setup.exe**](https://github.com/AnvinX1/Tesserin-pro/releases/latest/download/Tesserin+Setup+1.1.7.exe) | NSIS installer |
| <img src="https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white" /> | [**Tesserin.dmg**](https://github.com/AnvinX1/Tesserin-pro/releases/latest/download/Tesserin-1.1.7.dmg) | Disk image |
| <img src="https://img.shields.io/badge/Linux-FCC624?style=flat-square&logo=linux&logoColor=black" /> | [**Tesserin.AppImage**](https://github.com/AnvinX1/Tesserin-pro/releases/latest/download/Tesserin-1.1.7.AppImage) | Portable |
| <img src="https://img.shields.io/badge/Linux-FCC624?style=flat-square&logo=linux&logoColor=black" /> | [**Tesserin.deb**](https://github.com/AnvinX1/Tesserin-pro/releases/latest/download/tesserin_1.1.7_amd64.deb) | Debian/Ubuntu |

</div>

> **Browse all releases:** [github.com/AnvinX1/Tesserin-pro/releases](https://github.com/AnvinX1/Tesserin-pro/releases) — links above update with each new release.

---

## ⚡ Quick Start (Development)

```bash
# Clone the repository
git clone https://github.com/AnvinX1/Tesserin-pro.git
cd Tesserin-pro

# Install dependencies (pnpm required)
pnpm install

# Start development (Vite + Electron concurrently)
pnpm dev
```

The app opens automatically at `http://localhost:5173` with Electron wrapping it.

---

## ✦ Features

### Core Workspace

| Module | Description |
|--------|-------------|
| **Markdown Editor** | Rich split-pane editor with wiki-links `[[links]]`, task lists, and live preview |
| **Knowledge Graph** | Interactive D3-powered graph with Force, Radial, and Mind Map layouts |
| **Creative Canvas** | Infinite whiteboard powered by Excalidraw with auto-save |
| **Kanban Board** | Drag-and-drop task management with priority levels and columns |
| **Daily Notes** | Auto-created daily journals with 6 built-in templates and streak tracking |
| **Timeline View** | Chronological note visualisation for tracking project progress |
| **Code View** | Syntax-highlighted code editor for snippets and scripts |

### Researcher Features

| Module | Description |
|--------|-------------|
| **Reference Manager** | Import BibTeX, browse library, insert `[@citations]`, auto-generate bibliographies (APA/Chicago/IEEE/MLA) |
| **Block References** | Roam-style `((block-id))` inline refs and `!((block-id))` embeds across notes |
| **Backlinks Panel** | Incoming links, outgoing links, block references, and **unlinked mentions** detection |
| **Fuzzy Search** | Trigram-indexed fuzzy search with `tag:`, `date:`, `in:` filters |
| **Export Pipeline** | Export to **PDF**, **LaTeX**, **DOCX** (Word XML), **HTML**, Markdown, Plain Text, JSON — single or batch |
| **Version History** | Browse and restore previous versions of any note |
| **Templates** | Reusable note templates with `{{date}}` variables and categories |

### Intelligence & UX

| Module | Description |
|--------|-------------|
| **SAM (AI Assistant)** | Local AI powered by Ollama — brainstorm, summarise, rewrite. Fully offline, fully private. |
| **Search Palette** | `Ctrl+K` command palette with fuzzy search, plugin commands, and tab navigation |
| **Smart Tips** | Rotating tips in the status bar help you discover shortcuts and features organically |
| **Plugin System** | Event-driven plugin architecture with commands, panels, status bar widgets, and SAM tools |
| **Split Panes** | Side-by-side editing with `Ctrl+\` |

### Design Philosophy

- **Local-first** — All data lives in SQLite on your machine. No cloud, no accounts, no tracking.
- **Offline-capable** — Everything works without an internet connection, including AI.
- **Skeuomorphic UI** — Premium Obsidian Black `#050505` palette with gold `#FACC15` accents.
- **Fast** — Vite HMR in dev, optimized chunked builds in production.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Search palette (notes, commands, tabs) |
| `Ctrl + E` | Export current note |
| `Ctrl + T` | Template manager |
| `Ctrl + \` | Split editor panes |
| `Ctrl + Shift + D` | Quick Capture (daily note overlay) |
| `Ctrl + Shift + R` | Reference Manager |
| `Ctrl + Shift + B` | Backlinks panel |
| `Ctrl + Shift + H` | Version history |

> Replace `Ctrl` with `Cmd` on macOS.

---

## 🏗️ Architecture

```
Tesserin-pro/
├── src/                    # React renderer (Vite)
│   ├── App.tsx             # Root component – layout orchestrator
│   ├── main.tsx            # ReactDOM entry point
│   └── types/              # TypeScript declarations
├── components/
│   ├── tesserin/
│   │   ├── core/           # Logo, loading screen, theme, title bar, plugins
│   │   ├── workspace/      # Editor, canvas, graph, kanban, daily, SAM, timeline
│   │   └── panels/         # Sidebar, search, export, backlinks, references, settings
│   └── ui/                 # Shadcn/Radix design system primitives
├── electron/
│   ├── main.ts             # Electron main process
│   ├── preload.ts          # Context bridge (IPC API)
│   ├── database.ts         # SQLite schema, migrations, CRUD
│   ├── ipc-handlers.ts     # IPC channel registration
│   └── ai-service.ts       # Ollama AI integration
├── lib/
│   ├── storage-client.ts   # Renderer storage API (IPC + localStorage fallback)
│   ├── notes-store.tsx     # React context for notes state
│   ├── fuzzy-search.ts     # Trigram-indexed fuzzy matching engine
│   ├── block-references.ts # Block ID & ((ref)) system
│   ├── reference-manager.ts# BibTeX parser & citation formatting
│   ├── plugin-system.ts    # Plugin registry & event bus
│   ├── tips.ts             # Smart tips & shortcut discovery
│   └── utils.ts            # Shared utilities (cn, etc.)
├── .github/workflows/      # CI + cross-platform release pipeline
└── package.json
```

### Data Flow

```
┌─────────────┐     IPC Bridge      ┌──────────────┐     better-sqlite3    ┌──────────┐
│  React UI   │ ◄──────────────────► │  preload.ts  │ ◄──────────────────► │  SQLite   │
│  (Renderer) │   contextBridge      │  (Bridge)    │   synchronous         │  (Local)  │
└─────────────┘                      └──────────────┘                       └──────────┘
       │                                                                          │
       │  localStorage fallback (dev/web mode)                                    │
       └──────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `notes` | Markdown notes with folder organisation & pinning |
| `folders` | Hierarchical folder tree |
| `tags` / `note_tags` | Many-to-many tagging system |
| `tasks` | Kanban tasks with columns, priority, due dates |
| `templates` | Reusable note templates |
| `settings` | Key-value app settings |
| `canvases` | Excalidraw canvas state |

---

## 🔧 Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server + Electron in parallel |
| `pnpm build` | Build renderer for production |
| `pnpm electron:dev` | Compile & launch Electron only |
| `pnpm electron:build` | Package Electron app for current platform |
| `pnpm lint` | Run ESLint |

---

## 📦 Building for Production

### Local Build

```bash
# Build renderer + package for your current OS
pnpm build
pnpm electron:build
```

Outputs land in `release/`:
- **macOS** → `.dmg`
- **Windows** → `.exe` (NSIS installer)
- **Linux** → `.AppImage`, `.deb`, `.rpm`

### CI/CD (GitHub Actions)

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** | Push to `main`/`dev`, PRs | Build renderer + Electron main |
| **Release** | Push tag `v*` or manual | Build + package for macOS, Windows, Linux; create GitHub Release with download links |

To create a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow builds for all three platforms and publishes the binaries to **GitHub Releases**. Users can then download directly from the links in the [Download](#-download) section above.

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Electron 33 |
| **Renderer** | React 19 + TypeScript 5.7 |
| **Bundler** | Vite 6 |
| **Styling** | Tailwind CSS v4 + Radix UI |
| **Database** | better-sqlite3 (local SQLite) |
| **Canvas** | Excalidraw 0.18 |
| **Graphs** | D3.js 7 |
| **AI** | Ollama (local LLMs) |
| **Citations** | BibTeX parser + APA/Chicago/IEEE/MLA |
| **Package Manager** | pnpm |

---

## 🤝 Contributing

Contributions are welcome and appreciated! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

By contributing, you agree that your work may be included in Tesserin under the [Tesserin Pro License](LICENSE). You'll be credited in the project history.

```bash
# Fork → Clone → Branch → Code → PR
git checkout -b feat/your-feature
pnpm install
pnpm dev
# Make changes, then:
git commit -m "feat: your feature description"
git push origin feat/your-feature
```

---

## 📄 License

[Tesserin Pro License v1.0](LICENSE)

The source code is publicly available — you can read it, learn from it, modify it locally, and contribute to it. **Commercial redistribution, reselling, or using the Tesserin name in competing products requires written permission.**

> tl;dr — Open to explore and contribute. The product and its identity stay ours.

---

<div align="center">

**Built with obsession by the Tesserin team.**

*Think deeper. Write freely.* ✦

</div>