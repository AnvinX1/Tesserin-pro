"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const db = __importStar(require("./database"));
const ai = __importStar(require("./ai-service"));
const kb = __importStar(require("./knowledge-base"));
const mcp_client_1 = require("./mcp-client");
const cloud_agents_1 = require("./cloud-agents");
const api_server_1 = require("./api-server");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const pty = __importStar(require("node-pty"));
/* ================================================================== */
/*  Input validation helpers                                           */
/* ================================================================== */
/** Validates a string parameter. Returns the trimmed string or throws. */
function requireString(value, name) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid parameter "${name}": expected non-empty string`);
    }
    return value.trim();
}
/** Validates an optional string parameter. */
function optionalString(value, name) {
    if (value === undefined || value === null)
        return undefined;
    return requireString(value, name);
}
/**
 * Validates a filesystem path:
 * 1. Must be a non-empty string
 * 2. Must be absolute
 * 3. Must not contain null bytes
 * 4. Resolved path must not escape via .. traversal to unexpected roots
 */
function validatePath(value, name) {
    const raw = requireString(value, name);
    if (raw.includes('\0')) {
        throw new Error(`Invalid path "${name}": contains null bytes`);
    }
    const resolved = path.resolve(raw);
    if (!path.isAbsolute(resolved)) {
        throw new Error(`Invalid path "${name}": must be absolute`);
    }
    return resolved;
}
/** Validates that a value looks like a UUID / nanoid (alphanumeric + dashes). */
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;
function validateId(value, name) {
    const str = requireString(value, name);
    if (!ID_RE.test(str)) {
        throw new Error(`Invalid ID "${name}": must be 1-64 alphanumeric/dash/underscore chars`);
    }
    return str;
}
/** Validates a positive integer. */
function requirePositiveInt(value, name) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid parameter "${name}": expected positive integer`);
    }
    return value;
}
/* ================================================================== */
/*  Shell command safety                                               */
/* ================================================================== */
/** Blocked shell command patterns — prevent destructive/dangerous operations */
const DANGEROUS_COMMAND_PATTERNS = [
    /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\//, // rm -rf / or rm /
    /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?~\//, // rm -rf ~/
    /\bmkfs\b/, // format disk
    /\bdd\s+if=/, // disk overwrite
    /:(\s*)\(\s*\)\s*\{/, // fork bomb
    /\bshutdown\b/, // shutdown system
    /\breboot\b/, // reboot system
    /\bcurl\b.*\|\s*(sh|bash)\b/, // pipe curl to shell
    /\bwget\b.*\|\s*(sh|bash)\b/, // pipe wget to shell
    /\bchmod\s+777\s+\//, // chmod 777 on root
    /\bchown\s+.*\//, // chown on system dirs
    /\/etc\/shadow/, // access shadow file
    /\/etc\/passwd/, // access passwd file
    /\beval\b/, // eval execution
    /\bexec\b.*>/, // exec redirect
    /\b>\s*\/dev\/sda/, // overwrite disk
    /\bnc\s+-[a-z]*l/i, // netcat listener
    /\bpython[23]?\s+-m\s+http/, // python http server
];
function validateShellCommand(command) {
    for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
        if (pattern.test(command)) {
            throw new Error(`Blocked: command matches dangerous pattern`);
        }
    }
    if (command.length > 2000) {
        throw new Error('Command too long (max 2000 characters)');
    }
}
/* ================================================================== */
/*  Safe environment variable filtering                                */
/* ================================================================== */
/** Only pass safe env vars to subprocesses (terminal, shell, MCP) */
const SAFE_ENV_KEYS = [
    'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL', 'LC_CTYPE',
    'TERM', 'TERM_PROGRAM', 'COLORTERM', 'EDITOR', 'VISUAL',
    'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_RUNTIME_DIR',
    'DISPLAY', 'WAYLAND_DISPLAY', 'DBUS_SESSION_BUS_ADDRESS',
    'TMPDIR', 'TMP', 'TEMP',
    'NODE_ENV', 'HOSTNAME',
];
function safeEnv() {
    const env = {};
    for (const key of SAFE_ENV_KEYS) {
        if (process.env[key])
            env[key] = process.env[key];
    }
    try {
        const token = (0, api_server_1.getInternalTerminalToken)();
        const status = (0, api_server_1.getApiServerStatus)();
        env['TESSERIN_API_TOKEN'] = token;
        env['TESSERIN_API_URL'] = `http://127.0.0.1:${status.port}`;
        env['MEMPALACE_ENABLED'] = '1'; // Ensures MemPalace MCP starts directly within the terminal if used
    }
    catch {
        // Ignore if services aren't ready
    }
    return env;
}
/**
 * Register all IPC handlers for the Tesserin app.
 * Called once from main.ts during app initialization.
 */
function registerIpcHandlers() {
    // ── Notes ─────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:notes:list', () => db.listNotes());
    electron_1.ipcMain.handle('db:notes:get', (_e, id) => db.getNote(validateId(id, 'id')));
    electron_1.ipcMain.handle('db:notes:create', (_e, data) => {
        if (!data || typeof data !== 'object')
            throw new Error('Invalid note data');
        return db.createNote(data);
    });
    electron_1.ipcMain.handle('db:notes:update', (_e, id, data) => {
        if (!data || typeof data !== 'object')
            throw new Error('Invalid note data');
        return db.updateNote(validateId(id, 'id'), data);
    });
    electron_1.ipcMain.handle('db:notes:delete', (_e, id) => db.deleteNote(validateId(id, 'id')));
    electron_1.ipcMain.handle('db:notes:search', (_e, query) => db.searchNotes(requireString(query, 'query')));
    electron_1.ipcMain.handle('db:notes:getByTitle', (_e, title) => db.getNoteByTitle(requireString(title, 'title')));
    // ── Tags ──────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:tags:list', () => db.listTags());
    electron_1.ipcMain.handle('db:tags:create', (_e, name, color) => db.createTag(requireString(name, 'name'), optionalString(color, 'color')));
    electron_1.ipcMain.handle('db:tags:delete', (_e, id) => db.deleteTag(validateId(id, 'id')));
    electron_1.ipcMain.handle('db:tags:addToNote', (_e, noteId, tagId) => db.addTagToNote(validateId(noteId, 'noteId'), validateId(tagId, 'tagId')));
    electron_1.ipcMain.handle('db:tags:removeFromNote', (_e, noteId, tagId) => db.removeTagFromNote(validateId(noteId, 'noteId'), validateId(tagId, 'tagId')));
    electron_1.ipcMain.handle('db:tags:getForNote', (_e, noteId) => db.getTagsForNote(validateId(noteId, 'noteId')));
    // ── Folders ───────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:folders:list', () => db.listFolders());
    electron_1.ipcMain.handle('db:folders:create', (_e, name, parentId) => db.createFolder(requireString(name, 'name'), optionalString(parentId, 'parentId')));
    electron_1.ipcMain.handle('db:folders:rename', (_e, id, name) => db.renameFolder(validateId(id, 'id'), requireString(name, 'name')));
    electron_1.ipcMain.handle('db:folders:delete', (_e, id) => db.deleteFolder(validateId(id, 'id')));
    // ── Tasks ─────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:tasks:list', () => db.listTasks());
    electron_1.ipcMain.handle('db:tasks:create', (_e, data) => {
        if (!data || typeof data !== 'object')
            throw new Error('Invalid task data');
        return db.createTask(data);
    });
    electron_1.ipcMain.handle('db:tasks:update', (_e, id, data) => {
        if (!data || typeof data !== 'object')
            throw new Error('Invalid task data');
        return db.updateTask(validateId(id, 'id'), data);
    });
    electron_1.ipcMain.handle('db:tasks:delete', (_e, id) => db.deleteTask(validateId(id, 'id')));
    // ── Templates ─────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:templates:list', () => db.listTemplates());
    electron_1.ipcMain.handle('db:templates:get', (_e, id) => db.getTemplate(validateId(id, 'id')));
    electron_1.ipcMain.handle('db:templates:create', (_e, data) => {
        if (!data || typeof data !== 'object')
            throw new Error('Invalid template data');
        return db.createTemplate(data);
    });
    electron_1.ipcMain.handle('db:templates:delete', (_e, id) => db.deleteTemplate(validateId(id, 'id')));
    // ── Settings ──────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:settings:get', (_e, key) => db.getSetting(requireString(key, 'key')));
    electron_1.ipcMain.handle('db:settings:set', (_e, key, value) => {
        // key must be non-empty; value may be an empty string (e.g. clearing an API key)
        const k = requireString(key, 'key');
        if (typeof value !== 'string')
            throw new Error(`Invalid parameter "value": expected string`);
        return db.setSetting(k, value);
    });
    electron_1.ipcMain.handle('db:settings:getAll', () => db.getAllSettings());
    electron_1.ipcMain.handle('db:clear', () => db.clearAllData());
    // ── Canvases ──────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:canvases:list', () => db.listCanvases());
    electron_1.ipcMain.handle('db:canvases:get', (_e, id) => db.getCanvas(validateId(id, 'id')));
    electron_1.ipcMain.handle('db:canvases:create', (_e, data) => {
        if (!data || typeof data !== 'object')
            throw new Error('Invalid canvas data');
        return db.createCanvas(data);
    });
    electron_1.ipcMain.handle('db:canvases:update', (_e, id, data) => {
        if (!data || typeof data !== 'object')
            throw new Error('Invalid canvas data');
        return db.updateCanvas(validateId(id, 'id'), data);
    });
    electron_1.ipcMain.handle('db:canvases:delete', (_e, id) => db.deleteCanvas(validateId(id, 'id')));
    // ── AI ────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('ai:chat', async (_e, messages, model) => {
        return ai.chat(messages, model);
    });
    electron_1.ipcMain.on('ai:chat:stream', async (event, messages, model) => {
        try {
            await ai.chatStream(messages, model, {
                onChunk: (chunk) => event.sender.send('ai:chat:stream:chunk', chunk),
                onDone: () => event.sender.send('ai:chat:stream:done'),
                onError: (error) => event.sender.send('ai:chat:stream:error', error),
            });
        }
        catch (err) {
            event.sender.send('ai:chat:stream:error', String(err));
        }
    });
    electron_1.ipcMain.handle('ai:summarize', async (_e, text, model) => {
        return ai.summarize(text, model);
    });
    electron_1.ipcMain.handle('ai:generateTags', async (_e, text, model) => {
        return ai.generateTags(text, model);
    });
    electron_1.ipcMain.handle('ai:suggestLinks', async (_e, content, existingTitles, model) => {
        return ai.suggestLinks(content, existingTitles, model);
    });
    electron_1.ipcMain.handle('ai:checkConnection', async () => {
        return ai.checkConnection();
    });
    electron_1.ipcMain.handle('ai:listModels', async () => {
        return ai.listModels();
    });
    // ── OpenRouter (cloud AI) ─────────────────────────────────────
    electron_1.ipcMain.on('ai:openrouter:stream', async (event, messages) => {
        try {
            await ai.chatStreamOpenRouter(messages, {
                onChunk: (chunk) => event.sender.send('ai:openrouter:stream:chunk', chunk),
                onDone: () => event.sender.send('ai:openrouter:stream:done'),
                onError: (error) => event.sender.send('ai:openrouter:stream:error', error),
            });
        }
        catch (err) {
            event.sender.send('ai:openrouter:stream:error', String(err));
        }
    });
    electron_1.ipcMain.handle('ai:openrouter:listModels', async (_e, apiKey) => {
        return ai.listOpenRouterModels(apiKey);
    });
    // ── MCP (Model Context Protocol) ──────────────────────────────
    electron_1.ipcMain.handle('mcp:connect', async (_e, config) => {
        await mcp_client_1.mcpClientManager.connect(config);
        const tools = mcp_client_1.mcpClientManager.getServerTools(config.id);
        const statuses = mcp_client_1.mcpClientManager.getStatuses();
        const status = statuses.find(s => s.serverId === config.id);
        return {
            status: status || { serverId: config.id, serverName: config.name, status: 'error', toolCount: 0 },
            tools,
        };
    });
    electron_1.ipcMain.handle('mcp:disconnect', async (_e, serverId) => {
        await mcp_client_1.mcpClientManager.disconnect(serverId);
    });
    electron_1.ipcMain.handle('mcp:callTool', async (_e, serverId, toolName, args) => {
        return mcp_client_1.mcpClientManager.callTool(serverId, toolName, args);
    });
    electron_1.ipcMain.handle('mcp:getStatuses', async () => {
        return {
            statuses: mcp_client_1.mcpClientManager.getStatuses(),
            tools: mcp_client_1.mcpClientManager.getAllTools(),
        };
    });
    electron_1.ipcMain.handle('mcp:getTools', async () => {
        return mcp_client_1.mcpClientManager.getAllTools();
    });
    electron_1.ipcMain.handle('mcp:getServerTools', async (_e, serverId) => {
        return mcp_client_1.mcpClientManager.getServerTools(serverId);
    });
    // ── Filesystem ────────────────────────────────────────────────────
    electron_1.ipcMain.handle('fs:readDir', async (_e, dirPath) => {
        const safePath = validatePath(dirPath, 'dirPath');
        const entries = await fs.promises.readdir(safePath, { withFileTypes: true });
        return entries
            .filter(e => !e.name.startsWith('.'))
            .map(e => ({
            name: e.name,
            path: path.join(safePath, e.name),
            isDirectory: e.isDirectory(),
        }))
            .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory)
                return a.isDirectory ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    });
    electron_1.ipcMain.handle('fs:readFile', async (_e, filePath) => {
        return fs.promises.readFile(validatePath(filePath, 'filePath'), 'utf-8');
    });
    electron_1.ipcMain.handle('fs:writeFile', async (_e, filePath, content) => {
        if (typeof content !== 'string')
            throw new Error('Invalid content: expected string');
        await fs.promises.writeFile(validatePath(filePath, 'filePath'), content, 'utf-8');
    });
    electron_1.ipcMain.handle('fs:stat', async (_e, filePath) => {
        const stat = await fs.promises.stat(validatePath(filePath, 'filePath'));
        return {
            size: stat.size,
            isDirectory: stat.isDirectory(),
            isFile: stat.isFile(),
            modified: stat.mtime.toISOString(),
        };
    });
    // ── Shell Exec (non-interactive, for AI agent) ────────────────────
    electron_1.ipcMain.handle('shell:exec', (_e, command, cwd) => {
        const safeCommand = requireString(command, 'command');
        validateShellCommand(safeCommand);
        const safeCwd = cwd ? validatePath(cwd, 'cwd') : os.homedir();
        return new Promise((resolve) => {
            const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash';
            const args = os.platform() === 'win32' ? ['-Command', safeCommand] : ['-c', safeCommand];
            const child = (0, child_process_1.execFile)(shell, args, {
                cwd: safeCwd,
                timeout: 30000,
                maxBuffer: 1024 * 1024,
                env: safeEnv(),
            }, (error, stdout, stderr) => {
                resolve({
                    stdout: stdout || '',
                    stderr: stderr || '',
                    exitCode: error ? error.code || 1 : 0,
                });
            });
        });
    });
    // ── Filesystem: mkdir + delete ────────────────────────────────────
    electron_1.ipcMain.handle('fs:mkdir', async (_e, dirPath) => {
        await fs.promises.mkdir(validatePath(dirPath, 'dirPath'), { recursive: true });
    });
    electron_1.ipcMain.handle('fs:delete', async (_e, filePath) => {
        const safePath = validatePath(filePath, 'filePath');
        // Prevent deleting critical system paths — use strict blocklist
        const dangerous = [
            '/', '/usr', '/bin', '/sbin', '/etc', '/var', '/tmp', '/opt',
            '/home', '/root', '/boot', '/dev', '/proc', '/sys', '/lib', '/lib64',
            os.homedir(),
        ];
        const resolvedLower = safePath.toLowerCase();
        if (dangerous.some(d => resolvedLower === d || resolvedLower === d + '/')) {
            throw new Error('Refusing to delete critical system path');
        }
        // Must not be inside a system directory (only allow user-space paths)
        const allowedRoots = [os.homedir()];
        if (!allowedRoots.some(root => safePath.startsWith(root + path.sep) && safePath !== root)) {
            throw new Error('fs:delete only allowed within user home directory');
        }
        const stat = await fs.promises.stat(safePath);
        if (stat.isDirectory()) {
            await fs.promises.rm(safePath, { recursive: true });
        }
        else {
            await fs.promises.unlink(safePath);
        }
    });
    // ── Dialog ────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('dialog:openFolder', async () => {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        if (!win)
            return null;
        const result = await electron_1.dialog.showOpenDialog(win, {
            properties: ['openDirectory'],
        });
        return result.canceled ? null : result.filePaths[0];
    });
    // ── Save File Dialog ──────────────────────────────────────────────
    electron_1.ipcMain.handle('dialog:saveFile', async (_e, options) => {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        if (!win)
            return null;
        const result = await electron_1.dialog.showSaveDialog(win, {
            title: options?.title || 'Save File',
            defaultPath: options?.defaultPath,
            filters: options?.filters,
        });
        return result.canceled ? null : result.filePath;
    });
    // ── Write binary buffer (base64-encoded) to file ──────────────────
    electron_1.ipcMain.handle('fs:writeBuffer', async (_e, filePath, base64Data) => {
        const safePath = validatePath(filePath, 'filePath');
        const buffer = Buffer.from(base64Data, 'base64');
        await fs.promises.writeFile(safePath, buffer);
    });
    // ── Canvas PDF Export ─────────────────────────────────────
    // Receives an HTML string (canvas PNG wrapped in a print-ready page),
    // loads it in a hidden off-screen BrowserWindow, calls printToPDF,
    // and writes the result to filePath. No user-visible window is shown.
    electron_1.ipcMain.handle('canvas:printToPDF', async (_e, htmlContent, outputPath, opts) => {
        const safePath = validatePath(outputPath, 'outputPath');
        const win = electron_1.BrowserWindow.getFocusedWindow();
        const pageWidth = opts?.pageWidth ?? 794.56;
        const pageHeight = opts?.pageHeight ?? 1122.56;
        // Strip script/event-handler content from HTML before loading in a hidden window
        // to prevent execution of renderer-supplied scripts during PDF rendering.
        const safeHtml = htmlContent
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/\bon\w+\s*=/gi, 'data-blocked=');
        const hidden = new electron_1.BrowserWindow({
            show: false,
            width: Math.round(pageWidth),
            height: Math.round(pageHeight),
            webPreferences: { offscreen: true, javascript: false },
        });
        try {
            await hidden.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(safeHtml));
            // Give fonts/images a tick to fully render
            await new Promise(resolve => setTimeout(resolve, 300));
            const pdfData = await hidden.webContents.printToPDF({
                printBackground: true,
                pageSize: { width: pageWidth * 1000, height: pageHeight * 1000 }, // Electron uses microns
                margins: { marginType: 'none' },
            });
            await fs.promises.writeFile(safePath, pdfData);
            // Offer to reveal the saved file
            if (win)
                electron_1.shell.showItemInFolder(safePath);
        }
        finally {
            hidden.destroy();
        }
    });
    electron_1.ipcMain.handle('api:keys:list', () => {
        const keys = db.listApiKeys();
        // Never send key_hash to renderer
        return keys.map(k => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            permissions: k.permissions,
            created_at: k.created_at,
            last_used_at: k.last_used_at,
            expires_at: k.expires_at,
            is_revoked: k.is_revoked,
        }));
    });
    electron_1.ipcMain.handle('api:keys:create', (_e, data) => {
        if (!data || typeof data !== 'object')
            throw new Error('Invalid API key data');
        const name = requireString(data.name, 'name');
        const { rawKey, keyHash, prefix } = (0, api_server_1.generateApiKey)();
        const id = (0, crypto_1.randomUUID)();
        const permissions = Array.isArray(data.permissions) ? data.permissions : ['*'];
        db.createApiKey({ id, name, keyHash, prefix, permissions, expiresAt: data.expiresAt });
        // Return raw key ONCE — it cannot be recovered after this
        return { id, name, prefix, rawKey, permissions };
    });
    electron_1.ipcMain.handle('api:keys:revoke', (_e, id) => {
        db.revokeApiKey(validateId(id, 'id'));
    });
    electron_1.ipcMain.handle('api:keys:delete', (_e, id) => {
        db.deleteApiKey(validateId(id, 'id'));
    });
    // ── API Server ───────────────────────────────────────────────────
    electron_1.ipcMain.handle('api:server:start', async (_e, port) => {
        const safePort = typeof port === 'number' && port > 0 && port < 65536 ? port : 9960;
        const actualPort = await (0, api_server_1.startApiServer)(safePort);
        return { running: true, port: actualPort };
    });
    electron_1.ipcMain.handle('api:server:stop', () => {
        (0, api_server_1.stopApiServer)();
        return { running: false };
    });
    electron_1.ipcMain.handle('api:server:status', () => {
        return (0, api_server_1.getApiServerStatus)();
    });
    // ── PPT Generation ───────────────────────────────────────────────
    electron_1.ipcMain.handle('ppt:generate', async (_e, specOrMarkdown, outputPath) => {
        const safePath = validatePath(outputPath, 'outputPath');
        if (!safePath.endsWith('.pptx')) {
            throw new Error('Output path must end in .pptx');
        }
        const pptLib = await Promise.resolve().then(() => __importStar(require('./ppt-generator')));
        // Accept either a JSON DeckSpec object or a markdown string
        if (typeof specOrMarkdown === 'string') {
            return pptLib.generateFromMarkdownAndSave(specOrMarkdown, safePath);
        }
        if (specOrMarkdown && typeof specOrMarkdown === 'object') {
            return pptLib.generateAndSavePptx(specOrMarkdown, safePath);
        }
        throw new Error('Invalid spec: expected a DeckSpec object or markdown string');
    });
    // ── Cloud Agents ─────────────────────────────────────────────────
    electron_1.ipcMain.handle('agents:list', () => {
        return cloud_agents_1.cloudAgentManager.listAgents();
    });
    electron_1.ipcMain.handle('agents:statuses', () => {
        return cloud_agents_1.cloudAgentManager.getStatuses();
    });
    electron_1.ipcMain.handle('agents:register', (_e, type, config) => {
        const validTypes = ['claude-code', 'gemini-cli', 'openai-codex', 'opencode', 'custom'];
        if (!validTypes.includes(type)) {
            throw new Error(`Invalid agent type: ${type}. Must be one of: ${validTypes.join(', ')}`);
        }
        return cloud_agents_1.cloudAgentManager.registerAgent(type, config);
    });
    electron_1.ipcMain.handle('agents:update', (_e, id, updates) => {
        if (typeof id !== 'string')
            throw new Error('Agent ID must be a string');
        return cloud_agents_1.cloudAgentManager.updateAgent(id, updates);
    });
    electron_1.ipcMain.handle('agents:remove', async (_e, id) => {
        if (typeof id !== 'string')
            throw new Error('Agent ID must be a string');
        await cloud_agents_1.cloudAgentManager.disconnectAgent(id);
        return cloud_agents_1.cloudAgentManager.removeAgent(id);
    });
    electron_1.ipcMain.handle('agents:connect', async (_e, id) => {
        if (typeof id !== 'string')
            throw new Error('Agent ID must be a string');
        await cloud_agents_1.cloudAgentManager.connectAgent(id);
    });
    electron_1.ipcMain.handle('agents:disconnect', async (_e, id) => {
        if (typeof id !== 'string')
            throw new Error('Agent ID must be a string');
        await cloud_agents_1.cloudAgentManager.disconnectAgent(id);
    });
    electron_1.ipcMain.handle('agents:callTool', async (_e, agentId, toolName, args) => {
        if (typeof agentId !== 'string')
            throw new Error('Agent ID must be a string');
        if (typeof toolName !== 'string')
            throw new Error('Tool name must be a string');
        return cloud_agents_1.cloudAgentManager.callAgentTool(agentId, toolName, args || {});
    });
    electron_1.ipcMain.handle('agents:getTools', (_e, agentId) => {
        if (typeof agentId !== 'string')
            throw new Error('Agent ID must be a string');
        return cloud_agents_1.cloudAgentManager.getAgentTools(agentId);
    });
    electron_1.ipcMain.handle('agents:createToken', (_e, agentId, name, permissions, expiresAt) => {
        if (typeof agentId !== 'string')
            throw new Error('Agent ID must be a string');
        return cloud_agents_1.cloudAgentManager.createAgentToken(agentId, name || 'Token', permissions, expiresAt);
    });
    electron_1.ipcMain.handle('agents:getTokens', (_e, agentId) => {
        if (typeof agentId !== 'string')
            throw new Error('Agent ID must be a string');
        return cloud_agents_1.cloudAgentManager.getAgentTokens(agentId);
    });
    electron_1.ipcMain.handle('agents:revokeToken', (_e, agentId, tokenId) => {
        if (typeof agentId !== 'string')
            throw new Error('Agent ID must be a string');
        if (typeof tokenId !== 'string')
            throw new Error('Token ID must be a string');
        return cloud_agents_1.cloudAgentManager.revokeToken(agentId, tokenId);
    });
    // ── Knowledge Base ───────────────────────────────────────────────
    electron_1.ipcMain.handle('kb:graph', () => {
        return kb.buildKnowledgeGraph();
    });
    electron_1.ipcMain.handle('kb:export', () => {
        return kb.exportVault();
    });
    electron_1.ipcMain.handle('kb:search', (_e, query, maxChunks) => {
        if (typeof query !== 'string')
            throw new Error('Query must be a string');
        return kb.searchContextChunks(query, maxChunks || 10);
    });
    electron_1.ipcMain.handle('kb:context', (_e, maxNotes) => {
        return kb.formatVaultAsContext(maxNotes || 50);
    });
    electron_1.ipcMain.handle('kb:noteConnections', (_e, noteId) => {
        if (typeof noteId !== 'string')
            throw new Error('Note ID must be a string');
        const note = db.getNote(noteId);
        if (!note)
            throw new Error(`Note not found: ${noteId}`);
        const graph = kb.buildKnowledgeGraph();
        const node = graph.nodes.find(n => n.id === noteId);
        const tags = db.getTagsForNote(noteId);
        const relatedEdges = graph.edges.filter(e => e.source === noteId || e.target === noteId);
        return {
            note: { id: note.id, title: note.title },
            tags: tags.map((t) => t.name),
            outgoingLinks: node?.outgoingLinks || [],
            incomingLinks: node?.incomingLinks || [],
            linkCount: node?.linkCount || 0,
            edges: relatedEdges
        };
    });
    // ── Terminal (PTY) ──────────────────────────────────────────────────
    const ptyProcesses = new Map();
    const ptyDataHandlerRegistered = new Set();
    electron_1.ipcMain.handle('terminal:openExternal', (_e, url) => {
        // Only allow http/https URLs to prevent protocol abuse
        if (!/^https?:\/\//.test(url))
            return false;
        electron_1.shell.openExternal(url);
        return true;
    });
    electron_1.ipcMain.handle('terminal:getShells', async () => {
        const platform = os.platform();
        const shells = [];
        if (platform === 'win32') {
            const candidates = [
                { name: 'PowerShell Core', path: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe' },
                { name: 'PowerShell', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' },
                { name: 'Command Prompt', path: 'C:\\Windows\\System32\\cmd.exe' },
                { name: 'WSL', path: 'C:\\Windows\\System32\\wsl.exe' },
            ];
            for (const c of candidates) {
                if (fs.existsSync(c.path))
                    shells.push(c);
            }
        }
        else {
            // Seed with $SHELL first so the user's preferred shell is the default
            const envShell = process.env.SHELL;
            if (envShell && fs.existsSync(envShell)) {
                shells.push({ name: `${path.basename(envShell)} (default)`, path: envShell });
            }
            // Parse /etc/shells for additional options
            try {
                const shellNames = {
                    bash: 'Bash', zsh: 'Zsh', fish: 'Fish', sh: 'sh',
                    dash: 'Dash', ksh: 'KSH', tcsh: 'TCSH', nu: 'Nushell',
                };
                const lines = fs.readFileSync('/etc/shells', 'utf8').split('\n');
                for (const line of lines) {
                    const sp = line.trim();
                    if (!sp.startsWith('/') || sp.startsWith('#'))
                        continue;
                    if (shells.some(s => s.path === sp))
                        continue; // already added
                    shells.push({ name: shellNames[path.basename(sp)] || path.basename(sp), path: sp });
                }
            }
            catch {
                // /etc/shells not available — add common fallbacks
                for (const sp of ['/bin/zsh', '/bin/bash', '/bin/sh']) {
                    if (fs.existsSync(sp) && !shells.some(s => s.path === sp)) {
                        shells.push({ name: path.basename(sp), path: sp });
                    }
                }
            }
        }
        return shells.length > 0
            ? shells
            : [{ name: platform === 'win32' ? 'PowerShell' : 'bash', path: platform === 'win32' ? 'powershell.exe' : '/bin/bash' }];
    });
    electron_1.ipcMain.handle('terminal:spawn', (_e, id, cwd, shellPath) => {
        // Check if process already exists for this ID
        const existing = ptyProcesses.get(id);
        if (existing) {
            console.log(`[Terminal] Reusing existing process for ${id} (PID: ${existing.pid})`);
            return { success: true, pid: existing.pid, reconnected: true };
        }
        const defaultShell = os.platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';
        // Validate shellPath: must be an absolute path pointing to a real, executable file
        // to prevent arbitrary binary execution via renderer-supplied paths.
        let shell = defaultShell;
        if (shellPath) {
            const resolved = path.resolve(shellPath);
            if (!path.isAbsolute(resolved) || resolved.includes('\0')) {
                console.warn(`[Terminal] Rejected invalid shellPath: ${shellPath}`);
            }
            else if (!fs.existsSync(resolved)) {
                console.warn(`[Terminal] Rejected non-existent shellPath: ${resolved}`);
            }
            else {
                shell = resolved;
            }
        }
        const workingDir = cwd || os.homedir();
        try {
            const ptyProcess = pty.spawn(shell, [], {
                name: 'xterm-256color',
                cols: 80,
                rows: 24,
                cwd: workingDir,
                env: safeEnv(),
            });
            ptyProcesses.set(id, ptyProcess);
            console.log(`[Terminal] Created new process for ${id} (PID: ${ptyProcess.pid})`);
            return { success: true, pid: ptyProcess.pid };
        }
        catch (err) {
            console.error(`[Terminal] Failed to spawn for ${id}:`, err);
            return { success: false, error: String(err) };
        }
    });
    electron_1.ipcMain.handle('terminal:write', (_e, id, data) => {
        const ptyProcess = ptyProcesses.get(id);
        if (ptyProcess) {
            ptyProcess.write(data);
            return true;
        }
        return false;
    });
    electron_1.ipcMain.handle('terminal:resize', (_e, id, cols, rows) => {
        const ptyProcess = ptyProcesses.get(id);
        if (ptyProcess) {
            ptyProcess.resize(cols, rows);
            return true;
        }
        return false;
    });
    electron_1.ipcMain.handle('terminal:kill', (_e, id) => {
        const ptyProcess = ptyProcesses.get(id);
        if (ptyProcess) {
            ptyProcess.kill();
            ptyProcesses.delete(id);
            ptyDataHandlerRegistered.delete(id);
            return true;
        }
        return false;
    });
    electron_1.ipcMain.on('terminal:data', (event, id) => {
        const ptyProcess = ptyProcesses.get(id);
        if (ptyProcess && !ptyDataHandlerRegistered.has(id)) {
            ptyDataHandlerRegistered.add(id);
            ptyProcess.onData((data) => {
                event.sender.send('terminal:data', id, data);
            });
        }
    });
}
//# sourceMappingURL=ipc-handlers.js.map