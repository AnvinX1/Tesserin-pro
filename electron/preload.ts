import { contextBridge, ipcRenderer } from 'electron'

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
            list: () => ipcRenderer.invoke('db:notes:list'),
            get: (id: string) => ipcRenderer.invoke('db:notes:get', id),
            create: (data: { title?: string; content?: string; folderId?: string }) =>
                ipcRenderer.invoke('db:notes:create', data),
            update: (id: string, data: { title?: string; content?: string; folderId?: string; isPinned?: boolean }) =>
                ipcRenderer.invoke('db:notes:update', id, data),
            delete: (id: string) => ipcRenderer.invoke('db:notes:delete', id),
            search: (query: string) => ipcRenderer.invoke('db:notes:search', query),
            getByTitle: (title: string) => ipcRenderer.invoke('db:notes:getByTitle', title),
        },

        // ── Database: Tags ──────────────────────────────────────────────
        tags: {
            list: () => ipcRenderer.invoke('db:tags:list'),
            create: (name: string, color?: string) => ipcRenderer.invoke('db:tags:create', name, color),
            delete: (id: string) => ipcRenderer.invoke('db:tags:delete', id),
            addToNote: (noteId: string, tagId: string) => ipcRenderer.invoke('db:tags:addToNote', noteId, tagId),
            removeFromNote: (noteId: string, tagId: string) => ipcRenderer.invoke('db:tags:removeFromNote', noteId, tagId),
            getForNote: (noteId: string) => ipcRenderer.invoke('db:tags:getForNote', noteId),
        },

        // ── Database: Folders ───────────────────────────────────────────
        folders: {
            list: () => ipcRenderer.invoke('db:folders:list'),
            create: (name: string, parentId?: string) => ipcRenderer.invoke('db:folders:create', name, parentId),
            rename: (id: string, name: string) => ipcRenderer.invoke('db:folders:rename', id, name),
            delete: (id: string) => ipcRenderer.invoke('db:folders:delete', id),
        },

        // ── Database: Tasks ─────────────────────────────────────────────
        tasks: {
            list: () => ipcRenderer.invoke('db:tasks:list'),
            create: (data: { title: string; noteId?: string; columnId?: string; priority?: number; dueDate?: string }) =>
                ipcRenderer.invoke('db:tasks:create', data),
            update: (id: string, data: Record<string, unknown>) =>
                ipcRenderer.invoke('db:tasks:update', id, data),
            delete: (id: string) => ipcRenderer.invoke('db:tasks:delete', id),
        },

        // ── Database: Templates ─────────────────────────────────────────
        templates: {
            list: () => ipcRenderer.invoke('db:templates:list'),
            get: (id: string) => ipcRenderer.invoke('db:templates:get', id),
            create: (data: { name: string; content: string; category?: string }) =>
                ipcRenderer.invoke('db:templates:create', data),
            delete: (id: string) => ipcRenderer.invoke('db:templates:delete', id),
        },

        // ── Database: Settings ──────────────────────────────────────────
        settings: {
            get: (key: string) => ipcRenderer.invoke('db:settings:get', key),
            set: (key: string, value: string) => ipcRenderer.invoke('db:settings:set', key, value),
            getAll: () => ipcRenderer.invoke('db:settings:getAll'),
        },

        // ── Database: Canvases ─────────────────────────────────────────
        canvases: {
            list: () => ipcRenderer.invoke('db:canvases:list'),
            get: (id: string) => ipcRenderer.invoke('db:canvases:get', id),
            create: (data: { id?: string; name?: string; elements?: string; appState?: string; files?: string }) =>
                ipcRenderer.invoke('db:canvases:create', data),
            update: (id: string, data: { name?: string; elements?: string; appState?: string; files?: string }) =>
                ipcRenderer.invoke('db:canvases:update', id, data),
            delete: (id: string) => ipcRenderer.invoke('db:canvases:delete', id),
        },
    },

    // ── AI (Ollama) ───────────────────────────────────────────────────
    ai: {
        chat: (messages: Array<{ role: string; content: string }>, model?: string) =>
            ipcRenderer.invoke('ai:chat', messages, model),
        chatStream: (messages: Array<{ role: string; content: string }>, model?: string) => {
            // Remove any stale listeners from a previous stream BEFORE starting a new one
            ipcRenderer.removeAllListeners('ai:chat:stream:chunk')
            ipcRenderer.removeAllListeners('ai:chat:stream:done')
            ipcRenderer.removeAllListeners('ai:chat:stream:error')

            ipcRenderer.send('ai:chat:stream', messages, model)
            return {
                onChunk: (callback: (chunk: string) => void) => {
                    ipcRenderer.on('ai:chat:stream:chunk', (_e, chunk: string) => callback(chunk))
                },
                onDone: (callback: () => void) => {
                    ipcRenderer.on('ai:chat:stream:done', () => callback())
                },
                onError: (callback: (error: string) => void) => {
                    ipcRenderer.on('ai:chat:stream:error', (_e, error: string) => callback(error))
                },
                cancel: () => {
                    ipcRenderer.removeAllListeners('ai:chat:stream:chunk')
                    ipcRenderer.removeAllListeners('ai:chat:stream:done')
                    ipcRenderer.removeAllListeners('ai:chat:stream:error')
                },
            }
        },
        summarize: (text: string, model?: string) => ipcRenderer.invoke('ai:summarize', text, model),
        generateTags: (text: string, model?: string) => ipcRenderer.invoke('ai:generateTags', text, model),
        suggestLinks: (content: string, existingTitles: string[], model?: string) =>
            ipcRenderer.invoke('ai:suggestLinks', content, existingTitles, model),
        checkConnection: () => ipcRenderer.invoke('ai:checkConnection'),
        listModels: () => ipcRenderer.invoke('ai:listModels'),
    },

    // ── Window Controls ───────────────────────────────────────────────
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    },
}

contextBridge.exposeInMainWorld('tesserin', tesserinAPI)

// Type declaration for the renderer
export type TesserinAPI = typeof tesserinAPI
