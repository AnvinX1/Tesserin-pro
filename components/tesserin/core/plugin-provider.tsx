"use client"

import React, { useEffect, useRef, useCallback, useState, useContext, createContext } from "react"
import {
  FiZap, FiStar, FiCpu, FiCommand, FiChevronRight
} from "react-icons/fi"
import {
  pluginRegistry,
  usePlugins,
  sandboxAPI,
  type TesserinPluginAPI,
  type TesserinPlugin,
  type PluginEventType,
} from "@/lib/plugin-system"
import { useNotes } from "@/lib/notes-store"

import { BUILT_IN_PLUGINS } from "@/lib/builtin-plugins"
import { WORKSPACE_PLUGINS } from "@/lib/workspace-plugins"
import { COMMUNITY_PLUGINS } from "@/lib/community-plugins"
import { mcpStore } from "@/lib/mcp-client"
import {
  getRandomTip,
  getContextualTip,
  formatShortcut,
  type TesserinTip,
} from "@/lib/tips"

/**
 * Context that exposes the plugin API factory to child components.
 * This allows the community store and settings panel to activate plugins
 * with the same fully-wired API (toast notifications, navigation, vault access).
 */
type PluginAPIFactory = (pluginId: string) => TesserinPluginAPI
const PluginAPIContext = createContext<PluginAPIFactory | null>(null)

/** Hook to get the shared plugin API factory from the provider. */
export function usePluginAPI(): PluginAPIFactory {
  const factory = useContext(PluginAPIContext)
  if (!factory) throw new Error("usePluginAPI must be used within <PluginProvider>")
  return factory
}

/**
 * PluginProvider
 *
 * Wraps the application and:
 * 1. Creates the TesserinPluginAPI factory that bridges plugins to the notes store
 * 2. Registers and activates built-in plugins on mount
 * 3. Emits lifecycle events (app:ready, note:selected, etc.)
 */

interface PluginProviderProps {
  children: React.ReactNode
  /** Callback for showing toast/notice messages */
  onNotice?: (message: string, duration?: number) => void
  /** Callback for navigating to a tab */
  onNavigateTab?: (tabId: string) => void
}

export function PluginProvider({ children, onNotice, onNavigateTab }: PluginProviderProps) {
  const { notes, selectedNoteId, selectNote, addNote, updateNote, deleteNote, searchNotes } = useNotes()
  const initialised = useRef(false)

  // Create the API factory for plugins (sandboxed with rate-limiting + permissions)
  const createAPI = useCallback(
    (pluginId: string): TesserinPluginAPI => {
      const rawApi: TesserinPluginAPI = {
      registerCommand: (cmd) => pluginRegistry.addCommand(pluginId, cmd),
      registerPanel: (panel) => pluginRegistry.addPanel(pluginId, panel),
      registerStatusBarWidget: (widget) => pluginRegistry.addStatusBarWidget(pluginId, widget),
      registerMarkdownProcessor: (proc) => pluginRegistry.addMarkdownProcessor(pluginId, proc),
      registerCodeBlockRenderer: (renderer) => pluginRegistry.addCodeBlockRenderer(pluginId, renderer),
      registerAgentTool: (tool) => pluginRegistry.addAgentTool(pluginId, tool),

      on: (event, handler) => pluginRegistry.addEventListener(pluginId, event, handler),
      off: (event, handler) => pluginRegistry.removeEventListener(pluginId, event, handler),

      vault: {
        list: () =>
          notes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
          })),
        get: (id) => {
          const n = notes.find((n) => n.id === id)
          return n ? { id: n.id, title: n.title, content: n.content } : undefined
        },
        getSelected: () => {
          if (!selectedNoteId) return null
          const n = notes.find((n) => n.id === selectedNoteId)
          return n ? { id: n.id, title: n.title, content: n.content } : null
        },
        search: (query) => {
          const q = query.toLowerCase()
          return notes
            .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
            .map((n) => ({ id: n.id, title: n.title, content: n.content }))
        },
        create: (title, content) => addNote(title, content),
        update: (id, updates) => updateNote(id, updates),
        delete: (id) => deleteNote(id),
        selectNote: (id) => selectNote(id),
      },

      settings: {
        get: (key) => {
          // Plugin settings use a dedicated localStorage key for reliable synchronous access.
          // This works in both Electron and browser (Vite dev) modes.
          try {
            const raw = localStorage.getItem("tesserin:plugin-data")
            const data = raw ? JSON.parse(raw) : {}
            return data[key] ?? null
          } catch {
            return null
          }
        },
        set: (key, value) => {
          try {
            const raw = localStorage.getItem("tesserin:plugin-data")
            const data = raw ? JSON.parse(raw) : {}
            data[key] = value
            localStorage.setItem("tesserin:plugin-data", JSON.stringify(data))
          } catch {}
        },
      },

      ui: {
        showNotice: (message, duration) => {
          if (onNotice) {
            onNotice(message, duration)
          } else {
            console.log(`[Plugin Notice] ${message}`)
          }
        },
        navigateToTab: (tabId) => {
          onNavigateTab?.(tabId)
        },
      },

      ai: {
        chat: (messages, model) => {
          const t = (window as any).tesserin
          return t ? t.ai.chat(messages, model) : Promise.reject(new Error("AI not available"))
        },
        stream: (messages, onChunk, onDone, onError, model) => {
          const t = (window as any).tesserin
          if (!t) { onError("AI not available"); return { cancel: () => {} } }
          const s = t.ai.chatStream(messages, model)
          s.onChunk(onChunk)
          s.onDone(onDone)
          s.onError(onError)
          return { cancel: s.cancel }
        },
        summarize: (text, model) => {
          const t = (window as any).tesserin
          return t ? t.ai.summarize(text, model) : Promise.reject(new Error("AI not available"))
        },
        generateTags: (text, model) => {
          const t = (window as any).tesserin
          return t ? t.ai.generateTags(text, model) : Promise.reject(new Error("AI not available"))
        },
        suggestLinks: (content, existingTitles, model) => {
          const t = (window as any).tesserin
          return t ? t.ai.suggestLinks(content, existingTitles, model) : Promise.reject(new Error("AI not available"))
        },
        checkConnection: () => {
          const t = (window as any).tesserin
          return t ? t.ai.checkConnection() : Promise.resolve({ connected: false })
        },
        listModels: () => {
          const t = (window as any).tesserin
          return t ? t.ai.listModels() : Promise.resolve([])
        },
      },
    }

      // Look up the plugin manifest for permission checking
      const entry = pluginRegistry.snapshotPlugins.find(p => p.id === pluginId)
      const manifest = entry?.manifest ?? { id: pluginId, name: pluginId, version: "0.0.0", description: "", author: "" }
      return sandboxAPI(pluginId, rawApi, manifest)
    },
    [notes, selectedNoteId, selectNote, addNote, updateNote, deleteNote, onNotice, onNavigateTab],
  )

  // Register and activate built-in plugins on mount
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    async function init() {
      // Activate core plugins — respect user's toggle preference (default: enabled)
      for (const plugin of BUILT_IN_PLUGINS) {
        pluginRegistry.register(plugin)
        const key = `tesserin:plugin:${plugin.manifest.id}`
        const stored = localStorage.getItem(key)
        // Default to enabled if no preference set
        if (stored !== "false") {
          await pluginRegistry.activate(plugin.manifest.id, createAPI)
        }
      }

      // Register workspace plugins — activate only if user has enabled them
      for (const plugin of WORKSPACE_PLUGINS) {
        pluginRegistry.register(plugin)
        const key = `tesserin:plugin:${plugin.manifest.id}`
        const enabled = localStorage.getItem(key)
        if (enabled === "true") {
          await pluginRegistry.activate(plugin.manifest.id, createAPI)
        }
      }

      // Register community plugins — activate only if user has installed them
      for (const plugin of COMMUNITY_PLUGINS) {
        pluginRegistry.register(plugin)
        const key = `tesserin:plugin:${plugin.manifest.id}`
        const enabled = localStorage.getItem(key)
        if (enabled === "true") {
          await pluginRegistry.activate(plugin.manifest.id, createAPI)
        }
      }

      // Emit app:ready
      await pluginRegistry.emit({
        type: "app:ready",
        timestamp: Date.now(),
      })
    }

    init()
  }, [createAPI])

  // Emit note:selected when selection changes
  useEffect(() => {
    if (selectedNoteId) {
      pluginRegistry.emit({
        type: "note:selected",
        data: { noteId: selectedNoteId },
        timestamp: Date.now(),
      })
    }
  }, [selectedNoteId])

  // Bridge MCP tools into the SAM tool registry
  useEffect(() => {
    // Auto-connect enabled MCP servers on mount
    mcpStore.connectEnabled().catch(() => {})

    // Subscribe to MCP tool changes and bridge them as SAM tools
    const MCP_PLUGIN_ID = "com.tesserin.mcp-bridge"
    let currentToolNames: string[] = []

    const unsubscribe = mcpStore.subscribe(() => {
      const state = mcpStore.getSnapshot()

      // Remove previously registered MCP tools
      for (const toolName of currentToolNames) {
        // The plugin system doesn't have individual tool removal,
        // so we re-register all MCP tools on each change
      }

      // Register all MCP tools as agent tools
      currentToolNames = []
      for (const tool of state.tools) {
        const agentToolName = `mcp:${tool.serverName}:${tool.name}`
        currentToolNames.push(agentToolName)

        // Convert MCP input schema to AgentTool parameter format
        const parameters: Record<string, { type: string; description: string; required?: boolean }> = {}
        const schema = tool.inputSchema as {
          properties?: Record<string, { type?: string; description?: string }>
          required?: string[]
        }
        if (schema?.properties) {
          for (const [key, val] of Object.entries(schema.properties)) {
            parameters[key] = {
              type: val.type || "string",
              description: val.description || key,
              required: schema.required?.includes(key),
            }
          }
        }

        pluginRegistry.addAgentTool(MCP_PLUGIN_ID, {
          name: agentToolName,
          description: `[${tool.serverName}] ${tool.description}`,
          parameters,
          execute: async (params) => {
            return mcpStore.callTool(tool.serverId, tool.name, params)
          },
        })
      }
    })

    return () => unsubscribe()
  }, [])

  return <PluginAPIContext.Provider value={createAPI}>{children}</PluginAPIContext.Provider>
}

/* ================================================================== */
/*  Status Bar Component                                               */
/* ================================================================== */

/**
 * StatusBar
 *
 * A thin bar at the bottom of the workspace showing:
 * - Left-aligned plugin widgets (e.g. git status, sync indicator)
 * - Center-aligned widgets (e.g. daily quote)
 * - Right-aligned widgets (e.g. word count, cursor position)
 */

interface StatusBarProps {
  /** Currently active tab for context-aware tips */
  activeTab?: string
  /** Callback when user clicks an actionable tip */
  onTipAction?: (action: string) => void
}

export function StatusBar({ activeTab, onTipAction }: StatusBarProps) {
  const { statusBarWidgets } = usePlugins()
  const [currentTip, setCurrentTip] = useState<TesserinTip | null>(null)
  const [tipFading, setTipFading] = useState(false)
  const shownTips = useRef(new Set<string>())
  const tipTimerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const leftWidgets = statusBarWidgets.filter((w) => (w.align ?? "left") === "left")
  const centerWidgets = statusBarWidgets.filter((w) => w.align === "center")
  const rightWidgets = statusBarWidgets.filter((w) => w.align === "right")

  // Rotate tips every 45 seconds
  useEffect(() => {
    const showNextTip = () => {
      setTipFading(true)
      setTimeout(() => {
        // 30% chance to show a contextual tip based on active tab
        const contextual = activeTab && Math.random() < 0.3
          ? getContextualTip(activeTab)
          : null
        const tip = contextual || getRandomTip(shownTips.current)
        shownTips.current.add(tip.id)
        // Reset cycle when we've shown most tips
        if (shownTips.current.size > 25) shownTips.current.clear()
        setCurrentTip(tip)
        setTipFading(false)
      }, 300)
    }

    // Show first tip after 5s
    const initial = setTimeout(showNextTip, 5000)
    // Then rotate every 45s
    tipTimerRef.current = setInterval(showNextTip, 45000)

    return () => {
      clearTimeout(initial)
      clearInterval(tipTimerRef.current)
    }
  }, [activeTab])

  const tipIcon = currentTip?.icon === "zap" ? FiZap
    : currentTip?.icon === "sparkle" ? FiStar
    : currentTip?.icon === "rocket" ? FiCpu
    : currentTip?.icon === "brain" ? FiStar
    : FiCommand

  const TipIcon = tipIcon

  return (
    <div
      className="flex items-center px-4 py-1.5 gap-4 flex-shrink-0"
      style={{
        backgroundColor: "var(--bg-panel)",
        borderTop: "1px solid var(--border-dark)",
        minHeight: 28,
      }}
    >
      {/* Left: plugin widgets */}
      <div className="flex items-center gap-3 shrink-0">
        {leftWidgets.map((widget) => (
          <widget.component key={widget.id} />
        ))}
      </div>

      {/* Center: rotating tip */}
      {currentTip && (
        <div
          className={`flex-1 flex items-center justify-center gap-2 min-w-0 transition-opacity duration-300 ${
            tipFading ? "opacity-0" : "opacity-100"
          }`}
        >
          <TipIcon
            size={11}
            style={{ color: "var(--accent-primary)", flexShrink: 0, opacity: 0.7 }}
          />
          <button
            onClick={() => currentTip.action && onTipAction?.(currentTip.action)}
            className="text-[11px] truncate max-w-[600px] text-left transition-colors"
            style={{
              color: "var(--text-tertiary)",
              cursor: currentTip.action ? "pointer" : "default",
              background: "none",
              border: "none",
              padding: 0,
              font: "inherit",
            }}
            title={currentTip.text}
          >
            {currentTip.text}
          </button>
          {currentTip.shortcut && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0"
              style={{
                backgroundColor: "rgba(250, 204, 21, 0.08)",
                color: "var(--accent-primary)",
                border: "1px solid rgba(250, 204, 21, 0.12)",
              }}
            >
              {formatShortcut(currentTip.shortcut)}
            </span>
          )}
          {currentTip.action && (
            <FiChevronRight
              size={10}
              style={{ color: "var(--text-tertiary)", opacity: 0.4, flexShrink: 0 }}
            />
          )}
        </div>
      )}
      {!currentTip && (
        <div className="flex-1 flex items-center justify-center">
          {centerWidgets.map((widget) => (
            <widget.component key={widget.id} />
          ))}
        </div>
      )}

      {/* Right: plugin widgets */}
      <div className="flex items-center gap-3 shrink-0">
        {rightWidgets.map((widget) => (
          <widget.component key={widget.id} />
        ))}
      </div>
    </div>
  )
}
