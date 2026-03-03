/**
 * Tesserin Auto-Updater
 *
 * Uses electron-updater to check for new releases on GitHub.
 * Only active in production (packaged) builds.
 *
 * IPC channels exposed to renderer:
 *   updater:check          — manually trigger an update check
 *   updater:install        — quit and install a downloaded update
 *   updater:status (event) — renderer receives status updates
 */

import { ipcMain, BrowserWindow } from 'electron'

// Dynamically require so the import doesn't crash in dev (where the
// package may not be present or app.isPackaged is false)
let autoUpdater: any = null
try {
  const updaterModule = require('electron-updater')
  autoUpdater = updaterModule.autoUpdater
} catch {
  // electron-updater not installed — updates disabled
}

export type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes?: string }
  | { type: 'not-available'; version: string }
  | { type: 'downloading'; percent: number; transferred: number; total: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

function send(win: BrowserWindow | null, status: UpdateStatus) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('updater:status', status)
  }
}

export function setupAutoUpdater(mainWindow: BrowserWindow | null) {
  if (!autoUpdater) return   // not in a packaged build or package missing

  // Don't auto-download — let the user decide
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // ── Events ────────────────────────────────────────────────────────────
  autoUpdater.on('checking-for-update', () => {
    send(mainWindow, { type: 'checking' })
  })

  autoUpdater.on('update-available', (info: { version: string; releaseNotes?: string }) => {
    send(mainWindow, { type: 'available', version: info.version, releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined })
  })

  autoUpdater.on('update-not-available', (info: { version: string }) => {
    send(mainWindow, { type: 'not-available', version: info.version })
  })

  autoUpdater.on('download-progress', (progress: { percent: number; transferred: number; total: number }) => {
    send(mainWindow, {
      type: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    send(mainWindow, { type: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err: Error) => {
    send(mainWindow, { type: 'error', message: err.message })
  })

  // ── IPC handlers ──────────────────────────────────────────────────────
  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err: any) {
      send(mainWindow, { type: 'error', message: err?.message ?? 'Update check failed' })
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err: any) {
      send(mainWindow, { type: 'error', message: err?.message ?? 'Download failed' })
    }
  })

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // Check on startup after a short delay (don't block window creation)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => { /* silent fail on startup */ })
  }, 10_000)
}
