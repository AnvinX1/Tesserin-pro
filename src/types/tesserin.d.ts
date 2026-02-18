/**
 * Type declarations for the Tesserin Electron API
 * exposed via contextBridge in preload.ts
 *
 * Matches the nested structure: window.tesserin.db.notes.list(), etc.
 */

interface TesserinDBNotes {
    list(): Promise<any[]>
    get(id: string): Promise<any>
    create(data: { id?: string; title?: string; content?: string; folderId?: string }): Promise<any>
    update(id: string, data: { title?: string; content?: string; folderId?: string; isPinned?: boolean; isArchived?: boolean }): Promise<any>
    delete(id: string): Promise<void>
    search(query: string): Promise<any[]>
    getByTitle(title: string): Promise<any>
}

interface TesserinDBTags {
    list(): Promise<any[]>
    create(name: string, color?: string): Promise<any>
    delete(id: string): Promise<void>
    addToNote(noteId: string, tagId: string): Promise<void>
    removeFromNote(noteId: string, tagId: string): Promise<void>
    getForNote(noteId: string): Promise<any[]>
}

interface TesserinDBFolders {
    list(): Promise<any[]>
    create(name: string, parentId?: string): Promise<any>
    rename(id: string, name: string): Promise<void>
    delete(id: string): Promise<void>
}

interface TesserinDBTasks {
    list(): Promise<any[]>
    create(data: { title: string; noteId?: string; columnId?: string; priority?: number; dueDate?: string }): Promise<any>
    update(id: string, data: Record<string, unknown>): Promise<any>
    delete(id: string): Promise<void>
}

interface TesserinDBTemplates {
    list(): Promise<any[]>
    get(id: string): Promise<any>
    create(data: { name: string; content: string; category?: string }): Promise<any>
    delete(id: string): Promise<void>
}

interface TesserinDBSettings {
    get(key: string): Promise<string | null>
    set(key: string, value: string): Promise<void>
    getAll(): Promise<Record<string, string>>
}

interface TesserinDBCanvases {
    list(): Promise<any[]>
    get(id: string): Promise<any>
    create(data: { id?: string; name?: string; elements?: string; appState?: string; files?: string }): Promise<any>
    update(id: string, data: { name?: string; elements?: string; appState?: string; files?: string }): Promise<any>
    delete(id: string): Promise<void>
}

interface TesserinDB {
    notes: TesserinDBNotes
    tags: TesserinDBTags
    folders: TesserinDBFolders
    tasks: TesserinDBTasks
    templates: TesserinDBTemplates
    settings: TesserinDBSettings
    canvases: TesserinDBCanvases
}

interface TesserinAI {
    chat(
        messages: Array<{ role: string; content: string }>,
        model?: string
    ): Promise<{ role: string; content: string }>

    chatStream(
        messages: Array<{ role: string; content: string }>,
        model?: string
    ): {
        onChunk: (callback: (chunk: string) => void) => void
        onDone: (callback: () => void) => void
        onError: (callback: (error: string) => void) => void
    }

    summarize(text: string, model?: string): Promise<string>
    generateTags(text: string, model?: string): Promise<string[]>
    suggestLinks(content: string, titles: string[], model?: string): Promise<string[]>
    checkConnection(): Promise<{ connected: boolean; version?: string }>
    listModels(): Promise<string[]>
}

interface TesserinWindow {
    minimize(): void
    maximize(): void
    close(): void
    isMaximized(): Promise<boolean>
}

interface TesserinAPI {
    db: TesserinDB
    ai: TesserinAI
    window: TesserinWindow
}

declare global {
    interface Window {
        tesserin?: TesserinAPI
    }
}

export { }
