import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import { randomUUID } from 'crypto'

let db: Database.Database

/**
 * Get the path to the SQLite database file.
 * Stored in the user's app data directory.
 */
function getDbPath(): string {
    const userDataPath = app.getPath('userData')
    return path.join(userDataPath, 'tesserin.db')
}

/**
 * Initialize the database with schema and seed data.
 */
export function initDatabase(): void {
    const dbPath = getDbPath()
    db = new Database(dbPath)

    // ── Pragmas for production-grade performance & safety ────────────
    db.pragma('journal_mode = WAL')          // Write-Ahead Logging
    db.pragma('foreign_keys = ON')           // Enforce FK constraints
    db.pragma('busy_timeout = 5000')         // Wait up to 5s on lock contention
    db.pragma('synchronous = NORMAL')        // Safe with WAL, faster than FULL
    db.pragma('cache_size = -64000')         // 64MB page cache
    db.pragma('temp_store = MEMORY')         // Temp tables in memory

    // ── Core schema ─────────────────────────────────────────────────
    db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      parent_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      content     TEXT DEFAULT '',
      folder_id   TEXT REFERENCES folders(id) ON DELETE SET NULL,
      is_daily    INTEGER DEFAULT 0,
      is_pinned   INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0,
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id    TEXT PRIMARY KEY,
      name  TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#6366f1'
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
      tag_id  TEXT REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      note_id    TEXT REFERENCES notes(id) ON DELETE SET NULL,
      status     TEXT NOT NULL DEFAULT 'backlog',
      priority   INTEGER NOT NULL DEFAULT 0 CHECK(priority BETWEEN 0 AND 3),
      due_date   TEXT,
      column_id  TEXT NOT NULL DEFAULT 'backlog',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      content    TEXT DEFAULT '',
      category   TEXT DEFAULT 'general',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS canvases (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL DEFAULT 'Untitled Canvas',
      elements    TEXT DEFAULT '[]',
      app_state   TEXT DEFAULT '{}',
      files       TEXT DEFAULT '{}',
      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      key_hash     TEXT NOT NULL,
      prefix       TEXT NOT NULL,
      permissions  TEXT NOT NULL DEFAULT '["*"]',
      created_at   TEXT DEFAULT (datetime('now')),
      last_used_at TEXT,
      expires_at   TEXT,
      is_revoked   INTEGER DEFAULT 0
    );

    /* ── Indexes for query patterns ── */
    CREATE INDEX IF NOT EXISTS idx_notes_folder     ON notes(folder_id);
    CREATE INDEX IF NOT EXISTS idx_notes_updated     ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_pinned      ON notes(is_pinned DESC, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_title       ON notes(title COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_notes_daily       ON notes(is_daily) WHERE is_daily = 1;
    CREATE INDEX IF NOT EXISTS idx_tasks_column      ON tasks(column_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_due         ON tasks(due_date) WHERE due_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag     ON note_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_folders_parent    ON folders(parent_id);
    CREATE INDEX IF NOT EXISTS idx_canvases_updated  ON canvases(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_templates_cat     ON templates(category, name);
  `)

    // ── Schema migrations for existing databases ────────────────────
    // Safely add columns that may not exist in older DBs
    const migrations = [
        "ALTER TABLE notes ADD COLUMN is_archived INTEGER DEFAULT 0",
        "ALTER TABLE tasks ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))",
    ]
    for (const sql of migrations) {
        try { db.exec(sql) } catch { /* column already exists — safe to skip */ }
    }

    // Seed data if fresh database
    const count = db.prepare('SELECT COUNT(*) as c FROM notes').get() as { c: number }
    if (count.c === 0) {
        seedDatabase()
    }
}

/**
 * Seed the database with starter content.
 */
export function seedDatabase(): void {
    const insertTemplate = db.prepare(
        'INSERT INTO templates (id, name, content, category) VALUES (?, ?, ?, ?)'
    )
    const insertSetting = db.prepare(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
    )

    const seedTx = db.transaction(() => {

        // Seed templates
        insertTemplate.run(randomUUID(), 'Meeting Notes', '# Meeting: {{title}}\n\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n\n1. \n\n## Discussion\n\n\n## Action Items\n\n- [ ] \n\n## Next Steps\n\n', 'work')
        insertTemplate.run(randomUUID(), 'Book Notes', '# 📚 {{title}}\n\n**Author:** \n**Rating:** ⭐⭐⭐⭐⭐\n\n## Summary\n\n\n## Key Takeaways\n\n1. \n2. \n3. \n\n## Favorite Quotes\n\n> \n\n## How This Applies\n\n', 'learning')
        insertTemplate.run(randomUUID(), 'Project Plan', '# 🎯 Project: {{title}}\n\n**Status:** 🟢 Active\n**Deadline:** \n\n## Objective\n\n\n## Milestones\n\n- [ ] Phase 1: \n- [ ] Phase 2: \n- [ ] Phase 3: \n\n## Resources\n\n\n## Notes\n\n', 'work')
        insertTemplate.run(randomUUID(), 'Weekly Review', '# 📅 Weekly Review — {{date}}\n\n## Wins This Week\n\n1. \n\n## Challenges\n\n1. \n\n## Lessons Learned\n\n\n## Next Week Priorities\n\n1. \n2. \n3. \n\n## Gratitude\n\n', 'personal')
        insertTemplate.run(randomUUID(), 'Daily Note', '# 📝 {{date}}\n\n## Today\'s Focus\n\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n\n## End of Day Reflection\n\n', 'daily')

        // Default settings
        insertSetting.run('theme', 'dark')
        insertSetting.run('ai.model', 'llama3.2')
        insertSetting.run('ai.endpoint', 'http://localhost:11434')
        insertSetting.run('editor.fontSize', '14')
        insertSetting.run('editor.lineNumbers', 'true')
    })

    seedTx()
}

/**
 * Clear ALL data from the database and re-seed defaults.
 */
export function clearAllData(): void {
    const tables = [
        'folders', 'notes', 'tags', 'note_tags', 'tasks',
        'templates', 'settings', 'canvases', 'api_keys'
    ]
    const resetTx = db.transaction(() => {
        for (const table of tables) {
            db.prepare(`DELETE FROM ${table}`).run()
        }
    })
    resetTx()
    seedDatabase()
}

// ── Note Operations ───────────────────────────────────────────────────

export function listNotes() {
    return db.prepare('SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC').all()
}

export function getNote(id: string) {
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
}

export function getNoteByTitle(title: string) {
    return db.prepare('SELECT * FROM notes WHERE title = ? COLLATE NOCASE').get(title)
}

export function createNote(data: { id?: string; title?: string; content?: string; folderId?: string }) {
    const id = data.id || randomUUID()
    const title = data.title || 'Untitled'
    const content = data.content || ''
    db.prepare(
        'INSERT INTO notes (id, title, content, folder_id) VALUES (?, ?, ?, ?)'
    ).run(id, title, content, data.folderId || null)
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
}

export function updateNote(id: string, data: { title?: string; content?: string; folderId?: string; isPinned?: boolean; isArchived?: boolean }) {
    const sets: string[] = []
    const values: unknown[] = []

    if (data.title !== undefined) { sets.push('title = ?'); values.push(data.title) }
    if (data.content !== undefined) { sets.push('content = ?'); values.push(data.content) }
    if (data.folderId !== undefined) { sets.push('folder_id = ?'); values.push(data.folderId) }
    if (data.isPinned !== undefined) { sets.push('is_pinned = ?'); values.push(data.isPinned ? 1 : 0) }
    if (data.isArchived !== undefined) { sets.push('is_archived = ?'); values.push(data.isArchived ? 1 : 0) }

    sets.push("updated_at = datetime('now')")
    values.push(id)

    db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id)
}

export function deleteNote(id: string) {
    return db.prepare('DELETE FROM notes WHERE id = ?').run(id)
}

export function searchNotes(query: string) {
    // Use LIKE for simple search (FTS5 can be added as an optimization later)
    const pattern = `%${query}%`
    return db.prepare(
        'SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC'
    ).all(pattern, pattern)
}

// ── Tag Operations ────────────────────────────────────────────────────

export function listTags() {
    return db.prepare('SELECT * FROM tags ORDER BY name').all()
}

export function createTag(name: string, color?: string) {
    const id = randomUUID()
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color || '#6366f1')
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id)
}

export function deleteTag(id: string) {
    return db.prepare('DELETE FROM tags WHERE id = ?').run(id)
}

export function addTagToNote(noteId: string, tagId: string) {
    db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(noteId, tagId)
}

export function removeTagFromNote(noteId: string, tagId: string) {
    db.prepare('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?').run(noteId, tagId)
}

export function getTagsForNote(noteId: string) {
    return db.prepare(
        'SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?'
    ).all(noteId)
}

// ── Folder Operations ─────────────────────────────────────────────────

export function listFolders() {
    return db.prepare('SELECT * FROM folders ORDER BY sort_order, name').all()
}

export function createFolder(name: string, parentId?: string) {
    const id = randomUUID()
    db.prepare('INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)').run(id, name, parentId || null)
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(id)
}

export function renameFolder(id: string, name: string) {
    db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id)
}

export function deleteFolder(id: string) {
    return db.prepare('DELETE FROM folders WHERE id = ?').run(id)
}

// ── Task Operations ───────────────────────────────────────────────────

export function listTasks() {
    return db.prepare('SELECT * FROM tasks ORDER BY column_id, sort_order, created_at DESC').all()
}

export function createTask(data: { title: string; noteId?: string; columnId?: string; priority?: number; dueDate?: string }) {
    const id = randomUUID()
    const columnId = data.columnId || 'backlog'
    db.prepare(
        'INSERT INTO tasks (id, title, note_id, status, column_id, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, data.title, data.noteId || null, columnId, columnId, data.priority ?? 0, data.dueDate || null)
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
}

export function updateTask(id: string, data: Record<string, unknown>) {
    const sets: string[] = []
    const values: unknown[] = []

    const allowedFields: Record<string, string> = {
        title: 'title', status: 'status', columnId: 'column_id',
        priority: 'priority', dueDate: 'due_date', sortOrder: 'sort_order', noteId: 'note_id',
    }

    for (const [key, col] of Object.entries(allowedFields)) {
        if (data[key] !== undefined) {
            sets.push(`${col} = ?`)
            values.push(data[key])
        }
    }

    // Keep status in sync with column_id
    if (data.columnId !== undefined && data.status === undefined) {
        sets.push('status = ?')
        values.push(data.columnId)
    }

    if (sets.length === 0) return
    sets.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id)
}

export function deleteTask(id: string) {
    return db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

// ── Template Operations ───────────────────────────────────────────────

export function listTemplates() {
    return db.prepare('SELECT * FROM templates ORDER BY category, name').all()
}

export function getTemplate(id: string) {
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(id)
}

export function createTemplate(data: { name: string; content: string; category?: string }) {
    const id = randomUUID()
    db.prepare(
        'INSERT INTO templates (id, name, content, category) VALUES (?, ?, ?, ?)'
    ).run(id, data.name, data.content, data.category || 'general')
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(id)
}

export function deleteTemplate(id: string) {
    return db.prepare('DELETE FROM templates WHERE id = ?').run(id)
}

// ── Settings Operations ───────────────────────────────────────────────

export function getSetting(key: string): string | null {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
}

export function setSetting(key: string, value: string) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function getAllSettings(): Record<string, string> {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const result: Record<string, string> = {}
    for (const row of rows) {
        result[row.key] = row.value
    }
    return result
}

// ── Canvas Operations ─────────────────────────────────────────────────

export function listCanvases() {
    return db.prepare('SELECT id, name, created_at, updated_at FROM canvases ORDER BY updated_at DESC').all()
}

export function getCanvas(id: string) {
    return db.prepare('SELECT * FROM canvases WHERE id = ?').get(id)
}

export function createCanvas(data: { id?: string; name?: string; elements?: string; appState?: string; files?: string }) {
    const id = data.id || randomUUID()
    const name = data.name || 'Untitled Canvas'
    db.prepare(
        'INSERT INTO canvases (id, name, elements, app_state, files) VALUES (?, ?, ?, ?, ?)'
    ).run(id, name, data.elements || '[]', data.appState || '{}', data.files || '{}')
    return db.prepare('SELECT * FROM canvases WHERE id = ?').get(id)
}

export function updateCanvas(id: string, data: { name?: string; elements?: string; appState?: string; files?: string }) {
    const sets: string[] = []
    const values: unknown[] = []

    if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name) }
    if (data.elements !== undefined) { sets.push('elements = ?'); values.push(data.elements) }
    if (data.appState !== undefined) { sets.push('app_state = ?'); values.push(data.appState) }
    if (data.files !== undefined) { sets.push('files = ?'); values.push(data.files) }

    if (sets.length === 0) return
    sets.push("updated_at = datetime('now')")
    values.push(id)

    db.prepare(`UPDATE canvases SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    return db.prepare('SELECT * FROM canvases WHERE id = ?').get(id)
}

export function deleteCanvas(id: string) {
    return db.prepare('DELETE FROM canvases WHERE id = ?').run(id)
}

// ── API Key Operations ────────────────────────────────────────────────

export function listApiKeys() {
    return db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all() as Array<{
        id: string; name: string; key_hash: string; prefix: string;
        permissions: string; created_at: string; last_used_at: string | null;
        expires_at: string | null; is_revoked: number;
    }>
}

export function getApiKey(id: string) {
    return db.prepare('SELECT * FROM api_keys WHERE id = ?').get(id)
}

export function createApiKey(data: {
    id: string; name: string; keyHash: string; prefix: string;
    permissions: string[]; expiresAt?: string;
}) {
    db.prepare(
        'INSERT INTO api_keys (id, name, key_hash, prefix, permissions, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
        data.id, data.name, data.keyHash, data.prefix,
        JSON.stringify(data.permissions), data.expiresAt || null
    )
    return db.prepare('SELECT * FROM api_keys WHERE id = ?').get(data.id)
}

export function revokeApiKey(id: string) {
    db.prepare('UPDATE api_keys SET is_revoked = 1 WHERE id = ?').run(id)
}

export function deleteApiKey(id: string) {
    return db.prepare('DELETE FROM api_keys WHERE id = ?').run(id)
}

export function touchApiKey(id: string) {
    db.prepare("UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?").run(id)
}
