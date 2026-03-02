"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const ipc_handlers_1 = require("./ipc-handlers");
const database_1 = require("./database");
const mcp_server_1 = require("./mcp-server");
const api_server_1 = require("./api-server");
const cloud_agents_1 = require("./cloud-agents");
// ── Global error handlers ───────────────────────────────────────
// Prevent the main process from crashing silently on unhandled errors.
process.on('uncaughtException', (error) => {
    console.error('[Tesserin] Uncaught exception in main process:', error);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Tesserin] Unhandled promise rejection in main process:', reason);
});
// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
// Resolve icon path — in dev it's at project root, in production it's in resources/
function resolveIconPath() {
    if (isDev) {
        return path_1.default.join(__dirname, '../../build/icon.png');
    }
    // On macOS the app icon is embedded in the .app bundle; no runtime icon needed
    if (process.platform === 'darwin') {
        return path_1.default.join(process.resourcesPath, 'icon.png');
    }
    // On Windows, prefer .ico for sharp rendering in taskbar/alt-tab
    if (process.platform === 'win32') {
        return path_1.default.join(process.resourcesPath, 'icon.ico');
    }
    // Linux
    return path_1.default.join(process.resourcesPath, 'icon.png');
}
const iconPath = resolveIconPath();
// If launched with --mcp flag, run as MCP server on stdio and exit
if (process.argv.includes('--mcp')) {
    (0, mcp_server_1.startMcpServerStdio)().catch((err) => {
        console.error('[Tesserin] Failed to start MCP server:', err);
        process.exit(1);
    });
}
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        frame: false,
        titleBarStyle: 'hiddenInset',
        trafficLightPosition: { x: 16, y: 16 },
        backgroundColor: '#050505',
        icon: electron_1.nativeImage.createFromPath(iconPath),
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
        },
    });
    // Load the Vite dev server in development, or the bundled app in production
    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Frameless window controls
    electron_1.ipcMain.on('window:minimize', () => mainWindow?.minimize());
    electron_1.ipcMain.on('window:maximize', () => {
        if (mainWindow?.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow?.maximize();
        }
    });
    electron_1.ipcMain.on('window:close', () => mainWindow?.close());
    electron_1.ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
}
electron_1.app.whenReady().then(() => {
    // Set application icon — on Linux this updates the dock/taskbar icon
    // (BrowserWindow.icon alone doesn't reach the taskbar on GNOME/Wayland)
    // app.setIcon() is only available on Linux
    if (process.platform === 'linux') {
        try {
            const appIcon = electron_1.nativeImage.createFromPath(iconPath);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (!appIcon.isEmpty())
                electron_1.app.setIcon(appIcon);
        }
        catch { /* non-fatal */ }
    }
    // Initialize SQLite database (non-fatal — app works without it via in-memory fallback)
    try {
        (0, database_1.initDatabase)();
        console.log('[Tesserin] SQLite database initialized successfully');
    }
    catch (err) {
        console.error('[Tesserin] Failed to initialize SQLite database:', err);
        console.error('[Tesserin] App will continue with in-memory storage fallback');
    }
    // Register all IPC handlers (DB, AI, FS, Agents, KB)
    try {
        (0, ipc_handlers_1.registerIpcHandlers)();
        console.log('[Tesserin] IPC handlers registered');
    }
    catch (err) {
        console.error('[Tesserin] Failed to register IPC handlers:', err);
    }
    // Load persisted cloud agent configurations
    try {
        cloud_agents_1.cloudAgentManager.loadFromSettings();
        console.log('[Tesserin] Cloud agent configs loaded');
    }
    catch (err) {
        console.error('[Tesserin] Failed to load cloud agents:', err);
    }
    // Auto-start API server if it was previously enabled
    try {
        const apiEnabled = (0, database_1.getSetting)('api.serverEnabled');
        if (apiEnabled === 'true') {
            const apiPort = parseInt((0, database_1.getSetting)('api.serverPort') || '9960') || 9960;
            (0, api_server_1.startApiServer)(apiPort).then((port) => {
                console.log(`[Tesserin] API server auto-started on port ${port}`);
            }).catch((err) => {
                console.error('[Tesserin] Failed to auto-start API server:', err);
            });
        }
    }
    catch {
        // Non-fatal — API server is optional
    }
    // Create the main window
    createWindow();
    // ── Content Security Policy ──────────────────────────────────────
    // Read the Ollama endpoint from settings so the CSP allows the configured host
    let ollamaOrigin = 'http://127.0.0.1:11434';
    try {
        const configured = (0, database_1.getSetting)('ai.endpoint');
        if (configured) {
            const url = new URL(configured);
            ollamaOrigin = url.origin;
        }
    }
    catch { /* keep default */ }
    const csp = isDev
        ? [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'", // Vite HMR needs inline scripts
            "style-src 'self' 'unsafe-inline'", // Tailwind + inline styles
            "connect-src 'self' ws://localhost:* http://localhost:*", // Vite WS + Ollama
            "img-src 'self' data: blob:",
            "font-src 'self' data: https://esm.sh",
            "worker-src 'self' blob:",
        ].join('; ')
        : [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'", // Tailwind runtime styles
            `connect-src 'self' ${ollamaOrigin}`, // Ollama (from settings)
            "img-src 'self' data: blob:",
            "font-src 'self' data: https://esm.sh",
            "worker-src 'self' blob:",
        ].join('; ');
    electron_1.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [csp],
            },
        });
    });
    console.log('[Tesserin] Window created, loading', isDev ? 'http://localhost:5173' : 'dist/index.html');
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
//# sourceMappingURL=main.js.map