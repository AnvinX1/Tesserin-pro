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
    },
    // ── AI (Ollama) ───────────────────────────────────────────────────
    ai: {
        chat: (messages, model) => electron_1.ipcRenderer.invoke('ai:chat', messages, model),
        chatStream: (messages, model) => {
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
    },
    // ── Window Controls ───────────────────────────────────────────────
    window: {
        minimize: () => electron_1.ipcRenderer.send('window:minimize'),
        maximize: () => electron_1.ipcRenderer.send('window:maximize'),
        close: () => electron_1.ipcRenderer.send('window:close'),
        isMaximized: () => electron_1.ipcRenderer.invoke('window:isMaximized'),
    },
};
electron_1.contextBridge.exposeInMainWorld('tesserin', tesserinAPI);
//# sourceMappingURL=preload.js.map