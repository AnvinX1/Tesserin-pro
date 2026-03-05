"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
/**
 * Tesserin Preload Script
 *
 * Exposes a safe `window.tesserin` API to the renderer process.
 * All communication with the main process goes through IPC channels.
 */
const tesserinAPI = {
    // ── Database: Notes ──────────────────────────────────────────────
    db: {
        notes: {
            list: () => electron_1.ipcRenderer.invoke('db:notes:list'),
            get: (id) => electron_1.ipcRenderer.invoke('db:notes:get', id),
            create: (data) => electron_1.ipcRenderer.invoke('db:notes:create', data),
            update: (id, data) => electron_1.ipcRenderer.invoke('db:notes:update', id, data),
            delete: (id) => electron_1.ipcRenderer.invoke('db:notes:delete', id),
            search: (query) => electron_1.ipcRenderer.invoke('db:notes:search', query),
            getByTitle: (title) => electron_1.ipcRenderer.invoke('db:notes:getByTitle', title),
        },
        // ── Database: Tags ──────────────────────────────────────────────
        tags: {
            list: () => electron_1.ipcRenderer.invoke('db:tags:list'),
            create: (name, color) => electron_1.ipcRenderer.invoke('db:tags:create', name, color),
            delete: (id) => electron_1.ipcRenderer.invoke('db:tags:delete', id),
            addToNote: (noteId, tagId) => electron_1.ipcRenderer.invoke('db:tags:addToNote', noteId, tagId),
            removeFromNote: (noteId, tagId) => electron_1.ipcRenderer.invoke('db:tags:removeFromNote', noteId, tagId),
            getForNote: (noteId) => electron_1.ipcRenderer.invoke('db:tags:getForNote', noteId),
        },
        // ── Database: Folders ───────────────────────────────────────────
        folders: {
            list: () => electron_1.ipcRenderer.invoke('db:folders:list'),
            create: (name, parentId) => electron_1.ipcRenderer.invoke('db:folders:create', name, parentId),
            rename: (id, name) => electron_1.ipcRenderer.invoke('db:folders:rename', id, name),
            delete: (id) => electron_1.ipcRenderer.invoke('db:folders:delete', id),
        },
        // ── Database: Tasks ─────────────────────────────────────────────
        tasks: {
            list: () => electron_1.ipcRenderer.invoke('db:tasks:list'),
            create: (data) => electron_1.ipcRenderer.invoke('db:tasks:create', data),
            update: (id, data) => electron_1.ipcRenderer.invoke('db:tasks:update', id, data),
            delete: (id) => electron_1.ipcRenderer.invoke('db:tasks:delete', id),
        },
        // ── Database: Templates ─────────────────────────────────────────
        templates: {
            list: () => electron_1.ipcRenderer.invoke('db:templates:list'),
            get: (id) => electron_1.ipcRenderer.invoke('db:templates:get', id),
            create: (data) => electron_1.ipcRenderer.invoke('db:templates:create', data),
            delete: (id) => electron_1.ipcRenderer.invoke('db:templates:delete', id),
        },
        // ── Database: Settings ──────────────────────────────────────────
        settings: {
            get: (key) => electron_1.ipcRenderer.invoke('db:settings:get', key),
            set: (key, value) => electron_1.ipcRenderer.invoke('db:settings:set', key, value),
            getAll: () => electron_1.ipcRenderer.invoke('db:settings:getAll'),
        },
        // ── Database: Canvases ─────────────────────────────────────────
        canvases: {
            list: () => electron_1.ipcRenderer.invoke('db:canvases:list'),
            get: (id) => electron_1.ipcRenderer.invoke('db:canvases:get', id),
            create: (data) => electron_1.ipcRenderer.invoke('db:canvases:create', data),
            update: (id, data) => electron_1.ipcRenderer.invoke('db:canvases:update', id, data),
            delete: (id) => electron_1.ipcRenderer.invoke('db:canvases:delete', id),
        },
        clear: () => electron_1.ipcRenderer.invoke('db:clear'),
    },
    // ── AI (Ollama) ───────────────────────────────────────────────────
    ai: {
        chat: (messages, model) => electron_1.ipcRenderer.invoke('ai:chat', messages, model),
        chatStream: (messages, model) => {
            // Remove any stale listeners from a previous stream BEFORE starting a new one
            electron_1.ipcRenderer.removeAllListeners('ai:chat:stream:chunk');
            electron_1.ipcRenderer.removeAllListeners('ai:chat:stream:done');
            electron_1.ipcRenderer.removeAllListeners('ai:chat:stream:error');
            electron_1.ipcRenderer.send('ai:chat:stream', messages, model);
            return {
                onChunk: (callback) => {
                    electron_1.ipcRenderer.on('ai:chat:stream:chunk', (_e, chunk) => callback(chunk));
                },
                onDone: (callback) => {
                    electron_1.ipcRenderer.on('ai:chat:stream:done', () => callback());
                },
                onError: (callback) => {
                    electron_1.ipcRenderer.on('ai:chat:stream:error', (_e, error) => callback(error));
                },
                cancel: () => {
                    electron_1.ipcRenderer.removeAllListeners('ai:chat:stream:chunk');
                    electron_1.ipcRenderer.removeAllListeners('ai:chat:stream:done');
                    electron_1.ipcRenderer.removeAllListeners('ai:chat:stream:error');
                },
            };
        },
        summarize: (text, model) => electron_1.ipcRenderer.invoke('ai:summarize', text, model),
        generateTags: (text, model) => electron_1.ipcRenderer.invoke('ai:generateTags', text, model),
        suggestLinks: (content, existingTitles, model) => electron_1.ipcRenderer.invoke('ai:suggestLinks', content, existingTitles, model),
        checkConnection: () => electron_1.ipcRenderer.invoke('ai:checkConnection'),
        listModels: () => electron_1.ipcRenderer.invoke('ai:listModels'),
        // OpenRouter cloud provider
        openRouterStream: (messages) => {
            electron_1.ipcRenderer.removeAllListeners('ai:openrouter:stream:chunk');
            electron_1.ipcRenderer.removeAllListeners('ai:openrouter:stream:done');
            electron_1.ipcRenderer.removeAllListeners('ai:openrouter:stream:error');
            electron_1.ipcRenderer.send('ai:openrouter:stream', messages);
            return {
                onChunk: (callback) => {
                    electron_1.ipcRenderer.on('ai:openrouter:stream:chunk', (_e, chunk) => callback(chunk));
                },
                onDone: (callback) => {
                    electron_1.ipcRenderer.on('ai:openrouter:stream:done', () => callback());
                },
                onError: (callback) => {
                    electron_1.ipcRenderer.on('ai:openrouter:stream:error', (_e, error) => callback(error));
                },
                cancel: () => {
                    electron_1.ipcRenderer.removeAllListeners('ai:openrouter:stream:chunk');
                    electron_1.ipcRenderer.removeAllListeners('ai:openrouter:stream:done');
                    electron_1.ipcRenderer.removeAllListeners('ai:openrouter:stream:error');
                },
            };
        },
        listOpenRouterModels: (apiKey) => electron_1.ipcRenderer.invoke('ai:openrouter:listModels', apiKey),
    },
    // ── Window Controls ───────────────────────────────────────────────
    window: {
        minimize: () => electron_1.ipcRenderer.send('window:minimize'),
        maximize: () => electron_1.ipcRenderer.send('window:maximize'),
        close: () => electron_1.ipcRenderer.send('window:close'),
        isMaximized: () => electron_1.ipcRenderer.invoke('window:isMaximized'),
    },
    // ── MCP (Model Context Protocol) ──────────────────────────────────
    mcp: {
        connect: (config) => electron_1.ipcRenderer.invoke('mcp:connect', config),
        disconnect: (serverId) => electron_1.ipcRenderer.invoke('mcp:disconnect', serverId),
        callTool: (serverId, toolName, args) => electron_1.ipcRenderer.invoke('mcp:callTool', serverId, toolName, args),
        getStatuses: () => electron_1.ipcRenderer.invoke('mcp:getStatuses'),
        getTools: () => electron_1.ipcRenderer.invoke('mcp:getTools'),
        getServerTools: (serverId) => electron_1.ipcRenderer.invoke('mcp:getServerTools', serverId),
    },
    // ── Filesystem ────────────────────────────────────────────────────
    fs: {
        readDir: (dirPath) => electron_1.ipcRenderer.invoke('fs:readDir', dirPath),
        readFile: (filePath) => electron_1.ipcRenderer.invoke('fs:readFile', filePath),
        writeFile: (filePath, content) => electron_1.ipcRenderer.invoke('fs:writeFile', filePath, content),
        writeBuffer: (filePath, base64Data) => electron_1.ipcRenderer.invoke('fs:writeBuffer', filePath, base64Data),
        stat: (filePath) => electron_1.ipcRenderer.invoke('fs:stat', filePath),
        mkdir: (dirPath) => electron_1.ipcRenderer.invoke('fs:mkdir', dirPath),
        delete: (filePath) => electron_1.ipcRenderer.invoke('fs:delete', filePath),
    },
    // ── Shell Exec (non-interactive) ──────────────────────────────────
    shell: {
        exec: (command, cwd) => electron_1.ipcRenderer.invoke('shell:exec', command, cwd),
    },
    // ── Dialog ────────────────────────────────────────────────────────
    dialog: {
        openFolder: () => electron_1.ipcRenderer.invoke('dialog:openFolder'),
        saveFile: (options) => electron_1.ipcRenderer.invoke('dialog:saveFile', options),
    },
    // ── PPT Generation ──────────────────────────────────────────────
    ppt: {
        generate: (specOrMarkdown, outputPath) => electron_1.ipcRenderer.invoke('ppt:generate', specOrMarkdown, outputPath),
    },
    // ── API Keys & Server ─────────────────────────────────────────────
    api: {
        keys: {
            list: () => electron_1.ipcRenderer.invoke('api:keys:list'),
            create: (data) => electron_1.ipcRenderer.invoke('api:keys:create', data),
            revoke: (id) => electron_1.ipcRenderer.invoke('api:keys:revoke', id),
            delete: (id) => electron_1.ipcRenderer.invoke('api:keys:delete', id),
        },
        server: {
            start: (port) => electron_1.ipcRenderer.invoke('api:server:start', port),
            stop: () => electron_1.ipcRenderer.invoke('api:server:stop'),
            status: () => electron_1.ipcRenderer.invoke('api:server:status'),
        },
    },
    // ── Cloud Agents ──────────────────────────────────────────────────
    agents: {
        list: () => electron_1.ipcRenderer.invoke('agents:list'),
        statuses: () => electron_1.ipcRenderer.invoke('agents:statuses'),
        register: (type, config) => electron_1.ipcRenderer.invoke('agents:register', type, config),
        update: (id, updates) => electron_1.ipcRenderer.invoke('agents:update', id, updates),
        remove: (id) => electron_1.ipcRenderer.invoke('agents:remove', id),
        connect: (id) => electron_1.ipcRenderer.invoke('agents:connect', id),
        disconnect: (id) => electron_1.ipcRenderer.invoke('agents:disconnect', id),
        callTool: (agentId, toolName, args) => electron_1.ipcRenderer.invoke('agents:callTool', agentId, toolName, args),
        getTools: (agentId) => electron_1.ipcRenderer.invoke('agents:getTools', agentId),
        createToken: (agentId, name, permissions, expiresAt) => electron_1.ipcRenderer.invoke('agents:createToken', agentId, name, permissions, expiresAt),
        getTokens: (agentId) => electron_1.ipcRenderer.invoke('agents:getTokens', agentId),
        revokeToken: (agentId, tokenId) => electron_1.ipcRenderer.invoke('agents:revokeToken', agentId, tokenId),
    },
    // ── Knowledge Base ────────────────────────────────────────────────
    kb: {
        graph: () => electron_1.ipcRenderer.invoke('kb:graph'),
        export: () => electron_1.ipcRenderer.invoke('kb:export'),
        search: (query, maxChunks) => electron_1.ipcRenderer.invoke('kb:search', query, maxChunks),
        context: (maxNotes) => electron_1.ipcRenderer.invoke('kb:context', maxNotes),
        noteConnections: (noteId) => electron_1.ipcRenderer.invoke('kb:noteConnections', noteId),
    },
    // ── Canvas Events ─────────────────────────────────────────────────
    onCanvasUpdated: (callback) => {
        const handler = (_e, canvasId) => callback(canvasId);
        electron_1.ipcRenderer.on('canvas:updated', handler);
        return handler;
    },
    offCanvasUpdated: (handler) => {
        electron_1.ipcRenderer.removeListener('canvas:updated', handler);
    },
    // ── Auto-updater ──────────────────────────────────────────────────
    updater: {
        check: () => electron_1.ipcRenderer.invoke('updater:check'),
        download: () => electron_1.ipcRenderer.invoke('updater:download'),
        install: () => electron_1.ipcRenderer.invoke('updater:install'),
        onStatus: (callback) => {
            const handler = (_e, status) => callback(status);
            electron_1.ipcRenderer.on('updater:status', handler);
            return handler;
        },
        offStatus: (handler) => {
            electron_1.ipcRenderer.removeListener('updater:status', handler);
        },
    },
    // ── Terminal (PTY) ──────────────────────────────────────────────────
    terminal: {
        spawn: (id, cwd) => electron_1.ipcRenderer.invoke('terminal:spawn', id, cwd),
        write: (id, data) => electron_1.ipcRenderer.invoke('terminal:write', id, data),
        resize: (id, cols, rows) => electron_1.ipcRenderer.invoke('terminal:resize', id, cols, rows),
        kill: (id) => electron_1.ipcRenderer.invoke('terminal:kill', id),
        onData: (id, callback) => {
            electron_1.ipcRenderer.send('terminal:data', id);
            const handler = (_e, termId, data) => {
                if (termId === id)
                    callback(data);
            };
            electron_1.ipcRenderer.on('terminal:data', handler);
            return handler;
        },
        offData: (handler) => {
            electron_1.ipcRenderer.removeListener('terminal:data', handler);
        },
    },
};
electron_1.contextBridge.exposeInMainWorld('tesserin', tesserinAPI);
//# sourceMappingURL=preload.js.map