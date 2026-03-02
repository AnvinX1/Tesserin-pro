/**
 * Tesserin REST API Server
 *
 * Exposes vault capabilities over HTTP with API key authentication.
 * Any external agent, script, or integration can interact with Tesserin
 * by generating an API key from Settings → API.
 *
 * Enhanced with:
 * - Knowledge graph endpoints for AI context injection
 * - Cloud agent management and token endpoints
 * - Docker MCP integration endpoints
 * - Agent token authentication (in addition to API keys)
 *
 * All endpoints require the header: Authorization: Bearer <api-key>
 * Agent tokens use: Authorization: Agent <agent-token>
 */

import http from "http"
import { randomBytes, timingSafeEqual } from "crypto"
import * as db from "./database"
import * as ai from "./ai-service"
import * as kb from "./knowledge-base"
import { cloudAgentManager, type AgentPermission } from "./cloud-agents"

/* ================================================================== */
/*  API Key Management                                                 */
/* ================================================================== */

export interface ApiKey {
  id: string
  name: string
  key_hash: string
  prefix: string
  permissions: string // JSON array of permission strings
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  is_revoked: number
}

/**
 * Generate a cryptographically secure API key.
 * Returns the raw key (shown once) and the hash (stored in DB).
 */
export function generateApiKey(): { rawKey: string; keyHash: string; prefix: string } {
  const bytes = randomBytes(32)
  const rawKey = `tsk_${bytes.toString("hex")}`
  const prefix = rawKey.substring(0, 11) // "tsk_" + first 7 hex chars
  // Store a SHA-256 hash so raw keys are never persisted
  const { createHash } = require("crypto")
  const keyHash = createHash("sha256").update(rawKey).digest("hex")
  return { rawKey, keyHash, prefix }
}

/**
 * Verify an API key against stored hashes using constant-time comparison.
 */
function verifyApiKey(rawKey: string): ApiKey | null {
  const { createHash } = require("crypto")
  const inputHash = createHash("sha256").update(rawKey).digest("hex")
  const keys = db.listApiKeys()

  for (const key of keys) {
    if (key.is_revoked) continue
    if (key.expires_at && new Date(key.expires_at) < new Date()) continue

    try {
      const storedBuf = Buffer.from(key.key_hash, "hex")
      const inputBuf = Buffer.from(inputHash, "hex")
      if (storedBuf.length === inputBuf.length && timingSafeEqual(storedBuf, inputBuf)) {
        // Update last_used_at
        db.touchApiKey(key.id)
        return key
      }
    } catch {
      continue
    }
  }
  return null
}

/* ================================================================== */
/*  Rate Limiting — Token Bucket per client key                        */
/* ================================================================== */

interface TokenBucket {
  tokens: number
  lastRefill: number
}

const RATE_LIMIT_MAX_TOKENS = 60  // max requests
const RATE_LIMIT_REFILL_RATE = 60 // tokens per minute
const RATE_LIMIT_WINDOW_MS = 60_000

const rateBuckets = new Map<string, TokenBucket>()

/** Clean up stale buckets every 5 minutes */
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.lastRefill > RATE_LIMIT_WINDOW_MS * 5) {
      rateBuckets.delete(key)
    }
  }
}, 5 * 60_000).unref()

/**
 * Check and consume a rate limit token. Returns true if allowed, false if rate-limited.
 */
function checkRateLimit(clientKey: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now()
  let bucket = rateBuckets.get(clientKey)

  if (!bucket) {
    bucket = { tokens: RATE_LIMIT_MAX_TOKENS, lastRefill: now }
    rateBuckets.set(clientKey, bucket)
  }

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill
  const refill = Math.floor((elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_REFILL_RATE)
  if (refill > 0) {
    bucket.tokens = Math.min(RATE_LIMIT_MAX_TOKENS, bucket.tokens + refill)
    bucket.lastRefill = now
  }

  const resetMs = RATE_LIMIT_WINDOW_MS - (now - bucket.lastRefill)

  if (bucket.tokens > 0) {
    bucket.tokens--
    return { allowed: true, remaining: bucket.tokens, resetMs }
  }

  return { allowed: false, remaining: 0, resetMs }
}

/* ================================================================== */
/*  HTTP Server                                                        */
/* ================================================================== */

let server: http.Server | null = null
let currentPort = 9960

/**
 * Parse JSON body from incoming request with size limit.
 */
function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    const MAX_BODY = 5 * 1024 * 1024 // 5MB limit

    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) {
        req.destroy()
        reject(new Error("Request body too large"))
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8")
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error("Invalid JSON"))
      }
    })
    req.on("error", reject)
  })
}

/**
 * Send a JSON response.
 */
function json(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data)
  res.writeHead(status, {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  })
  res.end(body)
}

/**
 * Extract route parameters from URL patterns like /api/notes/:id
 */
function matchRoute(
  pattern: string,
  url: string
): Record<string, string> | null {
  const patternParts = pattern.split("/")
  const urlParts = url.split("/")
  if (patternParts.length !== urlParts.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = decodeURIComponent(urlParts[i])
    } else if (patternParts[i] !== urlParts[i]) {
      return null
    }
  }
  return params
}

/**
 * Parse permissions from API key.
 */
function hasPermission(apiKey: ApiKey, permission: string): boolean {
  try {
    const perms = JSON.parse(apiKey.permissions) as string[]
    return perms.includes("*") || perms.includes(permission)
  } catch {
    return false
  }
}

/* ================================================================== */
/*  Route handlers                                                     */
/* ================================================================== */

type RouteHandler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: Record<string, string>,
  apiKey: ApiKey
) => Promise<void>

interface Route {
  method: string
  pattern: string
  permission: string
  handler: RouteHandler
}

const routes: Route[] = [
  // ── Notes ──────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/notes",
    permission: "notes:read",
    handler: async (_req, res) => {
      const notes = db.listNotes()
      json(res, 200, { notes })
    },
  },
  {
    method: "GET",
    pattern: "/api/notes/:id",
    permission: "notes:read",
    handler: async (_req, res, params) => {
      const note = db.getNote(params.id)
      if (!note) return json(res, 404, { error: "Note not found" })
      json(res, 200, { note })
    },
  },
  {
    method: "POST",
    pattern: "/api/notes",
    permission: "notes:write",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.title || typeof body.title !== "string") {
        return json(res, 400, { error: "title is required" })
      }
      const note = db.createNote({
        title: body.title,
        content: body.content || "",
        folderId: body.folderId,
      })
      json(res, 201, { note })
    },
  },
  {
    method: "PUT",
    pattern: "/api/notes/:id",
    permission: "notes:write",
    handler: async (req, res, params) => {
      const existing = db.getNote(params.id)
      if (!existing) return json(res, 404, { error: "Note not found" })
      const body = await parseBody(req)
      const note = db.updateNote(params.id, {
        title: body.title,
        content: body.content,
        folderId: body.folderId,
        isPinned: body.isPinned,
        isArchived: body.isArchived,
      })
      json(res, 200, { note })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/notes/:id",
    permission: "notes:write",
    handler: async (_req, res, params) => {
      const existing = db.getNote(params.id)
      if (!existing) return json(res, 404, { error: "Note not found" })
      db.deleteNote(params.id)
      json(res, 200, { message: "Note deleted" })
    },
  },
  {
    method: "GET",
    pattern: "/api/notes/search/:query",
    permission: "notes:read",
    handler: async (_req, res, params) => {
      const results = db.searchNotes(params.query)
      json(res, 200, {
        results: results.map((n: any) => ({
          id: n.id,
          title: n.title,
          snippet: n.content?.substring(0, 200),
          updated_at: n.updated_at,
        })),
      })
    },
  },

  // ── Tags ───────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/tags",
    permission: "notes:read",
    handler: async (_req, res) => {
      json(res, 200, { tags: db.listTags() })
    },
  },
  {
    method: "POST",
    pattern: "/api/tags",
    permission: "notes:write",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.name || typeof body.name !== "string") {
        return json(res, 400, { error: "name is required" })
      }
      const tag = db.createTag(body.name, body.color)
      json(res, 201, { tag })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/tags/:id",
    permission: "notes:write",
    handler: async (_req, res, params) => {
      db.deleteTag(params.id)
      json(res, 200, { message: "Tag deleted" })
    },
  },

  // ── Folders ────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/folders",
    permission: "notes:read",
    handler: async (_req, res) => {
      json(res, 200, { folders: db.listFolders() })
    },
  },
  {
    method: "POST",
    pattern: "/api/folders",
    permission: "notes:write",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.name || typeof body.name !== "string") {
        return json(res, 400, { error: "name is required" })
      }
      const folder = db.createFolder(body.name, body.parentId)
      json(res, 201, { folder })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/folders/:id",
    permission: "notes:write",
    handler: async (_req, res, params) => {
      db.deleteFolder(params.id)
      json(res, 200, { message: "Folder deleted" })
    },
  },

  // ── Tasks ──────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/tasks",
    permission: "tasks:read",
    handler: async (_req, res) => {
      json(res, 200, { tasks: db.listTasks() })
    },
  },
  {
    method: "POST",
    pattern: "/api/tasks",
    permission: "tasks:write",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.title || typeof body.title !== "string") {
        return json(res, 400, { error: "title is required" })
      }
      const task = db.createTask({
        title: body.title,
        noteId: body.noteId,
        columnId: body.columnId,
        priority: body.priority,
        dueDate: body.dueDate,
      })
      json(res, 201, { task })
    },
  },
  {
    method: "PUT",
    pattern: "/api/tasks/:id",
    permission: "tasks:write",
    handler: async (req, res, params) => {
      const body = await parseBody(req)
      const task = db.updateTask(params.id, body)
      if (!task) return json(res, 404, { error: "Task not found" })
      json(res, 200, { task })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/tasks/:id",
    permission: "tasks:write",
    handler: async (_req, res, params) => {
      db.deleteTask(params.id)
      json(res, 200, { message: "Task deleted" })
    },
  },

  // ── Templates ──────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/templates",
    permission: "notes:read",
    handler: async (_req, res) => {
      json(res, 200, { templates: db.listTemplates() })
    },
  },

  // ── AI ─────────────────────────────────────────────────────────────
  {
    method: "POST",
    pattern: "/api/ai/chat",
    permission: "ai:use",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!Array.isArray(body.messages)) {
        return json(res, 400, { error: "messages array is required" })
      }
      const result = await ai.chat(body.messages, body.model)
      json(res, 200, { result })
    },
  },
  {
    method: "POST",
    pattern: "/api/ai/summarize",
    permission: "ai:use",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.text || typeof body.text !== "string") {
        return json(res, 400, { error: "text is required" })
      }
      const summary = await ai.summarize(body.text, body.model)
      json(res, 200, { summary })
    },
  },
  {
    method: "POST",
    pattern: "/api/ai/generate-tags",
    permission: "ai:use",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.text || typeof body.text !== "string") {
        return json(res, 400, { error: "text is required" })
      }
      const tags = await ai.generateTags(body.text, body.model)
      json(res, 200, { tags })
    },
  },
  {
    method: "POST",
    pattern: "/api/ai/suggest-links",
    permission: "ai:use",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.content || !Array.isArray(body.existingTitles)) {
        return json(res, 400, { error: "content and existingTitles are required" })
      }
      const links = await ai.suggestLinks(body.content, body.existingTitles, body.model)
      json(res, 200, { links })
    },
  },

  // ── Vault Summary ──────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/vault/summary",
    permission: "notes:read",
    handler: async (_req, res) => {
      const notes = db.listNotes()
      const tags = db.listTags()
      const tasks = db.listTasks()
      const folders = db.listFolders()
      json(res, 200, {
        noteCount: notes.length,
        tagCount: tags.length,
        taskCount: tasks.length,
        folderCount: folders.length,
        recentNotes: notes.slice(0, 10).map((n: any) => ({
          id: n.id,
          title: n.title,
          updated_at: n.updated_at,
        })),
      })
    },
  },

  // ── Knowledge Graph ────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/knowledge/graph",
    permission: "notes:read",
    handler: async (_req, res) => {
      const graph = kb.buildKnowledgeGraph()
      json(res, 200, { graph })
    },
  },
  {
    method: "GET",
    pattern: "/api/knowledge/context",
    permission: "notes:read",
    handler: async (_req, res) => {
      const context = kb.formatVaultAsContext()
      json(res, 200, { context })
    },
  },
  {
    method: "POST",
    pattern: "/api/knowledge/search",
    permission: "notes:read",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.query || typeof body.query !== "string") {
        return json(res, 400, { error: "query is required" })
      }
      const chunks = kb.searchContextChunks(body.query, body.maxChunks || 10)
      json(res, 200, { chunks })
    },
  },
  {
    method: "GET",
    pattern: "/api/knowledge/export",
    permission: "notes:read",
    handler: async (_req, res) => {
      const exported = kb.exportVault()
      json(res, 200, exported)
    },
  },
  {
    method: "GET",
    pattern: "/api/knowledge/note/:id/connections",
    permission: "notes:read",
    handler: async (_req, res, params) => {
      const note = db.getNote(params.id) as any
      if (!note) return json(res, 404, { error: "Note not found" })

      const graph = kb.buildKnowledgeGraph()
      const node = graph.nodes.find((n) => n.id === params.id)
      const tags = db.getTagsForNote(params.id) as any[]

      const relatedEdges = graph.edges.filter(
        (e) => e.source === params.id || e.target === params.id
      )

      json(res, 200, {
        note: { id: note.id, title: note.title },
        tags: tags.map((t: any) => t.name),
        outgoingLinks: node?.outgoingLinks || [],
        incomingLinks: node?.incomingLinks || [],
        linkCount: node?.linkCount || 0,
        edges: relatedEdges,
      })
    },
  },

  // ── Cloud Agents ───────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/agents",
    permission: "*",
    handler: async (_req, res) => {
      const agents = cloudAgentManager.listAgents()
      const statuses = cloudAgentManager.getStatuses()
      json(res, 200, { agents, statuses })
    },
  },
  {
    method: "POST",
    pattern: "/api/agents",
    permission: "*",
    handler: async (req, res) => {
      const body = await parseBody(req)
      if (!body.type || typeof body.type !== "string") {
        return json(res, 400, { error: "type is required (claude-code, gemini-cli, openai-codex, opencode, custom)" })
      }
      const agent = cloudAgentManager.registerAgent(body.type, body.config || {})
      json(res, 201, { agent })
    },
  },
  {
    method: "POST",
    pattern: "/api/agents/:id/connect",
    permission: "*",
    handler: async (_req, res, params) => {
      try {
        await cloudAgentManager.connectAgent(params.id)
        json(res, 200, { message: "Agent connected" })
      } catch (err) {
        json(res, 500, { error: `Failed to connect: ${err instanceof Error ? err.message : String(err)}` })
      }
    },
  },
  {
    method: "POST",
    pattern: "/api/agents/:id/disconnect",
    permission: "*",
    handler: async (_req, res, params) => {
      await cloudAgentManager.disconnectAgent(params.id)
      json(res, 200, { message: "Agent disconnected" })
    },
  },
  {
    method: "DELETE",
    pattern: "/api/agents/:id",
    permission: "*",
    handler: async (_req, res, params) => {
      await cloudAgentManager.disconnectAgent(params.id)
      cloudAgentManager.removeAgent(params.id)
      json(res, 200, { message: "Agent removed" })
    },
  },
  {
    method: "POST",
    pattern: "/api/agents/:id/tokens",
    permission: "*",
    handler: async (req, res, params) => {
      const body = await parseBody(req)
      const result = cloudAgentManager.createAgentToken(
        params.id,
        body.name || "API Token",
        body.permissions,
        body.expiresAt,
      )
      if (!result) return json(res, 404, { error: "Agent not found" })
      json(res, 201, { token: result.token, rawToken: result.rawToken })
    },
  },
  {
    method: "GET",
    pattern: "/api/agents/:id/tokens",
    permission: "*",
    handler: async (_req, res, params) => {
      const tokens = cloudAgentManager.getAgentTokens(params.id)
      json(res, 200, { tokens })
    },
  },
  {
    method: "GET",
    pattern: "/api/agents/:id/tools",
    permission: "*",
    handler: async (_req, res, params) => {
      const tools = cloudAgentManager.getAgentTools(params.id)
      json(res, 200, { tools })
    },
  },

  // ── Docker MCP ─────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/docker/mcp/status",
    permission: "*",
    handler: async (_req, res) => {
      // Report Docker MCP integration status
      const agents = cloudAgentManager.listAgents()
      const dockerAgents = agents.filter((a) => a.transport === "docker-mcp")
      const statuses = cloudAgentManager.getStatuses()

      json(res, 200, {
        dockerMcpEnabled: dockerAgents.length > 0,
        dockerAgents: dockerAgents.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          dockerImage: a.dockerImage,
          dockerProfile: a.dockerProfile,
          status: statuses.find((s) => s.agentId === a.id)?.status || "disconnected",
        })),
      })
    },
  },

  // ── Health ─────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: "/api/health",
    permission: "*",
    handler: async (_req, res) => {
      json(res, 200, {
        status: "ok",
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        capabilities: [
          "notes", "tags", "folders", "tasks", "canvases",
          "ai", "knowledge-graph", "cloud-agents", "docker-mcp",
          "vault-export", "rag-search",
        ],
        mcp: {
          server: "tesserin",
          transport: ["stdio", "sse"],
          dockerMcp: true,
        },
      })
    },
  },
]

/* ================================================================== */
/*  Server lifecycle                                                   */
/* ================================================================== */

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  // CORS headers for local development
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    res.writeHead(204)
    res.end()
    return
  }

  // Parse URL (strip query string)
  const urlPath = (req.url || "/").split("?")[0]
  const method = (req.method || "GET").toUpperCase()

  // Authenticate — support both API keys (Bearer) and Agent tokens (Agent)
  const authHeader = req.headers.authorization || ""
  const isAgentToken = authHeader.startsWith("Agent ")
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : isAgentToken
      ? authHeader.slice(6).trim()
      : ""

  if (!token) {
    json(res, 401, { error: "Missing authentication. Use header: Authorization: Bearer <api-key> or Authorization: Agent <agent-token>" })
    return
  }

  // Try agent token first, then API key
  let apiKey: ApiKey | null = null
  let agentPermissions: string[] | null = null

  if (isAgentToken) {
    const verified = cloudAgentManager.verifyToken(token)
    if (!verified) {
      json(res, 401, { error: "Invalid or expired agent token" })
      return
    }
    agentPermissions = verified.token.permissions
  } else {
    apiKey = verifyApiKey(token)
    if (!apiKey) {
      json(res, 401, { error: "Invalid or expired API key" })
      return
    }
  }

  // Rate limiting — use key prefix as client identifier
  const clientId = isAgentToken ? `agent:${token.slice(0, 11)}` : `key:${apiKey?.prefix || token.slice(0, 11)}`
  const rateCheck = checkRateLimit(clientId)
  res.setHeader("X-RateLimit-Limit", String(RATE_LIMIT_MAX_TOKENS))
  res.setHeader("X-RateLimit-Remaining", String(rateCheck.remaining))
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(rateCheck.resetMs / 1000)))

  if (!rateCheck.allowed) {
    res.setHeader("Retry-After", String(Math.ceil(rateCheck.resetMs / 1000)))
    json(res, 429, { error: "Rate limit exceeded. Try again later.", retryAfter: Math.ceil(rateCheck.resetMs / 1000) })
    return
  }

  // Route matching
  for (const route of routes) {
    if (route.method !== method) continue
    const params = matchRoute(route.pattern, urlPath)
    if (!params) continue

    // Check permissions (API key or agent token)
    if (route.permission !== "*") {
      if (apiKey && !hasPermission(apiKey, route.permission)) {
        json(res, 403, { error: `Missing permission: ${route.permission}` })
        return
      }
      if (agentPermissions && !agentPermissions.includes(route.permission) && !agentPermissions.includes("vault:full")) {
        json(res, 403, { error: `Agent missing permission: ${route.permission}` })
        return
      }
    }

    // Build a synthetic apiKey for compatibility with route handlers
    const effectiveApiKey = apiKey || {
      id: "agent",
      name: "Agent Token",
      key_hash: "",
      prefix: "tat_",
      permissions: JSON.stringify(agentPermissions || ["*"]),
      created_at: new Date().toISOString(),
      last_used_at: null,
      expires_at: null,
      is_revoked: 0,
    } as ApiKey

    route
      .handler(req, res, params, effectiveApiKey)
      .catch((err) => {
        console.error("[API] Handler error:", err)
        json(res, 500, { error: "Internal server error" })
      })
    return
  }

  json(res, 404, { error: "Not found" })
}

/**
 * Start the API server on the specified port.
 * Only binds to 127.0.0.1 for security (local access only).
 */
export function startApiServer(port: number = 9960): Promise<number> {
  return new Promise((resolve, reject) => {
    if (server) {
      // Already running, stop first
      stopApiServer()
    }

    currentPort = port
    server = http.createServer(handleRequest)

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[API] Port ${port} in use, trying ${port + 1}`)
        server = null
        startApiServer(port + 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })

    server.listen(port, "127.0.0.1", () => {
      currentPort = port
      console.log(`[API] Tesserin REST API server listening on http://127.0.0.1:${port}`)
      resolve(port)
    })
  })
}

/**
 * Stop the API server.
 */
export function stopApiServer(): void {
  if (server) {
    server.close()
    server = null
    console.log("[API] Server stopped")
  }
}

/**
 * Get the current server status.
 */
export function getApiServerStatus(): { running: boolean; port: number } {
  return {
    running: server !== null && server.listening,
    port: currentPort,
  }
}
