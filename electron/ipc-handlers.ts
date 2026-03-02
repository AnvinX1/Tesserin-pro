import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as db from './database'
import * as ai from './ai-service'
import * as kb from './knowledge-base'
import { mcpClientManager, type McpServerConfig } from './mcp-client'
import { cloudAgentManager, type CloudAgentType, type AgentPermission } from './cloud-agents'
import { generateApiKey, startApiServer, stopApiServer, getApiServerStatus } from './api-server'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execFile } from 'child_process'
import { randomUUID } from 'crypto'

/* ================================================================== */
/*  Input validation helpers                                           */
/* ================================================================== */

/** Validates a string parameter. Returns the trimmed string or throws. */
function requireString(value: unknown, name: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`Invalid parameter "${name}": expected non-empty string`)
    }
    return value.trim()
}

/** Validates an optional string parameter. */
function optionalString(value: unknown, name: string): string | undefined {
    if (value === undefined || value === null) return undefined
    return requireString(value, name)
}

/**
 * Validates a filesystem path:
 * 1. Must be a non-empty string
 * 2. Must be absolute
 * 3. Must not contain null bytes
 * 4. Resolved path must not escape via .. traversal to unexpected roots
 */
function validatePath(value: unknown, name: string): string {
    const raw = requireString(value, name)
    if (raw.includes('\0')) {
        throw new Error(`Invalid path "${name}": contains null bytes`)
    }
    const resolved = path.resolve(raw)
    if (!path.isAbsolute(resolved)) {
        throw new Error(`Invalid path "${name}": must be absolute`)
    }
    return resolved
}

/** Validates that a value looks like a UUID / nanoid (alphanumeric + dashes). */
const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/
function validateId(value: unknown, name: string): string {
    const str = requireString(value, name)
    if (!ID_RE.test(str)) {
        throw new Error(`Invalid ID "${name}": must be 1-64 alphanumeric/dash/underscore chars`)
    }
    return str
}

/** Validates a positive integer. */
function requirePositiveInt(value: unknown, name: string): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid parameter "${name}": expected positive integer`)
    }
    return value
}

/* ================================================================== */
/*  Shell command safety                                               */
/* ================================================================== */

/** Blocked shell command patterns — prevent destructive/dangerous operations */
const DANGEROUS_COMMAND_PATTERNS = [
    /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?\//,       // rm -rf / or rm /
    /\brm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?~\//,       // rm -rf ~/
    /\bmkfs\b/,                                      // format disk
    /\bdd\s+if=/,                                     // disk overwrite
    /:(\s*)\(\s*\)\s*\{/,                            // fork bomb
    /\bshutdown\b/,                                   // shutdown system
    /\breboot\b/,                                     // reboot system
    /\bcurl\b.*\|\s*(sh|bash)\b/,                    // pipe curl to shell
    /\bwget\b.*\|\s*(sh|bash)\b/,                    // pipe wget to shell
    /\bchmod\s+777\s+\//,                            // chmod 777 on root
    /\bchown\s+.*\//,                                 // chown on system dirs
    /\/etc\/shadow/,                                   // access shadow file
    /\/etc\/passwd/,                                   // access passwd file
    /\beval\b/,                                        // eval execution
    /\bexec\b.*>/,                                     // exec redirect
    /\b>\s*\/dev\/sda/,                               // overwrite disk
    /\bnc\s+-[a-z]*l/i,                               // netcat listener
    /\bpython[23]?\s+-m\s+http/,                      // python http server
]

function validateShellCommand(command: string): void {
    for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
        if (pattern.test(command)) {
            throw new Error(`Blocked: command matches dangerous pattern`)
        }
    }
    if (command.length > 2000) {
        throw new Error('Command too long (max 2000 characters)')
    }
}

/* ================================================================== */
/*  Safe environment variable filtering                                */
/* ================================================================== */

/** Only pass safe env vars to subprocesses (terminal, shell, MCP) */
const SAFE_ENV_KEYS = [
    'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL', 'LC_CTYPE',
    'TERM', 'TERM_PROGRAM', 'COLORTERM', 'EDITOR', 'VISUAL',
    'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_RUNTIME_DIR',
    'DISPLAY', 'WAYLAND_DISPLAY', 'DBUS_SESSION_BUS_ADDRESS',
    'TMPDIR', 'TMP', 'TEMP',
    'NODE_ENV', 'HOSTNAME',
]

function safeEnv(): Record<string, string> {
    const env: Record<string, string> = {}
    for (const key of SAFE_ENV_KEYS) {
        if (process.env[key]) env[key] = process.env[key]!
    }
    return env
}

/**
 * Register all IPC handlers for the Tesserin app.
 * Called once from main.ts during app initialization.
 */
export function registerIpcHandlers(): void {
    // ── Notes ─────────────────────────────────────────────────────────
    ipcMain.handle('db:notes:list', () => db.listNotes())
    ipcMain.handle('db:notes:get', (_e, id) => db.getNote(validateId(id, 'id')))
    ipcMain.handle('db:notes:create', (_e, data) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid note data')
        return db.createNote(data)
    })
    ipcMain.handle('db:notes:update', (_e, id, data) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid note data')
        return db.updateNote(validateId(id, 'id'), data)
    })
    ipcMain.handle('db:notes:delete', (_e, id) => db.deleteNote(validateId(id, 'id')))
    ipcMain.handle('db:notes:search', (_e, query) => db.searchNotes(requireString(query, 'query')))
    ipcMain.handle('db:notes:getByTitle', (_e, title) => db.getNoteByTitle(requireString(title, 'title')))

    // ── Tags ──────────────────────────────────────────────────────────
    ipcMain.handle('db:tags:list', () => db.listTags())
    ipcMain.handle('db:tags:create', (_e, name, color?) => db.createTag(requireString(name, 'name'), optionalString(color, 'color')))
    ipcMain.handle('db:tags:delete', (_e, id) => db.deleteTag(validateId(id, 'id')))
    ipcMain.handle('db:tags:addToNote', (_e, noteId, tagId) => db.addTagToNote(validateId(noteId, 'noteId'), validateId(tagId, 'tagId')))
    ipcMain.handle('db:tags:removeFromNote', (_e, noteId, tagId) => db.removeTagFromNote(validateId(noteId, 'noteId'), validateId(tagId, 'tagId')))
    ipcMain.handle('db:tags:getForNote', (_e, noteId) => db.getTagsForNote(validateId(noteId, 'noteId')))

    // ── Folders ───────────────────────────────────────────────────────
    ipcMain.handle('db:folders:list', () => db.listFolders())
    ipcMain.handle('db:folders:create', (_e, name, parentId?) => db.createFolder(requireString(name, 'name'), optionalString(parentId, 'parentId')))
    ipcMain.handle('db:folders:rename', (_e, id, name) => db.renameFolder(validateId(id, 'id'), requireString(name, 'name')))
    ipcMain.handle('db:folders:delete', (_e, id) => db.deleteFolder(validateId(id, 'id')))

    // ── Tasks ─────────────────────────────────────────────────────────
    ipcMain.handle('db:tasks:list', () => db.listTasks())
    ipcMain.handle('db:tasks:create', (_e, data) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid task data')
        return db.createTask(data)
    })
    ipcMain.handle('db:tasks:update', (_e, id, data) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid task data')
        return db.updateTask(validateId(id, 'id'), data)
    })
    ipcMain.handle('db:tasks:delete', (_e, id) => db.deleteTask(validateId(id, 'id')))

    // ── Templates ─────────────────────────────────────────────────────
    ipcMain.handle('db:templates:list', () => db.listTemplates())
    ipcMain.handle('db:templates:get', (_e, id) => db.getTemplate(validateId(id, 'id')))
    ipcMain.handle('db:templates:create', (_e, data) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid template data')
        return db.createTemplate(data)
    })
    ipcMain.handle('db:templates:delete', (_e, id) => db.deleteTemplate(validateId(id, 'id')))

    // ── Settings ──────────────────────────────────────────────────────
    ipcMain.handle('db:settings:get', (_e, key) => db.getSetting(requireString(key, 'key')))
    ipcMain.handle('db:settings:set', (_e, key, value) => db.setSetting(requireString(key, 'key'), requireString(value, 'value')))
    ipcMain.handle('db:settings:getAll', () => db.getAllSettings())

    // ── Canvases ──────────────────────────────────────────────────────
    ipcMain.handle('db:canvases:list', () => db.listCanvases())
    ipcMain.handle('db:canvases:get', (_e, id) => db.getCanvas(validateId(id, 'id')))
    ipcMain.handle('db:canvases:create', (_e, data) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid canvas data')
        return db.createCanvas(data)
    })
    ipcMain.handle('db:canvases:update', (_e, id, data) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid canvas data')
        return db.updateCanvas(validateId(id, 'id'), data)
    })
    ipcMain.handle('db:canvases:delete', (_e, id) => db.deleteCanvas(validateId(id, 'id')))

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

    // ── OpenRouter (cloud AI) ─────────────────────────────────────
    ipcMain.on('ai:openrouter:stream', async (event, messages) => {
        try {
            await ai.chatStreamOpenRouter(messages, {
                onChunk: (chunk: string) => event.sender.send('ai:openrouter:stream:chunk', chunk),
                onDone: () => event.sender.send('ai:openrouter:stream:done'),
                onError: (error: string) => event.sender.send('ai:openrouter:stream:error', error),
            })
        } catch (err) {
            event.sender.send('ai:openrouter:stream:error', String(err))
        }
    })

    ipcMain.handle('ai:openrouter:listModels', async (_e, apiKey?: string) => {
        return ai.listOpenRouterModels(apiKey)
    })

    // ── MCP (Model Context Protocol) ──────────────────────────────
    ipcMain.handle('mcp:connect', async (_e, config: McpServerConfig) => {
        await mcpClientManager.connect(config)
        const tools = mcpClientManager.getServerTools(config.id)
        const statuses = mcpClientManager.getStatuses()
        const status = statuses.find(s => s.serverId === config.id)
        return {
            status: status || { serverId: config.id, serverName: config.name, status: 'error', toolCount: 0 },
            tools,
        }
    })

    ipcMain.handle('mcp:disconnect', async (_e, serverId: string) => {
        await mcpClientManager.disconnect(serverId)
    })

    ipcMain.handle('mcp:callTool', async (_e, serverId: string, toolName: string, args: Record<string, unknown>) => {
        return mcpClientManager.callTool(serverId, toolName, args)
    })

    ipcMain.handle('mcp:getStatuses', async () => {
        return {
            statuses: mcpClientManager.getStatuses(),
            tools: mcpClientManager.getAllTools(),
        }
    })

    ipcMain.handle('mcp:getTools', async () => {
        return mcpClientManager.getAllTools()
    })

    ipcMain.handle('mcp:getServerTools', async (_e, serverId: string) => {
        return mcpClientManager.getServerTools(serverId)
    })

    // ── Filesystem ────────────────────────────────────────────────────
    ipcMain.handle('fs:readDir', async (_e, dirPath) => {
        const safePath = validatePath(dirPath, 'dirPath')
        const entries = await fs.promises.readdir(safePath, { withFileTypes: true })
        return entries
            .filter(e => !e.name.startsWith('.'))
            .map(e => ({
                name: e.name,
                path: path.join(safePath, e.name),
                isDirectory: e.isDirectory(),
            }))
            .sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
                return a.name.localeCompare(b.name)
            })
    })

    ipcMain.handle('fs:readFile', async (_e, filePath) => {
        return fs.promises.readFile(validatePath(filePath, 'filePath'), 'utf-8')
    })

    ipcMain.handle('fs:writeFile', async (_e, filePath, content) => {
        if (typeof content !== 'string') throw new Error('Invalid content: expected string')
        await fs.promises.writeFile(validatePath(filePath, 'filePath'), content, 'utf-8')
    })

    ipcMain.handle('fs:stat', async (_e, filePath) => {
        const stat = await fs.promises.stat(validatePath(filePath, 'filePath'))
        return {
            size: stat.size,
            isDirectory: stat.isDirectory(),
            isFile: stat.isFile(),
            modified: stat.mtime.toISOString(),
        }
    })

    // ── Shell Exec (non-interactive, for AI agent) ────────────────────
    ipcMain.handle('shell:exec', (_e, command, cwd?) => {
        const safeCommand = requireString(command, 'command')
        validateShellCommand(safeCommand)
        const safeCwd = cwd ? validatePath(cwd, 'cwd') : os.homedir()
        return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
            const shell = os.platform() === 'win32' ? 'powershell.exe' : '/bin/bash'
            const args = os.platform() === 'win32' ? ['-Command', safeCommand] : ['-c', safeCommand]
            const child = execFile(shell, args, {
                cwd: safeCwd,
                timeout: 30000,
                maxBuffer: 1024 * 1024,
                env: safeEnv(),
            }, (error, stdout, stderr) => {
                resolve({
                    stdout: stdout || '',
                    stderr: stderr || '',
                    exitCode: error ? (error as any).code || 1 : 0,
                })
            })
        })
    })

    // ── Filesystem: mkdir + delete ────────────────────────────────────
    ipcMain.handle('fs:mkdir', async (_e, dirPath) => {
        await fs.promises.mkdir(validatePath(dirPath, 'dirPath'), { recursive: true })
    })

    ipcMain.handle('fs:delete', async (_e, filePath) => {
        const safePath = validatePath(filePath, 'filePath')
        // Prevent deleting critical system paths — use strict blocklist
        const dangerous = [
            '/', '/usr', '/bin', '/sbin', '/etc', '/var', '/tmp', '/opt',
            '/home', '/root', '/boot', '/dev', '/proc', '/sys', '/lib', '/lib64',
            os.homedir(),
        ]
        const resolvedLower = safePath.toLowerCase()
        if (dangerous.some(d => resolvedLower === d || resolvedLower === d + '/')) {
            throw new Error('Refusing to delete critical system path')
        }
        // Must not be inside a system directory (only allow user-space paths)
        const allowedRoots = [os.homedir()]
        if (!allowedRoots.some(root => safePath.startsWith(root + path.sep) && safePath !== root)) {
            throw new Error('fs:delete only allowed within user home directory')
        }
        const stat = await fs.promises.stat(safePath)
        if (stat.isDirectory()) {
            await fs.promises.rm(safePath, { recursive: true })
        } else {
            await fs.promises.unlink(safePath)
        }
    })

    // ── Dialog ────────────────────────────────────────────────────────
    ipcMain.handle('dialog:openFolder', async () => {
        const win = BrowserWindow.getFocusedWindow()
        if (!win) return null
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory'],
        })
        return result.canceled ? null : result.filePaths[0]
    })

    // ── API Keys ─────────────────────────────────────────────────────
    ipcMain.handle('api:keys:list', () => {
        const keys = db.listApiKeys()
        // Never send key_hash to renderer
        return keys.map(k => ({
            id: k.id,
            name: k.name,
            prefix: k.prefix,
            permissions: k.permissions,
            created_at: k.created_at,
            last_used_at: k.last_used_at,
            expires_at: k.expires_at,
            is_revoked: k.is_revoked,
        }))
    })

    ipcMain.handle('api:keys:create', (_e, data: { name: string; permissions?: string[]; expiresAt?: string }) => {
        if (!data || typeof data !== 'object') throw new Error('Invalid API key data')
        const name = requireString(data.name, 'name')
        const { rawKey, keyHash, prefix } = generateApiKey()
        const id = randomUUID()
        const permissions = Array.isArray(data.permissions) ? data.permissions : ['*']
        db.createApiKey({ id, name, keyHash, prefix, permissions, expiresAt: data.expiresAt })
        // Return raw key ONCE — it cannot be recovered after this
        return { id, name, prefix, rawKey, permissions }
    })

    ipcMain.handle('api:keys:revoke', (_e, id: string) => {
        db.revokeApiKey(validateId(id, 'id'))
    })

    ipcMain.handle('api:keys:delete', (_e, id: string) => {
        db.deleteApiKey(validateId(id, 'id'))
    })

    // ── API Server ───────────────────────────────────────────────────
    ipcMain.handle('api:server:start', async (_e, port?: number) => {
        const safePort = typeof port === 'number' && port > 0 && port < 65536 ? port : 9960
        const actualPort = await startApiServer(safePort)
        return { running: true, port: actualPort }
    })

    ipcMain.handle('api:server:stop', () => {
        stopApiServer()
        return { running: false }
    })

    ipcMain.handle('api:server:status', () => {
        return getApiServerStatus()
    })

    // ── PPT Generation ───────────────────────────────────────────────
    ipcMain.handle('ppt:generate', async (_e, specOrMarkdown: unknown, outputPath: string) => {
        const safePath = validatePath(outputPath, 'outputPath')
        if (!safePath.endsWith('.pptx')) {
            throw new Error('Output path must end in .pptx')
        }
        const pptLib = await import('./ppt-generator')

        // Accept either a JSON DeckSpec object or a markdown string
        if (typeof specOrMarkdown === 'string') {
            return pptLib.generateFromMarkdownAndSave(specOrMarkdown, safePath)
        }
        if (specOrMarkdown && typeof specOrMarkdown === 'object') {
            return pptLib.generateAndSavePptx(specOrMarkdown as any, safePath)
        }
        throw new Error('Invalid spec: expected a DeckSpec object or markdown string')
    })

    // ── Cloud Agents ─────────────────────────────────────────────────
    ipcMain.handle('agents:list', () => {
        return cloudAgentManager.listAgents()
    })

    ipcMain.handle('agents:statuses', () => {
        return cloudAgentManager.getStatuses()
    })

    ipcMain.handle('agents:register', (_e, type: string, config?: Record<string, unknown>) => {
        const validTypes: CloudAgentType[] = ['claude-code', 'gemini-cli', 'openai-codex', 'opencode', 'custom']
        if (!validTypes.includes(type as CloudAgentType)) {
            throw new Error(`Invalid agent type: ${type}. Must be one of: ${validTypes.join(', ')}`)
        }
        return cloudAgentManager.registerAgent(type as CloudAgentType, config as any)
    })

    ipcMain.handle('agents:update', (_e, id: string, updates: Record<string, unknown>) => {
        if (typeof id !== 'string') throw new Error('Agent ID must be a string')
        return cloudAgentManager.updateAgent(id, updates as any)
    })

    ipcMain.handle('agents:remove', async (_e, id: string) => {
        if (typeof id !== 'string') throw new Error('Agent ID must be a string')
        await cloudAgentManager.disconnectAgent(id)
        return cloudAgentManager.removeAgent(id)
    })

    ipcMain.handle('agents:connect', async (_e, id: string) => {
        if (typeof id !== 'string') throw new Error('Agent ID must be a string')
        await cloudAgentManager.connectAgent(id)
    })

    ipcMain.handle('agents:disconnect', async (_e, id: string) => {
        if (typeof id !== 'string') throw new Error('Agent ID must be a string')
        await cloudAgentManager.disconnectAgent(id)
    })

    ipcMain.handle('agents:callTool', async (_e, agentId: string, toolName: string, args: Record<string, unknown>) => {
        if (typeof agentId !== 'string') throw new Error('Agent ID must be a string')
        if (typeof toolName !== 'string') throw new Error('Tool name must be a string')
        return cloudAgentManager.callAgentTool(agentId, toolName, args || {})
    })

    ipcMain.handle('agents:getTools', (_e, agentId: string) => {
        if (typeof agentId !== 'string') throw new Error('Agent ID must be a string')
        return cloudAgentManager.getAgentTools(agentId)
    })

    ipcMain.handle('agents:createToken', (_e, agentId: string, name: string, permissions?: string[], expiresAt?: string) => {
        if (typeof agentId !== 'string') throw new Error('Agent ID must be a string')
        return cloudAgentManager.createAgentToken(agentId, name || 'Token', permissions as AgentPermission[], expiresAt)
    })

    ipcMain.handle('agents:getTokens', (_e, agentId: string) => {
        if (typeof agentId !== 'string') throw new Error('Agent ID must be a string')
        return cloudAgentManager.getAgentTokens(agentId)
    })

    ipcMain.handle('agents:revokeToken', (_e, agentId: string, tokenId: string) => {
        if (typeof agentId !== 'string') throw new Error('Agent ID must be a string')
        if (typeof tokenId !== 'string') throw new Error('Token ID must be a string')
        return cloudAgentManager.revokeToken(agentId, tokenId)
    })

    // ── Knowledge Base ───────────────────────────────────────────────
    ipcMain.handle('kb:graph', () => {
        return kb.buildKnowledgeGraph()
    })

    ipcMain.handle('kb:export', () => {
        return kb.exportVault()
    })

    ipcMain.handle('kb:search', (_e, query: string, maxChunks?: number) => {
        if (typeof query !== 'string') throw new Error('Query must be a string')
        return kb.searchContextChunks(query, maxChunks || 10)
    })

    ipcMain.handle('kb:context', (_e, maxNotes?: number) => {
        return kb.formatVaultAsContext(maxNotes || 50)
    })

    ipcMain.handle('kb:noteConnections', (_e, noteId: string) => {
        if (typeof noteId !== 'string') throw new Error('Note ID must be a string')
        const note = db.getNote(noteId) as any
        if (!note) throw new Error(`Note not found: ${noteId}`)

        const graph = kb.buildKnowledgeGraph()
        const node = graph.nodes.find(n => n.id === noteId)
        const tags = db.getTagsForNote(noteId) as any[]

        const relatedEdges = graph.edges.filter(
            e => e.source === noteId || e.target === noteId
        )

        return {
            note: { id: note.id, title: note.title },
            tags: tags.map((t: any) => t.name),
            outgoingLinks: node?.outgoingLinks || [],
            incomingLinks: node?.incomingLinks || [],
            linkCount: node?.linkCount || 0,
            edges: relatedEdges
        }
    })
}
