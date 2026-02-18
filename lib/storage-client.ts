/**
 * Storage Client
 *
 * Renderer-side API for database operations via the Electron IPC bridge.
 * Falls back to localStorage when not running in Electron (e.g. Vite dev).
 *
 * The preload exposes a nested API: window.tesserin.db.notes.list(), etc.
 */

/* ------------------------------------------------------------------ */
/*  Interfaces (match SQLite schema 1:1)                               */
/* ------------------------------------------------------------------ */

export interface StorageNote {
    id: string
    title: string
    content: string
    folder_id: string | null
    is_daily: number
    is_pinned: number
    is_archived: number
    created_at: string
    updated_at: string
}

export interface StorageTask {
    id: string
    title: string
    status: string
    priority: number         // 0=none, 1=low, 2=medium, 3=high
    note_id: string | null
    column_id: string
    sort_order: number
    due_date: string | null
    created_at: string
    updated_at: string
}

export interface StorageTemplate {
    id: string
    name: string
    content: string
    category: string
    created_at: string
}

export interface StorageCanvas {
    id: string
    name: string
    elements: string   // JSON string of ExcalidrawElement[]
    app_state: string  // JSON string of partial AppState
    files: string      // JSON string of BinaryFiles
    created_at: string
    updated_at: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.tesserin?.db
}

/** Generic localStorage helper */
function lsGet<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : fallback
    } catch { return fallback }
}
function lsSet(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

/* ================================================================== */
/*  NOTES                                                              */
/* ================================================================== */

const NOTES_LS_KEY = 'tesserin:notes'

export async function listNotes(): Promise<StorageNote[]> {
    if (isElectron()) return window.tesserin!.db.notes.list()
    return lsGet<StorageNote[]>(NOTES_LS_KEY, [])
}

export async function getNote(id: string): Promise<StorageNote | undefined> {
    if (isElectron()) return window.tesserin!.db.notes.get(id)
    return lsGet<StorageNote[]>(NOTES_LS_KEY, []).find(n => n.id === id)
}

export async function createNote(data: { id?: string; title?: string; content?: string; folderId?: string }): Promise<StorageNote> {
    if (isElectron()) return window.tesserin!.db.notes.create(data)
    const now = new Date().toISOString()
    const note: StorageNote = {
        id: data.id || crypto.randomUUID(),
        title: data.title || 'Untitled',
        content: data.content || '',
        folder_id: data.folderId || null,
        is_daily: 0,
        is_pinned: 0,
        is_archived: 0,
        created_at: now,
        updated_at: now,
    }
    const notes = lsGet<StorageNote[]>(NOTES_LS_KEY, [])
    notes.push(note)
    lsSet(NOTES_LS_KEY, notes)
    return note
}

export async function updateNote(id: string, updates: { title?: string; content?: string; folderId?: string; isPinned?: boolean; isArchived?: boolean }): Promise<StorageNote | undefined> {
    if (isElectron()) return window.tesserin!.db.notes.update(id, updates)
    const notes = lsGet<StorageNote[]>(NOTES_LS_KEY, [])
    const idx = notes.findIndex(n => n.id === id)
    if (idx === -1) return undefined
    if (updates.title !== undefined) notes[idx].title = updates.title
    if (updates.content !== undefined) notes[idx].content = updates.content
    if (updates.folderId !== undefined) notes[idx].folder_id = updates.folderId
    if (updates.isPinned !== undefined) notes[idx].is_pinned = updates.isPinned ? 1 : 0
    if (updates.isArchived !== undefined) notes[idx].is_archived = updates.isArchived ? 1 : 0
    notes[idx].updated_at = new Date().toISOString()
    lsSet(NOTES_LS_KEY, notes)
    return notes[idx]
}

export async function deleteNote(id: string): Promise<void> {
    if (isElectron()) return window.tesserin!.db.notes.delete(id)
    lsSet(NOTES_LS_KEY, lsGet<StorageNote[]>(NOTES_LS_KEY, []).filter(n => n.id !== id))
}

export async function searchNotes(query: string): Promise<StorageNote[]> {
    if (isElectron()) return window.tesserin!.db.notes.search(query)
    const q = query.toLowerCase()
    return lsGet<StorageNote[]>(NOTES_LS_KEY, []).filter(
        n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    )
}

export async function getNoteByTitle(title: string): Promise<StorageNote | undefined> {
    if (isElectron()) return window.tesserin!.db.notes.getByTitle(title)
    return lsGet<StorageNote[]>(NOTES_LS_KEY, []).find(
        n => n.title.toLowerCase() === title.toLowerCase()
    )
}

/* ================================================================== */
/*  TASKS                                                              */
/* ================================================================== */

const TASKS_LS_KEY = 'tesserin:tasks'

export async function listTasks(): Promise<StorageTask[]> {
    if (isElectron()) return window.tesserin!.db.tasks.list()
    return lsGet<StorageTask[]>(TASKS_LS_KEY, [])
}

export async function createTask(data: { title: string; columnId?: string; priority?: number; dueDate?: string; noteId?: string }): Promise<StorageTask> {
    if (isElectron()) return window.tesserin!.db.tasks.create(data)
    const now = new Date().toISOString()
    const columnId = data.columnId || 'backlog'
    const task: StorageTask = {
        id: crypto.randomUUID(),
        title: data.title,
        status: columnId,
        priority: data.priority ?? 0,
        note_id: data.noteId || null,
        column_id: columnId,
        sort_order: 0,
        due_date: data.dueDate || null,
        created_at: now,
        updated_at: now,
    }
    const tasks = lsGet<StorageTask[]>(TASKS_LS_KEY, [])
    tasks.push(task)
    lsSet(TASKS_LS_KEY, tasks)
    return task
}

export async function updateTask(id: string, updates: Record<string, unknown>): Promise<StorageTask | undefined> {
    if (isElectron()) return window.tesserin!.db.tasks.update(id, updates)
    const tasks = lsGet<StorageTask[]>(TASKS_LS_KEY, [])
    const idx = tasks.findIndex(t => t.id === id)
    if (idx === -1) return undefined
    const fieldMap: Record<string, string> = {
        columnId: 'column_id', sortOrder: 'sort_order',
        dueDate: 'due_date', noteId: 'note_id',
    }
    for (const [key, val] of Object.entries(updates)) {
        const mapped = fieldMap[key] || key
        ;(tasks[idx] as any)[mapped] = val
    }
    // Sync status with column_id
    if (updates.columnId !== undefined && updates.status === undefined) {
        tasks[idx].status = updates.columnId as string
    }
    tasks[idx].updated_at = new Date().toISOString()
    lsSet(TASKS_LS_KEY, tasks)
    return tasks[idx]
}

export async function deleteTask(id: string): Promise<void> {
    if (isElectron()) return window.tesserin!.db.tasks.delete(id)
    lsSet(TASKS_LS_KEY, lsGet<StorageTask[]>(TASKS_LS_KEY, []).filter(t => t.id !== id))
}

/* ================================================================== */
/*  TEMPLATES                                                          */
/* ================================================================== */

const TEMPLATES_LS_KEY = 'tesserin:templates'

export async function listTemplates(): Promise<StorageTemplate[]> {
    if (isElectron()) return window.tesserin!.db.templates.list()
    return lsGet<StorageTemplate[]>(TEMPLATES_LS_KEY, [])
}

export async function createTemplate(data: { name: string; content: string; category?: string }): Promise<StorageTemplate> {
    if (isElectron()) return window.tesserin!.db.templates.create(data)
    const template: StorageTemplate = {
        id: crypto.randomUUID(),
        name: data.name,
        content: data.content,
        category: data.category || 'general',
        created_at: new Date().toISOString(),
    }
    const list = lsGet<StorageTemplate[]>(TEMPLATES_LS_KEY, [])
    list.push(template)
    lsSet(TEMPLATES_LS_KEY, list)
    return template
}

/* ================================================================== */
/*  SETTINGS                                                           */
/* ================================================================== */

const SETTINGS_LS_KEY = 'tesserin:settings'

export async function getSetting(key: string): Promise<string | null> {
    if (isElectron()) return window.tesserin!.db.settings.get(key)
    return lsGet<Record<string, string>>(SETTINGS_LS_KEY, {})[key] ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
    if (isElectron()) return window.tesserin!.db.settings.set(key, value)
    const settings = lsGet<Record<string, string>>(SETTINGS_LS_KEY, {})
    settings[key] = value
    lsSet(SETTINGS_LS_KEY, settings)
}

/* ================================================================== */
/*  CANVASES                                                           */
/* ================================================================== */

const CANVAS_LS_PREFIX = 'tesserin:canvas:'

export async function listCanvases(): Promise<StorageCanvas[]> {
    if (isElectron()) return window.tesserin!.db.canvases.list()
    try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(CANVAS_LS_PREFIX))
        return keys.map(k => JSON.parse(localStorage.getItem(k)!)).filter(Boolean)
    } catch { return [] }
}

export async function getCanvas(id: string): Promise<StorageCanvas | undefined> {
    if (isElectron()) return window.tesserin!.db.canvases.get(id)
    try {
        const raw = localStorage.getItem(CANVAS_LS_PREFIX + id)
        return raw ? JSON.parse(raw) : undefined
    } catch { return undefined }
}

export async function createCanvas(data: { id?: string; name?: string; elements?: string; appState?: string; files?: string }): Promise<StorageCanvas> {
    if (isElectron()) return window.tesserin!.db.canvases.create(data)
    const id = data.id || crypto.randomUUID()
    const now = new Date().toISOString()
    const canvas: StorageCanvas = {
        id,
        name: data.name || 'Untitled Canvas',
        elements: data.elements || '[]',
        app_state: data.appState || '{}',
        files: data.files || '{}',
        created_at: now,
        updated_at: now,
    }
    try { localStorage.setItem(CANVAS_LS_PREFIX + id, JSON.stringify(canvas)) } catch {}
    return canvas
}

export async function updateCanvas(id: string, data: { name?: string; elements?: string; appState?: string; files?: string }): Promise<StorageCanvas | undefined> {
    if (isElectron()) return window.tesserin!.db.canvases.update(id, data)
    try {
        const raw = localStorage.getItem(CANVAS_LS_PREFIX + id)
        if (!raw) return undefined
        const canvas: StorageCanvas = JSON.parse(raw)
        if (data.name !== undefined) canvas.name = data.name
        if (data.elements !== undefined) canvas.elements = data.elements
        if (data.appState !== undefined) canvas.app_state = data.appState
        if (data.files !== undefined) canvas.files = data.files
        canvas.updated_at = new Date().toISOString()
        localStorage.setItem(CANVAS_LS_PREFIX + id, JSON.stringify(canvas))
        return canvas
    } catch { return undefined }
}

export async function deleteCanvas(id: string): Promise<void> {
    if (isElectron()) return window.tesserin!.db.canvases.delete(id)
    try { localStorage.removeItem(CANVAS_LS_PREFIX + id) } catch {}
}

/* ================================================================== */
/*  AI                                                                 */
/* ================================================================== */

export function isAIAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.tesserin?.ai
}

export async function checkAIConnection(): Promise<{ connected: boolean; version?: string }> {
    if (isAIAvailable()) {
        return window.tesserin!.ai.checkConnection()
    }
    return { connected: false }
}

export async function aiChat(
    messages: Array<{ role: string; content: string }>,
    model?: string
): Promise<{ role: string; content: string }> {
    if (isAIAvailable()) {
        return window.tesserin!.ai.chat(messages, model)
    }
    return { role: 'assistant', content: 'AI is not available. Install Ollama to enable AI features.' }
}

export async function aiSummarize(text: string): Promise<string> {
    if (isAIAvailable()) {
        return window.tesserin!.ai.summarize(text)
    }
    return 'AI summarization requires Ollama to be running.'
}

export async function aiGenerateTags(text: string): Promise<string[]> {
    if (isAIAvailable()) {
        return window.tesserin!.ai.generateTags(text)
    }
    return []
}

export async function aiSuggestLinks(content: string, titles: string[]): Promise<string[]> {
    if (isAIAvailable()) {
        return window.tesserin!.ai.suggestLinks(content, titles)
    }
    return []
}
