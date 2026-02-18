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
    };
    window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<any>;
    };
};
export type TesserinAPI = typeof tesserinAPI;
export {};
//# sourceMappingURL=preload.d.ts.map