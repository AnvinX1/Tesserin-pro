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
        // OpenRouter cloud provider
        openRouterStream: (messages: Array<{ role: string; content: string }>) => {
            ipcRenderer.removeAllListeners('ai:openrouter:stream:chunk')
            ipcRenderer.removeAllListeners('ai:openrouter:stream:done')
            ipcRenderer.removeAllListeners('ai:openrouter:stream:error')

            ipcRenderer.send('ai:openrouter:stream', messages)
            return {
                onChunk: (callback: (chunk: string) => void) => {
                    ipcRenderer.on('ai:openrouter:stream:chunk', (_e, chunk: string) => callback(chunk))
                },
                onDone: (callback: () => void) => {
                    ipcRenderer.on('ai:openrouter:stream:done', () => callback())
                },
                onError: (callback: (error: string) => void) => {
                    ipcRenderer.on('ai:openrouter:stream:error', (_e, error: string) => callback(error))
                },
                cancel: () => {
                    ipcRenderer.removeAllListeners('ai:openrouter:stream:chunk')
                    ipcRenderer.removeAllListeners('ai:openrouter:stream:done')
                    ipcRenderer.removeAllListeners('ai:openrouter:stream:error')
                },
            }
        },
        listOpenRouterModels: (apiKey?: string) => ipcRenderer.invoke('ai:openrouter:listModels', apiKey),
    },

    // ── Window Controls ───────────────────────────────────────────────
    window: {
        minimize: () => ipcRenderer.send('window:minimize'),
        maximize: () => ipcRenderer.send('window:maximize'),
        close: () => ipcRenderer.send('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    },

    // ── MCP (Model Context Protocol) ──────────────────────────────────
    mcp: {
        connect: (config: {
            id: string
            name: string
            transport: 'stdio' | 'sse'
            command?: string
            args?: string[]
            env?: Record<string, string>
            url?: string
            enabled: boolean
        }) => ipcRenderer.invoke('mcp:connect', config),
        disconnect: (serverId: string) => ipcRenderer.invoke('mcp:disconnect', serverId),
        callTool: (serverId: string, toolName: string, args: Record<string, unknown>) =>
            ipcRenderer.invoke('mcp:callTool', serverId, toolName, args),
        getStatuses: () => ipcRenderer.invoke('mcp:getStatuses'),
        getTools: () => ipcRenderer.invoke('mcp:getTools'),
        getServerTools: (serverId: string) => ipcRenderer.invoke('mcp:getServerTools', serverId),
    },

    // ── Filesystem ────────────────────────────────────────────────────
    fs: {
        readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath) as Promise<Array<{ name: string; path: string; isDirectory: boolean }>>,
        readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath) as Promise<string>,
        writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
        writeBuffer: (filePath: string, base64Data: string) => ipcRenderer.invoke('fs:writeBuffer', filePath, base64Data) as Promise<void>,
        stat: (filePath: string) => ipcRenderer.invoke('fs:stat', filePath) as Promise<{ size: number; isDirectory: boolean; isFile: boolean; modified: string }>,
        mkdir: (dirPath: string) => ipcRenderer.invoke('fs:mkdir', dirPath) as Promise<void>,
        delete: (filePath: string) => ipcRenderer.invoke('fs:delete', filePath) as Promise<void>,
    },

    // ── Shell Exec (non-interactive) ──────────────────────────────────
    shell: {
        exec: (command: string, cwd?: string) => ipcRenderer.invoke('shell:exec', command, cwd) as Promise<{ stdout: string; stderr: string; exitCode: number }>,
    },

    // ── Dialog ────────────────────────────────────────────────────────
    dialog: {
        openFolder: () => ipcRenderer.invoke('dialog:openFolder') as Promise<string | null>,
        saveFile: (options: {
            title?: string
            defaultPath?: string
            filters?: Array<{ name: string; extensions: string[] }>
        }) => ipcRenderer.invoke('dialog:saveFile', options) as Promise<string | null>,
    },

    // ── PPT Generation ──────────────────────────────────────────────
    ppt: {
        generate: (specOrMarkdown: Record<string, unknown> | string, outputPath: string) =>
            ipcRenderer.invoke('ppt:generate', specOrMarkdown, outputPath) as Promise<string>,
    },

    // ── API Keys & Server ─────────────────────────────────────────────
    api: {
        keys: {
            list: () => ipcRenderer.invoke('api:keys:list'),
            create: (data: { name: string; permissions?: string[]; expiresAt?: string }) =>
                ipcRenderer.invoke('api:keys:create', data),
            revoke: (id: string) => ipcRenderer.invoke('api:keys:revoke', id),
            delete: (id: string) => ipcRenderer.invoke('api:keys:delete', id),
        },
        server: {
            start: (port?: number) => ipcRenderer.invoke('api:server:start', port),
            stop: () => ipcRenderer.invoke('api:server:stop'),
            status: () => ipcRenderer.invoke('api:server:status') as Promise<{ running: boolean; port: number }>,
        },
    },

    // ── Cloud Agents ──────────────────────────────────────────────────
    agents: {
        list: () => ipcRenderer.invoke('agents:list'),
        statuses: () => ipcRenderer.invoke('agents:statuses'),
        register: (type: string, config?: Record<string, unknown>) =>
            ipcRenderer.invoke('agents:register', type, config),
        update: (id: string, updates: Record<string, unknown>) =>
            ipcRenderer.invoke('agents:update', id, updates),
        remove: (id: string) => ipcRenderer.invoke('agents:remove', id),
        connect: (id: string) => ipcRenderer.invoke('agents:connect', id),
        disconnect: (id: string) => ipcRenderer.invoke('agents:disconnect', id),
        callTool: (agentId: string, toolName: string, args: Record<string, unknown>) =>
            ipcRenderer.invoke('agents:callTool', agentId, toolName, args),
        getTools: (agentId: string) => ipcRenderer.invoke('agents:getTools', agentId),
        createToken: (agentId: string, name: string, permissions?: string[], expiresAt?: string) =>
            ipcRenderer.invoke('agents:createToken', agentId, name, permissions, expiresAt),
        getTokens: (agentId: string) => ipcRenderer.invoke('agents:getTokens', agentId),
        revokeToken: (agentId: string, tokenId: string) =>
            ipcRenderer.invoke('agents:revokeToken', agentId, tokenId),
    },

    // ── Knowledge Base ────────────────────────────────────────────────
    kb: {
        graph: () => ipcRenderer.invoke('kb:graph'),
        export: () => ipcRenderer.invoke('kb:export'),
        search: (query: string, maxChunks?: number) => ipcRenderer.invoke('kb:search', query, maxChunks),
        context: (maxNotes?: number) => ipcRenderer.invoke('kb:context', maxNotes),
        noteConnections: (noteId: string) => ipcRenderer.invoke('kb:noteConnections', noteId),
    },

    // ── Canvas Events ─────────────────────────────────────────────────
    onCanvasUpdated: (callback: (canvasId: string) => void) => {
        const handler = (_e: Electron.IpcRendererEvent, canvasId: string) => callback(canvasId)
        ipcRenderer.on('canvas:updated', handler)
        return handler
    },
    offCanvasUpdated: (handler: (...args: any[]) => void) => {
        ipcRenderer.removeListener('canvas:updated', handler)
    },

    // ── Auto-updater ──────────────────────────────────────────────────
    updater: {
        check: () => ipcRenderer.invoke('updater:check'),
        download: () => ipcRenderer.invoke('updater:download'),
        install: () => ipcRenderer.invoke('updater:install'),
        onStatus: (callback: (status: unknown) => void) => {
            const handler = (_e: Electron.IpcRendererEvent, status: unknown) => callback(status)
            ipcRenderer.on('updater:status', handler)
            return handler
        },
        offStatus: (handler: (...args: any[]) => void) => {
            ipcRenderer.removeListener('updater:status', handler)
        },
    },
}

contextBridge.exposeInMainWorld('tesserin', tesserinAPI)

// Type declaration for the renderer
export type TesserinAPI = typeof tesserinAPI
