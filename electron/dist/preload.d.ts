/**
 * Tesserin Preload Script
 *
 * Exposes a safe `window.tesserin` API to the renderer process.
 * All communication with the main process goes through IPC channels.
 */
declare const tesserinAPI: {
    db: {
        notes: {
            list: () => Promise<any>;
            get: (id: string) => Promise<any>;
            create: (data: {
                title?: string;
                content?: string;
                folderId?: string;
            }) => Promise<any>;
            update: (id: string, data: {
                title?: string;
                content?: string;
                folderId?: string;
                isPinned?: boolean;
            }) => Promise<any>;
            delete: (id: string) => Promise<any>;
            search: (query: string) => Promise<any>;
            getByTitle: (title: string) => Promise<any>;
        };
        tags: {
            list: () => Promise<any>;
            create: (name: string, color?: string) => Promise<any>;
            delete: (id: string) => Promise<any>;
            addToNote: (noteId: string, tagId: string) => Promise<any>;
            removeFromNote: (noteId: string, tagId: string) => Promise<any>;
            getForNote: (noteId: string) => Promise<any>;
        };
        folders: {
            list: () => Promise<any>;
            create: (name: string, parentId?: string) => Promise<any>;
            rename: (id: string, name: string) => Promise<any>;
            delete: (id: string) => Promise<any>;
        };
        tasks: {
            list: () => Promise<any>;
            create: (data: {
                title: string;
                noteId?: string;
                columnId?: string;
                priority?: number;
                dueDate?: string;
            }) => Promise<any>;
            update: (id: string, data: Record<string, unknown>) => Promise<any>;
            delete: (id: string) => Promise<any>;
        };
        templates: {
            list: () => Promise<any>;
            get: (id: string) => Promise<any>;
            create: (data: {
                name: string;
                content: string;
                category?: string;
            }) => Promise<any>;
            delete: (id: string) => Promise<any>;
        };
        settings: {
            get: (key: string) => Promise<any>;
            set: (key: string, value: string) => Promise<any>;
            getAll: () => Promise<any>;
        };
        canvases: {
            list: () => Promise<any>;
            get: (id: string) => Promise<any>;
            create: (data: {
                id?: string;
                name?: string;
                elements?: string;
                appState?: string;
                files?: string;
            }) => Promise<any>;
            update: (id: string, data: {
                name?: string;
                elements?: string;
                appState?: string;
                files?: string;
            }) => Promise<any>;
            delete: (id: string) => Promise<any>;
        };
    };
    ai: {
        chat: (messages: Array<{
            role: string;
            content: string;
        }>, model?: string) => Promise<any>;
        chatStream: (messages: Array<{
            role: string;
            content: string;
        }>, model?: string) => {
            onChunk: (callback: (chunk: string) => void) => void;
            onDone: (callback: () => void) => void;
            onError: (callback: (error: string) => void) => void;
            cancel: () => void;
        };
        summarize: (text: string, model?: string) => Promise<any>;
        generateTags: (text: string, model?: string) => Promise<any>;
        suggestLinks: (content: string, existingTitles: string[], model?: string) => Promise<any>;
        checkConnection: () => Promise<any>;
        listModels: () => Promise<any>;
        openRouterStream: (messages: Array<{
            role: string;
            content: string;
        }>) => {
            onChunk: (callback: (chunk: string) => void) => void;
            onDone: (callback: () => void) => void;
            onError: (callback: (error: string) => void) => void;
            cancel: () => void;
        };
        listOpenRouterModels: (apiKey?: string) => Promise<any>;
    };
    window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<any>;
    };
    mcp: {
        connect: (config: {
            id: string;
            name: string;
            transport: "stdio" | "sse";
            command?: string;
            args?: string[];
            env?: Record<string, string>;
            url?: string;
            enabled: boolean;
        }) => Promise<any>;
        disconnect: (serverId: string) => Promise<any>;
        callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<any>;
        getStatuses: () => Promise<any>;
        getTools: () => Promise<any>;
        getServerTools: (serverId: string) => Promise<any>;
    };
    fs: {
        readDir: (dirPath: string) => Promise<Array<{
            name: string;
            path: string;
            isDirectory: boolean;
        }>>;
        readFile: (filePath: string) => Promise<string>;
        writeFile: (filePath: string, content: string) => Promise<any>;
        stat: (filePath: string) => Promise<{
            size: number;
            isDirectory: boolean;
            isFile: boolean;
            modified: string;
        }>;
        mkdir: (dirPath: string) => Promise<void>;
        delete: (filePath: string) => Promise<void>;
    };
    shell: {
        exec: (command: string, cwd?: string) => Promise<{
            stdout: string;
            stderr: string;
            exitCode: number;
        }>;
    };
    dialog: {
        openFolder: () => Promise<string | null>;
    };
    ppt: {
        generate: (specOrMarkdown: Record<string, unknown> | string, outputPath: string) => Promise<string>;
    };
    api: {
        keys: {
            list: () => Promise<any>;
            create: (data: {
                name: string;
                permissions?: string[];
                expiresAt?: string;
            }) => Promise<any>;
            revoke: (id: string) => Promise<any>;
            delete: (id: string) => Promise<any>;
        };
        server: {
            start: (port?: number) => Promise<any>;
            stop: () => Promise<any>;
            status: () => Promise<{
                running: boolean;
                port: number;
            }>;
        };
    };
    agents: {
        list: () => Promise<any>;
        statuses: () => Promise<any>;
        register: (type: string, config?: Record<string, unknown>) => Promise<any>;
        update: (id: string, updates: Record<string, unknown>) => Promise<any>;
        remove: (id: string) => Promise<any>;
        connect: (id: string) => Promise<any>;
        disconnect: (id: string) => Promise<any>;
        callTool: (agentId: string, toolName: string, args: Record<string, unknown>) => Promise<any>;
        getTools: (agentId: string) => Promise<any>;
        createToken: (agentId: string, name: string, permissions?: string[], expiresAt?: string) => Promise<any>;
        getTokens: (agentId: string) => Promise<any>;
        revokeToken: (agentId: string, tokenId: string) => Promise<any>;
    };
    kb: {
        graph: () => Promise<any>;
        export: () => Promise<any>;
        search: (query: string, maxChunks?: number) => Promise<any>;
        context: (maxNotes?: number) => Promise<any>;
        noteConnections: (noteId: string) => Promise<any>;
    };
    onCanvasUpdated: (callback: (canvasId: string) => void) => (_e: Electron.IpcRendererEvent, canvasId: string) => void;
    offCanvasUpdated: (handler: (...args: any[]) => void) => void;
};
export type TesserinAPI = typeof tesserinAPI;
export {};
//# sourceMappingURL=preload.d.ts.map