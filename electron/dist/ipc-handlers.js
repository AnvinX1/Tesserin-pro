"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const db = __importStar(require("./database"));
const ai = __importStar(require("./ai-service"));
/**
 * Register all IPC handlers for the Tesserin app.
 * Called once from main.ts during app initialization.
 */
function registerIpcHandlers() {
    // ── Notes ─────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:notes:list', () => db.listNotes());
    electron_1.ipcMain.handle('db:notes:get', (_e, id) => db.getNote(id));
    electron_1.ipcMain.handle('db:notes:create', (_e, data) => db.createNote(data));
    electron_1.ipcMain.handle('db:notes:update', (_e, id, data) => db.updateNote(id, data));
    electron_1.ipcMain.handle('db:notes:delete', (_e, id) => db.deleteNote(id));
    electron_1.ipcMain.handle('db:notes:search', (_e, query) => db.searchNotes(query));
    electron_1.ipcMain.handle('db:notes:getByTitle', (_e, title) => db.getNoteByTitle(title));
    // ── Tags ──────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:tags:list', () => db.listTags());
    electron_1.ipcMain.handle('db:tags:create', (_e, name, color) => db.createTag(name, color));
    electron_1.ipcMain.handle('db:tags:delete', (_e, id) => db.deleteTag(id));
    electron_1.ipcMain.handle('db:tags:addToNote', (_e, noteId, tagId) => db.addTagToNote(noteId, tagId));
    electron_1.ipcMain.handle('db:tags:removeFromNote', (_e, noteId, tagId) => db.removeTagFromNote(noteId, tagId));
    electron_1.ipcMain.handle('db:tags:getForNote', (_e, noteId) => db.getTagsForNote(noteId));
    // ── Folders ───────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:folders:list', () => db.listFolders());
    electron_1.ipcMain.handle('db:folders:create', (_e, name, parentId) => db.createFolder(name, parentId));
    electron_1.ipcMain.handle('db:folders:rename', (_e, id, name) => db.renameFolder(id, name));
    electron_1.ipcMain.handle('db:folders:delete', (_e, id) => db.deleteFolder(id));
    // ── Tasks ─────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:tasks:list', () => db.listTasks());
    electron_1.ipcMain.handle('db:tasks:create', (_e, data) => db.createTask(data));
    electron_1.ipcMain.handle('db:tasks:update', (_e, id, data) => db.updateTask(id, data));
    electron_1.ipcMain.handle('db:tasks:delete', (_e, id) => db.deleteTask(id));
    // ── Templates ─────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:templates:list', () => db.listTemplates());
    electron_1.ipcMain.handle('db:templates:get', (_e, id) => db.getTemplate(id));
    electron_1.ipcMain.handle('db:templates:create', (_e, data) => db.createTemplate(data));
    electron_1.ipcMain.handle('db:templates:delete', (_e, id) => db.deleteTemplate(id));
    // ── Settings ──────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:settings:get', (_e, key) => db.getSetting(key));
    electron_1.ipcMain.handle('db:settings:set', (_e, key, value) => db.setSetting(key, value));
    electron_1.ipcMain.handle('db:settings:getAll', () => db.getAllSettings());
    // ── Canvases ──────────────────────────────────────────────────────
    electron_1.ipcMain.handle('db:canvases:list', () => db.listCanvases());
    electron_1.ipcMain.handle('db:canvases:get', (_e, id) => db.getCanvas(id));
    electron_1.ipcMain.handle('db:canvases:create', (_e, data) => db.createCanvas(data));
    electron_1.ipcMain.handle('db:canvases:update', (_e, id, data) => db.updateCanvas(id, data));
    electron_1.ipcMain.handle('db:canvases:delete', (_e, id) => db.deleteCanvas(id));
    // ── AI ────────────────────────────────────────────────────────────
    electron_1.ipcMain.handle('ai:chat', async (_e, messages, model) => {
        return ai.chat(messages, model);
    });
    electron_1.ipcMain.on('ai:chat:stream', async (event, messages, model) => {
        try {
            await ai.chatStream(messages, model, {
                onChunk: (chunk) => event.sender.send('ai:chat:stream:chunk', chunk),
                onDone: () => event.sender.send('ai:chat:stream:done'),
                onError: (error) => event.sender.send('ai:chat:stream:error', error),
            });
        }
        catch (err) {
            event.sender.send('ai:chat:stream:error', String(err));
        }
    });
    electron_1.ipcMain.handle('ai:summarize', async (_e, text, model) => {
        return ai.summarize(text, model);
    });
    electron_1.ipcMain.handle('ai:generateTags', async (_e, text, model) => {
        return ai.generateTags(text, model);
    });
    electron_1.ipcMain.handle('ai:suggestLinks', async (_e, content, existingTitles, model) => {
        return ai.suggestLinks(content, existingTitles, model);
    });
    electron_1.ipcMain.handle('ai:checkConnection', async () => {
        return ai.checkConnection();
    });
    electron_1.ipcMain.handle('ai:listModels', async () => {
        return ai.listModels();
    });
}
//# sourceMappingURL=ipc-handlers.js.map