"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  FiSettings,
  FiEdit3,
  FiCpu,
  FiSun,
  FiDatabase,
  FiCommand,
  FiInfo,
  FiCheck,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
  FiDownload,
  FiTrash2,
  FiSave,
  FiChevronRight,
  FiAlertTriangle,
  FiGlobe,
  FiType,
  FiEye,
  FiGrid,
  FiZap,
  FiMonitor,
  FiHardDrive,
  FiPlus,
  FiLink,
  FiPlay,
  FiPause,
  FiPackage,
  FiKey,
  FiCopy,
  FiShield,
  FiServer,
  FiCompass,
  FiClock,
  FiDroplet,
} from "react-icons/fi"
import {
  HiOutlineCpuChip,
  HiOutlineSparkles,
} from "react-icons/hi2"
import { getSetting, setSetting } from "@/lib/storage-client"
import { useNotes } from "@/lib/notes-store"
import { useMcp, type McpServerConfig } from "@/lib/mcp-client"
import { useTesserinTheme } from "@/components/tesserin/core/theme-provider"
import { usePlugins, pluginRegistry } from "@/lib/plugin-system"
import { usePluginAPI } from "@/components/tesserin/core/plugin-provider"
import { CommunityPluginsPanel } from "@/components/tesserin/panels/community-plugins-panel"
import { ThemesPanel } from "@/components/tesserin/panels/theme-panel"
import {
  DEFAULT_SHORTCUTS,
  loadCustomShortcuts,
  saveCustomShortcuts,
  getEffectiveBinding,
  eventToShortcutString,
  formatShortcutDisplay,
} from "@/lib/keyboard-shortcuts"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface SettingsValues {
  // General
  "general.startupTab": string
  "general.confirmDelete": string
  "general.autoSave": string
  "general.autoSaveInterval": string

  // Editor
  "editor.fontSize": string
  "editor.fontFamily": string
  "editor.lineHeight": string
  "editor.tabSize": string
  "editor.wordWrap": string
  "editor.showLineNumbers": string
  "editor.spellCheck": string
  "editor.vimMode": string

  // AI / SAM
  "ai.ollamaEndpoint": string
  "ai.defaultModel": string
  "ai.streamResponses": string
  "ai.maxContextLength": string
  "ai.temperature": string
  "ai.codeAgentProvider": string
  "ai.openrouterApiKey": string
  "ai.openrouterModel": string

  // MCP
  "mcp.serverEnabled": string
  "mcp.serverPort": string

  // Appearance
  "appearance.theme": string
  "appearance.accentColor": string
  "appearance.uiScale": string
  "appearance.sidebarWidth": string
  "appearance.reducedMotion": string
  "appearance.showStatusBar": string

  // Vault
  "vault.backupEnabled": string
  "vault.backupInterval": string
  "vault.defaultNoteTemplate": string

  // Features — toggle workspace tabs & panels on/off
  "features.canvas": string
  "features.graph": string
  "features.sam": string
  "features.floatingChat": string
  "features.statusBar": string
  "features.backlinks": string
  "features.versionHistory": string
  "features.references": string
  "features.splitPanes": string
  "features.dailyNotes": string
  "features.templates": string
}

type SettingKey = keyof SettingsValues

const DEFAULTS: SettingsValues = {
  "general.startupTab": "graph",
  "general.confirmDelete": "true",
  "general.autoSave": "true",
  "general.autoSaveInterval": "3000",

  "editor.fontSize": "14",
  "editor.fontFamily": "JetBrains Mono, monospace",
  "editor.lineHeight": "1.7",
  "editor.tabSize": "2",
  "editor.wordWrap": "true",
  "editor.showLineNumbers": "false",
  "editor.spellCheck": "false",
  "editor.vimMode": "false",

  "ai.ollamaEndpoint": "http://localhost:11434",
  "ai.defaultModel": "llama3.2",
  "ai.streamResponses": "true",
  "ai.maxContextLength": "4096",
  "ai.temperature": "0.7",
  "ai.codeAgentProvider": "ollama",
  "ai.openrouterApiKey": "",
  "ai.openrouterModel": "anthropic/claude-sonnet-4",

  "mcp.serverEnabled": "true",
  "mcp.serverPort": "3100",

  "appearance.theme": "dark",
  "appearance.accentColor": "#FACC15",
  "appearance.uiScale": "100",
  "appearance.sidebarWidth": "72",
  "appearance.reducedMotion": "false",
  "appearance.showStatusBar": "true",

  "vault.backupEnabled": "false",
  "vault.backupInterval": "daily",
  "vault.defaultNoteTemplate": "none",

  "features.canvas": "true",
  "features.graph": "true",
  "features.sam": "true",
  "features.floatingChat": "true",
  "features.statusBar": "true",
  "features.backlinks": "true",
  "features.versionHistory": "true",
  "features.references": "true",
  "features.splitPanes": "true",
  "features.dailyNotes": "true",
  "features.templates": "true",
}

/* ------------------------------------------------------------------ */
/*  Section definitions                                                */
/* ------------------------------------------------------------------ */

type SectionId = "general" | "editor" | "ai" | "mcp" | "api" | "agents" | "appearance" | "themes" | "vault" | "plugins" | "marketplace" | "features" | "shortcuts" | "about"

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <FiSettings size={16} /> },
  { id: "editor", label: "Editor", icon: <FiEdit3 size={16} /> },
  { id: "ai", label: "AI / SAM", icon: <HiOutlineCpuChip size={16} /> },
  { id: "mcp", label: "MCP", icon: <FiLink size={16} /> },
  { id: "api", label: "API", icon: <FiKey size={16} /> },
  { id: "agents", label: "Cloud Agents", icon: <FiGlobe size={16} /> },
  { id: "appearance", label: "Appearance", icon: <FiSun size={16} /> },
  { id: "themes", label: "Themes", icon: <FiDroplet size={16} /> },
  { id: "features", label: "Features", icon: <FiGrid size={16} /> },
  { id: "vault", label: "Vault & Data", icon: <FiDatabase size={16} /> },
  { id: "plugins", label: "Plugins", icon: <FiPackage size={16} /> },
  { id: "marketplace", label: "Marketplace", icon: <FiGlobe size={16} /> },
  { id: "shortcuts", label: "Shortcuts", icon: <FiCommand size={16} /> },
  { id: "about", label: "About", icon: <FiInfo size={16} /> },
]

/* ------------------------------------------------------------------ */
/*  Shortcut definitions                                               */
/* ------------------------------------------------------------------ */

// Now managed by lib/keyboard-shortcuts.ts — imported below

/* ------------------------------------------------------------------ */
/*  Utility components                                                 */
/* ------------------------------------------------------------------ */

function SettingRow({
  label, description, children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-8 py-3.5 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{label}</div>
        {description && (
          <div className="text-[10px] mt-0.5 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{description}</div>
        )}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  )
}

function Toggle({
  checked, onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-10 h-5 rounded-full transition-all duration-200"
      style={{
        backgroundColor: checked ? "var(--accent-primary)" : "var(--bg-panel-inset)",
        boxShadow: checked ? "0 0 12px rgba(250,204,21,0.3)" : "var(--input-inner-shadow)",
        border: `1px solid ${checked ? "transparent" : "var(--border-dark)"}`,
      }}
      aria-label="Toggle"
      role="switch"
      aria-checked={checked}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200"
        style={{
          left: checked ? "calc(100% - 18px)" : "2px",
          backgroundColor: checked ? "var(--text-on-accent)" : "var(--text-secondary)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </button>
  )
}

function SelectInput({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none skeuo-inset pl-3 pr-8 py-1.5 text-[11px] rounded-xl focus:outline-none cursor-pointer min-w-[140px]"
        style={{ color: "var(--text-primary)", backgroundColor: "var(--bg-panel-inset)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <FiChevronRight size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
    </div>
  )
}

function TextInput({
  value, onChange, placeholder, type = "text", min, max, step,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  min?: string
  max?: string
  step?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className="skeuo-inset px-3 py-1.5 text-[11px] rounded-xl focus:outline-none min-w-[140px]"
      style={{ color: "var(--text-primary)", backgroundColor: "var(--bg-panel-inset)" }}
    />
  )
}

function SliderInput({
  value, onChange, min, max, step, unit,
}: {
  value: string
  onChange: (v: string) => void
  min: number
  max: number
  step: number
  unit?: string
}) {
  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        className="flex-1 accent-[#FACC15] h-1 cursor-pointer"
        style={{ accentColor: "var(--accent-primary)" }}
      />
      <span className="text-[10px] font-mono min-w-[40px] text-right" style={{ color: "var(--text-secondary)" }}>
        {value}{unit ?? ""}
      </span>
    </div>
  )
}

function SectionHeading({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b" style={{ borderColor: "var(--border-dark)" }}>
      {icon && <span style={{ color: "var(--accent-primary)" }}>{icon}</span>}
      <h2 className="text-sm font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>{title}</h2>
    </div>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className="inline-block px-2 py-0.5 text-[10px] font-mono rounded-lg"
      style={{
        backgroundColor: "var(--bg-panel-inset)",
        color: "var(--text-secondary)",
        boxShadow: "var(--input-inner-shadow)",
        border: "1px solid var(--border-dark)",
      }}
    >
      {children}
    </kbd>
  )
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export function SettingsPanel() {
  const { notes } = useNotes()
  const { setTheme } = useTesserinTheme()
  const createAPI = usePluginAPI()
  const [activeSection, setActiveSection] = useState<SectionId>("general")
  const [settings, setSettings] = useState<SettingsValues>({ ...DEFAULTS })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiStatus, setAiStatus] = useState<"checking" | "connected" | "disconnected" | null>(null)
  const [aiModels, setAiModels] = useState<string[]>([])

  // MCP state
  const mcp = useMcp()
  const [mcpNewServerName, setMcpNewServerName] = useState("")
  const [mcpNewServerTransport, setMcpNewServerTransport] = useState<"stdio" | "sse">("sse")
  const [mcpNewServerUrl, setMcpNewServerUrl] = useState("")
  const [mcpNewServerCommand, setMcpNewServerCommand] = useState("")
  const [mcpNewServerArgs, setMcpNewServerArgs] = useState("")

  // Plugin state
  const { plugins: registeredPlugins } = usePlugins()
  const [pluginToggles, setPluginToggles] = useState<Record<string, boolean>>({})

  // API state
  const [apiKeys, setApiKeys] = useState<Array<{
    id: string; name: string; prefix: string; permissions: string;
    created_at: string; last_used_at: string | null;
    expires_at: string | null; is_revoked: number;
  }>>([])
  const [apiServerStatus, setApiServerStatus] = useState<{ running: boolean; port: number }>({ running: false, port: 9960 })
  const [apiNewKeyName, setApiNewKeyName] = useState("")
  const [apiNewKeyPermissions, setApiNewKeyPermissions] = useState<string[]>(["*"])
  const [apiNewKeyRevealed, setApiNewKeyRevealed] = useState<string | null>(null)
  const [apiPort, setApiPort] = useState("9960")
  const [apiCopied, setApiCopied] = useState(false)

  // Cloud agents state
  const [agents, setAgents] = useState<Array<{
    id: string; name: string; type: string; transport: string;
    enabled: boolean; dockerImage?: string; command?: string;
    knowledgeBaseAccess: boolean; permissions: string[];
  }>>([])
  const [agentStatuses, setAgentStatuses] = useState<Array<{
    agentId: string; agentName: string; status: string;
    toolCount: number; error?: string;
  }>>([])
  const [agentTokens, setAgentTokens] = useState<Array<{
    id: string; agentId: string; token: string; name: string;
    permissions: string[]; createdAt: string; expiresAt?: string; isRevoked: boolean;
  }>>([])
  const [agentNewType, setAgentNewType] = useState("claude-code")
  const [agentNewTokenId, setAgentNewTokenId] = useState<string | null>(null)
  const [agentNewTokenRevealed, setAgentNewTokenRevealed] = useState<string | null>(null)
  const [agentTokenCopied, setAgentTokenCopied] = useState(false)
  const [agentExpandedId, setAgentExpandedId] = useState<string | null>(null)

  // Shortcuts state (hoisted from renderShortcuts to avoid conditional hook calls)
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>({})
  const [capturing, setCapturing] = useState<string | null>(null)

  // Load plugin enabled states from localStorage
  // Core plugins default to true (enabled), others default to their current enabled state
  const corePluginIds = useMemo(() => new Set(["com.tesserin.word-count", "com.tesserin.daily-quote", "com.tesserin.backlinks"]), [])
  useEffect(() => {
    const toggles: Record<string, boolean> = {}
    for (const p of registeredPlugins) {
      const key = `tesserin:plugin:${p.id}`
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        toggles[p.id] = stored === "true"
      } else {
        // Default: core plugins = enabled, others = check if currently active
        toggles[p.id] = corePluginIds.has(p.id) ? true : p.enabled
      }
    }
    setPluginToggles(toggles)
  }, [registeredPlugins, corePluginIds])

  // Load API keys and server status
  useEffect(() => {
    async function loadApi() {
      if (typeof window !== "undefined" && window.tesserin?.api) {
        try {
          const keys = await window.tesserin.api.keys.list()
          setApiKeys(keys)
          const status = await window.tesserin.api.server.status()
          setApiServerStatus(status)
          setApiPort(String(status.port))
        } catch {}
      }
    }
    loadApi()
  }, [])

  // Load cloud agents
  const loadAgents = useCallback(async () => {
    if (typeof window !== "undefined" && window.tesserin?.agents) {
      try {
        const list = await window.tesserin.agents.list()
        setAgents(list)
        const statuses = await window.tesserin.agents.statuses()
        setAgentStatuses(statuses)
      } catch {}
    }
  }, [])

  const loadAgentTokens = useCallback(async (agentId: string) => {
    if (typeof window !== "undefined" && window.tesserin?.agents) {
      try {
        const tokens = await window.tesserin.agents.getTokens(agentId)
        setAgentTokens(tokens)
      } catch {}
    }
  }, [])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  // Load custom shortcuts
  useEffect(() => {
    loadCustomShortcuts().then(setCustomShortcuts)
  }, [])

  // Keyboard capture for shortcut remapping
  useEffect(() => {
    if (!capturing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const combo = eventToShortcutString(e)
      if (!combo) return
      const next = { ...customShortcuts, [capturing]: combo }
      setCustomShortcuts(next)
      saveCustomShortcuts(next)
      setCapturing(null)
    }
    window.addEventListener("keydown", handler, true)
    return () => window.removeEventListener("keydown", handler, true)
  }, [capturing, customShortcuts])

  /* ---- Load persisted settings ---- */
  useEffect(() => {
    async function load() {
      const loaded: Partial<SettingsValues> = {}
      for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
        const val = await getSetting(key)
        if (val !== null) (loaded as Record<string, string>)[key] = val
      }
      setSettings((prev) => ({ ...prev, ...loaded }))
    }
    load()
  }, [])

  /* ---- Update a single setting ---- */
  const update = useCallback((key: SettingKey, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setSaved(false)
    if (key === "appearance.theme") {
      setTheme(value)
    }
  }, [setTheme])

  /** Update and immediately persist a setting (for toggles that should take effect instantly) */
  const updateImmediate = useCallback((key: SettingKey, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSetting(key, value).catch(() => {})
    if (key === "appearance.theme") {
      setTheme(value)
    }
  }, [setTheme])

  /* ---- Save all settings ---- */
  const saveSettings = useCallback(async () => {
    setSaving(true)
    try {
      for (const [key, value] of Object.entries(settings)) {
        await setSetting(key, value)
      }
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }, [settings])

  /* ---- Reset to defaults ---- */
  const resetSection = useCallback(() => {
    const prefix = activeSection + "."
    setSettings((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
        if (key.startsWith(prefix)) {
          next[key] = DEFAULTS[key]
        }
      }
      return next
    })
    setDirty(true)
    setSaved(false)
  }, [activeSection])

  /* ---- AI connection check ---- */
  const checkAiConnection = useCallback(async () => {
    setAiStatus("checking")
    try {
      const endpoint = settings["ai.ollamaEndpoint"]
      // IPC
      if (typeof window !== "undefined" && window.tesserin?.ai) {
        const result = await window.tesserin.ai.checkConnection()
        setAiStatus(result.connected ? "connected" : "disconnected")
        if (result.connected) {
          const models = await window.tesserin.ai.listModels()
          setAiModels(models)
        }
        return
      }
      // Direct fetch
      const res = await fetch(`${endpoint}/api/version`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        setAiStatus("connected")
        const tagRes = await fetch(`${endpoint}/api/tags`)
        if (tagRes.ok) {
          const data = (await tagRes.json()) as { models?: Array<{ name: string }> }
          setAiModels((data.models || []).map((m: { name: string }) => m.name))
        }
      } else {
        setAiStatus("disconnected")
      }
    } catch {
      setAiStatus("disconnected")
    }
  }, [settings])

  /* ---- Vault stats ---- */
  const vaultStats = useMemo(() => {
    const totalChars = notes.reduce((acc, n) => acc + n.content.length, 0)
    const totalWords = notes.reduce((acc, n) => acc + n.content.split(/\s+/).filter(Boolean).length, 0)
    return {
      noteCount: notes.length,
      totalWords,
      totalChars,
      avgWords: notes.length > 0 ? Math.round(totalWords / notes.length) : 0,
    }
  }, [notes])

  /* ---- Clear all data ---- */
  const clearAllData = useCallback(() => {
    if (!confirm("⚠️ This will permanently delete ALL notes, tasks, canvases, and settings. This cannot be undone.\n\nAre you sure?")) return
    localStorage.clear()
    window.location.reload()
  }, [])

  /* ---- Export vault ---- */
  const exportVault = useCallback(() => {
    const data = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      notes: notes.map((n) => ({ title: n.title, content: n.content, createdAt: n.createdAt })),
      settings,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tesserin-vault-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [notes, settings])

  /* ================================================================ */
  /*  Section renderers                                                */
  /* ================================================================ */

  const renderGeneral = () => (
    <div>
      <SectionHeading title="General" icon={<FiSettings size={16} />} />

      <SettingRow label="Startup tab" description="Which workspace tab to show when Tesserin launches.">
        <SelectInput
          value={settings["general.startupTab"]}
          onChange={(v) => update("general.startupTab", v)}
          options={[
            { value: "notes", label: "Notes" },
            { value: "canvas", label: "Canvas" },
            { value: "graph", label: "Graph" },
            { value: "sam", label: "SAM" },
          ]}
        />
      </SettingRow>

      <SettingRow label="Auto-save" description="Automatically save notes as you type.">
        <Toggle
          checked={settings["general.autoSave"] === "true"}
          onChange={(v) => update("general.autoSave", String(v))}
        />
      </SettingRow>

      <SettingRow label="Auto-save interval" description="Debounce delay in milliseconds before saving.">
        <SliderInput
          value={settings["general.autoSaveInterval"]}
          onChange={(v) => update("general.autoSaveInterval", v)}
          min={500}
          max={10000}
          step={500}
          unit="ms"
        />
      </SettingRow>

      <SettingRow label="Confirm before delete" description="Show a confirmation dialog before deleting notes and folders.">
        <Toggle
          checked={settings["general.confirmDelete"] === "true"}
          onChange={(v) => update("general.confirmDelete", String(v))}
        />
      </SettingRow>
    </div>
  )

  const renderEditor = () => (
    <div>
      <SectionHeading title="Editor" icon={<FiEdit3 size={16} />} />

      <SettingRow label="Font size" description="Base font size for the markdown editor.">
        <SliderInput
          value={settings["editor.fontSize"]}
          onChange={(v) => update("editor.fontSize", v)}
          min={10}
          max={24}
          step={1}
          unit="px"
        />
      </SettingRow>

      <SettingRow label="Font family" description="Monospace font used in the editor.">
        <SelectInput
          value={settings["editor.fontFamily"]}
          onChange={(v) => update("editor.fontFamily", v)}
          options={[
            { value: "JetBrains Mono, monospace", label: "JetBrains Mono" },
            { value: "Fira Code, monospace", label: "Fira Code" },
            { value: "Source Code Pro, monospace", label: "Source Code Pro" },
            { value: "Cascadia Code, monospace", label: "Cascadia Code" },
            { value: "IBM Plex Mono, monospace", label: "IBM Plex Mono" },
            { value: "monospace", label: "System Mono" },
          ]}
        />
      </SettingRow>

      <SettingRow label="Line height" description="Spacing between lines in the editor.">
        <SliderInput
          value={settings["editor.lineHeight"]}
          onChange={(v) => update("editor.lineHeight", v)}
          min={1.2}
          max={2.4}
          step={0.1}
        />
      </SettingRow>

      <SettingRow label="Tab size" description="Number of spaces per indentation level.">
        <SelectInput
          value={settings["editor.tabSize"]}
          onChange={(v) => update("editor.tabSize", v)}
          options={[
            { value: "2", label: "2 spaces" },
            { value: "4", label: "4 spaces" },
            { value: "8", label: "8 spaces" },
          ]}
        />
      </SettingRow>

      <SettingRow label="Word wrap" description="Wrap long lines in the editor.">
        <Toggle
          checked={settings["editor.wordWrap"] === "true"}
          onChange={(v) => update("editor.wordWrap", String(v))}
        />
      </SettingRow>

      <SettingRow label="Line numbers" description="Show line numbers in the editor gutter.">
        <Toggle
          checked={settings["editor.showLineNumbers"] === "true"}
          onChange={(v) => update("editor.showLineNumbers", String(v))}
        />
      </SettingRow>

      <SettingRow label="Spell check" description="Browser spell checking for the editor.">
        <Toggle
          checked={settings["editor.spellCheck"] === "true"}
          onChange={(v) => update("editor.spellCheck", String(v))}
        />
      </SettingRow>

      <SettingRow label="Vim mode" description="Enable Vim keybindings in the editor.">
        <Toggle
          checked={settings["editor.vimMode"] === "true"}
          onChange={(v) => update("editor.vimMode", String(v))}
        />
      </SettingRow>
    </div>
  )

  const renderAI = () => (
    <div>
      <SectionHeading title="AI / SAM" icon={<HiOutlineCpuChip size={16} />} />

      {/* Connection status */}
      <div
        className="mb-4 p-3.5 rounded-xl flex items-center justify-between"
        style={{
          background: "var(--bg-panel-inset)",
          boxShadow: "var(--input-inner-shadow)",
          border: "1px solid var(--border-dark)",
        }}
      >
        <div className="flex items-center gap-3">
          {aiStatus === "connected" && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
              <span className="text-[11px] font-semibold" style={{ color: "#22c55e" }}>Connected</span>
              {aiModels.length > 0 && (
                <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                  · {aiModels.length} model{aiModels.length !== 1 ? "s" : ""} available
                </span>
              )}
            </div>
          )}
          {aiStatus === "disconnected" && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
              <span className="text-[11px] font-semibold" style={{ color: "#ef4444" }}>Disconnected</span>
            </div>
          )}
          {aiStatus === "checking" && (
            <div className="flex items-center gap-2">
              <FiRefreshCw size={12} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
              <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>Checking…</span>
            </div>
          )}
          {aiStatus === null && (
            <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>Not checked yet</span>
          )}
        </div>
        <button
          onClick={checkAiConnection}
          className="skeuo-btn px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
          style={{ color: "var(--text-secondary)" }}
        >
          <FiRefreshCw size={10} />
          Test Connection
        </button>
      </div>

      <SettingRow label="Ollama endpoint" description="URL of your local Ollama instance.">
        <TextInput
          value={settings["ai.ollamaEndpoint"]}
          onChange={(v) => update("ai.ollamaEndpoint", v)}
          placeholder="http://localhost:11434"
        />
      </SettingRow>

      <SettingRow label="Default model" description="Model to use for SAM conversations.">
        {aiModels.length > 0 ? (
          <SelectInput
            value={settings["ai.defaultModel"]}
            onChange={(v) => update("ai.defaultModel", v)}
            options={aiModels.map((m) => ({ value: m, label: m }))}
          />
        ) : (
          <TextInput
            value={settings["ai.defaultModel"]}
            onChange={(v) => update("ai.defaultModel", v)}
            placeholder="llama3.2"
          />
        )}
      </SettingRow>

      <SettingRow label="Stream responses" description="Show streaming text as SAM generates it.">
        <Toggle
          checked={settings["ai.streamResponses"] === "true"}
          onChange={(v) => update("ai.streamResponses", String(v))}
        />
      </SettingRow>

      <SettingRow label="Max context length" description="Maximum token context window for conversations.">
        <SelectInput
          value={settings["ai.maxContextLength"]}
          onChange={(v) => update("ai.maxContextLength", v)}
          options={[
            { value: "2048", label: "2K tokens" },
            { value: "4096", label: "4K tokens" },
            { value: "8192", label: "8K tokens" },
            { value: "16384", label: "16K tokens" },
            { value: "32768", label: "32K tokens" },
          ]}
        />
      </SettingRow>

      <SettingRow label="Temperature" description="Controls randomness of AI responses. Lower = more focused.">
        <SliderInput
          value={settings["ai.temperature"]}
          onChange={(v) => update("ai.temperature", v)}
          min={0}
          max={2}
          step={0.1}
        />
      </SettingRow>

      {/* Available models */}
      {aiModels.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-semibold mb-2" style={{ color: "var(--text-tertiary)" }}>AVAILABLE MODELS</div>
          <div className="flex flex-wrap gap-1.5">
            {aiModels.map((m) => (
              <span
                key={m}
                className="px-2.5 py-1 rounded-lg text-[10px] font-mono"
                style={{
                  backgroundColor: m === settings["ai.defaultModel"] ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                  color: m === settings["ai.defaultModel"] ? "var(--text-on-accent)" : "var(--text-secondary)",
                  boxShadow: m === settings["ai.defaultModel"] ? "0 0 12px rgba(250,204,21,0.3)" : "var(--input-inner-shadow)",
                  border: `1px solid ${m === settings["ai.defaultModel"] ? "transparent" : "var(--border-dark)"}`,
                  cursor: "pointer",
                }}
                onClick={() => update("ai.defaultModel", m)}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── OpenRouter / Cloud Agent ───────────────────────────────── */}
      <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border-dark)" }}>
        <div className="text-[11px] font-bold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <span style={{ color: "var(--accent-primary)" }}>☁</span> OpenRouter (Cloud Agent)
        </div>

        <SettingRow label="Code Agent provider" description="Choose which AI provider powers the code builder agent.">
          <SelectInput
            value={settings["ai.codeAgentProvider"]}
            onChange={(v) => update("ai.codeAgentProvider", v)}
            options={[
              { value: "ollama", label: "Ollama (local)" },
              { value: "openrouter", label: "OpenRouter (cloud)" },
            ]}
          />
        </SettingRow>

        <SettingRow label="OpenRouter API key" description="Get your key from openrouter.ai/keys">
          <TextInput
            value={settings["ai.openrouterApiKey"]}
            onChange={(v) => update("ai.openrouterApiKey", v)}
            placeholder="sk-or-v1-..."
          />
        </SettingRow>

        <SettingRow label="OpenRouter model" description="Model ID for code agent (e.g. anthropic/claude-sonnet-4).">
          <TextInput
            value={settings["ai.openrouterModel"]}
            onChange={(v) => update("ai.openrouterModel", v)}
            placeholder="anthropic/claude-sonnet-4"
          />
        </SettingRow>
      </div>
    </div>
  )

  const renderMCP = () => {
    const addMcpServer = () => {
      if (!mcpNewServerName.trim()) return
      const id = `mcp-${Date.now()}`
      const config: McpServerConfig = {
        id,
        name: mcpNewServerName.trim(),
        transport: mcpNewServerTransport,
        enabled: true,
      }
      if (mcpNewServerTransport === "sse") {
        config.url = mcpNewServerUrl.trim() || undefined
      } else {
        config.command = mcpNewServerCommand.trim() || undefined
        config.args = mcpNewServerArgs.trim() ? mcpNewServerArgs.trim().split(/\s+/) : undefined
      }
      mcp.addServer(config)
      setMcpNewServerName("")
      setMcpNewServerUrl("")
      setMcpNewServerCommand("")
      setMcpNewServerArgs("")
    }

    return (
      <div>
        <SectionHeading title="MCP Servers" icon={<FiLink size={16} />} />

        <div className="text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
          Connect to external MCP servers to give SAM access to additional tools (web search, databases, APIs, etc.).
          Tesserin also exposes its vault as an MCP server so external AI agents can interact with your notes.
        </div>

        {/* Tesserin built-in MCP server status */}
        <div
          className="mb-4 p-3.5 rounded-xl"
          style={{
            background: "var(--bg-panel-inset)",
            boxShadow: "var(--input-inner-shadow)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>Tesserin Vault Server</span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg" style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-tertiary)", border: "1px solid var(--border-dark)" }}>
              Built-in
            </span>
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            Exposes notes, tags, tasks, and folders as MCP tools. Use <code className="font-mono" style={{ color: "var(--accent-primary)" }}>tesserin --mcp</code> to start as a standalone stdio server.
          </div>
        </div>

        <SettingRow label="Expose vault via MCP" description="Allow external AI agents to access your vault through the MCP protocol.">
          <Toggle
            checked={settings["mcp.serverEnabled"] === "true"}
            onChange={(v) => update("mcp.serverEnabled", String(v))}
          />
        </SettingRow>

        {/* Connected external servers */}
        <div className="mt-6">
          <div className="text-[10px] font-semibold mb-3" style={{ color: "var(--text-tertiary)" }}>CONNECTED SERVERS</div>

          {mcp.servers.length === 0 && (
            <div className="text-[11px] py-4 text-center" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
              No external MCP servers configured yet.
            </div>
          )}

          {mcp.servers.map((server) => {
            const status = mcp.statuses.find((s) => s.serverId === server.id)
            const isConnected = status?.status === "connected"
            const isConnecting = status?.status === "connecting"
            const isError = status?.status === "error"

            return (
              <div
                key={server.id}
                className="mb-2 p-3 rounded-xl flex items-center justify-between"
                style={{
                  background: "var(--bg-panel-inset)",
                  boxShadow: "var(--input-inner-shadow)",
                  border: "1px solid var(--border-dark)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: isConnected ? "#22c55e" : isConnecting ? "#facc15" : isError ? "#ef4444" : "#666",
                        boxShadow: isConnected ? "0 0 6px #22c55e" : isError ? "0 0 6px #ef4444" : "none",
                      }}
                    />
                    <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {server.name}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-tertiary)" }}>
                      {server.transport}
                    </span>
                    {isConnected && status && (
                      <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>
                        {status.toolCount} tool{status.toolCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {isError && status?.error && (
                    <div className="text-[9px] mt-1 truncate" style={{ color: "#ef4444" }}>{status.error}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  {isConnected ? (
                    <button
                      onClick={() => mcp.disconnect(server.id)}
                      className="skeuo-btn px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <FiPause size={9} /> Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => mcp.connect(server.id)}
                      className="skeuo-btn px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                      style={{ color: "var(--accent-primary)" }}
                      disabled={isConnecting}
                    >
                      {isConnecting ? <FiRefreshCw size={9} className="animate-spin" /> : <FiPlay size={9} />}
                      {isConnecting ? "Connecting…" : "Connect"}
                    </button>
                  )}
                  <button
                    onClick={() => mcp.removeServer(server.id)}
                    className="skeuo-btn px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                    style={{ color: "#ef4444" }}
                  >
                    <FiTrash2 size={9} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add new server */}
        <div className="mt-4">
          <div className="text-[10px] font-semibold mb-3" style={{ color: "var(--text-tertiary)" }}>ADD SERVER</div>
          <div
            className="p-3.5 rounded-xl space-y-3"
            style={{
              background: "var(--bg-panel-inset)",
              boxShadow: "var(--input-inner-shadow)",
              border: "1px solid var(--border-dark)",
            }}
          >
            <div className="flex gap-2">
              <TextInput
                value={mcpNewServerName}
                onChange={setMcpNewServerName}
                placeholder="Server name (e.g. Web Search)"
              />
              <SelectInput
                value={mcpNewServerTransport}
                onChange={(v) => setMcpNewServerTransport(v as "stdio" | "sse")}
                options={[
                  { value: "sse", label: "SSE (HTTP)" },
                  { value: "stdio", label: "Stdio" },
                ]}
              />
            </div>

            {mcpNewServerTransport === "sse" ? (
              <TextInput
                value={mcpNewServerUrl}
                onChange={setMcpNewServerUrl}
                placeholder="Server URL (e.g. http://localhost:8000/sse)"
              />
            ) : (
              <div className="space-y-2">
                <TextInput
                  value={mcpNewServerCommand}
                  onChange={setMcpNewServerCommand}
                  placeholder="Command (e.g. uvx mcp-server-fetch)"
                />
                <TextInput
                  value={mcpNewServerArgs}
                  onChange={setMcpNewServerArgs}
                  placeholder="Arguments (space-separated)"
                />
              </div>
            )}

            <button
              onClick={addMcpServer}
              disabled={!mcpNewServerName.trim()}
              className="skeuo-btn w-full px-3 py-2 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30"
              style={{ color: "var(--accent-primary)" }}
            >
              <FiPlus size={11} />
              Add MCP Server
            </button>
          </div>
        </div>

        {/* Connected tools list */}
        {mcp.tools.length > 0 && (
          <div className="mt-6">
            <div className="text-[10px] font-semibold mb-2" style={{ color: "var(--text-tertiary)" }}>AVAILABLE MCP TOOLS ({mcp.tools.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {mcp.tools.map((tool) => (
                <span
                  key={`${tool.serverId}:${tool.name}`}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-mono"
                  style={{
                    backgroundColor: "var(--bg-panel-inset)",
                    color: "var(--text-secondary)",
                    boxShadow: "var(--input-inner-shadow)",
                    border: "1px solid var(--border-dark)",
                  }}
                  title={`${tool.serverName}: ${tool.description}`}
                >
                  {tool.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderAppearance = () => (
    <div>
      <SectionHeading title="Appearance" icon={<FiSun size={16} />} />

      <SettingRow label="Theme" description="Color palette for the interface.">
        <SelectInput
          value={settings["appearance.theme"]}
          onChange={(v) => update("appearance.theme", v)}
          options={[
            { value: "dark", label: "Obsidian Black" },
            { value: "light", label: "Warm Ivory" },
          ]}
        />
      </SettingRow>

      <SettingRow label="Accent color" description="Primary accent color for buttons, links, and highlights.">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={settings["appearance.accentColor"]}
            onChange={(e) => update("appearance.accentColor", e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
            style={{ backgroundColor: "transparent" }}
          />
          <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
            {settings["appearance.accentColor"]}
          </span>
        </div>
      </SettingRow>

      <SettingRow label="UI scale" description="Zoom level of the entire interface.">
        <SliderInput
          value={settings["appearance.uiScale"]}
          onChange={(v) => update("appearance.uiScale", v)}
          min={75}
          max={150}
          step={5}
          unit="%"
        />
      </SettingRow>

      <SettingRow label="Reduced motion" description="Disable animations for accessibility.">
        <Toggle
          checked={settings["appearance.reducedMotion"] === "true"}
          onChange={(v) => update("appearance.reducedMotion", String(v))}
        />
      </SettingRow>

      <SettingRow label="Status bar" description="Show the bottom status bar with note info.">
        <Toggle
          checked={settings["appearance.showStatusBar"] === "true"}
          onChange={(v) => update("appearance.showStatusBar", String(v))}
        />
      </SettingRow>

      {/* Preview swatch */}
      <div className="mt-5">
        <div className="text-[10px] font-semibold mb-2" style={{ color: "var(--text-tertiary)" }}>ACCENT PREVIEW</div>
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-8 rounded-xl"
            style={{
              backgroundColor: settings["appearance.accentColor"],
              boxShadow: `0 0 20px ${settings["appearance.accentColor"]}40`,
            }}
          />
          <div
            className="skeuo-btn px-4 py-2 rounded-xl text-[11px] font-bold"
            style={{ backgroundColor: settings["appearance.accentColor"], color: "var(--text-on-accent)" }}
          >
            Button
          </div>
          <span className="text-xs font-semibold" style={{ color: settings["appearance.accentColor"] }}>
            Accent text
          </span>
        </div>
      </div>
    </div>
  )

  const renderVault = () => (
    <div>
      <SectionHeading title="Vault & Data" icon={<FiDatabase size={16} />} />

      {/* Vault stats card */}
      <div
        className="mb-5 p-4 rounded-xl grid grid-cols-4 gap-4"
        style={{
          background: "var(--bg-panel-inset)",
          boxShadow: "var(--input-inner-shadow)",
          border: "1px solid var(--border-dark)",
        }}
      >
        {[
          { label: "Notes", value: vaultStats.noteCount, icon: <FiEdit3 size={14} /> },
          { label: "Words", value: vaultStats.totalWords.toLocaleString(), icon: <FiType size={14} /> },
          { label: "Characters", value: vaultStats.totalChars.toLocaleString(), icon: <FiGlobe size={14} /> },
          { label: "Avg Words/Note", value: vaultStats.avgWords, icon: <FiGrid size={14} /> },
        ].map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="flex justify-center mb-1" style={{ color: "var(--accent-primary)" }}>{stat.icon}</div>
            <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{stat.value}</div>
            <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <SettingRow label="Auto backup" description="Periodically create backup snapshots of your vault.">
        <Toggle
          checked={settings["vault.backupEnabled"] === "true"}
          onChange={(v) => update("vault.backupEnabled", String(v))}
        />
      </SettingRow>

      {settings["vault.backupEnabled"] === "true" && (
        <SettingRow label="Backup frequency" description="How often to create backups.">
          <SelectInput
            value={settings["vault.backupInterval"]}
            onChange={(v) => update("vault.backupInterval", v)}
            options={[
              { value: "hourly", label: "Every hour" },
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" },
            ]}
          />
        </SettingRow>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Data actions
        </div>

        <button
          onClick={exportVault}
          className="skeuo-btn w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all"
          style={{ color: "var(--text-secondary)" }}
        >
          <FiDownload size={14} style={{ color: "var(--accent-primary)" }} />
          Export Vault as JSON
          <span className="ml-auto text-[10px]" style={{ color: "var(--text-tertiary)" }}>{vaultStats.noteCount} notes</span>
        </button>

        <button
          onClick={clearAllData}
          className="skeuo-btn w-full px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all"
          style={{ color: "#ef4444" }}
        >
          <FiTrash2 size={14} />
          Clear All Data
          <span className="ml-auto text-[10px]" style={{ color: "var(--text-tertiary)" }}>Cannot be undone</span>
        </button>
      </div>
    </div>
  )

  const renderShortcuts = () => {
    const resetShortcut = (id: string) => {
      const next = { ...customShortcuts }
      delete next[id]
      setCustomShortcuts(next)
      saveCustomShortcuts(next)
    }

    const resetAll = () => {
      setCustomShortcuts({})
      saveCustomShortcuts({})
    }

    const categories = ["navigation", "panels", "editor", "ai"] as const
    const categoryLabels: Record<string, string> = {
      navigation: "Navigation", panels: "Panels & Overlays", editor: "Editor", ai: "AI",
    }

    return (
      <div>
        <SectionHeading title="Keyboard Shortcuts" icon={<FiCommand size={16} />} />

        <div className="text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
          Click any shortcut to remap it. Press <Kbd>Esc</Kbd> to cancel.
        </div>

        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={resetAll}
            className="skeuo-btn px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
            style={{ color: "var(--text-secondary)" }}
          >
            <FiRefreshCw size={10} />
            Reset All to Defaults
          </button>
        </div>

        {categories.map((cat) => {
          const items = DEFAULT_SHORTCUTS.filter((s) => s.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat} className="mb-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                {categoryLabels[cat]}
              </div>
              <div className="space-y-0">
                {items.map((s) => {
                  const effectiveKeys = getEffectiveBinding(s.id, customShortcuts)
                  const isCustomized = !!customShortcuts[s.id]
                  const isCapturing = capturing === s.id

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-2.5 border-b"
                      style={{ borderColor: "rgba(255,255,255,0.04)" }}
                    >
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{s.label}</span>
                      <div className="flex items-center gap-2">
                        {isCapturing ? (
                          <span
                            className="px-3 py-1 rounded-lg text-[10px] font-semibold animate-pulse"
                            style={{
                              backgroundColor: "var(--accent-primary)",
                              color: "var(--text-on-accent)",
                            }}
                          >
                            Press keys…
                          </span>
                        ) : (
                          <button
                            onClick={() => setCapturing(s.id)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:brightness-110 transition-all"
                            style={{
                              backgroundColor: "var(--bg-panel-inset)",
                              boxShadow: "var(--input-inner-shadow)",
                              border: `1px solid ${isCustomized ? "var(--accent-primary)" : "var(--border-dark)"}`,
                            }}
                            title="Click to remap"
                          >
                            {effectiveKeys.split("+").map((k, i, arr) => (
                              <React.Fragment key={i}>
                                <Kbd>{k.trim()}</Kbd>
                                {i < arr.length - 1 && (
                                  <span className="text-[9px] mx-0.5" style={{ color: "var(--text-tertiary)" }}>+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </button>
                        )}
                        {isCustomized && !isCapturing && (
                          <button
                            onClick={() => resetShortcut(s.id)}
                            className="p-1 rounded-lg hover:opacity-80 transition-opacity"
                            style={{ color: "var(--text-tertiary)" }}
                            title="Reset to default"
                          >
                            <FiRefreshCw size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Non-remappable shortcuts info */}
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
            Editor (fixed)
          </div>
          {[
            { action: "Bold", keys: "Ctrl + B" },
            { action: "Italic", keys: "Ctrl + I" },
            { action: "Save note", keys: "Auto-saved" },
            { action: "Send SAM message", keys: "Enter" },
            { action: "New line in SAM", keys: "Shift + Enter" },
          ].map((s) => (
            <div
              key={s.action}
              className="flex items-center justify-between py-2 border-b"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.action}</span>
              <div className="flex items-center gap-1">
                {s.keys.split(" + ").map((k, i, arr) => (
                  <React.Fragment key={i}>
                    <Kbd>{k.trim()}</Kbd>
                    {i < arr.length - 1 && (
                      <span className="text-[9px] mx-0.5" style={{ color: "var(--text-tertiary)" }}>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-4 p-3 rounded-xl text-[10px] leading-relaxed"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: "var(--text-tertiary)",
            boxShadow: "var(--input-inner-shadow)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <strong style={{ color: "var(--text-secondary)" }}>Tip:</strong> On macOS, use ⌘ Cmd in place of Ctrl for all shortcuts. Custom shortcuts sync across sessions.
        </div>
      </div>
    )
  }

  const renderAbout = () => (
    <div>
      <SectionHeading title="About Tesserin" icon={<FiInfo size={16} />} />

      {/* Brand header */}
      <div className="flex items-center gap-5 mb-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #FACC15 0%, #F59E0B 50%, #D97706 100%)",
            boxShadow: "0 0 30px rgba(250,204,21,0.3), inset 0 2px 4px rgba(255,255,255,0.3)",
          }}
        >
          <HiOutlineSparkles size={32} style={{ color: "var(--text-on-accent)" }} />
        </div>
        <div>
          <div className="text-lg font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>Tesserin</div>
          <div className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            v1.0.0-beta · Electron + React + SQLite
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Premium knowledge management for power users
          </div>
        </div>
      </div>

      {/* System info */}
      <div
        className="p-4 rounded-xl space-y-2.5 mb-5"
        style={{
          background: "var(--bg-panel-inset)",
          boxShadow: "var(--input-inner-shadow)",
          border: "1px solid var(--border-dark)",
        }}
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
          System Information
        </div>
        {[
          { label: "Platform", value: navigator.platform },
          { label: "User Agent", value: navigator.userAgent.split(" ").slice(-2).join(" ") },
          { label: "Electron", value: typeof window !== "undefined" && window.tesserin ? "Active" : "Browser mode" },
          { label: "Storage", value: typeof window !== "undefined" && window.tesserin?.db ? "SQLite (WAL)" : "localStorage" },
          { label: "AI Backend", value: "Ollama (local)" },
          { label: "Build Date", value: "February 2026" },
        ].map((info) => (
          <div key={info.label} className="flex items-center justify-between">
            <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{info.label}</span>
            <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>{info.value}</span>
          </div>
        ))}
      </div>

      {/* Credits */}
      <div
        className="p-4 rounded-xl space-y-1.5"
        style={{
          background: "var(--bg-panel-inset)",
          boxShadow: "var(--input-inner-shadow)",
          border: "1px solid var(--border-dark)",
        }}
      >
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
          Built With
        </div>
        {[
          "React 19 · Vite 6 · TypeScript 5.7",
          "Electron 33 · better-safe-sqlite3",
          "D3.js · Tesseradraw · Radix UI",
          "Tailwind CSS · Ollama",
        ].map((line) => (
          <div key={line} className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{line}</div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <div className="text-[9px] font-mono" style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>
          © 2026 Tesserin · MIT License · Made with ✦ for knowledge workers
        </div>
      </div>
    </div>
  )

  /* ---- API key & server handlers ---- */
  const createApiKey = useCallback(async () => {
    if (!apiNewKeyName.trim()) return
    if (typeof window === "undefined" || !window.tesserin?.api) return
    try {
      const result = await window.tesserin.api.keys.create({
        name: apiNewKeyName.trim(),
        permissions: apiNewKeyPermissions,
      })
      setApiNewKeyRevealed(result.rawKey)
      setApiNewKeyName("")
      // Refresh list
      const keys = await window.tesserin.api.keys.list()
      setApiKeys(keys)
    } catch (err) {
      console.error("[API] Failed to create key:", err)
    }
  }, [apiNewKeyName, apiNewKeyPermissions])

  const revokeApiKey = useCallback(async (id: string) => {
    if (typeof window === "undefined" || !window.tesserin?.api) return
    await window.tesserin.api.keys.revoke(id)
    const keys = await window.tesserin.api.keys.list()
    setApiKeys(keys)
  }, [])

  const deleteApiKeyHandler = useCallback(async (id: string) => {
    if (typeof window === "undefined" || !window.tesserin?.api) return
    if (!confirm("Delete this API key permanently?")) return
    await window.tesserin.api.keys.delete(id)
    const keys = await window.tesserin.api.keys.list()
    setApiKeys(keys)
  }, [])

  const toggleApiServer = useCallback(async () => {
    if (typeof window === "undefined" || !window.tesserin?.api) return
    if (apiServerStatus.running) {
      await window.tesserin.api.server.stop()
      setApiServerStatus({ running: false, port: apiServerStatus.port })
    } else {
      const port = parseInt(apiPort) || 9960
      const result = await window.tesserin.api.server.start(port)
      setApiServerStatus(result)
      setApiPort(String(result.port))
    }
  }, [apiServerStatus, apiPort])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setApiCopied(true)
    setTimeout(() => setApiCopied(false), 2000)
  }, [])

  const renderApi = () => {
    const AVAILABLE_PERMISSIONS = [
      { value: "*", label: "Full Access" },
      { value: "notes:read", label: "Read Notes" },
      { value: "notes:write", label: "Write Notes" },
      { value: "tasks:read", label: "Read Tasks" },
      { value: "tasks:write", label: "Write Tasks" },
      { value: "ai:use", label: "Use AI" },
    ]

    return (
      <div>
        <SectionHeading title="API Access" icon={<FiKey size={16} />} />

        <div className="text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
          Generate API keys to let external agents, scripts, and automations interact with Tesserin's capabilities
          over a local REST API. Any agent with a valid key can read/write notes, manage tasks, and use AI.
        </div>

        {/* Server status card */}
        <div
          className="mb-4 p-3.5 rounded-xl"
          style={{
            background: "var(--bg-panel-inset)",
            boxShadow: "var(--input-inner-shadow)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: apiServerStatus.running ? "#22c55e" : "#666",
                  boxShadow: apiServerStatus.running ? "0 0 8px #22c55e" : "none",
                }}
              />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                API Server
              </span>
              {apiServerStatus.running && (
                <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  · http://127.0.0.1:{apiServerStatus.port}
                </span>
              )}
            </div>
            <button
              onClick={toggleApiServer}
              className="skeuo-btn px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
              style={{ color: apiServerStatus.running ? "#ef4444" : "var(--accent-primary)" }}
            >
              {apiServerStatus.running ? <><FiPause size={10} /> Stop Server</> : <><FiPlay size={10} /> Start Server</>}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Port:</span>
            <TextInput
              value={apiPort}
              onChange={setApiPort}
              placeholder="9960"
              type="number"
              min="1024"
              max="65535"
            />
          </div>
        </div>

        {/* Generate new key */}
        <div className="mt-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            GENERATE API KEY
          </div>
          <div
            className="p-3.5 rounded-xl space-y-3"
            style={{
              background: "var(--bg-panel-inset)",
              boxShadow: "var(--input-inner-shadow)",
              border: "1px solid var(--border-dark)",
            }}
          >
            <TextInput
              value={apiNewKeyName}
              onChange={setApiNewKeyName}
              placeholder="Key name (e.g. My Automation Agent)"
            />

            <div>
              <div className="text-[10px] font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Permissions</div>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const isSelected = apiNewKeyPermissions.includes(perm.value)
                  return (
                    <button
                      key={perm.value}
                      onClick={() => {
                        if (perm.value === "*") {
                          setApiNewKeyPermissions(["*"])
                        } else {
                          setApiNewKeyPermissions((prev) => {
                            const filtered = prev.filter((p) => p !== "*")
                            return isSelected
                              ? filtered.filter((p) => p !== perm.value)
                              : [...filtered, perm.value]
                          })
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
                      style={{
                        backgroundColor: isSelected ? "var(--accent-primary)" : "var(--bg-panel)",
                        color: isSelected ? "var(--text-on-accent)" : "var(--text-secondary)",
                        border: `1px solid ${isSelected ? "transparent" : "var(--border-dark)"}`,
                      }}
                    >
                      {perm.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <button
              onClick={createApiKey}
              disabled={!apiNewKeyName.trim()}
              className="skeuo-btn w-full px-3 py-2 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30"
              style={{ color: "var(--accent-primary)" }}
            >
              <FiPlus size={11} />
              Generate Key
            </button>
          </div>
        </div>

        {/* Newly created key reveal */}
        {apiNewKeyRevealed && (
          <div
            className="mt-3 p-3.5 rounded-xl"
            style={{
              background: "rgba(250,204,21,0.06)",
              border: "1px solid rgba(250,204,21,0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FiAlertTriangle size={12} style={{ color: "var(--accent-primary)" }} />
              <span className="text-[10px] font-bold" style={{ color: "var(--accent-primary)" }}>
                Copy this key now — it won't be shown again!
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 text-[10px] font-mono p-2 rounded-lg break-all"
                style={{
                  backgroundColor: "var(--bg-panel-inset)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-dark)",
                }}
              >
                {apiNewKeyRevealed}
              </code>
              <button
                onClick={() => copyToClipboard(apiNewKeyRevealed)}
                className="skeuo-btn p-2 rounded-lg hover:brightness-110 active:scale-95 transition-all"
                style={{ color: apiCopied ? "#22c55e" : "var(--text-secondary)" }}
                title="Copy to clipboard"
              >
                {apiCopied ? <FiCheck size={14} /> : <FiCopy size={14} />}
              </button>
            </div>
            <button
              onClick={() => setApiNewKeyRevealed(null)}
              className="mt-2 text-[9px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Existing keys */}
        <div className="mt-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            API KEYS ({apiKeys.length})
          </div>

          {apiKeys.length === 0 && (
            <div className="text-[11px] py-4 text-center" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
              No API keys generated yet. Create one above to get started.
            </div>
          )}

          {apiKeys.map((key) => {
            const isRevoked = key.is_revoked === 1
            const isExpired = key.expires_at ? new Date(key.expires_at) < new Date() : false
            const isActive = !isRevoked && !isExpired
            let perms: string[] = []
            try { perms = JSON.parse(key.permissions) } catch {}

            return (
              <div
                key={key.id}
                className="mb-2 p-3 rounded-xl"
                style={{
                  background: "var(--bg-panel-inset)",
                  boxShadow: "var(--input-inner-shadow)",
                  border: "1px solid var(--border-dark)",
                  opacity: isActive ? 1 : 0.5,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: isActive ? "#22c55e" : "#ef4444",
                        boxShadow: isActive ? "0 0 6px #22c55e" : "none",
                      }}
                    />
                    <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {key.name}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-tertiary)" }}>
                      {key.prefix}…
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isActive && (
                      <button
                        onClick={() => revokeApiKey(key.id)}
                        className="skeuo-btn px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                        style={{ color: "#f59e0b" }}
                      >
                        <FiShield size={9} /> Revoke
                      </button>
                    )}
                    <button
                      onClick={() => deleteApiKeyHandler(key.id)}
                      className="skeuo-btn px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                      style={{ color: "#ef4444" }}
                    >
                      <FiTrash2 size={9} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[9px]" style={{ color: "var(--text-tertiary)" }}>
                  <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                  {key.last_used_at && <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>}
                  {isRevoked && <span style={{ color: "#ef4444" }}>Revoked</span>}
                  {isExpired && !isRevoked && <span style={{ color: "#ef4444" }}>Expired</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {perms.map((p) => (
                    <span
                      key={p}
                      className="px-1.5 py-0.5 rounded text-[8px] font-mono"
                      style={{
                        backgroundColor: "var(--bg-panel)",
                        color: "var(--text-tertiary)",
                        border: "1px solid var(--border-dark)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Usage docs */}
        <div
          className="mt-6 p-3.5 rounded-xl text-[10px] leading-relaxed space-y-2"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: "var(--text-tertiary)",
            boxShadow: "var(--input-inner-shadow)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <div className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>Quick Start</div>
          <div>
            Start the API server, generate a key, then call any endpoint:
          </div>
          <code
            className="block p-2 rounded-lg font-mono text-[9px] whitespace-pre"
            style={{ backgroundColor: "var(--bg-panel)", color: "var(--accent-primary)" }}
          >
{`curl http://127.0.0.1:${apiServerStatus.port}/api/notes \\
  -H "Authorization: Bearer YOUR_KEY"`}
          </code>
          <div className="mt-2">
            <strong style={{ color: "var(--text-secondary)" }}>Available endpoints:</strong>
          </div>
          <div className="font-mono text-[9px] space-y-0.5">
            <div>GET  /api/notes · /api/notes/:id · /api/notes/search/:q</div>
            <div>POST /api/notes · PUT /api/notes/:id · DELETE /api/notes/:id</div>
            <div>GET  /api/tags · POST /api/tags · DELETE /api/tags/:id</div>
            <div>GET  /api/folders · POST /api/folders · DELETE /api/folders/:id</div>
            <div>GET  /api/tasks · POST /api/tasks · PUT /api/tasks/:id</div>
            <div>POST /api/ai/chat · /api/ai/summarize · /api/ai/generate-tags</div>
            <div>GET  /api/knowledge/graph · /api/knowledge/context</div>
            <div>POST /api/knowledge/search · GET /api/knowledge/export</div>
            <div>GET  /api/agents · POST /api/agents/register</div>
            <div>GET  /api/vault/summary · /api/health</div>
          </div>
        </div>
      </div>
    )
  }

  /* ---- Cloud agent handlers ---- */
  const registerAgent = useCallback(async () => {
    if (typeof window === "undefined" || !window.tesserin?.agents) return
    try {
      await window.tesserin.agents.register(agentNewType, {})
      await loadAgents()
    } catch (err) {
      console.error("[Agents] Failed to register:", err)
    }
  }, [agentNewType, loadAgents])

  const connectAgent = useCallback(async (agentId: string) => {
    if (typeof window === "undefined" || !window.tesserin?.agents) return
    try {
      await window.tesserin.agents.connect(agentId)
      await loadAgents()
    } catch (err) {
      console.error("[Agents] Failed to connect:", err)
    }
  }, [loadAgents])

  const disconnectAgent = useCallback(async (agentId: string) => {
    if (typeof window === "undefined" || !window.tesserin?.agents) return
    try {
      await window.tesserin.agents.disconnect(agentId)
      await loadAgents()
    } catch (err) {
      console.error("[Agents] Failed to disconnect:", err)
    }
  }, [loadAgents])

  const removeAgent = useCallback(async (agentId: string) => {
    if (typeof window === "undefined" || !window.tesserin?.agents) return
    if (!confirm("Remove this cloud agent?")) return
    try {
      await window.tesserin.agents.remove(agentId)
      setAgentExpandedId(null)
      await loadAgents()
    } catch (err) {
      console.error("[Agents] Failed to remove:", err)
    }
  }, [loadAgents])

  const createAgentToken = useCallback(async (agentId: string) => {
    if (typeof window === "undefined" || !window.tesserin?.agents) return
    try {
      const result = await window.tesserin.agents.createToken(agentId, "api-access", ["vault:read", "vault:write", "ai:use"])
      if (result) {
        setAgentNewTokenRevealed(result.rawToken)
        setAgentNewTokenId(agentId)
      }
      await loadAgentTokens(agentId)
    } catch (err) {
      console.error("[Agents] Failed to create token:", err)
    }
  }, [loadAgentTokens])

  const revokeAgentToken = useCallback(async (agentId: string, tokenId: string) => {
    if (typeof window === "undefined" || !window.tesserin?.agents) return
    try {
      await window.tesserin.agents.revokeToken(agentId, tokenId)
      await loadAgentTokens(agentId)
    } catch (err) {
      console.error("[Agents] Failed to revoke token:", err)
    }
  }, [loadAgentTokens])

  const copyAgentToken = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
    setAgentTokenCopied(true)
    setTimeout(() => setAgentTokenCopied(false), 2000)
  }, [])

  const AGENT_TYPES = [
    { value: "claude-code", label: "Claude Code" },
    { value: "gemini-cli", label: "Gemini CLI" },
    { value: "openai-codex", label: "OpenAI Codex" },
    { value: "opencode", label: "OpenCode" },
    { value: "custom", label: "Custom Agent" },
  ]

  const renderCloudAgents = () => {
    return (
      <div>
        <SectionHeading title="Cloud Agents" icon={<FiGlobe size={16} />} />

        <div className="text-[11px] mb-4" style={{ color: "var(--text-tertiary)" }}>
          Connect external AI agents (Claude Code, Gemini CLI, Codex, etc.) to Tesserin via MCP.
          Cloud agents can access your notes and knowledge graph as context, enabling powerful multi-agent workflows.
        </div>

        {/* Docker MCP status */}
        <div
          className="mb-4 p-3.5 rounded-xl"
          style={{
            background: "var(--bg-panel-inset)",
            boxShadow: "var(--input-inner-shadow)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FiServer size={12} style={{ color: "var(--accent-primary)" }} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>Docker MCP Integration</span>
          </div>
          <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            Cloud agents connect via Docker MCP Toolkit. Ensure Docker Desktop is running with MCP Toolkit enabled.
            Agents use the <code className="font-mono" style={{ color: "var(--accent-primary)" }}>mcp.json</code> configuration in the project root.
          </div>
        </div>

        {/* Register new agent */}
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            ADD CLOUD AGENT
          </div>
          <div
            className="p-3.5 rounded-xl space-y-3"
            style={{
              background: "var(--bg-panel-inset)",
              boxShadow: "var(--input-inner-shadow)",
              border: "1px solid var(--border-dark)",
            }}
          >
            <div className="flex gap-2">
              <SelectInput
                value={agentNewType}
                onChange={setAgentNewType}
                options={AGENT_TYPES}
              />
              <button
                onClick={registerAgent}
                className="skeuo-btn px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
                style={{ color: "var(--accent-primary)" }}
              >
                <FiPlus size={11} />
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Registered agents list */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            REGISTERED AGENTS ({agents.length})
          </div>

          {agents.length === 0 && (
            <div className="text-[11px] py-4 text-center" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
              No cloud agents registered yet. Add one above to get started.
            </div>
          )}

          {agents.map((agent) => {
            const status = agentStatuses.find((s) => s.agentId === agent.id)
            const isConnected = status?.status === "connected"
            const isError = status?.status === "error"
            const isExpanded = agentExpandedId === agent.id

            return (
              <div
                key={agent.id}
                className="mb-2 rounded-xl overflow-hidden"
                style={{
                  background: "var(--bg-panel-inset)",
                  boxShadow: "var(--input-inner-shadow)",
                  border: "1px solid var(--border-dark)",
                }}
              >
                {/* Agent header row */}
                <div className="p-3 flex items-center justify-between">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      setAgentExpandedId(isExpanded ? null : agent.id)
                      if (!isExpanded) loadAgentTokens(agent.id)
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: isConnected ? "#22c55e" : isError ? "#ef4444" : "#666",
                          boxShadow: isConnected ? "0 0 6px #22c55e" : isError ? "0 0 6px #ef4444" : "none",
                        }}
                      />
                      <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {agent.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-tertiary)" }}>
                        {agent.type}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-tertiary)" }}>
                        {agent.transport}
                      </span>
                      {isConnected && status && (
                        <span className="text-[9px]" style={{ color: "#22c55e" }}>
                          {status.toolCount} tool{status.toolCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {isError && status?.error && (
                      <div className="text-[9px] mt-1 truncate" style={{ color: "#ef4444" }}>{status.error}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    {isConnected ? (
                      <button
                        onClick={() => disconnectAgent(agent.id)}
                        className="skeuo-btn px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <FiPause size={9} /> Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => connectAgent(agent.id)}
                        className="skeuo-btn px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        <FiPlay size={9} /> Connect
                      </button>
                    )}
                    <button
                      onClick={() => removeAgent(agent.id)}
                      className="skeuo-btn px-2 py-1 rounded-lg text-[9px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                      style={{ color: "#ef4444" }}
                    >
                      <FiTrash2 size={9} />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "var(--border-dark)" }}>
                    {/* Agent info */}
                    <div className="pt-3 flex flex-wrap gap-2 text-[9px]" style={{ color: "var(--text-tertiary)" }}>
                      {agent.dockerImage && <span>Docker: <code className="font-mono" style={{ color: "var(--accent-primary)" }}>{agent.dockerImage}</code></span>}
                      {agent.command && <span>Command: <code className="font-mono" style={{ color: "var(--accent-primary)" }}>{agent.command}</code></span>}
                      <span>KB Access: {agent.knowledgeBaseAccess ? "✓" : "✗"}</span>
                    </div>

                    {/* Permissions */}
                    <div>
                      <div className="text-[9px] font-semibold mb-1" style={{ color: "var(--text-tertiary)" }}>Permissions</div>
                      <div className="flex flex-wrap gap-1">
                        {agent.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-1.5 py-0.5 rounded text-[8px] font-mono"
                            style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-tertiary)", border: "1px solid var(--border-dark)" }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Token management */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-semibold" style={{ color: "var(--text-tertiary)" }}>Agent Tokens</div>
                        <button
                          onClick={() => createAgentToken(agent.id)}
                          className="skeuo-btn px-2 py-0.5 rounded-lg text-[8px] font-semibold flex items-center gap-1 hover:brightness-110 active:scale-95 transition-all"
                          style={{ color: "var(--accent-primary)" }}
                        >
                          <FiPlus size={8} /> New Token
                        </button>
                      </div>

                      {/* Revealed new token */}
                      {agentNewTokenRevealed && agentNewTokenId === agent.id && (
                        <div
                          className="mb-2 p-2.5 rounded-lg"
                          style={{ background: "rgba(250,204,21,0.06)", border: "1px solid rgba(250,204,21,0.2)" }}
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <FiAlertTriangle size={10} style={{ color: "var(--accent-primary)" }} />
                            <span className="text-[9px] font-bold" style={{ color: "var(--accent-primary)" }}>Copy now — won't be shown again!</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <code
                              className="flex-1 text-[9px] font-mono p-1.5 rounded break-all"
                              style={{ backgroundColor: "var(--bg-panel-inset)", color: "var(--text-primary)", border: "1px solid var(--border-dark)" }}
                            >
                              {agentNewTokenRevealed}
                            </code>
                            <button
                              onClick={() => copyAgentToken(agentNewTokenRevealed)}
                              className="skeuo-btn p-1.5 rounded-lg hover:brightness-110 active:scale-95 transition-all"
                              style={{ color: agentTokenCopied ? "#22c55e" : "var(--text-secondary)" }}
                            >
                              {agentTokenCopied ? <FiCheck size={12} /> : <FiCopy size={12} />}
                            </button>
                          </div>
                          <button
                            onClick={() => { setAgentNewTokenRevealed(null); setAgentNewTokenId(null) }}
                            className="mt-1.5 text-[8px] font-medium"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            Dismiss
                          </button>
                        </div>
                      )}

                      {/* Existing tokens */}
                      {agentTokens.filter((t) => t.agentId === agent.id).map((tok) => (
                        <div
                          key={tok.id}
                          className="mb-1 p-2 rounded-lg flex items-center justify-between"
                          style={{
                            backgroundColor: "var(--bg-panel)",
                            border: "1px solid var(--border-dark)",
                            opacity: tok.isRevoked ? 0.5 : 1,
                          }}
                        >
                          <div>
                            <span className="text-[9px] font-semibold" style={{ color: "var(--text-secondary)" }}>{tok.name}</span>
                            <span className="text-[8px] ml-2" style={{ color: "var(--text-tertiary)" }}>
                              {new Date(tok.createdAt).toLocaleDateString()}
                            </span>
                            {tok.isRevoked && (
                              <span className="text-[8px] ml-2" style={{ color: "#ef4444" }}>Revoked</span>
                            )}
                          </div>
                          {!tok.isRevoked && (
                            <button
                              onClick={() => revokeAgentToken(agent.id, tok.id)}
                              className="skeuo-btn px-1.5 py-0.5 rounded text-[8px] font-semibold hover:brightness-110 active:scale-95 transition-all"
                              style={{ color: "#f59e0b" }}
                            >
                              <FiShield size={8} /> Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Usage docs */}
        <div
          className="mt-6 p-3.5 rounded-xl text-[10px] leading-relaxed space-y-2"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: "var(--text-tertiary)",
            boxShadow: "var(--input-inner-shadow)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <div className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>How it works</div>
          <div>
            1. Register a cloud agent by type (Claude Code, Gemini CLI, etc.)
          </div>
          <div>
            2. Generate an agent token — this authenticates the agent to your vault's REST API.
          </div>
          <div>
            3. Connect the agent — it will start an MCP session with access to your notes and knowledge graph.
          </div>
          <div>
            4. External agents can also connect via Docker MCP Toolkit using the <code className="font-mono" style={{ color: "var(--accent-primary)" }}>mcp.json</code> config.
          </div>
          <code
            className="block p-2 rounded-lg font-mono text-[9px] whitespace-pre mt-2"
            style={{ backgroundColor: "var(--bg-panel)", color: "var(--accent-primary)" }}
          >
{`# Agent token auth:
curl http://127.0.0.1:${apiServerStatus.port}/api/knowledge/graph \\
  -H "Authorization: Agent YOUR_AGENT_TOKEN"`}
          </code>
        </div>
      </div>
    )
  }

  /* ---- Plugin toggle handler (uses shared API factory from PluginProvider) ---- */
  const togglePlugin = useCallback(async (pluginId: string, enable: boolean) => {
    const key = `tesserin:plugin:${pluginId}`
    localStorage.setItem(key, String(enable))
    setPluginToggles((prev) => ({ ...prev, [pluginId]: enable }))

    if (enable) {
      await pluginRegistry.activate(pluginId, createAPI)
    } else {
      await pluginRegistry.deactivate(pluginId)
    }
  }, [createAPI])

  const renderPlugins = () => {
    // Separate core plugins, workspace plugins, and community plugins
    const corePluginIds = new Set(["com.tesserin.word-count", "com.tesserin.daily-quote", "com.tesserin.backlinks"])
    const corePlugins = registeredPlugins.filter((p) => corePluginIds.has(p.id))
    const workspacePlugins = registeredPlugins.filter((p) => !corePluginIds.has(p.id) && p.id.startsWith("com.tesserin."))
    const communityPlugins = registeredPlugins.filter((p) => p.id.startsWith("community."))

    const renderPluginRow = (p: typeof registeredPlugins[0], showToggle: boolean) => {
      const isEnabled = pluginToggles[p.id] ?? p.enabled
      return (
        <div
          key={p.id}
          className="flex items-center justify-between py-3 border-b"
          style={{ borderColor: "rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isEnabled ? "rgba(250,204,21,0.08)" : "var(--bg-panel-inset)",
                boxShadow: isEnabled ? "0 0 12px rgba(250,204,21,0.1)" : "var(--input-inner-shadow)",
                border: `1px solid ${isEnabled ? "rgba(250,204,21,0.2)" : "var(--border-dark)"}`,
              }}
            >
              {p.manifest.icon || <FiPackage size={14} style={{ color: isEnabled ? "var(--accent-primary)" : "var(--text-tertiary)" }} />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{p.manifest.name}</div>
              <div className="text-[10px] truncate" style={{ color: "var(--text-tertiary)" }}>{p.manifest.description}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <span
              className="text-[9px] font-mono px-2 py-0.5 rounded-lg"
              style={{
                backgroundColor: "var(--bg-panel-inset)",
                color: "var(--text-tertiary)",
                border: "1px solid var(--border-dark)",
              }}
            >
              v{p.manifest.version}
            </span>
            {showToggle ? (
              <Toggle
                checked={isEnabled}
                onChange={(v) => togglePlugin(p.id, v)}
              />
            ) : (
              <span
                className="text-[9px] px-2 py-0.5 rounded-lg font-semibold"
                style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e" }}
              >
                Always On
              </span>
            )}
          </div>
        </div>
      )
    }

    return (
      <div>
        <SectionHeading title="Plugins" icon={<FiPackage size={16} />} />

        <div className="text-[11px] mb-5" style={{ color: "var(--text-tertiary)" }}>
          Manage workspace views, extensions, and community plugins. Toggle any
          plugin on or off as needed. Changes take effect immediately.
        </div>

        {/* Core plugins */}
        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            CORE PLUGINS
          </div>
          {corePlugins.map((p) => renderPluginRow(p, true))}
        </div>

        {/* Workspace plugins */}
        {workspacePlugins.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
              WORKSPACE PLUGINS
            </div>
            {workspacePlugins.map((p) => renderPluginRow(p, true))}
          </div>
        )}

        {/* Community plugins */}
        {communityPlugins.length > 0 && (
          <div className="mb-6">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
              COMMUNITY PLUGINS
            </div>
            {communityPlugins.map((p) => renderPluginRow(p, true))}
          </div>
        )}

        {/* Info box */}
        <div
          className="mt-6 p-3 rounded-xl text-[10px] leading-relaxed"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: "var(--text-tertiary)",
            boxShadow: "var(--input-inner-shadow)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <strong style={{ color: "var(--text-secondary)" }}>Note:</strong> Enabling a workspace plugin adds a new tab
          to the left dock. Disabling it removes the tab but does not delete any data you created with it.
        </div>
      </div>
    )
  }

  const renderThemes = () => (
    <div className="h-full">
      <ThemesPanel />
    </div>
  )

  const renderMarketplace = () => (
    <div className="h-full">
      <CommunityPluginsPanel />
    </div>
  )

  const renderFeatures = () => {
    const FEATURE_ITEMS: { key: SettingKey; label: string; description: string; icon: React.ReactNode }[] = [
      { key: "features.canvas", label: "Canvas", description: "Infinite whiteboard for visual thinking and diagrams.", icon: <FiCompass size={14} /> },
      { key: "features.graph", label: "Graph View", description: "Interactive knowledge graph visualizing note connections.", icon: <HiOutlineCpuChip size={14} /> },
      { key: "features.sam", label: "SAM (AI Assistant)", description: "AI-powered assistant for writing, summarizing, and brainstorming.", icon: <HiOutlineSparkles size={14} /> },
      { key: "features.floatingChat", label: "Floating AI Chat", description: "Quick-access AI chat bubble in the bottom-right corner.", icon: <HiOutlineSparkles size={14} /> },
      { key: "features.statusBar", label: "Status Bar", description: "Bottom bar showing tips and plugin widgets.", icon: <FiMonitor size={14} /> },
      { key: "features.backlinks", label: "Backlinks Panel", description: "See which notes link to the current note.", icon: <FiLink size={14} /> },
      { key: "features.versionHistory", label: "Version History", description: "Track and restore previous versions of notes.", icon: <FiClock size={14} /> },
      { key: "features.references", label: "Reference Manager", description: "Manage academic citations and bibliography.", icon: <FiDatabase size={14} /> },
      { key: "features.splitPanes", label: "Split Panes", description: "Side-by-side editing of two notes.", icon: <FiGrid size={14} /> },
      { key: "features.dailyNotes", label: "Daily Notes / Quick Capture", description: "Quick-capture overlay for rapid note creation.", icon: <FiEdit3 size={14} /> },
      { key: "features.templates", label: "Template Manager", description: "Create notes from pre-defined templates.", icon: <FiType size={14} /> },
    ]

    const enabledCount = FEATURE_ITEMS.filter(f => settings[f.key] === "true").length

    return (
      <div>
        <SectionHeading title="Features" icon={<FiGrid size={16} />} />

        <div className="text-[11px] mb-5" style={{ color: "var(--text-tertiary)" }}>
          Toggle features on or off to customize your workspace. Disabled features are hidden from the interface
          but no data is lost.{" "}
          <span style={{ color: "var(--accent-primary)" }}>{enabledCount}/{FEATURE_ITEMS.length} enabled</span>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => {
              FEATURE_ITEMS.forEach(f => updateImmediate(f.key, "true"))
            }}
            className="skeuo-btn px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
            style={{ color: "var(--accent-primary)" }}
          >
            <FiCheck size={10} /> Enable All
          </button>
          <button
            onClick={() => {
              FEATURE_ITEMS.forEach(f => updateImmediate(f.key, "false"))
            }}
            className="skeuo-btn px-3 py-1.5 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
            style={{ color: "var(--text-tertiary)" }}
          >
            <FiEye size={10} /> Disable All
          </button>
        </div>

        {/* Feature toggles */}
        <div className="space-y-0">
          {FEATURE_ITEMS.map((feature) => (
            <div
              key={feature.key}
              className="flex items-center justify-between py-3.5 border-b"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: settings[feature.key] === "true" ? "rgba(250,204,21,0.08)" : "var(--bg-panel-inset)",
                    boxShadow: settings[feature.key] === "true" ? "0 0 12px rgba(250,204,21,0.1)" : "var(--input-inner-shadow)",
                    border: `1px solid ${settings[feature.key] === "true" ? "rgba(250,204,21,0.2)" : "var(--border-dark)"}`,
                    color: settings[feature.key] === "true" ? "var(--accent-primary)" : "var(--text-tertiary)",
                  }}
                >
                  {feature.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{feature.label}</div>
                  <div className="text-[10px] truncate" style={{ color: "var(--text-tertiary)" }}>{feature.description}</div>
                </div>
              </div>
              <div className="ml-3">
                <Toggle
                  checked={settings[feature.key] === "true"}
                  onChange={(v) => updateImmediate(feature.key, String(v))}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div
          className="mt-6 p-3 rounded-xl text-[10px] leading-relaxed"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: "var(--text-tertiary)",
            boxShadow: "var(--input-inner-shadow)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <strong style={{ color: "var(--text-secondary)" }}>Tip:</strong> Disabling a tab (e.g. Canvas, Graph) removes it from the left dock.
          Disabling overlays (e.g. Floating Chat, Templates) hides their UI. You can re-enable everything at any time.
        </div>
      </div>
    )
  }

  /* ---- Section router ---- */
  const sectionContent = useMemo(() => {
    switch (activeSection) {
      case "general": return renderGeneral()
      case "editor": return renderEditor()
      case "ai": return renderAI()
      case "mcp": return renderMCP()
      case "api": return renderApi()
      case "agents": return renderCloudAgents()
      case "appearance": return renderAppearance()
      case "themes": return renderThemes()
      case "features": return renderFeatures()
      case "vault": return renderVault()
      case "plugins": return renderPlugins()
      case "marketplace": return renderMarketplace()
      case "shortcuts": return renderShortcuts()
      case "about": return renderAbout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, settings, aiStatus, aiModels, vaultStats, mcp.servers, mcp.statuses, mcp.tools, mcpNewServerName, mcpNewServerTransport, mcpNewServerUrl, mcpNewServerCommand, mcpNewServerArgs, registeredPlugins, pluginToggles, apiKeys, apiServerStatus, apiNewKeyName, apiNewKeyPermissions, apiNewKeyRevealed, apiPort, apiCopied, agents, agentStatuses, agentTokens, agentNewType, agentExpandedId, agentNewTokenRevealed, agentNewTokenId, agentTokenCopied, customShortcuts, capturing])

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Navigation sidebar ── */}
      <div
        className="w-56 shrink-0 flex flex-col border-r"
        style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
      >
        {/* Header */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border-dark)" }}>
          <div className="flex items-center gap-2.5">
            <FiSettings size={18} style={{ color: "var(--accent-primary)" }} />
            <span className="text-sm font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>
              Settings
            </span>
          </div>
        </div>

        {/* Section list */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-1">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${activeSection === section.id ? "" : "hover:brightness-110"
                }`}
              style={{
                background: activeSection === section.id ? "var(--accent-primary)" : "transparent",
                color: activeSection === section.id ? "var(--text-on-accent)" : "var(--text-secondary)",
              }}
            >
              <span className="shrink-0">{section.icon}</span>
              <span className="text-xs font-medium">{section.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-3 border-t space-y-2" style={{ borderColor: "var(--border-dark)" }}>
          {/* Reset section */}
          <button
            onClick={resetSection}
            className="skeuo-btn w-full px-3 py-2 rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
            style={{ color: "var(--text-tertiary)" }}
          >
            <FiRefreshCw size={10} />
            Reset Section
          </button>
        </div>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="h-12 border-b flex items-center justify-between px-6 shrink-0"
          style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {SECTIONS.find((s) => s.id === activeSection)?.label}
            </span>
          </div>

          {/* Save button */}
          <button
            onClick={saveSettings}
            disabled={!dirty || saving}
            className="skeuo-btn px-4 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              backgroundColor: dirty ? "var(--accent-primary)" : undefined,
              color: dirty ? "var(--text-on-accent)" : "var(--text-tertiary)",
            }}
          >
            {saving ? (
              <><FiRefreshCw size={12} className="animate-spin" /> Saving…</>
            ) : saved ? (
              <><FiCheck size={12} /> Saved</>
            ) : (
              <><FiSave size={12} /> Save Settings</>
            )}
          </button>
        </div>

        {/* Section content */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${activeSection === "marketplace" || activeSection === "themes" ? "p-4" : "p-6"}`}>
          {sectionContent}
        </div>
      </div>
    </div>
  )
}
