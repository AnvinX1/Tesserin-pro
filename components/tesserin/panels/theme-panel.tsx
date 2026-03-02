"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  FiSearch, FiDownload, FiTrash2, FiCheck, FiStar,
  FiUser, FiGrid, FiList, FiEye, FiSun, FiMoon,
  FiDroplet,
} from "react-icons/fi"
import {
  BUILTIN_THEMES,
  COMMUNITY_THEMES,
  ALL_THEMES,
  getInstalledThemeIds,
  installTheme,
  uninstallTheme,
  isThemeInstalled,
  getActiveThemeId,
  setActiveThemeId,
  getThemeById,
  generateThemeCSS,
  type TesserinTheme,
  type ThemeCategory,
} from "@/lib/theme-store"
import { useTesserinTheme } from "@/components/tesserin/core/theme-provider"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type ViewMode = "grid" | "list"
type TabId = "installed" | "browse"

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    dark:       { bg: "rgba(148,163,184,0.1)", text: "#94a3b8" },
    light:      { bg: "rgba(250,204,21,0.1)",  text: "#facc15" },
    colorful:   { bg: "rgba(168,85,247,0.1)",  text: "#a855f7" },
    minimal:    { bg: "rgba(34,197,94,0.1)",   text: "#22c55e" },
    warm:       { bg: "rgba(251,146,60,0.1)",  text: "#fb923c" },
    cool:       { bg: "rgba(59,130,246,0.1)",  text: "#3b82f6" },
    monochrome: { bg: "rgba(160,160,160,0.1)", text: "#a0a0a0" },
    brutalism:  { bg: "rgba(255,0,0,0.1)",     text: "#ef4444" },
    glass:      { bg: "rgba(56,189,248,0.1)",  text: "#38bdf8" },
    clay:       { bg: "rgba(210,105,30,0.1)",  text: "#d2691e" },
    retro:      { bg: "rgba(255,176,0,0.1)",   text: "#ffb000" },
    pastel:     { bg: "rgba(249,168,212,0.1)", text: "#f9a8d4" },
    all:        { bg: "rgba(255,255,255,0.05)", text: "var(--text-tertiary)" },
  }
  const c = colors[category] || colors.all
  return (
    <span
      className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-lg"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {category}
    </span>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <FiStar
          key={i}
          size={10}
          style={{
            color: i <= Math.round(rating) ? "#facc15" : "var(--text-tertiary)",
            fill: i <= Math.round(rating) ? "#facc15" : "none",
            opacity: i <= Math.round(rating) ? 1 : 0.3,
          }}
        />
      ))}
      <span className="text-[9px] ml-1" style={{ color: "var(--text-tertiary)" }}>
        {rating.toFixed(1)}
      </span>
    </div>
  )
}

function ThemePreview({ theme, size = "md" }: { theme: TesserinTheme; size?: "sm" | "md" }) {
  const [bg, accent, text] = theme.preview
  const dim = size === "sm" ? "w-full h-20" : "w-full h-28"
  return (
    <div
      className={`${dim} rounded-xl relative overflow-hidden`}
      style={{ backgroundColor: bg, border: `1px solid ${accent}22` }}
    >
      {/* Mini app mockup */}
      <div className="absolute inset-2 flex gap-1.5">
        {/* Sidebar mock */}
        <div
          className="w-6 rounded-lg flex flex-col items-center py-1.5 gap-1"
          style={{ backgroundColor: `${accent}15` }}
        >
          <div className="w-3 h-3 rounded" style={{ backgroundColor: accent, opacity: 0.6 }} />
          <div className="w-3 h-2 rounded" style={{ backgroundColor: text, opacity: 0.15 }} />
          <div className="w-3 h-2 rounded" style={{ backgroundColor: text, opacity: 0.1 }} />
        </div>
        {/* Main content mock */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-4 rounded-lg" style={{ backgroundColor: `${text}10` }} />
          <div className="flex-1 rounded-lg p-1.5 flex flex-col gap-1" style={{ backgroundColor: `${text}06` }}>
            <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: text, opacity: 0.25 }} />
            <div className="h-1.5 rounded-full w-1/2" style={{ backgroundColor: text, opacity: 0.15 }} />
            <div className="h-1.5 rounded-full w-2/3" style={{ backgroundColor: accent, opacity: 0.3 }} />
            <div className="h-1.5 rounded-full w-1/3" style={{ backgroundColor: text, opacity: 0.1 }} />
          </div>
        </div>
      </div>
      {/* Mode badge */}
      <div
        className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold"
        style={{ backgroundColor: `${accent}20`, color: accent }}
      >
        {theme.mode === "dark" ? <FiMoon size={8} /> : <FiSun size={8} />}
        {theme.mode}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Theme Card                                                          */
/* ------------------------------------------------------------------ */

function ThemeCard({
  theme,
  isActive,
  isInstalled: installed,
  onApply,
  onInstall,
  onUninstall,
}: {
  theme: TesserinTheme
  isActive: boolean
  isInstalled: boolean
  onApply: (id: string) => void
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
}) {
  const isBuiltin = BUILTIN_THEMES.some((t) => t.id === theme.id)

  return (
    <div
      className="group rounded-2xl p-4 transition-all duration-200 hover:brightness-110 flex flex-col gap-3"
      style={{
        background: isActive
          ? "linear-gradient(135deg, rgba(250,204,21,0.04), rgba(250,204,21,0.01))"
          : "var(--bg-panel-inset)",
        border: `1px solid ${isActive ? "rgba(250,204,21,0.15)" : "var(--border-dark)"}`,
        boxShadow: isActive ? "0 0 20px rgba(250,204,21,0.05)" : "var(--input-inner-shadow)",
      }}
    >
      {/* Preview */}
      <ThemePreview theme={theme} />

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
            {theme.name}
          </span>
          {isActive && (
            <span
              className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--accent-primary)", color: "var(--text-on-accent)" }}
            >
              Active
            </span>
          )}
        </div>
        <div className="text-[10px] leading-relaxed line-clamp-2 mb-2" style={{ color: "var(--text-tertiary)" }}>
          {theme.description}
        </div>
        <div className="flex items-center gap-2 text-[9px]" style={{ color: "var(--text-tertiary)" }}>
          <span className="flex items-center gap-1">
            <FiUser size={9} /> {theme.author}
          </span>
          <span>v{theme.version}</span>
        </div>
      </div>

      {/* Meta row */}
      {(theme.downloads || theme.rating) && (
        <div className="flex items-center justify-between">
          {theme.category && <CategoryBadge category={theme.category} />}
          <div className="flex items-center gap-3 text-[9px]" style={{ color: "var(--text-tertiary)" }}>
            {theme.downloads && (
              <span className="flex items-center gap-1">
                <FiDownload size={9} /> {formatCount(theme.downloads)}
              </span>
            )}
            {theme.rating && <StarRating rating={theme.rating} />}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {installed ? (
          <>
            <button
              onClick={() => onApply(theme.id)}
              disabled={isActive}
              className="flex-1 skeuo-btn px-3 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={isActive ? {
                backgroundColor: "var(--accent-primary)",
                color: "var(--text-on-accent)",
              } : {
                color: "var(--text-secondary)",
              }}
            >
              {isActive ? (
                <><FiCheck size={10} /> Active</>
              ) : (
                <><FiEye size={10} /> Apply</>
              )}
            </button>
            {!isBuiltin && (
              <button
                onClick={() => onUninstall(theme.id)}
                className="skeuo-btn px-3 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
                style={{ color: "#ef4444" }}
              >
                <FiTrash2 size={10} />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => onInstall(theme.id)}
            className="flex-1 skeuo-btn px-3 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
            style={{ color: "var(--accent-primary)" }}
          >
            <FiDownload size={10} /> Install
          </button>
        )}
      </div>
    </div>
  )
}

/* ---- List row variant ---- */

function ThemeRow({
  theme,
  isActive,
  isInstalled: installed,
  onApply,
  onInstall,
  onUninstall,
}: {
  theme: TesserinTheme
  isActive: boolean
  isInstalled: boolean
  onApply: (id: string) => void
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
}) {
  const isBuiltin = BUILTIN_THEMES.some((t) => t.id === theme.id)
  const [bg, accent] = theme.preview

  return (
    <div
      className="flex items-center gap-4 rounded-2xl px-4 py-3 transition-all duration-200 hover:brightness-110"
      style={{
        background: isActive
          ? "linear-gradient(135deg, rgba(250,204,21,0.04), rgba(250,204,21,0.01))"
          : "var(--bg-panel-inset)",
        border: `1px solid ${isActive ? "rgba(250,204,21,0.15)" : "var(--border-dark)"}`,
        boxShadow: isActive ? "0 0 20px rgba(250,204,21,0.05)" : "var(--input-inner-shadow)",
      }}
    >
      {/* Color swatch */}
      <div className="flex gap-1 shrink-0">
        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: bg, border: `1px solid ${accent}30` }} />
        <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: accent }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {theme.name}
          </span>
          {isActive && (
            <span
              className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0"
              style={{ backgroundColor: "var(--accent-primary)", color: "var(--text-on-accent)" }}
            >
              Active
            </span>
          )}
          {theme.category && <CategoryBadge category={theme.category} />}
        </div>
        <div className="text-[10px] truncate" style={{ color: "var(--text-tertiary)" }}>
          by {theme.author} · v{theme.version}
          {theme.downloads ? ` · ${formatCount(theme.downloads)} downloads` : ""}
        </div>
      </div>

      {/* Rating */}
      {theme.rating && <StarRating rating={theme.rating} />}

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {installed ? (
          <>
            <button
              onClick={() => onApply(theme.id)}
              disabled={isActive}
              className="skeuo-btn px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={isActive ? {
                backgroundColor: "var(--accent-primary)",
                color: "var(--text-on-accent)",
              } : {
                color: "var(--text-secondary)",
              }}
            >
              {isActive ? <><FiCheck size={10} /> Active</> : <><FiEye size={10} /> Apply</>}
            </button>
            {!isBuiltin && (
              <button
                onClick={() => onUninstall(theme.id)}
                className="skeuo-btn px-2 py-1.5 rounded-xl text-[10px] hover:brightness-110 active:scale-95 transition-all"
                style={{ color: "#ef4444" }}
              >
                <FiTrash2 size={10} />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={() => onInstall(theme.id)}
            className="skeuo-btn px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
            style={{ color: "var(--accent-primary)" }}
          >
            <FiDownload size={10} /> Install
          </button>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                          */
/* ------------------------------------------------------------------ */

export function ThemesPanel() {
  const { setTheme } = useTesserinTheme()

  const [activeTab, setActiveTab] = useState<TabId>("installed")
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<ThemeCategory>("all")
  const [activeThemeId, setActiveThemeIdState] = useState("tesserin.obsidian-black")
  const [installedIds, setInstalledIds] = useState<string[]>([])

  // Load state
  useEffect(() => {
    getActiveThemeId().then(setActiveThemeIdState)
    setInstalledIds(getInstalledThemeIds())
  }, [])

  // --- Actions ---

  const handleApply = useCallback((themeId: string) => {
    const theme = getThemeById(themeId)
    if (!theme) return

    setActiveThemeIdState(themeId)
    setActiveThemeId(themeId)

    // Update the base mode (dark/light)
    setTheme(theme.mode)

    // Inject custom CSS overrides
    const cssId = "tesserin-custom-theme"
    let el = document.getElementById(cssId)
    if (!el) {
      el = document.createElement("style")
      el.id = cssId
      document.head.appendChild(el)
    }
    el.textContent = generateThemeCSS(theme)
  }, [setTheme])

  const handleInstall = useCallback((themeId: string) => {
    installTheme(themeId)
    setInstalledIds(getInstalledThemeIds())
  }, [])

  const handleUninstall = useCallback((themeId: string) => {
    // If uninstalling the active theme, revert to default
    if (themeId === activeThemeId) {
      handleApply("tesserin.obsidian-black")
    }
    uninstallTheme(themeId)
    setInstalledIds(getInstalledThemeIds())
  }, [activeThemeId, handleApply])

  // --- Filtering ---

  const categories: ThemeCategory[] = ["all", "dark", "light", "monochrome", "brutalism", "glass", "clay", "retro", "pastel", "colorful", "minimal", "warm", "cool"]

  const installedThemes = useMemo(() => {
    return ALL_THEMES.filter((t) => isThemeInstalled(t.id))
  }, [installedIds])

  const browseThemes = useMemo(() => {
    let list = COMMUNITY_THEMES
    if (category !== "all") {
      if (category === "dark" || category === "light") {
        list = list.filter((t) => t.mode === category)
      } else {
        list = list.filter((t) => t.category === category)
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      )
    }
    return list
  }, [category, search])

  const displayThemes = activeTab === "installed" ? installedThemes : browseThemes

  // --- Render ---

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header with tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--bg-panel-inset)", boxShadow: "var(--input-inner-shadow)" }}>
          {(["installed", "browse"] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                backgroundColor: activeTab === tab ? "var(--accent-primary)" : "transparent",
                color: activeTab === tab ? "var(--text-on-accent)" : "var(--text-tertiary)",
              }}
            >
              {tab === "installed" ? `Installed (${installedThemes.length})` : "Browse Community"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--bg-panel-inset)", boxShadow: "var(--input-inner-shadow)" }}>
            <button
              onClick={() => setViewMode("grid")}
              className="p-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: viewMode === "grid" ? "var(--accent-primary)" : "transparent",
                color: viewMode === "grid" ? "var(--text-on-accent)" : "var(--text-tertiary)",
              }}
            >
              <FiGrid size={12} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="p-1.5 rounded-lg transition-all"
              style={{
                backgroundColor: viewMode === "list" ? "var(--accent-primary)" : "transparent",
                color: viewMode === "list" ? "var(--text-on-accent)" : "var(--text-tertiary)",
              }}
            >
              <FiList size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3">
        <div
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: "var(--bg-panel-inset)", boxShadow: "var(--input-inner-shadow)" }}
        >
          <FiSearch size={14} style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            placeholder="Search themes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all"
              style={{
                backgroundColor: category === cat ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                color: category === cat ? "var(--text-on-accent)" : "var(--text-tertiary)",
                boxShadow: category === cat ? "none" : "var(--input-inner-shadow)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Theme grid / list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {displayThemes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <FiDroplet size={32} style={{ color: "var(--text-tertiary)", opacity: 0.3 }} />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {activeTab === "installed" ? "No themes installed yet." : "No themes match your search."}
            </span>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {displayThemes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                isActive={theme.id === activeThemeId}
                isInstalled={isThemeInstalled(theme.id)}
                onApply={handleApply}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {displayThemes.map((theme) => (
              <ThemeRow
                key={theme.id}
                theme={theme}
                isActive={theme.id === activeThemeId}
                isInstalled={isThemeInstalled(theme.id)}
                onApply={handleApply}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
