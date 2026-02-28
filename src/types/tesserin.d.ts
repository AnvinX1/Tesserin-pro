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

    // OpenRouter cloud provider
    openRouterStream(
        messages: Array<{ role: string; content: string }>
    ): {
        onChunk: (callback: (chunk: string) => void) => void
        onDone: (callback: () => void) => void
        onError: (callback: (error: string) => void) => void
    }
    listOpenRouterModels(apiKey?: string): Promise<string[]>
}

interface TesserinWindow {
    minimize(): void
    maximize(): void
    close(): void
    isMaximized(): Promise<boolean>
}

interface TesserinMcpServerConfig {
    id: string
    name: string
    transport: 'stdio' | 'sse'
    command?: string
    args?: string[]
    env?: Record<string, string>
    url?: string
    enabled: boolean
}

interface TesserinMcpToolInfo {
    serverId: string
    serverName: string
    name: string
    description: string
    inputSchema: Record<string, unknown>
}

interface TesserinMcpConnectionStatus {
    serverId: string
    serverName: string
    status: 'connected' | 'disconnected' | 'connecting' | 'error'
    error?: string
    toolCount: number
}

interface TesserinMCP {
    connect(config: TesserinMcpServerConfig): Promise<{
        status: TesserinMcpConnectionStatus
        tools: TesserinMcpToolInfo[]
    }>
    disconnect(serverId: string): Promise<void>
    callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<string>
    getStatuses(): Promise<{
        statuses: TesserinMcpConnectionStatus[]
        tools: TesserinMcpToolInfo[]
    }>
    getTools(): Promise<TesserinMcpToolInfo[]>
    getServerTools(serverId: string): Promise<TesserinMcpToolInfo[]>
}

interface TesserinFS {
    readDir(dirPath: string): Promise<Array<{ name: string; path: string; isDirectory: boolean }>>
    readFile(filePath: string): Promise<string>
    writeFile(filePath: string, content: string): Promise<void>
    stat(filePath: string): Promise<{ size: number; isDirectory: boolean; isFile: boolean; modified: string }>
    mkdir(dirPath: string): Promise<void>
    delete(filePath: string): Promise<void>
}

interface TesserinShell {
    exec(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }>
}

interface TesserinDialog {
    openFolder(): Promise<string | null>
}

interface TesserinApiKeyInfo {
    id: string
    name: string
    prefix: string
    permissions: string
    created_at: string
    last_used_at: string | null
    expires_at: string | null
    is_revoked: number
}

interface TesserinApiKeyCreateResult {
    id: string
    name: string
    prefix: string
    rawKey: string
    permissions: string[]
}

interface TesserinApiKeys {
    list(): Promise<TesserinApiKeyInfo[]>
    create(data: { name: string; permissions?: string[]; expiresAt?: string }): Promise<TesserinApiKeyCreateResult>
    revoke(id: string): Promise<void>
    delete(id: string): Promise<void>
}

interface TesserinApiServer {
    start(port?: number): Promise<{ running: boolean; port: number }>
    stop(): Promise<{ running: boolean }>
    status(): Promise<{ running: boolean; port: number }>
}

interface TesserinApiManager {
    keys: TesserinApiKeys
    server: TesserinApiServer
}

interface TesserinPPT {
    generate(specOrMarkdown: Record<string, unknown> | string, outputPath: string): Promise<string>
}

interface TesserinAPI {
    db: TesserinDB
    ai: TesserinAI
    window: TesserinWindow
    mcp?: TesserinMCP
    fs?: TesserinFS
    shell?: TesserinShell
    dialog?: TesserinDialog
    api?: TesserinApiManager
    ppt?: TesserinPPT
}

declare global {
    interface Window {
        tesserin?: TesserinAPI
    }
}

export { }
