import Database from 'better-sqlite3';
/**
 * Initialize the database with schema and seed data.
 */
export declare function initDatabase(): void;
/**
 * Seed the database with starter content.
 */
export declare function seedDatabase(): void;
/**
 * Clear ALL data from the database and re-seed defaults.
 */
export declare function clearAllData(): void;
export declare function listNotes(): unknown[];
export declare function getNote(id: string): unknown;
export declare function getNoteByTitle(title: string): unknown;
export declare function createNote(data: {
    id?: string;
    title?: string;
    content?: string;
    folderId?: string;
}): unknown;
export declare function updateNote(id: string, data: {
    title?: string;
    content?: string;
    folderId?: string;
    isPinned?: boolean;
    isArchived?: boolean;
}): unknown;
export declare function deleteNote(id: string): Database.RunResult;
export declare function searchNotes(query: string): unknown[];
export declare function listTags(): unknown[];
export declare function createTag(name: string, color?: string): unknown;
export declare function deleteTag(id: string): Database.RunResult;
export declare function addTagToNote(noteId: string, tagId: string): void;
export declare function removeTagFromNote(noteId: string, tagId: string): void;
export declare function getTagsForNote(noteId: string): unknown[];
export declare function listFolders(): unknown[];
export declare function createFolder(name: string, parentId?: string): unknown;
export declare function renameFolder(id: string, name: string): void;
export declare function deleteFolder(id: string): Database.RunResult;
export declare function listTasks(): unknown[];
export declare function createTask(data: {
    title: string;
    noteId?: string;
    columnId?: string;
    priority?: number;
    dueDate?: string;
}): unknown;
export declare function updateTask(id: string, data: Record<string, unknown>): unknown;
export declare function deleteTask(id: string): Database.RunResult;
export declare function listTemplates(): unknown[];
export declare function getTemplate(id: string): unknown;
export declare function createTemplate(data: {
    name: string;
    content: string;
    category?: string;
}): unknown;
export declare function deleteTemplate(id: string): Database.RunResult;
export declare function getSetting(key: string): string | null;
export declare function setSetting(key: string, value: string): void;
export declare function getAllSettings(): Record<string, string>;
export declare function listCanvases(): unknown[];
export declare function getCanvas(id: string): unknown;
export declare function createCanvas(data: {
    id?: string;
    name?: string;
    elements?: string;
    appState?: string;
    files?: string;
}): unknown;
export declare function updateCanvas(id: string, data: {
    name?: string;
    elements?: string;
    appState?: string;
    files?: string;
}): unknown;
export declare function deleteCanvas(id: string): Database.RunResult;
export declare function listApiKeys(): Array<{
    id: string;
    name: string;
    key_hash: string;
    prefix: string;
    permissions: string;
    created_at: string;
    last_used_at: string | null;
    expires_at: string | null;
    is_revoked: number;
}>;
export declare function getApiKey(id: string): unknown;
export declare function createApiKey(data: {
    id: string;
    name: string;
    keyHash: string;
    prefix: string;
    permissions: string[];
    expiresAt?: string;
}): unknown;
export declare function revokeApiKey(id: string): void;
export declare function deleteApiKey(id: string): Database.RunResult;
export declare function touchApiKey(id: string): void;
//# sourceMappingURL=database.d.ts.map