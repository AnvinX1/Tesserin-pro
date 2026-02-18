<div align="center">

# ✦ Tesserin

**AI-native productivity workspace — local-first, blazing fast, beautifully crafted.**

Knowledge graphs · Creative canvas · Kanban boards · Markdown editor · AI chat — all in one desktop app.

[![CI](https://github.com/tesserin/tesserin/actions/workflows/ci.yml/badge.svg)](https://github.com/tesserin/tesserin/actions/workflows/ci.yml)
[![Release](https://github.com/tesserin/tesserin/actions/workflows/release.yml/badge.svg)](https://github.com/tesserin/tesserin/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-FACC15.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-33-47848F.svg?logo=electron)](https://www.electronjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript)](https://www.typescriptlang.org)

<br />

<img src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS" />
<img src="https://img.shields.io/badge/Windows-0078D4?style=for-the-badge&logo=windows11&logoColor=white" alt="Windows" />
<img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux" />

</div>

---

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/tesserin/tesserin.git
cd tesserin

# Install dependencies (pnpm required)
pnpm install

# Start development (Vite + Electron concurrently)
pnpm dev
```

The app opens automatically at `http://localhost:5173` with Electron wrapping it.

---

## ✦ Features

| Module | Description |
|--------|-------------|
| **Markdown Editor** | Rich WYSIWYG editor with live preview, wiki-links, and frontmatter |
| **Knowledge Graph** | Interactive D3-powered graph showing note connections |
| **Creative Canvas** | Infinite canvas powered by Excalidraw with auto-save |
| **Kanban Board** | Drag-and-drop task management with priority levels |
| **Daily Notes** | Automatic daily journal entries with templating |
| **AI Chat** | Floating AI assistant powered by local Ollama models |
| **Search Palette** | Lightning-fast `Cmd+K` fuzzy search across all notes |
| **Export** | Export notes to PDF, Markdown, HTML, or JSON |
| **Templates** | Reusable note templates with categories |

### Design Philosophy

- **Local-first** — All data lives in SQLite on your machine. No cloud, no accounts, no tracking.
- **Offline-capable** — Everything works without an internet connection.
- **Skeuomorphic UI** — Premium Obsidian Black (#050505) palette with gold (#FACC15) accents.
- **Fast** — Vite HMR in dev, optimized chunked builds in production.

---

## 🏗️ Architecture

```
tesserin/
├── src/                    # React renderer (Vite)
│   ├── App.tsx             # Root component – layout orchestrator
│   ├── main.tsx            # ReactDOM entry point
│   ├── styles/             # Global CSS (Tailwind v4)
│   └── types/              # TypeScript declarations
├── components/
│   ├── tesserin/           # Core app components (graph, canvas, kanban…)
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
       │  localStorage fallback (dev mode)                                        │
       └──────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `notes` | Markdown notes with folder organization & pinning |
| `folders` | Hierarchical folder tree |
| `tags` / `note_tags` | Many-to-many tagging system |
| `tasks` | Kanban tasks with columns, priority, due dates |
| `templates` | Reusable note templates |
| `settings` | Key-value app settings |
| `canvases` | Excalidraw canvas state (elements + appState + files) |

Production pragmas: `busy_timeout=5000`, `synchronous=NORMAL`, `cache_size=-64000`

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

The project includes two workflows:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **CI** | Push to `main`/`dev`, PRs | Type-check, lint, build |
| **Release** | Push tag `v*` or manual | Build + package for macOS, Windows, Linux; create GitHub Release |

To create a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

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
| **Package Manager** | pnpm |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Search palette |
| `Cmd/Ctrl + E` | Export panel |
| `Cmd/Ctrl + T` | Template manager |

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a PR.

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

[MIT](LICENSE) — free for personal and commercial use.

---

<div align="center">

**Built with obsession by the Tesserin team.**

✦

</div>