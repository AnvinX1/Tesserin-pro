"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.listNotes = listNotes;
exports.getNote = getNote;
exports.getNoteByTitle = getNoteByTitle;
exports.createNote = createNote;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
exports.searchNotes = searchNotes;
exports.listTags = listTags;
exports.createTag = createTag;
exports.deleteTag = deleteTag;
exports.addTagToNote = addTagToNote;
exports.removeTagFromNote = removeTagFromNote;
exports.getTagsForNote = getTagsForNote;
exports.listFolders = listFolders;
exports.createFolder = createFolder;
exports.renameFolder = renameFolder;
exports.deleteFolder = deleteFolder;
exports.listTasks = listTasks;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.listTemplates = listTemplates;
exports.getTemplate = getTemplate;
exports.createTemplate = createTemplate;
exports.deleteTemplate = deleteTemplate;
exports.getSetting = getSetting;
exports.setSetting = setSetting;
exports.getAllSettings = getAllSettings;
exports.listCanvases = listCanvases;
exports.getCanvas = getCanvas;
exports.createCanvas = createCanvas;
exports.updateCanvas = updateCanvas;
exports.deleteCanvas = deleteCanvas;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
let db;
/**
 * Get the path to the SQLite database file.
 * Stored in the user's app data directory.
 */
function getDbPath() {
    const userDataPath = electron_1.app.getPath('userData');
    return path_1.default.join(userDataPath, 'tesserin.db');
}
/**
 * Initialize the database with schema and seed data.
 */
function initDatabase() {
    const dbPath = getDbPath();
    db = new better_sqlite3_1.default(dbPath);
    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // Create tables
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
      status     TEXT DEFAULT 'todo',
      priority   INTEGER DEFAULT 0,
      due_date   TEXT,
      column_id  TEXT DEFAULT 'backlog',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      content  TEXT DEFAULT '',
      category TEXT DEFAULT 'general'
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
  `);
    // Seed data if fresh database
    const count = db.prepare('SELECT COUNT(*) as c FROM notes').get();
    if (count.c === 0) {
        seedDatabase();
    }
}
/**
 * Seed the database with starter content.
 */
function seedDatabase() {
    const insertTemplate = db.prepare('INSERT INTO templates (id, name, content, category) VALUES (?, ?, ?, ?)');
    const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const seedTx = db.transaction(() => {
        // Seed templates
        insertTemplate.run((0, crypto_1.randomUUID)(), 'Meeting Notes', '# Meeting: {{title}}\n\n**Date:** {{date}}\n**Attendees:** \n\n## Agenda\n\n1. \n\n## Discussion\n\n\n## Action Items\n\n- [ ] \n\n## Next Steps\n\n', 'work');
        insertTemplate.run((0, crypto_1.randomUUID)(), 'Book Notes', '# 📚 {{title}}\n\n**Author:** \n**Rating:** ⭐⭐⭐⭐⭐\n\n## Summary\n\n\n## Key Takeaways\n\n1. \n2. \n3. \n\n## Favorite Quotes\n\n> \n\n## How This Applies\n\n', 'learning');
        insertTemplate.run((0, crypto_1.randomUUID)(), 'Project Plan', '# 🎯 Project: {{title}}\n\n**Status:** 🟢 Active\n**Deadline:** \n\n## Objective\n\n\n## Milestones\n\n- [ ] Phase 1: \n- [ ] Phase 2: \n- [ ] Phase 3: \n\n## Resources\n\n\n## Notes\n\n', 'work');
        insertTemplate.run((0, crypto_1.randomUUID)(), 'Weekly Review', '# 📅 Weekly Review — {{date}}\n\n## Wins This Week\n\n1. \n\n## Challenges\n\n1. \n\n## Lessons Learned\n\n\n## Next Week Priorities\n\n1. \n2. \n3. \n\n## Gratitude\n\n', 'personal');
        insertTemplate.run((0, crypto_1.randomUUID)(), 'Daily Note', '# 📝 {{date}}\n\n## Today\'s Focus\n\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n\n## End of Day Reflection\n\n', 'daily');
        // Default settings
        insertSetting.run('theme', 'dark');
        insertSetting.run('ai.model', 'llama3.2');
        insertSetting.run('ai.endpoint', 'http://localhost:11434');
        insertSetting.run('editor.fontSize', '14');
        insertSetting.run('editor.lineNumbers', 'true');
    });
    seedTx();
}
// ── Note Operations ───────────────────────────────────────────────────
function listNotes() {
    return db.prepare('SELECT * FROM notes ORDER BY is_pinned DESC, updated_at DESC').all();
}
function getNote(id) {
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
}
function getNoteByTitle(title) {
    return db.prepare('SELECT * FROM notes WHERE title = ? COLLATE NOCASE').get(title);
}
function createNote(data) {
    const id = (0, crypto_1.randomUUID)();
    const title = data.title || 'Untitled';
    const content = data.content || '';
    db.prepare('INSERT INTO notes (id, title, content, folder_id) VALUES (?, ?, ?, ?)').run(id, title, content, data.folderId || null);
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
}
function updateNote(id, data) {
    const sets = [];
    const values = [];
    if (data.title !== undefined) {
        sets.push('title = ?');
        values.push(data.title);
    }
    if (data.content !== undefined) {
        sets.push('content = ?');
        values.push(data.content);
    }
    if (data.folderId !== undefined) {
        sets.push('folder_id = ?');
        values.push(data.folderId);
    }
    if (data.isPinned !== undefined) {
        sets.push('is_pinned = ?');
        values.push(data.isPinned ? 1 : 0);
    }
    sets.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
}
function deleteNote(id) {
    return db.prepare('DELETE FROM notes WHERE id = ?').run(id);
}
function searchNotes(query) {
    // Use LIKE for simple search (FTS5 can be added as an optimization later)
    const pattern = `%${query}%`;
    return db.prepare('SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC').all(pattern, pattern);
}
// ── Tag Operations ────────────────────────────────────────────────────
function listTags() {
    return db.prepare('SELECT * FROM tags ORDER BY name').all();
}
function createTag(name, color) {
    const id = (0, crypto_1.randomUUID)();
    db.prepare('INSERT INTO tags (id, name, color) VALUES (?, ?, ?)').run(id, name, color || '#6366f1');
    return db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
}
function deleteTag(id) {
    return db.prepare('DELETE FROM tags WHERE id = ?').run(id);
}
function addTagToNote(noteId, tagId) {
    db.prepare('INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(noteId, tagId);
}
function removeTagFromNote(noteId, tagId) {
    db.prepare('DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?').run(noteId, tagId);
}
function getTagsForNote(noteId) {
    return db.prepare('SELECT t.* FROM tags t JOIN note_tags nt ON t.id = nt.tag_id WHERE nt.note_id = ?').all(noteId);
}
// ── Folder Operations ─────────────────────────────────────────────────
function listFolders() {
    return db.prepare('SELECT * FROM folders ORDER BY sort_order, name').all();
}
function createFolder(name, parentId) {
    const id = (0, crypto_1.randomUUID)();
    db.prepare('INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)').run(id, name, parentId || null);
    return db.prepare('SELECT * FROM folders WHERE id = ?').get(id);
}
function renameFolder(id, name) {
    db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id);
}
function deleteFolder(id) {
    return db.prepare('DELETE FROM folders WHERE id = ?').run(id);
}
// ── Task Operations ───────────────────────────────────────────────────
function listTasks() {
    return db.prepare('SELECT * FROM tasks ORDER BY sort_order, created_at DESC').all();
}
function createTask(data) {
    const id = (0, crypto_1.randomUUID)();
    db.prepare('INSERT INTO tasks (id, title, note_id, column_id, priority, due_date) VALUES (?, ?, ?, ?, ?, ?)').run(id, data.title, data.noteId || null, data.columnId || 'backlog', data.priority || 0, data.dueDate || null);
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}
function updateTask(id, data) {
    const sets = [];
    const values = [];
    const allowedFields = {
        title: 'title', status: 'status', columnId: 'column_id',
        priority: 'priority', dueDate: 'due_date', sortOrder: 'sort_order', noteId: 'note_id',
    };
    for (const [key, col] of Object.entries(allowedFields)) {
        if (data[key] !== undefined) {
            sets.push(`${col} = ?`);
            values.push(data[key]);
        }
    }
    if (sets.length === 0)
        return;
    values.push(id);
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
}
function deleteTask(id) {
    return db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}
// ── Template Operations ───────────────────────────────────────────────
function listTemplates() {
    return db.prepare('SELECT * FROM templates ORDER BY category, name').all();
}
function getTemplate(id) {
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
}
function createTemplate(data) {
    const id = (0, crypto_1.randomUUID)();
    db.prepare('INSERT INTO templates (id, name, content, category) VALUES (?, ?, ?, ?)').run(id, data.name, data.content, data.category || 'general');
    return db.prepare('SELECT * FROM templates WHERE id = ?').get(id);
}
function deleteTemplate(id) {
    return db.prepare('DELETE FROM templates WHERE id = ?').run(id);
}
// ── Settings Operations ───────────────────────────────────────────────
function getSetting(key) {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row?.value ?? null;
}
function setSetting(key, value) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}
function getAllSettings() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const result = {};
    for (const row of rows) {
        result[row.key] = row.value;
    }
    return result;
}
// ── Canvas Operations ─────────────────────────────────────────────────
function listCanvases() {
    return db.prepare('SELECT id, name, created_at, updated_at FROM canvases ORDER BY updated_at DESC').all();
}
function getCanvas(id) {
    return db.prepare('SELECT * FROM canvases WHERE id = ?').get(id);
}
function createCanvas(data) {
    const id = data.id || (0, crypto_1.randomUUID)();
    const name = data.name || 'Untitled Canvas';
    db.prepare('INSERT INTO canvases (id, name, elements, app_state, files) VALUES (?, ?, ?, ?, ?)').run(id, name, data.elements || '[]', data.appState || '{}', data.files || '{}');
    return db.prepare('SELECT * FROM canvases WHERE id = ?').get(id);
}
function updateCanvas(id, data) {
    const sets = [];
    const values = [];
    if (data.name !== undefined) {
        sets.push('name = ?');
        values.push(data.name);
    }
    if (data.elements !== undefined) {
        sets.push('elements = ?');
        values.push(data.elements);
    }
    if (data.appState !== undefined) {
        sets.push('app_state = ?');
        values.push(data.appState);
    }
    if (data.files !== undefined) {
        sets.push('files = ?');
        values.push(data.files);
    }
    if (sets.length === 0)
        return;
    sets.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE canvases SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM canvases WHERE id = ?').get(id);
}
function deleteCanvas(id) {
    return db.prepare('DELETE FROM canvases WHERE id = ?').run(id);
}
//# sourceMappingURL=database.js.map