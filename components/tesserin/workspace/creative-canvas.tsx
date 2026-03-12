import React, { useRef, useEffect, useCallback, useState } from "react"
import {
  Excalidraw,
  WelcomeScreen,
} from "@excalidraw/excalidraw"
import "@excalidraw/excalidraw/index.css"
import { TesserinLogo } from "../core/tesserin-logo"
import { TesseradrawLogo } from "./tesseradraw-logo"
import { AnimatedIcon } from "../core/animated-icon"
import { ScribbledPlus, ScribbledSearch, ScribbledZap, ScribbledExpand, ScribbledCollapse } from "../core/scribbled-icons"
import * as storage from "@/lib/storage-client"
import { useTesserinTheme } from "@/components/tesserin/core/theme-provider"
import { useNotes, type Note } from "@/lib/notes-store"
import { useCanvasStore } from "@/lib/canvas-store"
import { setExcalidrawAPI } from "@/lib/canvas-store"
import { excalidrawId } from "@/lib/canvas-elements"
import { CanvasTabBar } from "./canvas-tab-bar"
import { FiFileText, FiX, FiColumns } from "react-icons/fi"

/**
 * CreativeCanvas — Tesseradraw
 *
 * Wraps the Excalidraw engine in permanent dark mode.
 * Automatically saves/loads canvas data to/from SQLite.
 */

const DARK_BG = "#121212"
const LIGHT_BG = "#fdfbf7"

/** Storage key for library items across all sessions */
const LIBRARY_STORAGE_KEY = "tesserin:canvas:library"

/** Fields from appState worth persisting (skip transient UI fields) */
const PERSIST_APP_STATE_KEYS = [
  "theme",
  "viewBackgroundColor",
  "currentItemStrokeColor",
  "currentItemBackgroundColor",
  "currentItemFillStyle",
  "currentItemStrokeWidth",
  "currentItemRoughness",
  "currentItemOpacity",
  "currentItemFontFamily",
  "currentItemFontSize",
  "currentItemTextAlign",
  "currentItemRoundness",
  "currentItemArrowType",
] as const

/* ── helpers ──────────────────────────────────────────── */

/** Create Excalidraw elements representing a note card */
function createNoteCardElements(note: Note, x: number, y: number, isDark: boolean) {
  const cardWidth = 260
  const cardHeight = 120
  const preview = note.content
    .replace(/^#.*\n?/gm, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .trim()
    .slice(0, 100)

  const groupId = excalidrawId()

  // Card background rectangle
  const rect = {
    id: excalidrawId(),
    type: "rectangle" as const,
    x,
    y,
    width: cardWidth,
    height: cardHeight,
    strokeColor: isDark ? "#FACC15" : "#CA8A04",
    backgroundColor: isDark ? "#1a1a1a" : "#fdfbf7",
    fillStyle: "solid" as const,
    strokeWidth: 2,
    roughness: 0,
    opacity: 100,
    angle: 0,
    strokeStyle: "solid" as const,
    roundness: { type: 3, value: 12 },
    seed: Math.floor(Math.random() * 1000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    groupIds: [groupId],
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    frameId: null,
  }

  // Note title text
  const titleText = {
    id: excalidrawId(),
    type: "text" as const,
    x: x + 16,
    y: y + 14,
    width: cardWidth - 32,
    height: 24,
    text: note.title,
    fontSize: 18,
    fontFamily: 1,
    textAlign: "left" as const,
    verticalAlign: "top" as const,
    strokeColor: isDark ? "#FACC15" : "#CA8A04",
    backgroundColor: "transparent",
    fillStyle: "solid" as const,
    strokeWidth: 1,
    roughness: 0,
    opacity: 100,
    angle: 0,
    strokeStyle: "solid" as const,
    roundness: null,
    seed: Math.floor(Math.random() * 1000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    groupIds: [groupId],
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    frameId: null,
    containerId: null,
    originalText: note.title,
    autoResize: false,
    lineHeight: 1.25,
  }

  // Preview text
  const previewText = {
    id: excalidrawId(),
    type: "text" as const,
    x: x + 16,
    y: y + 46,
    width: cardWidth - 32,
    height: 56,
    text: preview || "(empty note)",
    fontSize: 12,
    fontFamily: 1,
    textAlign: "left" as const,
    verticalAlign: "top" as const,
    strokeColor: isDark ? "#888888" : "#7a756b",
    backgroundColor: "transparent",
    fillStyle: "solid" as const,
    strokeWidth: 1,
    roughness: 0,
    opacity: 80,
    angle: 0,
    strokeStyle: "solid" as const,
    roundness: null,
    seed: Math.floor(Math.random() * 1000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000),
    isDeleted: false,
    groupIds: [groupId],
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    frameId: null,
    containerId: null,
    originalText: preview || "(empty note)",
    autoResize: false,
    lineHeight: 1.25,
  }

  return [rect, titleText, previewText]
}

/* ── Note Picker Panel ───────────────────────────────── */

function NotePickerPanel({
  notes,
  onInsert,
  onClose,
}: {
  notes: Note[]
  onInsert: (note: Note) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState("")
  const filtered = search.trim()
    ? notes.filter(
      (n) =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.tags.some((t) => t.name.toLowerCase().includes(search.toLowerCase())),
    )
    : notes

  return (
    <div
      className="skeuo-panel absolute top-3 left-3 z-50 w-64 overflow-hidden"
    >
      <div
        className="px-3 py-2.5 flex items-center gap-2"
        style={{
          borderBottom: "1px solid var(--border-light)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <FiFileText size={14} style={{ color: "var(--accent-primary)" }} />
        <span className="text-xs font-bold flex-1" style={{ color: "var(--text-primary)" }}>Insert Note</span>
        <button
          onClick={onClose}
          className="skeuo-btn flex items-center justify-center transition-all"
          style={{ width: 22, height: 22, borderRadius: 7, color: "var(--text-secondary)" }}
        >
          <FiX size={11} />
        </button>
      </div>
      <div className="px-2.5 py-2">
        <div className="skeuo-inset flex items-center gap-2 px-2.5 py-1.5">
          <ScribbledSearch size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-xs focus:outline-none"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search notes..."
          />
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto custom-scrollbar px-2 pb-2">
        {filtered.length === 0 && (
          <p className="text-[10px] text-center py-4" style={{ color: "var(--text-tertiary)" }}>
            No notes found
          </p>
        )}
        {filtered.map((note) => (
          <button
            key={note.id}
            onClick={() => onInsert(note)}
            className="w-full text-left px-2.5 py-2 mb-0.5 flex items-center gap-2 transition-all"
            style={{
              color: "var(--text-primary)",
              borderRadius: "var(--radius-inset)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-panel-inset)"
              e.currentTarget.style.boxShadow = "var(--input-inner-shadow)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.boxShadow = "none"
            }}
          >
            <FiFileText size={12} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{note.title}</p>
              {note.tags.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {note.tags.slice(0, 3).map((t) => (
                    <span key={t.id} className="text-[8px] px-1 rounded-full" style={{ backgroundColor: t.color + "22", color: t.color }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ScribbledPlus size={12} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── component ───────────────────────────────────────────── */

export function CreativeCanvas({ onSplitOpen, paneId = "primary" }: { onSplitOpen?: () => void; paneId?: string } = {}) {
  const { isDark } = useTesserinTheme()
  const { notes } = useNotes()
  const {
    canvases,
    activeCanvasId: globalActiveCanvasId,
    isLoading: canvasListLoading,
    loadCanvases,
    createCanvas,
    deleteCanvas,
    renameCanvas,
    duplicateCanvas,
    setActiveCanvas: globalSetActiveCanvas,
    touchCanvas,
  } = useCanvasStore()

  // ── Per-pane canvas selection isolation ────────────────────────────────────
  // Both panes share the global store, but writing activeCanvasId there makes
  // the other pane jump to the same canvas. The secondary pane keeps its own
  // local selection so the two panes are fully independent.
  // The selection is persisted to localStorage so split-pane restores the
  // correct canvas on reload instead of always resetting to canvases[0].
  const isSecondaryPane = paneId !== "primary"
  const splitPaneKey = `tesserin:canvas:split-pane:${paneId}`

  const [localCanvasId, setLocalCanvasId] = useState<string | null>(() => {
    if (!isSecondaryPane) return null
    try { return localStorage.getItem(splitPaneKey) } catch { return null }
  })

  // Shadow the global names — all existing code in this component uses these
  // and automatically gets per-pane isolation for free.
  const activeCanvasId = isSecondaryPane ? localCanvasId : globalActiveCanvasId
  const setActiveCanvas = useCallback((id: string | null) => {
    if (isSecondaryPane) {
      setLocalCanvasId(id)
      try {
        if (id) localStorage.setItem(splitPaneKey, id)
        else localStorage.removeItem(splitPaneKey)
      } catch {}
    } else {
      globalSetActiveCanvas(id)
    }
  }, [isSecondaryPane, globalSetActiveCanvas, splitPaneKey])

  const apiRef = useRef<any>(null)
  const canvasIdRef = useRef<string | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** True while loading canvas data — shows a solid overlay so no blank/stale-scene flash */
  const [isTransitioning, setIsTransitioning] = useState(true)
  const readyToSave = useRef(false)
  /** Full-board mode — uses native Fullscreen API for zero-glitch takeover */
  const [isFullscreen, setIsFullscreen] = useState(false)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  /** Canvas scene queued when data loads before Excalidraw's onAPI fires (first-mount race) */
  const pendingSceneRef = useRef<{ elements: any[]; appState: any; files?: any } | null>(null)
  /** Tracks the last canvas ID that was fully loaded — prevents spurious reloads when only canvasListLoading toggles */
  const lastLoadedCanvasRef = useRef<string | null>(null)
  /** Library items read once on mount for Excalidraw's initialData (shared across canvases) */
  const [libraryInitData] = useState<any[] | undefined>(() => {
    try {
      const raw = localStorage.getItem(LIBRARY_STORAGE_KEY)
      return raw ? JSON.parse(raw) : undefined
    } catch { return undefined }
  })
  const [showNotePicker, setShowNotePicker] = useState(false)
  const insertCountRef = useRef(0)


  // Sync isFullscreen state with native fullscreenchange events (handles Escape key natively)
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // When the canvas container becomes visible again (e.g. after switching back
  // from another tab where it was hidden via display:none), Excalidraw's internal
  // canvas dimensions may be stale. Dispatching a resize event triggers its
  // ResizeObserver to recalculate, preventing a blank/mis-sized canvas.
  useEffect(() => {
    const el = canvasContainerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.dispatchEvent(new Event("resize"))
        }
      },
      { threshold: 0.01 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      canvasContainerRef.current?.requestFullscreen()
    }
  }, [])

  // Load canvas list on mount
  useEffect(() => {
    loadCanvases()
  }, [])

  // Auto-select a canvas when the list loads and no valid canvas is active.
  // For the secondary pane this also validates the persisted selection against
  // the current canvas list (the canvas may have been deleted between sessions).
  useEffect(() => {
    if (canvasListLoading || canvases.length === 0) return
    if (
      !activeCanvasId ||
      (isSecondaryPane && !canvases.some((c) => c.id === activeCanvasId))
    ) {
      setActiveCanvas(canvases[0].id)
    }
  }, [canvases, activeCanvasId, canvasListLoading, setActiveCanvas, isSecondaryPane])

  // Listen for canvas:updated events from MCP/IPC
  useEffect(() => {
    const handler = (updatedId: string) => {
      if (updatedId === canvasIdRef.current && apiRef.current) {
        // Reload canvas data from storage and update scene
        storage.getCanvas(updatedId).then((canvas) => {
          if (!canvas) return
          try {
            const elements = canvas.elements ? JSON.parse(canvas.elements) : []
            const files = canvas.files ? JSON.parse(canvas.files) : undefined
            apiRef.current.updateScene({
              elements,
              ...(files ? { files } : {}),
            })
          } catch { }
        })
      }
    }
    // onCanvasUpdated wraps our callback in an IPC-event handler and returns
    // the wrapped reference — we must capture it so offCanvasUpdated can
    // remove the correct listener (passing the original callback won't work).
    let registeredHandler: ((...args: any[]) => void) | undefined
    if (typeof window !== "undefined" && window.tesserin?.onCanvasUpdated) {
      registeredHandler = window.tesserin.onCanvasUpdated(handler)
    }
    return () => {
      if (registeredHandler && typeof window !== "undefined" && window.tesserin?.offCanvasUpdated) {
        window.tesserin.offCanvasUpdated(registeredHandler)
      }
    }
  }, [])

  /** Handle new canvas creation from tab bar */
  const handleCreateCanvas = useCallback(async () => {
    // Cancel debounced save and flush current canvas before switching
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    saveNowRef.current?.()
    await createCanvas("Untitled Canvas")
  }, [createCanvas])

  /** Handle switching canvases */
  const handleSelectCanvas = useCallback(
    (id: string) => {
      if (id === activeCanvasId) return
      // Cancel any pending debounced save so it doesn't land on the new canvas
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      // Flush current canvas immediately
      saveNowRef.current?.()
      setActiveCanvas(id)
    },
    [activeCanvasId, setActiveCanvas],
  )

  /** Handle closing a canvas tab (delete) */
  const handleCloseCanvas = useCallback(
    async (id: string) => {
      await deleteCanvas(id)
    },
    [deleteCanvas],
  )

  /** Duplicate a canvas; for the secondary pane, select locally not globally. */
  const handleDuplicateCanvas = useCallback(
    async (id: string) => {
      const newId = await duplicateCanvas(id, !isSecondaryPane)
      if (isSecondaryPane) setLocalCanvasId(newId)
    },
    [duplicateCanvas, isSecondaryPane],
  )

  /** Insert a note as a card onto the canvas */
  const handleInsertNote = useCallback(
    (note: Note) => {
      const api = apiRef.current
      if (!api) return

      // Position each card with a slight offset to avoid stacking
      const offset = insertCountRef.current * 30
      insertCountRef.current++

      // Get current viewport center for placement
      const appState = api.getAppState()
      const centerX = (appState.scrollX ? -appState.scrollX : 0) + 200 + offset
      const centerY = (appState.scrollY ? -appState.scrollY : 0) + 150 + offset

      const newElements = createNoteCardElements(note, centerX, centerY, isDark)
      const existingElements = api.getSceneElements()
      api.updateScene({
        elements: [...existingElements, ...newElements],
      })
      setShowNotePicker(false)
    },
    [isDark],
  )

  // ── Load canvas from SQLite (or localStorage fallback) when activeCanvasId changes ─
  // Uses updateScene() after Excalidraw mounts so it never remounts on canvas switches.
  // This eliminates the "blank flash" and "stuck" behaviour between canvas tabs.
  useEffect(() => {
    if (!activeCanvasId) {
      // Keep the dark overlay while the canvas list is still being fetched.
      // Dropping it early would expose Excalidraw's default light render
      // before the first canvas is selected and its dark appState applied.
      if (!canvasListLoading) {
        setIsTransitioning(false)
      }
      readyToSave.current = false
      return
    }

    // Skip reload when only canvasListLoading toggled — the canvas hasn't actually changed.
    // This prevents spurious DB reads + readyToSave resets on background refreshes.
    if (activeCanvasId === lastLoadedCanvasRef.current) return
    lastLoadedCanvasRef.current = activeCanvasId

    // Flush current canvas before switching — handles cases where the caller
    // (e.g. sidebar onSelect) goes straight to setActiveCanvas without calling
    // handleSelectCanvas's explicit saveNow() first.
    saveNowRef.current?.()

    let cancelled = false
    setIsTransitioning(true)
    readyToSave.current = false
    // Cancel any pending debounced save from the previous canvas
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    async function loadCanvas() {
      let elements: any[] = []
      let appState: Record<string, any> = { theme: isDark ? "dark" : "light" }
      let files: any | undefined

      try {
        // Try storage API first (SQLite via IPC)
        let canvas = await storage.getCanvas(activeCanvasId!)

        // Always check localStorage — saveNow() writes here synchronously before
        // the async IPC call completes, so on a reload localStorage may hold
        // drawings that never made it to SQLite.
        let lsCanvas: any = null
        try {
          const lsRaw = localStorage.getItem(`tesserin:canvas:${activeCanvasId}`)
          if (lsRaw) lsCanvas = JSON.parse(lsRaw)
        } catch {}

        if (!canvas) {
          // No SQLite record yet — fall back to localStorage entirely
          canvas = lsCanvas
        } else if (
          lsCanvas?.updated_at &&
          canvas?.updated_at &&
          new Date(lsCanvas.updated_at) > new Date(canvas.updated_at)
        ) {
          // localStorage is newer (async IPC didn't land before reload)
          canvas = lsCanvas
          // Opportunistically sync the newer data back to SQLite
          storage
            .updateCanvas(activeCanvasId!, {
              elements: lsCanvas.elements,
              appState: lsCanvas.app_state,
              files: lsCanvas.files,
            })
            .catch(() => {})
        }

        if (canvas?.id) {
          canvasIdRef.current = canvas.id
        }

        if (canvas) {
          elements = canvas.elements ? JSON.parse(canvas.elements) : []
          const savedState = canvas.app_state ? JSON.parse(canvas.app_state) : {}
          // Restore persisted appState (incl. viewBackgroundColor) but keep theme in sync
          appState = { ...savedState, theme: isDark ? "dark" : "light" }
          const parsedFiles = canvas.files ? JSON.parse(canvas.files) : undefined
          if (parsedFiles && Object.keys(parsedFiles).length > 0) files = parsedFiles
        }
      } catch (err) {
        console.warn("[Tesserin] Failed to load canvas from DB:", err)
      }

      if (cancelled) return

      canvasIdRef.current = activeCanvasId!
      const sceneData = { elements, appState, ...(files ? { files } : {}) }

      if (apiRef.current) {
        // Excalidraw already mounted — clear old scene then load new data.
        // First mark all existing elements as deleted, then add the new ones.
        // This is the safe Excalidraw pattern to replace the scene without remounting.
        const oldElements = apiRef.current.getSceneElementsIncludingDeleted()
        const cleared = oldElements.map((el: any) => ({ ...el, isDeleted: true }))
        apiRef.current.updateScene({
          elements: [...cleared, ...elements],
          appState,
          ...(files ? { files } : {}),
        })
        // Clear history so undo doesn't resurrect elements from the previous canvas
        apiRef.current.history.clear()
        setIsTransitioning(false)
      } else {
        // Excalidraw not yet mounted on first render — queue for onAPI
        pendingSceneRef.current = sceneData
        // overlay stays until onAPI processes pendingSceneRef
      }

      setTimeout(() => { readyToSave.current = true }, 800)
    }
    loadCanvas()

    return () => { cancelled = true }
  }, [activeCanvasId, canvasListLoading])

  // ── Immediate save helper (non-debounced) ──────────────────────
  const saveNow = useCallback(() => {
    const api = apiRef.current
    if (!api || !readyToSave.current) return

    try {
      const elements = api.getSceneElements()
      const appState = api.getAppState()
      const files = api.getFiles ? api.getFiles() : {}
      const persistAppState: Record<string, any> = {}
      for (const key of PERSIST_APP_STATE_KEYS) {
        if (key in appState) persistAppState[key] = appState[key]
      }

      // Synchronous localStorage write for immediate persistence
      const canvasId = canvasIdRef.current
      if (!canvasId) return
      const elementsJson = JSON.stringify(elements)
      const appStateJson = JSON.stringify(persistAppState)
      const filesJson = JSON.stringify(files)

      // Always write to localStorage as immediate backup
      try {
        const lsKey = `tesserin:canvas:${canvasId}`
        const existing = localStorage.getItem(lsKey)
        const canvas = existing ? JSON.parse(existing) : {
          id: canvasId,
          name: "Canvas",
          files: "{}",
          created_at: new Date().toISOString(),
        }
        canvas.elements = elementsJson
        canvas.app_state = appStateJson
        canvas.files = filesJson
        canvas.updated_at = new Date().toISOString()
        localStorage.setItem(lsKey, JSON.stringify(canvas))
      } catch { }

      // Also fire async IPC save (may or may not complete before unload)
      storage.updateCanvas(canvasId, {
        elements: elementsJson,
        appState: appStateJson,
        files: filesJson,
      }).catch(() => { })

      // Bump updated time in canvas list
      touchCanvas(canvasId)
    } catch { }
  }, [touchCanvas])

  // Keep saveNow accessible from callbacks that close over old state
  const saveNowRef = useRef(saveNow)
  useEffect(() => { saveNowRef.current = saveNow }, [saveNow])

  // ── Debounced save ────────────────────────────────────────────
  const doSave = useCallback(
    (elements: readonly any[], appState: Record<string, any>, files: Record<string, any> = {}) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

      // Snapshot the canvas ID NOW so the debounced callback saves to the correct canvas
      const targetCanvasId = canvasIdRef.current
      if (!targetCanvasId) return

      saveTimerRef.current = setTimeout(() => {
        // Double-check we're still on the same canvas; abort if user switched
        if (canvasIdRef.current !== targetCanvasId) return

        try {
          // Pick only persistable appState keys
          const persistAppState: Record<string, any> = {}
          for (const key of PERSIST_APP_STATE_KEYS) {
            if (key in appState) persistAppState[key] = appState[key]
          }

          const elementsJson = JSON.stringify(elements)
          const appStateJson = JSON.stringify(persistAppState)
          const filesJson = JSON.stringify(files)

          // Write to localStorage synchronously as backup
          try {
            const lsKey = `tesserin:canvas:${targetCanvasId}`
            const existing = localStorage.getItem(lsKey)
            const canvas = existing ? JSON.parse(existing) : {
              id: targetCanvasId,
              name: "Canvas",
              files: "{}",
              created_at: new Date().toISOString(),
            }
            canvas.elements = elementsJson
            canvas.app_state = appStateJson
            canvas.files = filesJson
            canvas.updated_at = new Date().toISOString()
            localStorage.setItem(lsKey, JSON.stringify(canvas))
          } catch { }

          // Also save via IPC/storage API
          storage
            .updateCanvas(targetCanvasId, {
              elements: elementsJson,
              appState: appStateJson,
              files: filesJson,
            })
            .catch((err) =>
              console.warn("[Tesserin] Canvas save failed:", err),
            )
        } catch {
          // Silently ignore serialization errors
        }
      }, 500)
    },
    [],
  )

  // ── Save on beforeunload (page refresh / close) ───────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveNow()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [saveNow])

  // ── Save on visibility change (tab going background) ──────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveNow()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [saveNow])

  // Cleanup save timer on unmount — always flush current state to DB.
  // NOTE: Intentionally bypasses readyToSave guard. api.getSceneElements() always
  // returns the live scene, so it is safe to save regardless of when the component
  // mounted. This fixes data loss when the user switches tabs within the first 800ms.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const api = apiRef.current
      const canvasId = canvasIdRef.current
      if (!api || !canvasId) return
      try {
        const elements = api.getSceneElements()
        const appState = api.getAppState()
        const files = api.getFiles ? api.getFiles() : {}
        const persistAppState: Record<string, any> = {}
        for (const key of PERSIST_APP_STATE_KEYS) {
          if (key in appState) persistAppState[key] = appState[key]
        }
        const elementsJson = JSON.stringify(elements)
        const appStateJson = JSON.stringify(persistAppState)
        const filesJson = JSON.stringify(files)
        // Synchronous localStorage write
        try {
          const lsKey = `tesserin:canvas:${canvasId}`
          const existing = localStorage.getItem(lsKey)
          const lsData = existing ? JSON.parse(existing) : { id: canvasId, name: "Canvas", created_at: new Date().toISOString() }
          lsData.elements = elementsJson
          lsData.app_state = appStateJson
          lsData.files = filesJson
          lsData.updated_at = new Date().toISOString()
          localStorage.setItem(lsKey, JSON.stringify(lsData))
        } catch { }
        // Async IPC (best-effort)
        storage.updateCanvas(canvasId, { elements: elementsJson, appState: appStateJson, files: filesJson }).catch(() => {})
      } catch { }
    }
  }, []) // empty deps — refs are always current, no stale closure risk

  const onAPI = useCallback((api: any) => {
    apiRef.current = api
    // Only the primary pane owns the global export API reference
    if (paneId === "primary") setExcalidrawAPI(api)
    // If canvas data finished loading before Excalidraw was ready, apply it now
    if (pendingSceneRef.current) {
      api.updateScene(pendingSceneRef.current)
      pendingSceneRef.current = null
      setIsTransitioning(false)
      setTimeout(() => { readyToSave.current = true }, 800)
    }
  }, [])

  // Excalidraw onChange receives (elements, appState, files)
  const onChange = useCallback(
    (elements: readonly any[], appState: Record<string, any>, files: Record<string, any> = {}) => {
      if (!readyToSave.current) return
      doSave(elements, appState, files)
    },
    [doSave],
  )

  // Triggered when a user adds/removes to their personal Excalidraw library
  const onLibraryChange = useCallback(
    (items: any) => {
      try {
        localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(items))
      } catch (err) {
        console.warn("[Tesserin] Failed to save canvas library:", err)
      }
    },
    [],
  )

  // Synchronize dynamic theme changes with Excalidraw's API
  useEffect(() => {
    if (apiRef.current) {
      apiRef.current.updateScene({ appState: { theme: isDark ? "dark" : "light" } })
    }
  }, [isDark])

  /* ── Tesserin-branded CSS overrides for Excalidraw UI chrome ── */
  const brandCSS = `
    /* ── Override Excalidraw's CSS variables to match Tesserin Obsidian Black ── */
    .excalidraw.theme--dark {
      /* Surface / Island colours → deep black */
      --island-bg-color: #0d0d0d !important;
      --color-surface-lowest: #050505 !important;
      --color-surface-low: #0a0a0a !important;
      --color-surface-mid: #111111 !important;
      --color-surface-high: #1a1a1a !important;
      --default-bg-color: ${DARK_BG} !important;
      --input-bg-color: #0a0a0a !important;
      --popup-bg-color: #0d0d0d !important;
      --sidebar-bg-color: #0a0a0a !important;
      --overlay-bg-color: rgba(0, 0, 0, 0.75) !important;

      /* Primary accent → Tesserin Gold */
      --color-primary: #FACC15 !important;
      --color-primary-darker: #EAB308 !important;
      --color-primary-darkest: #CA8A04 !important;
      --color-primary-hover: #EAB308 !important;
      --color-primary-light: rgba(250, 204, 21, 0.15) !important;
      --color-primary-light-darker: rgba(250, 204, 21, 0.25) !important;
      --color-surface-primary-container: rgba(250, 204, 21, 0.12) !important;

      /* Text */
      --text-primary-color: #ededed !important;
      --color-on-surface: #ededed !important;

      /* Borders & shadows → deeper */
      --dialog-border-color: rgba(255, 255, 255, 0.06) !important;
      --sidebar-border-color: rgba(255, 255, 255, 0.06) !important;
      --shadow-island: 0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) !important;

      /* Buttons */
      --button-bg: #111111 !important;
      --button-hover-bg: #1a1a1a !important;
      --button-active-bg: #FACC15 !important;
      --button-color: #ededed !important;
      --button-hover-color: #ffffff !important;
      --button-border: rgba(255,255,255,0.06) !important;
      --button-hover-border: rgba(255,255,255,0.1) !important;
      --button-active-border: #FACC15 !important;

      /* Color picker / input */
      --input-border-color: rgba(255,255,255,0.08) !important;
      --input-hover-bg-color: #1a1a1a !important;
      --input-label-color: #888888 !important;

      /* Brand logo colour */
      --color-logo-icon: #FACC15 !important;
    }

    /* ── Toolbar container: rounded, Tesserin glass  ── */
    .excalidraw.theme--dark .App-toolbar-content {
      background: linear-gradient(145deg, #111111, #080808) !important;
      border: 1px solid rgba(255,255,255,0.06) !important;
      border-radius: 16px !important;
      box-shadow: 0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03) !important;
    }

    /* ── Tool icons: rounded with Tesserin style ── */
    .excalidraw.theme--dark .ToolIcon__icon {
      border-radius: 10px !important;
    }
    .excalidraw.theme--dark .ToolIcon__icon:hover {
      background: rgba(250, 204, 21, 0.08) !important;
    }
    .excalidraw.theme--dark .ToolIcon__icon[aria-checked="true"],
    .excalidraw.theme--dark .ToolIcon__icon[aria-selected="true"] {
      background: #FACC15 !important;
      color: #000000 !important;
      box-shadow: 0 0 12px rgba(250,204,21,0.3), inset 0 1px 2px rgba(0,0,0,0.2) !important;
    }
    .excalidraw.theme--dark .ToolIcon__icon[aria-checked="true"] svg,
    .excalidraw.theme--dark .ToolIcon__icon[aria-selected="true"] svg {
      color: #000000 !important;
    }

    /* ── Side properties panel ── */
    .excalidraw.theme--dark .properties-content {
      background: #0d0d0d !important;
    }

    /* ── Color picker buttons: active state gold ── */
    .excalidraw.theme--dark .color-picker__button.active,
    .excalidraw.theme--dark .color-picker__button:focus {
      box-shadow: 0 0 0 2px #FACC15 !important;
    }

    /* ── Dropdown menus ── */
    .excalidraw.theme--dark .dropdown-menu-container {
      background: #0d0d0d !important;
      border: 1px solid rgba(255,255,255,0.06) !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
    }

    /* ── Library sidebar ── */
    .excalidraw.theme--dark .layer-ui__library {
      background: #0a0a0a !important;
    }

    /* ── Bottom bar (zoom, undo/redo) ── */
    .excalidraw.theme--dark .layer-ui__wrapper__footer {
      background: transparent !important;
    }

    /* ── Hide the keyboard-shortcut help button (?) ── */
    .excalidraw .HelpButton,
    .excalidraw [aria-label="Help"] {
      display: none !important;
    }

    /* ── Welcome screen hint text ── */
    .excalidraw.theme--dark .welcome-screen-decor-hint {
      color: #888888 !important;
    }

    /* ── Scrollbar ── */
    .excalidraw.theme--dark ::-webkit-scrollbar-thumb {
      background-color: #333 !important;
      border-radius: 10px !important;
    }
    .excalidraw.theme--dark ::-webkit-scrollbar-track {
      background: transparent !important;
    }
    
    /* ── Canvas Background Force ── */
    .excalidraw.theme--dark {
      --color-bg-canvas: ${DARK_BG} !important;
      --color-surface-default: ${DARK_BG} !important;
      --color-background: ${DARK_BG} !important;
    }

    /* ── OVERRIDE FOR LIGHT (WARM IVORY) PALETTE ── */
    /* Target via our local wrapper since Excalidraw simply removes .theme--dark rather than adding .theme--light */
    .tesserin-canvas-light .excalidraw {
      --island-bg-color: #fdfbf7 !important;
      --color-surface-lowest: #f1ebd9 !important;
      --color-surface-low: #f6eedb !important;
      --color-surface-mid: #f9f6f0 !important;
      --color-surface-high: #ffffff !important;
      --default-bg-color: ${LIGHT_BG} !important;
      --input-bg-color: #f9f6f0 !important;
      --popup-bg-color: #fdfbf7 !important;
      --sidebar-bg-color: #f9f6f0 !important;
      --overlay-bg-color: rgba(255, 255, 255, 0.75) !important;

      --color-primary: #FACC15 !important;
      --color-primary-darker: #EAB308 !important;
      --color-primary-darkest: #CA8A04 !important;
      --color-primary-hover: #EAB308 !important;
      --color-primary-light: rgba(250, 204, 21, 0.15) !important;
      --color-primary-light-darker: rgba(250, 204, 21, 0.25) !important;
      --color-surface-primary-container: rgba(250, 204, 21, 0.12) !important;

      --text-primary-color: #2d2a26 !important;
      --color-on-surface: #2d2a26 !important;

      --dialog-border-color: rgba(0, 0, 0, 0.06) !important;
      --sidebar-border-color: rgba(0, 0, 0, 0.06) !important;
      --shadow-island: 0 4px 24px rgba(227,223,211,0.6), 0 0 0 1px rgba(0,0,0,0.04) !important;

      --button-bg: #fdfbf7 !important;
      --button-hover-bg: #ffffff !important;
      --button-active-bg: #FACC15 !important;
      --button-color: #7a756b !important;
      --button-hover-color: #2d2a26 !important;
      --button-border: rgba(0,0,0,0.06) !important;
      --button-hover-border: rgba(0,0,0,0.1) !important;
      --button-active-border: #FACC15 !important;

      --input-border-color: rgba(0,0,0,0.08) !important;
      --input-hover-bg-color: #ffffff !important;
      --input-label-color: #a8a399 !important;

      --color-logo-icon: #FACC15 !important;
    }

    .tesserin-canvas-light .excalidraw .App-toolbar-content {
      background: linear-gradient(145deg, #ffffff, #f9f6f0) !important;
      border: 1px solid rgba(0,0,0,0.06) !important;
      border-radius: 16px !important;
      box-shadow: 0 4px 24px rgba(227,223,211,0.5), inset 0 1px 0 rgba(255,255,255,0.8) !important;
    }

    .tesserin-canvas-light .excalidraw .ToolIcon__icon {
      border-radius: 10px !important;
    }
    .tesserin-canvas-light .excalidraw .ToolIcon__icon:hover {
      background: rgba(250, 204, 21, 0.08) !important;
    }
    .tesserin-canvas-light .excalidraw .ToolIcon__icon[aria-checked="true"],
    .tesserin-canvas-light .excalidraw .ToolIcon__icon[aria-selected="true"] {
      background: #FACC15 !important;
      color: #000000 !important;
      box-shadow: 0 0 12px rgba(250,204,21,0.3), inset 0 1px 2px rgba(0,0,0,0.2) !important;
    }
    .tesserin-canvas-light .excalidraw .ToolIcon__icon[aria-checked="true"] svg,
    .tesserin-canvas-light .excalidraw .ToolIcon__icon[aria-selected="true"] svg {
      color: #000000 !important;
    }

    .tesserin-canvas-light .excalidraw .properties-content {
      background: #fdfbf7 !important;
    }

    .tesserin-canvas-light .excalidraw .color-picker__button.active,
    .tesserin-canvas-light .excalidraw .color-picker__button:focus {
      box-shadow: 0 0 0 2px #FACC15 !important;
    }

    .tesserin-canvas-light .excalidraw .dropdown-menu-container {
      background: #fdfbf7 !important;
      border: 1px solid rgba(0,0,0,0.06) !important;
      border-radius: 12px !important;
      box-shadow: 0 8px 32px rgba(227,223,211,0.6) !important;
    }

    .tesserin-canvas-light .excalidraw .layer-ui__library {
      background: #f9f6f0 !important;
    }

    .tesserin-canvas-light .excalidraw .layer-ui__wrapper__footer {
      background: transparent !important;
    }

    /* ── Hide the keyboard-shortcut help button (?) in light mode too ── */
    .tesserin-canvas-light .excalidraw .HelpButton,
    .tesserin-canvas-light .excalidraw [aria-label="Help"] {
      display: none !important;
    }

    .tesserin-canvas-light .excalidraw .welcome-screen-decor-hint {
      color: #a8a399 !important;
    }

    .tesserin-canvas-light .excalidraw ::-webkit-scrollbar-thumb {
      background-color: #d9d5cb !important;
      border-radius: 10px !important;
    }
    .tesserin-canvas-light .excalidraw ::-webkit-scrollbar-track {
      background: transparent !important;
    }
    
    .tesserin-canvas-light .excalidraw {
      --color-bg-canvas: ${LIGHT_BG} !important;
      --color-surface-default: ${LIGHT_BG} !important;
      --color-background: ${LIGHT_BG} !important;
    }
  `

  /* ── render ───────────────────────────────────────────── */

  // Empty state — no canvases exist yet
  if (!canvasListLoading && canvases.length === 0 && !activeCanvasId) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: isDark ? DARK_BG : LIGHT_BG }}
      >
        <div
          className="skeuo-panel flex flex-col items-center gap-6 text-center px-12 py-10"
        >
          <TesseradrawLogo size={80} animated />
          <div>
            <h2
              style={{
                color: "var(--text-primary)",
                fontFamily: '"Excalifont", "Virgil", "Comic Shanns", cursive',
                fontSize: "2rem",
                fontWeight: 400,
                letterSpacing: "-0.02em",
              }}
            >
              Tesseradraw
            </h2>
            <p
              className="mt-1.5"
              style={{
                fontFamily: '"Excalifont", "Virgil", "Comic Shanns", cursive',
                fontSize: "0.9rem",
                color: "var(--text-tertiary)",
              }}
            >
              AI-Enhanced Creative Canvas
            </p>
          </div>
          <button
            onClick={handleCreateCanvas}
            className="flex items-center gap-2.5 px-6 py-2.5 text-sm font-bold transition-all"
            style={{
              backgroundColor: "var(--accent-primary)",
              color: "var(--text-on-accent)",
              borderRadius: "var(--radius-btn)",
              boxShadow: "var(--btn-shadow), 0 0 16px rgba(250,204,21,0.25)",
              border: "1px solid var(--border-light)",
            }}
          >
            <ScribbledPlus size={16} />
            Create your first canvas
          </button>
          <p
            className="text-[10px]"
            style={{ color: "var(--text-tertiary)", opacity: 0.6 }}
          >
            Right-click canvas to generate diagrams with AI
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={canvasContainerRef}
      className={`w-full h-full flex flex-col relative ${!isDark ? 'tesserin-canvas-light' : ''}`}
      style={{ backgroundColor: isDark ? DARK_BG : LIGHT_BG }}
    >
      <style>{brandCSS}</style>

      {/* Canvas Tab Bar */}
      <CanvasTabBar
        canvases={canvases}
        activeCanvasId={activeCanvasId}
        onSelect={handleSelectCanvas}
        onCreate={handleCreateCanvas}
        onClose={handleCloseCanvas}
        onRename={renameCanvas}
        onDuplicate={handleDuplicateCanvas}
        onDelete={deleteCanvas}
      />

      {/* Canvas action toolbar */}
      {activeCanvasId && (
        <div
          className="flex items-center gap-2 px-2 flex-shrink-0"
          style={{
            height: 36,
            borderBottom: "1px solid var(--border-dark)",
            backgroundColor: "var(--bg-panel)",
          }}
        >
          {!showNotePicker && (
            <button
              onClick={() => setShowNotePicker(true)}
              className="skeuo-btn flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-all"
              style={{ color: "var(--accent-primary)", borderRadius: "var(--radius-btn)" }}
              aria-label="Insert note onto canvas"
            >
              <FiFileText size={12} />
              Insert Note
            </button>
          )}
          {onSplitOpen && (
            <button
              onClick={onSplitOpen}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: "var(--bg-panel-inset)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-dark)",
              }}
              title="Split pane (Ctrl+\\)"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--accent-primary)"
                e.currentTarget.style.color = "var(--text-on-accent)"
                e.currentTarget.style.borderColor = "var(--accent-primary)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)"
                e.currentTarget.style.color = "var(--text-secondary)"
                e.currentTarget.style.borderColor = "var(--border-dark)"
              }}
            >
              <FiColumns size={12} />
              <span>Split</span>
            </button>
          )}
        </div>
      )}

      {/* Canvas area */}
      <div
        className="flex-1 relative min-h-0"
      >
        {/* Excalidraw is always mounted — canvas switches use updateScene() so it never
          remounts. This eliminates the blank-flash / stuck behaviour between tabs. */}
        <Excalidraw
          key="tesserin-excalidraw"
          excalidrawAPI={onAPI}
          initialData={{
            elements: [],
            appState: { theme: isDark ? "dark" : "light" },
            ...(libraryInitData ? { libraryItems: libraryInitData } : {})
          }}
          onChange={onChange}
          onLibraryChange={onLibraryChange}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: true,
              clearCanvas: true,
              export: { saveFileToDisk: true },
              loadScene: true,
              saveToActiveFile: false,
              toggleTheme: true,
            },
          }}
        >
          {/* No custom <MainMenu> — Excalidraw renders its full native menu
            with all defaults: Export (PNG/SVG/Clipboard with Background,
            Dark mode, Embed scene, Scale), Load Scene, Clear Canvas,
            Toggle Theme, Change Background, Help, etc. */}
          <WelcomeScreen>
            <WelcomeScreen.Hints.MenuHint />
            <WelcomeScreen.Hints.ToolbarHint />
            <WelcomeScreen.Center>
              <div className="flex flex-col items-center justify-center pointer-events-none select-none">
                <TesseradrawLogo size={72} animated />
                <h1
                  className="mt-4"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: '"Excalifont", "Virgil", "Comic Shanns", cursive',
                    fontSize: "2.5rem",
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Tesseradraw
                </h1>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: '"Excalifont", "Virgil", "Comic Shanns", cursive',
                    fontSize: "0.95rem",
                    opacity: 0.45,
                    fontWeight: 400,
                  }}
                >
                  AI-Enhanced Creative Canvas
                </p>
              </div>
            </WelcomeScreen.Center>
          </WelcomeScreen>
        </Excalidraw>

        {showNotePicker && (
          <NotePickerPanel
            notes={notes}
            onInsert={handleInsertNote}
            onClose={() => setShowNotePicker(false)}
          />
        )}
        {/* Canvas-switch overlay — covers Excalidraw from first mount until scene data is applied */}
        {isTransitioning && (
          <div
            className="absolute inset-0 z-30"
            style={{ backgroundColor: isDark ? DARK_BG : LIGHT_BG }}
          />
        )}

        {/* Full-board toggle button — bottom-right corner */}
        {activeCanvasId && (
          <button
            onClick={toggleFullscreen}
            className="skeuo-btn absolute bottom-3 right-3 z-40 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all"
            style={{
              color: isFullscreen ? "var(--text-on-accent)" : "var(--accent-primary)",
              backgroundColor: isFullscreen ? "var(--accent-primary)" : undefined,
              borderRadius: "var(--radius-btn)",
            }}
            title={isFullscreen ? "Exit full board (Esc)" : "Full board mode"}
          >
            {isFullscreen
              ? <><ScribbledCollapse size={13} /> Exit Full Board</>
              : <><ScribbledExpand size={13} /> Full Board</>
            }
          </button>
        )}

      </div>
    </div>
  )
}
