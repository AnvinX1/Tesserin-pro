import { app, BrowserWindow, ipcMain, nativeImage, session, screen, globalShortcut } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { initDatabase, getSetting } from './database'
import { startMcpServerStdio } from './mcp-server'
import { startApiServer } from './api-server'
import { cloudAgentManager } from './cloud-agents'
import { setupAutoUpdater } from './updater'

// ── Global error handlers ───────────────────────────────────────
// Prevent the main process from crashing silently on unhandled errors.
process.on('uncaughtException', (error) => {
  console.error('[Tesserin] Uncaught exception in main process:', error)
})
process.on('unhandledRejection', (reason) => {
  console.error('[Tesserin] Unhandled promise rejection in main process:', reason)
})

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Resolve icon path — in dev it's at project root, in production it's in resources/
function resolveIconPath(): string {
  if (isDev) {
    return path.join(__dirname, '../../build/icon.png')
  }
  // On macOS the app icon is embedded in the .app bundle; no runtime icon needed
  if (process.platform === 'darwin') {
    return path.join(process.resourcesPath, 'icon.png')
  }
  // On Windows, prefer .ico for sharp rendering in taskbar/alt-tab
  if (process.platform === 'win32') {
    return path.join(process.resourcesPath, 'icon.ico')
  }
  // Linux
  return path.join(process.resourcesPath, 'icon.png')
}
const iconPath = resolveIconPath()

// If launched with --mcp flag, run as MCP server on stdio and exit
if (process.argv.includes('--mcp')) {
  startMcpServerStdio().catch((err) => {
    console.error('[Tesserin] Failed to start MCP server:', err)
    process.exit(1)
  })
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#050505',
    show: false,
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  // Load the Vite dev server in development, or the bundled app in production
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  // Show window only after the first paint — eliminates the grey flash on startup
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // ── Window resize / management keyboard shortcuts ─────────────────────────
  // Handled here (main process, before-input-event) so they work even when
  // Excalidraw or another renderer element has keyboard focus.
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return

    // F11 — toggle OS-level window fullscreen
    if (input.key === 'F11') {
      mainWindow?.setFullScreen(!mainWindow.isFullScreen())
      return
    }

    // Ctrl+M — minimize window
    if (input.control && !input.shift && !input.alt && input.key.toLowerCase() === 'm') {
      mainWindow?.minimize()
      return
    }

    // Ctrl+Shift+F — maximize / restore window
    if (input.control && input.shift && !input.alt && input.key.toLowerCase() === 'f') {
      if (mainWindow?.isMaximized()) mainWindow.unmaximize()
      else mainWindow?.maximize()
      return
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Frameless window controls
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
}

app.whenReady().then(() => {
  // Set application icon — on Linux this updates the dock/taskbar icon
  // (BrowserWindow.icon alone doesn't reach the taskbar on GNOME/Wayland)
  // app.setIcon() is only available on Linux
  if (process.platform === 'linux') {
    try {
      const appIcon = nativeImage.createFromPath(iconPath)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!appIcon.isEmpty()) (app as any).setIcon(appIcon)
    } catch { /* non-fatal */ }
  }

  // Initialize SQLite database (non-fatal — app works without it via in-memory fallback)
  try {
    initDatabase()
    console.log('[Tesserin] SQLite database initialized successfully')
  } catch (err) {
    console.error('[Tesserin] Failed to initialize SQLite database:', err)
    console.error('[Tesserin] App will continue with in-memory storage fallback')
  }

  // Register all IPC handlers (DB, AI, FS, Agents, KB)
  try {
    registerIpcHandlers()
    console.log('[Tesserin] IPC handlers registered')
  } catch (err) {
    console.error('[Tesserin] Failed to register IPC handlers:', err)
  }

  // Load persisted cloud agent configurations
  try {
    cloudAgentManager.loadFromSettings()
    console.log('[Tesserin] Cloud agent configs loaded')
  } catch (err) {
    console.error('[Tesserin] Failed to load cloud agents:', err)
  }

  // Auto-start API server if it was previously enabled
  try {
    const apiEnabled = getSetting('api.serverEnabled')
    if (apiEnabled === 'true') {
      const apiPort = parseInt(getSetting('api.serverPort') || '9960') || 9960
      startApiServer(apiPort).then((port) => {
        console.log(`[Tesserin] API server auto-started on port ${port}`)
      }).catch((err) => {
        console.error('[Tesserin] Failed to auto-start API server:', err)
      })
    }
  } catch {
    // Non-fatal — API server is optional
  }

  // Create the main window
  createWindow()

  // ── Auto-updater (production only) ─────────────────────────────────
  if (!isDev) {
    setupAutoUpdater(mainWindow)
  }

  // ── Super+Arrow window snapping ──────────────────────────────────
  // GNOME/KDE intercept Super+Arrow at the compositor level so frameless
  // windows never receive them. globalShortcut registers at OS level so
  // Tesserin gets them first and snaps itself using setBounds().
  const snap = (fn: () => void) => () => { if (mainWindow) fn() }
  globalShortcut.register('Super+Left',  snap(() => {
    const { x, y, width, height } = screen.getDisplayMatching(mainWindow!.getBounds()).workArea
    mainWindow!.setFullScreen(false)
    mainWindow!.unmaximize()
    mainWindow!.setBounds({ x, y, width: Math.floor(width / 2), height })
  }))
  globalShortcut.register('Super+Right', snap(() => {
    const { x, y, width, height } = screen.getDisplayMatching(mainWindow!.getBounds()).workArea
    mainWindow!.setFullScreen(false)
    mainWindow!.unmaximize()
    mainWindow!.setBounds({ x: x + Math.floor(width / 2), y, width: Math.ceil(width / 2), height })
  }))
  globalShortcut.register('Super+Up',    snap(() => {
    mainWindow!.setFullScreen(false)
    mainWindow!.maximize()
  }))
  globalShortcut.register('Super+Down',  snap(() => {
    if (mainWindow!.isMaximized() || mainWindow!.isFullScreen()) {
      mainWindow!.setFullScreen(false)
      mainWindow!.unmaximize()
    } else {
      mainWindow!.minimize()
    }
  }))

  // ── Content Security Policy ──────────────────────────────────────
  // Read the Ollama endpoint from settings so the CSP allows the configured host
  let ollamaOrigin = 'http://127.0.0.1:11434'
  try {
    const configured = getSetting('ai.endpoint')
    if (configured) {
      const url = new URL(configured)
      ollamaOrigin = url.origin
    }
  } catch { /* keep default */ }

  const csp = isDev
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",                     // Vite HMR needs inline scripts
        "style-src 'self' 'unsafe-inline'",                               // Tailwind + inline styles
        "connect-src 'self' ws://localhost:* http://localhost:*",  // Vite WS + Ollama
        "img-src 'self' data: blob:",
        "font-src 'self' data: https://esm.sh",
        "worker-src 'self' blob:",
      ].join('; ')
    : [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",                               // Tailwind runtime styles
        `connect-src 'self' ${ollamaOrigin}`,         // Ollama (from settings)
        "img-src 'self' data: blob:",
        "font-src 'self' data: https://esm.sh",
        "worker-src 'self' blob:",
      ].join('; ')

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    })
  })

  console.log('[Tesserin] Window created, loading', isDev ? 'http://localhost:5173' : 'dist/index.html')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})
