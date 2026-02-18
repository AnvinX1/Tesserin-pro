# Changelog

All notable changes to Tesserin are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Production-grade SQLite schema with indexes, pragmas, CHECK constraints, and auto-migrations
- Full localStorage fallback for all storage entities (notes, tasks, templates, settings, canvases)
- Kanban board persistence (create, move, delete, priority — all saved to DB)
- Canvas persistence across tab switches and page refreshes (dual localStorage + IPC save)
- CI/CD pipeline: GitHub Actions for lint/build (CI) and cross-platform Electron packaging (Release)
- Cross-platform build targets: macOS (.dmg), Windows (.exe), Linux (.AppImage, .deb, .rpm)
- Premium README with architecture docs, data flow diagrams, and keyboard shortcut reference
- CONTRIBUTING.md with development workflow and commit conventions
- `.editorconfig` and `.nvmrc` for consistent developer experience
- Vite manual chunks: vendor-react, vendor-excalidraw, vendor-charts, vendor-radix

### Changed
- Reorganised project: removed Next.js leftovers (`app/`, `next.config.mjs`, `next-env.d.ts`)
- Consolidated duplicate files (theme-provider, hooks, globals.css)
- Moved `globals.css` from `app/` to `src/styles/` to match Vite entry
- Hardened `.gitignore` for Electron build artifacts, IDE files, and OS junk

### Removed
- `BottomTimeline` component (decorative, no functionality)
- Dead Next.js files: `app/layout.tsx`, `app/page.tsx`, `next.config.mjs`, `next-env.d.ts`
- Duplicate `components/theme-provider.tsx` (Next.js themes wrapper, unused)
- Duplicate `styles/globals.css` and `hooks/` directory

## [1.0.0] - 2026-02-18

### Added
- Initial release: Markdown editor, knowledge graph, creative canvas, kanban board
- Electron desktop app with frameless window and custom title bar
- SQLite local-first storage via better-sqlite3
- Excalidraw integration with permanent dark mode
- D3.js interactive knowledge graph
- Floating AI chat powered by Ollama
- Search palette (Cmd+K), export panel (Cmd+E), template manager (Cmd+T)
- Skeuomorphic Obsidian Black UI with gold accent theme
