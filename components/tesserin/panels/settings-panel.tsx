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
} from "react-icons/fi"
import {
  HiOutlineCpuChip,
  HiOutlineSparkles,
} from "react-icons/hi2"
import { getSetting, setSetting } from "@/lib/storage-client"
import { useNotes } from "@/lib/notes-store"

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

  "appearance.theme": "dark",
  "appearance.accentColor": "#FACC15",
  "appearance.uiScale": "100",
  "appearance.sidebarWidth": "72",
  "appearance.reducedMotion": "false",
  "appearance.showStatusBar": "true",

  "vault.backupEnabled": "false",
  "vault.backupInterval": "daily",
  "vault.defaultNoteTemplate": "none",
}

/* ------------------------------------------------------------------ */
/*  Section definitions                                                */
/* ------------------------------------------------------------------ */

type SectionId = "general" | "editor" | "ai" | "appearance" | "vault" | "shortcuts" | "about"

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: "general",    label: "General",    icon: <FiSettings size={16} /> },
  { id: "editor",     label: "Editor",     icon: <FiEdit3 size={16} /> },
  { id: "ai",         label: "AI / SAM",   icon: <HiOutlineCpuChip size={16} /> },
  { id: "appearance", label: "Appearance", icon: <FiSun size={16} /> },
  { id: "vault",      label: "Vault & Data", icon: <FiDatabase size={16} /> },
  { id: "shortcuts",  label: "Shortcuts",  icon: <FiCommand size={16} /> },
  { id: "about",      label: "About",      icon: <FiInfo size={16} /> },
]

/* ------------------------------------------------------------------ */
/*  Shortcut definitions                                               */
/* ------------------------------------------------------------------ */

const SHORTCUTS = [
  { action: "Search notes",            keys: "Ctrl + K" },
  { action: "Export note",             keys: "Ctrl + E" },
  { action: "Template manager",        keys: "Ctrl + T" },
  { action: "New note",                keys: "Ctrl + N" },
  { action: "Bold",                    keys: "Ctrl + B" },
  { action: "Italic",                  keys: "Ctrl + I" },
  { action: "Save note",              keys: "Auto-saved" },
  { action: "Toggle sidebar",         keys: "Ctrl + \\" },
  { action: "Send SAM message",       keys: "Enter" },
  { action: "New line in SAM",        keys: "Shift + Enter" },
  { action: "Navigate graph",         keys: "Click + Drag" },
  { action: "Zoom graph",             keys: "Scroll" },
]

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
          backgroundColor: checked ? "#000" : "var(--text-tertiary)",
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
  const [activeSection, setActiveSection] = useState<SectionId>("general")
  const [settings, setSettings] = useState<SettingsValues>({ ...DEFAULTS })
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [aiStatus, setAiStatus] = useState<"checking" | "connected" | "disconnected" | null>(null)
  const [aiModels, setAiModels] = useState<string[]>([])

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
  }, [])

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
            { value: "code", label: "Code" },
            { value: "kanban", label: "Kanban" },
            { value: "daily", label: "Daily Notes" },
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
            { value: "2048",  label: "2K tokens" },
            { value: "4096",  label: "4K tokens" },
            { value: "8192",  label: "8K tokens" },
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
    </div>
  )

  const renderAppearance = () => (
    <div>
      <SectionHeading title="Appearance" icon={<FiSun size={16} />} />

      <SettingRow label="Theme" description="Color palette for the interface.">
        <SelectInput
          value={settings["appearance.theme"]}
          onChange={(v) => update("appearance.theme", v)}
          options={[
            { value: "dark",  label: "Obsidian Black" },
            { value: "light", label: "Ceramic White" },
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
            style={{ backgroundColor: settings["appearance.accentColor"], color: "#000" }}
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
              { value: "daily",  label: "Daily" },
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

  const renderShortcuts = () => (
    <div>
      <SectionHeading title="Keyboard Shortcuts" icon={<FiCommand size={16} />} />

      <div className="space-y-0">
        {SHORTCUTS.map((s) => (
          <div
            key={s.action}
            className="flex items-center justify-between py-2.5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{s.action}</span>
            <div className="flex items-center gap-1">
              {s.keys.split(" + ").map((k, i, arr) => (
                <React.Fragment key={k}>
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
        <strong style={{ color: "var(--text-secondary)" }}>Tip:</strong> On macOS, use ⌘ Cmd in place of Ctrl for all shortcuts.
      </div>
    </div>
  )

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
          <HiOutlineSparkles size={32} className="text-gray-900" />
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
          "Electron 33 · better-sqlite3",
          "D3.js · Excalidraw · Radix UI",
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

  /* ---- Section router ---- */
  const sectionContent = useMemo(() => {
    switch (activeSection) {
      case "general":    return renderGeneral()
      case "editor":     return renderEditor()
      case "ai":         return renderAI()
      case "appearance": return renderAppearance()
      case "vault":      return renderVault()
      case "shortcuts":  return renderShortcuts()
      case "about":      return renderAbout()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, settings, aiStatus, aiModels, vaultStats])

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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 ${
                activeSection === section.id ? "" : "hover:brightness-110"
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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 max-w-2xl">
          {sectionContent}
        </div>
      </div>
    </div>
  )
}
