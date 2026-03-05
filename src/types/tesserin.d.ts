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
    clear(): Promise<void>
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
        cancel: () => void
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
        cancel: () => void
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
    writeBuffer(filePath: string, base64Data: string): Promise<void>
    stat(filePath: string): Promise<{ size: number; isDirectory: boolean; isFile: boolean; modified: string }>
    mkdir(dirPath: string): Promise<void>
    delete(filePath: string): Promise<void>
}

interface TesserinShell {
    exec(command: string, cwd?: string): Promise<{ stdout: string; stderr: string; exitCode: number }>
}

interface TesserinDialog {
    openFolder(): Promise<string | null>
    saveFile(options: {
        title?: string
        defaultPath?: string
        filters?: Array<{ name: string; extensions: string[] }>
    }): Promise<string | null>
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

/* ── Cloud Agents ──────────────────────────────────────────────────── */

interface TesserinCloudAgentConfig {
    id: string
    name: string
    type: 'claude-code' | 'gemini-cli' | 'openai-codex' | 'opencode' | 'custom'
    transport: 'docker-mcp' | 'stdio' | 'sse' | 'streamable-http'
    enabled: boolean
    dockerImage?: string
    dockerProfile?: string
    command?: string
    args?: string[]
    env?: Record<string, string>
    url?: string
    knowledgeBaseAccess: boolean
    permissions: string[]
    createdAt: string
    lastConnectedAt?: string
}

interface TesserinAgentConnectionStatus {
    agentId: string
    agentName: string
    agentType: string
    status: 'connected' | 'disconnected' | 'connecting' | 'error'
    error?: string
    toolCount: number
    lastActivity?: string
}

interface TesserinAgentToken {
    id: string
    agentId: string
    token: string
    name: string
    permissions: string[]
    createdAt: string
    expiresAt?: string
    isRevoked: boolean
}

interface TesserinCloudAgents {
    list(): Promise<TesserinCloudAgentConfig[]>
    statuses(): Promise<TesserinAgentConnectionStatus[]>
    register(type: string, config?: Record<string, unknown>): Promise<TesserinCloudAgentConfig>
    update(id: string, updates: Record<string, unknown>): Promise<TesserinCloudAgentConfig | null>
    remove(id: string): Promise<boolean>
    connect(id: string): Promise<void>
    disconnect(id: string): Promise<void>
    callTool(agentId: string, toolName: string, args: Record<string, unknown>): Promise<string>
    getTools(agentId: string): Promise<TesserinMcpToolInfo[]>
    createToken(agentId: string, name: string, permissions?: string[], expiresAt?: string): Promise<{ token: TesserinAgentToken; rawToken: string } | null>
    getTokens(agentId: string): Promise<TesserinAgentToken[]>
    revokeToken(agentId: string, tokenId: string): Promise<boolean>
}

/* ── Knowledge Base ────────────────────────────────────────────────── */

interface TesserinKnowledgeNode {
    id: string
    title: string
    content: string
    type: 'note' | 'task' | 'folder'
    tags: string[]
    folderId?: string
    folderPath?: string
    linkCount: number
    outgoingLinks: string[]
    incomingLinks: string[]
    createdAt: string
    updatedAt: string
}

interface TesserinKnowledgeEdge {
    source: string
    target: string
    type: 'wiki-link' | 'tag-shared' | 'folder-sibling'
    label?: string
}

interface TesserinKnowledgeGraph {
    nodes: TesserinKnowledgeNode[]
    edges: TesserinKnowledgeEdge[]
    metadata: {
        exportedAt: string
        noteCount: number
        edgeCount: number
        tagCount: number
        folderCount: number
    }
}

interface TesserinContextChunk {
    noteId: string
    noteTitle: string
    content: string
    relevance: number
    tags: string[]
    linkedNotes: string[]
}

interface TesserinKnowledgeBase {
    graph(): Promise<TesserinKnowledgeGraph>
    export(): Promise<any>
    search(query: string, maxChunks?: number): Promise<TesserinContextChunk[]>
    context(maxNotes?: number): Promise<string>
    noteConnections(noteId: string): Promise<{
        note: { id: string; title: string }
        tags: string[]
        outgoingLinks: string[]
        incomingLinks: string[]
        linkCount: number
        edges: TesserinKnowledgeEdge[]
    }>
}

/* ── Terminal (PTY) ─────────────────────────────────────────────────── */

interface TesserinTerminal {
    spawn(id: string, cwd?: string): Promise<{ success: boolean; pid?: number; error?: string }>
    write(id: string, data: string): Promise<boolean>
    resize(id: string, cols: number, rows: number): Promise<boolean>
    kill(id: string): Promise<boolean>
    onData(id: string, callback: (data: string) => void): (...args: any[]) => void
    offData(handler: (...args: any[]) => void): void
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
    agents?: TesserinCloudAgents
    kb?: TesserinKnowledgeBase
    terminal?: TesserinTerminal
    onCanvasUpdated?: (callback: (canvasId: string) => void) => any
    offCanvasUpdated?: (handler: (...args: any[]) => void) => void
}

declare global {
    interface Window {
        tesserin?: TesserinAPI
    }
}

export { }
