# Contributing to Tesserin

> **Contributions are welcome!** Whether you're fixing a bug, proposing a feature, improving docs, or just sharing ideas — we're glad you're here. Every contribution, big or small, makes Tesserin better for everyone.

Thank you for considering contributing to Tesserin! This guide will help you get started.

> **License note:** Tesserin is published under the [Tesserin Pro License v1.0](LICENSE). By submitting a contribution you agree that it may be included in the project under that license. The copyright of the Software as a whole remains with the original authors. You'll be credited in the project's git history.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

---

## Code of Conduct

Be respectful, be constructive, be kind. We're building something great together.

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 22 (see `.nvmrc`) |
| pnpm | ≥ 9 |
| Git | Latest |

### Setup

```bash
git clone https://github.com/tesserin/tesserin.git
cd tesserin
pnpm install
pnpm dev
```

---

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```

2. **Make your changes** — the dev server hot-reloads automatically.

3. **Test your changes**:
   ```bash
   pnpm build                        # Verify renderer builds
   pnpm tsc --noEmit                 # Type-check renderer
   pnpm tsc -p electron/tsconfig.json --noEmit  # Type-check Electron
   ```

4. **Commit** using the [conventional commit](#commit-convention) format.

5. **Push and open a PR** against `main`.

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Code restructure, no new feature or fix |
| `perf:` | Performance improvement |
| `chore:` | Build, CI, dependencies |

**Examples:**
```
feat: add drag-and-drop reordering to kanban
fix: canvas not persisting on tab switch
docs: update README with architecture diagram
chore: upgrade Electron to v33
```

---

## Pull Request Process

1. Ensure your branch is up to date with `main`.
2. Verify the build passes locally (`pnpm build`).
3. Write a clear PR description explaining **what** and **why**.
4. Link any related issues.
5. Request a review.

PRs are squash-merged into `main`.

---

## Project Structure

```
src/            → React renderer (App.tsx, main.tsx, types)
components/     → UI components (tesserin/ = app, ui/ = design system)
electron/       → Main process (database, IPC, preload, AI)
lib/            → Shared logic (storage client, notes context, utils)
.github/        → CI/CD workflows
```

### Key Patterns

- **Storage client** (`lib/storage-client.ts`) wraps all data access — IPC in Electron, localStorage in dev.
- **All panels stay mounted** with CSS `hidden` to preserve component state across tab switches.
- **Database migrations** are handled automatically in `electron/database.ts` via `ALTER TABLE` try/catch blocks.

---

## Questions?

Open a [Discussion](https://github.com/tesserin/tesserin/discussions) or reach out in Issues.
