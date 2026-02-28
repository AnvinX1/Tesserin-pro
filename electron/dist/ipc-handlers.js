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
const mcp_client_1 = require("./mcp-client");
const api_server_1 = require("./api-server");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
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
    electron_1.ipcMain.handle('db:settings:set', (_e, key, value) => db.setSetting(requireString(key, 'key'), requireString(value, 'value')));
    electron_1.ipcMain.handle('db:settings:getAll', () => db.getAllSettings());
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
    // ── API Keys ─────────────────────────────────────────────────────
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
}
//# sourceMappingURL=ipc-handlers.js.map