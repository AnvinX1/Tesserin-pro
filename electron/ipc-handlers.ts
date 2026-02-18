import { ipcMain } from 'electron'
import * as db from './database'
import * as ai from './ai-service'

/**
 * Register all IPC handlers for the Tesserin app.
 * Called once from main.ts during app initialization.
 */
export function registerIpcHandlers(): void {
    // ── Notes ─────────────────────────────────────────────────────────
    ipcMain.handle('db:notes:list', () => db.listNotes())
    ipcMain.handle('db:notes:get', (_e, id: string) => db.getNote(id))
    ipcMain.handle('db:notes:create', (_e, data) => db.createNote(data))
    ipcMain.handle('db:notes:update', (_e, id: string, data) => db.updateNote(id, data))
    ipcMain.handle('db:notes:delete', (_e, id: string) => db.deleteNote(id))
    ipcMain.handle('db:notes:search', (_e, query: string) => db.searchNotes(query))
    ipcMain.handle('db:notes:getByTitle', (_e, title: string) => db.getNoteByTitle(title))

    // ── Tags ──────────────────────────────────────────────────────────
    ipcMain.handle('db:tags:list', () => db.listTags())
    ipcMain.handle('db:tags:create', (_e, name: string, color?: string) => db.createTag(name, color))
    ipcMain.handle('db:tags:delete', (_e, id: string) => db.deleteTag(id))
    ipcMain.handle('db:tags:addToNote', (_e, noteId: string, tagId: string) => db.addTagToNote(noteId, tagId))
    ipcMain.handle('db:tags:removeFromNote', (_e, noteId: string, tagId: string) => db.removeTagFromNote(noteId, tagId))
    ipcMain.handle('db:tags:getForNote', (_e, noteId: string) => db.getTagsForNote(noteId))

    // ── Folders ───────────────────────────────────────────────────────
    ipcMain.handle('db:folders:list', () => db.listFolders())
    ipcMain.handle('db:folders:create', (_e, name: string, parentId?: string) => db.createFolder(name, parentId))
    ipcMain.handle('db:folders:rename', (_e, id: string, name: string) => db.renameFolder(id, name))
    ipcMain.handle('db:folders:delete', (_e, id: string) => db.deleteFolder(id))

    // ── Tasks ─────────────────────────────────────────────────────────
    ipcMain.handle('db:tasks:list', () => db.listTasks())
    ipcMain.handle('db:tasks:create', (_e, data) => db.createTask(data))
    ipcMain.handle('db:tasks:update', (_e, id: string, data) => db.updateTask(id, data))
    ipcMain.handle('db:tasks:delete', (_e, id: string) => db.deleteTask(id))

    // ── Templates ─────────────────────────────────────────────────────
    ipcMain.handle('db:templates:list', () => db.listTemplates())
    ipcMain.handle('db:templates:get', (_e, id: string) => db.getTemplate(id))
    ipcMain.handle('db:templates:create', (_e, data) => db.createTemplate(data))
    ipcMain.handle('db:templates:delete', (_e, id: string) => db.deleteTemplate(id))

    // ── Settings ──────────────────────────────────────────────────────
    ipcMain.handle('db:settings:get', (_e, key: string) => db.getSetting(key))
    ipcMain.handle('db:settings:set', (_e, key: string, value: string) => db.setSetting(key, value))
    ipcMain.handle('db:settings:getAll', () => db.getAllSettings())

    // ── Canvases ──────────────────────────────────────────────────────
    ipcMain.handle('db:canvases:list', () => db.listCanvases())
    ipcMain.handle('db:canvases:get', (_e, id: string) => db.getCanvas(id))
    ipcMain.handle('db:canvases:create', (_e, data) => db.createCanvas(data))
    ipcMain.handle('db:canvases:update', (_e, id: string, data) => db.updateCanvas(id, data))
    ipcMain.handle('db:canvases:delete', (_e, id: string) => db.deleteCanvas(id))

    // ── AI ────────────────────────────────────────────────────────────
    ipcMain.handle('ai:chat', async (_e, messages, model?) => {
        return ai.chat(messages, model)
    })

    ipcMain.on('ai:chat:stream', async (event, messages, model?) => {
        try {
            await ai.chatStream(messages, model, {
                onChunk: (chunk: string) => event.sender.send('ai:chat:stream:chunk', chunk),
                onDone: () => event.sender.send('ai:chat:stream:done'),
                onError: (error: string) => event.sender.send('ai:chat:stream:error', error),
            })
        } catch (err) {
            event.sender.send('ai:chat:stream:error', String(err))
        }
    })

    ipcMain.handle('ai:summarize', async (_e, text: string, model?: string) => {
        return ai.summarize(text, model)
    })

    ipcMain.handle('ai:generateTags', async (_e, text: string, model?: string) => {
        return ai.generateTags(text, model)
    })

    ipcMain.handle('ai:suggestLinks', async (_e, content: string, existingTitles: string[], model?: string) => {
        return ai.suggestLinks(content, existingTitles, model)
    })

    ipcMain.handle('ai:checkConnection', async () => {
        return ai.checkConnection()
    })

    ipcMain.handle('ai:listModels', async () => {
        return ai.listModels()
    })
}
