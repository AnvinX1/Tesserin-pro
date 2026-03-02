/**
 * Tesserin Cloud Agent Connector
 *
 * Manages connections to external cloud AI agents (Claude Code, Gemini CLI,
 * OpenAI Codex, OpenCode, etc.) via Docker MCP or direct MCP transports.
 *
 * Architecture:
 * - Each cloud agent is registered with a transport config
 * - Agents can use Tesserin's knowledge base (notes + graphs) as context
 * - Supports Docker MCP Toolkit integration for containerized agent servers
 * - Token-based authentication for secure agent ↔ Tesserin communication
 */

import { randomBytes, createHash } from "crypto"
import { randomUUID } from "crypto"
import * as db from "./database"
import { mcpClientManager, type McpServerConfig } from "./mcp-client"

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export type CloudAgentType =
  | "claude-code"
  | "gemini-cli"
  | "openai-codex"
  | "opencode"
  | "custom"

export type AgentTransport =
  | "docker-mcp"     // Via Docker MCP Toolkit
  | "stdio"          // Direct stdio MCP
  | "sse"            // SSE HTTP transport
  | "streamable-http" // Streamable HTTP transport

export interface CloudAgentConfig {
  /** Unique ID */
  id: string
  /** Display name */
  name: string
  /** Agent type for preset configurations */
  type: CloudAgentType
  /** Transport mechanism */
  transport: AgentTransport
  /** Whether this agent is currently enabled */
  enabled: boolean
  /** Docker image reference (for docker-mcp transport) */
  dockerImage?: string
  /** Docker MCP profile name */
  dockerProfile?: string
  /** Command to run (for stdio transport) */
  command?: string
  /** Args for the command */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** SSE/HTTP endpoint URL */
  url?: string
  /** Whether this agent has access to the knowledge base */
  knowledgeBaseAccess: boolean
  /** Specific permissions granted to this agent */
  permissions: AgentPermission[]
  /** Agent-specific API key/token for authentication */
  apiToken?: string
  /** Created timestamp */
  createdAt: string
  /** Last connected timestamp */
  lastConnectedAt?: string
}

export type AgentPermission =
  | "notes:read"
  | "notes:write"
  | "notes:delete"
  | "tasks:read"
  | "tasks:write"
  | "tags:read"
  | "tags:write"
  | "canvases:read"
  | "canvases:write"
  | "ai:use"
  | "graph:read"
  | "vault:full"

export interface AgentConnectionStatus {
  agentId: string
  agentName: string
  agentType: CloudAgentType
  status: "connected" | "disconnected" | "connecting" | "error"
  error?: string
  toolCount: number
  lastActivity?: string
}

export interface AgentToken {
  id: string
  agentId: string
  token: string        // Shown once, then only hash stored
  tokenHash: string
  name: string
  permissions: AgentPermission[]
  createdAt: string
  expiresAt?: string
  isRevoked: boolean
}

/* ================================================================== */
/*  Pre-configured agent templates                                     */
/* ================================================================== */

const AGENT_TEMPLATES: Record<CloudAgentType, Partial<CloudAgentConfig>> = {
  "claude-code": {
    name: "Claude Code",
    transport: "docker-mcp",
    dockerImage: "mcp/anthropic-claude",
    permissions: ["notes:read", "notes:write", "tasks:read", "tasks:write", "graph:read", "ai:use"],
    knowledgeBaseAccess: true,
  },
  "gemini-cli": {
    name: "Gemini CLI",
    transport: "docker-mcp",
    dockerImage: "mcp/google-gemini",
    permissions: ["notes:read", "notes:write", "graph:read", "ai:use"],
    knowledgeBaseAccess: true,
  },
  "openai-codex": {
    name: "OpenAI Codex",
    transport: "docker-mcp",
    dockerImage: "mcp/openai-codex",
    permissions: ["notes:read", "notes:write", "tasks:read", "graph:read", "ai:use"],
    knowledgeBaseAccess: true,
  },
  "opencode": {
    name: "OpenCode",
    transport: "stdio",
    command: "opencode",
    permissions: ["notes:read", "notes:write", "graph:read"],
    knowledgeBaseAccess: true,
  },
  custom: {
    name: "Custom Agent",
    transport: "stdio",
    permissions: ["notes:read"],
    knowledgeBaseAccess: false,
  },
}

/* ================================================================== */
/*  Token management                                                   */
/* ================================================================== */

/**
 * Generate a secure agent token for authentication.
 * Returns the raw token (shown once) and the hash (stored).
 */
export function generateAgentToken(
  agentId: string,
  name: string,
  permissions: AgentPermission[],
  expiresAt?: string,
): { token: AgentToken; rawToken: string } {
  const bytes = randomBytes(32)
  const rawToken = `tat_${bytes.toString("hex")}` // "tesserin agent token"
  const tokenHash = createHash("sha256").update(rawToken).digest("hex")
  const id = randomUUID()

  const token: AgentToken = {
    id,
    agentId,
    token: rawToken.substring(0, 12) + "...", // Prefix only for display
    tokenHash,
    name,
    permissions,
    createdAt: new Date().toISOString(),
    expiresAt,
    isRevoked: false,
  }

  return { token, rawToken }
}

/**
 * Verify an agent token and return its permissions.
 */
export function verifyAgentToken(
  rawToken: string,
  storedTokens: AgentToken[],
): AgentToken | null {
  const inputHash = createHash("sha256").update(rawToken).digest("hex")

  for (const token of storedTokens) {
    if (token.isRevoked) continue
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) continue

    try {
      const storedBuf = Buffer.from(token.tokenHash, "hex")
      const inputBuf = Buffer.from(inputHash, "hex")
      if (
        storedBuf.length === inputBuf.length &&
        require("crypto").timingSafeEqual(storedBuf, inputBuf)
      ) {
        return token
      }
    } catch {
      continue
    }
  }
  return null
}

/* ================================================================== */
/*  Cloud Agent Manager                                                */
/* ================================================================== */

class CloudAgentManager {
  private agents: Map<string, CloudAgentConfig> = new Map()
  private tokens: Map<string, AgentToken[]> = new Map() // agentId -> tokens
  private statusListeners: Set<(statuses: AgentConnectionStatus[]) => void> =
    new Set()

  /**
   * Register a new cloud agent from a template type.
   */
  registerAgent(
    type: CloudAgentType,
    overrides?: Partial<CloudAgentConfig>,
  ): CloudAgentConfig {
    const template = AGENT_TEMPLATES[type]
    const id = randomUUID()

    const config: CloudAgentConfig = {
      name: template.name || "Agent",
      type,
      transport: template.transport || "stdio",
      enabled: false,
      dockerImage: template.dockerImage,
      dockerProfile: overrides?.dockerProfile,
      command: template.command,
      args: template.args,
      env: {},
      url: template.url,
      knowledgeBaseAccess: template.knowledgeBaseAccess ?? false,
      permissions: (template.permissions as AgentPermission[]) || [],
      createdAt: new Date().toISOString(),
      ...overrides,
      id, // Ensure ID and createdAt aren't overridden
    }

    this.agents.set(id, config)
    this.tokens.set(id, [])
    this.persistAgents()
    return config
  }

  /**
   * Register a fully custom agent.
   */
  registerCustomAgent(config: Omit<CloudAgentConfig, "id" | "createdAt">): CloudAgentConfig {
    const id = randomUUID()
    const fullConfig: CloudAgentConfig = {
      ...config,
      id,
      createdAt: new Date().toISOString(),
    }
    this.agents.set(id, fullConfig)
    this.tokens.set(id, [])
    this.persistAgents()
    return fullConfig
  }

  /**
   * Update an agent configuration.
   */
  updateAgent(id: string, updates: Partial<CloudAgentConfig>): CloudAgentConfig | null {
    const existing = this.agents.get(id)
    if (!existing) return null

    const updated = { ...existing, ...updates, id } // Preserve ID
    this.agents.set(id, updated)
    this.persistAgents()
    return updated
  }

  /**
   * Remove an agent and all its tokens.
   */
  removeAgent(id: string): boolean {
    const existed = this.agents.delete(id)
    this.tokens.delete(id)
    if (existed) this.persistAgents()
    return existed
  }

  /**
   * Connect an agent via MCP.
   * For docker-mcp agents, maps to docker MCP server connection.
   * For stdio/sse agents, connects directly.
   */
  async connectAgent(id: string): Promise<void> {
    const config = this.agents.get(id)
    if (!config) throw new Error(`Agent not found: ${id}`)

    // Build MCP server config from agent config
    const mcpConfig: McpServerConfig = {
      id: `agent:${config.id}`,
      name: `[Agent] ${config.name}`,
      transport: config.transport === "docker-mcp" ? "stdio" : (config.transport === "sse" || config.transport === "streamable-http" ? "sse" : "stdio"),
      enabled: true,
    }

    if (config.transport === "docker-mcp") {
      // Docker MCP: run through docker CLI
      mcpConfig.command = "docker"
      mcpConfig.args = [
        "run", "--rm", "-i",
        ...(config.dockerProfile ? ["--label", `mcp.profile=${config.dockerProfile}`] : []),
        config.dockerImage || config.name.toLowerCase().replace(/\s+/g, "-"),
      ]
      mcpConfig.env = {
        ...config.env,
        TESSERIN_API_URL: `http://host.docker.internal:${db.getSetting("api.serverPort") || "9960"}`,
        TESSERIN_API_KEY: config.apiToken || "",
      }
    } else if (config.transport === "stdio") {
      mcpConfig.command = config.command
      mcpConfig.args = config.args
      mcpConfig.env = config.env
    } else if (config.transport === "sse" || config.transport === "streamable-http") {
      mcpConfig.url = config.url
    }

    await mcpClientManager.connect(mcpConfig)

    config.lastConnectedAt = new Date().toISOString()
    this.persistAgents()
    this.notifyStatusChange()
  }

  /**
   * Disconnect an agent.
   */
  async disconnectAgent(id: string): Promise<void> {
    await mcpClientManager.disconnect(`agent:${id}`)
    this.notifyStatusChange()
  }

  /**
   * Create a token for an agent.
   */
  createAgentToken(
    agentId: string,
    name: string,
    permissions?: AgentPermission[],
    expiresAt?: string,
  ): { token: AgentToken; rawToken: string } | null {
    const agent = this.agents.get(agentId)
    if (!agent) return null

    const perms = permissions || agent.permissions
    const { token, rawToken } = generateAgentToken(agentId, name, perms, expiresAt)

    const agentTokens = this.tokens.get(agentId) || []
    agentTokens.push(token)
    this.tokens.set(agentId, agentTokens)
    this.persistTokens()

    return { token, rawToken }
  }

  /**
   * Revoke an agent token.
   */
  revokeToken(agentId: string, tokenId: string): boolean {
    const agentTokens = this.tokens.get(agentId)
    if (!agentTokens) return false

    const token = agentTokens.find((t) => t.id === tokenId)
    if (!token) return false

    token.isRevoked = true
    this.persistTokens()
    return true
  }

  /**
   * Verify an incoming agent token.
   */
  verifyToken(rawToken: string): { agent: CloudAgentConfig; token: AgentToken } | null {
    for (const [agentId, agentTokens] of this.tokens) {
      const verified = verifyAgentToken(rawToken, agentTokens)
      if (verified) {
        const agent = this.agents.get(agentId)
        if (agent) return { agent, token: verified }
      }
    }
    return null
  }

  /**
   * Get all registered agents.
   */
  listAgents(): CloudAgentConfig[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get an agent by ID.
   */
  getAgent(id: string): CloudAgentConfig | undefined {
    return this.agents.get(id)
  }

  /**
   * Get tokens for an agent.
   */
  getAgentTokens(agentId: string): AgentToken[] {
    return (this.tokens.get(agentId) || []).map((t) => ({
      ...t,
      tokenHash: "[hidden]" as any, // Don't expose hash
    }))
  }

  /**
   * Get connection statuses for all agents.
   */
  getStatuses(): AgentConnectionStatus[] {
    const mcpStatuses = mcpClientManager.getStatuses()
    const mcpStatusMap = new Map(mcpStatuses.map((s) => [s.serverId, s]))

    return Array.from(this.agents.values()).map((agent) => {
      const mcpStatus = mcpStatusMap.get(`agent:${agent.id}`)
      return {
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
        status: mcpStatus?.status || "disconnected",
        error: mcpStatus?.error,
        toolCount: mcpStatus?.toolCount || 0,
        lastActivity: agent.lastConnectedAt,
      }
    })
  }

  /**
   * Call a tool on a connected agent.
   */
  async callAgentTool(
    agentId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    return mcpClientManager.callTool(`agent:${agentId}`, toolName, args)
  }

  /**
   * Get all tools from a connected agent.
   */
  getAgentTools(agentId: string) {
    return mcpClientManager.getServerTools(`agent:${agentId}`)
  }

  /**
   * Subscribe to status changes.
   */
  onStatusChange(
    listener: (statuses: AgentConnectionStatus[]) => void,
  ): () => void {
    this.statusListeners.add(listener)
    return () => this.statusListeners.delete(listener)
  }

  private notifyStatusChange() {
    const statuses = this.getStatuses()
    this.statusListeners.forEach((l) => l(statuses))
  }

  /* ── Persistence ── */

  private persistAgents() {
    try {
      const data = JSON.stringify(Array.from(this.agents.values()))
      db.setSetting("cloudAgents.configs", data)
    } catch (err) {
      console.error("[CloudAgents] Failed to persist agent configs:", err)
    }
  }

  private persistTokens() {
    try {
      const data: Record<string, AgentToken[]> = {}
      for (const [agentId, tokens] of this.tokens) {
        data[agentId] = tokens
      }
      db.setSetting("cloudAgents.tokens", JSON.stringify(data))
    } catch (err) {
      console.error("[CloudAgents] Failed to persist tokens:", err)
    }
  }

  /**
   * Load persisted agents and tokens from settings.
   */
  loadFromSettings() {
    try {
      const agentData = db.getSetting("cloudAgents.configs")
      if (agentData) {
        const agents: CloudAgentConfig[] = JSON.parse(agentData)
        for (const agent of agents) {
          this.agents.set(agent.id, agent)
        }
      }

      const tokenData = db.getSetting("cloudAgents.tokens")
      if (tokenData) {
        const tokens: Record<string, AgentToken[]> = JSON.parse(tokenData)
        for (const [agentId, agentTokens] of Object.entries(tokens)) {
          this.tokens.set(agentId, agentTokens)
        }
      }

      console.log(`[CloudAgents] Loaded ${this.agents.size} agents, ${Array.from(this.tokens.values()).flat().length} tokens`)
    } catch (err) {
      console.error("[CloudAgents] Failed to load from settings:", err)
    }
  }
}

/* ── Singleton ── */
export const cloudAgentManager = new CloudAgentManager()
