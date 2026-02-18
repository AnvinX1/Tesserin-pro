import React, { useRef, useEffect, useCallback, useState } from "react"
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
} from "@excalidraw/excalidraw"
import "@excalidraw/excalidraw/index.css"
import { TesserinLogo } from "../core/tesserin-logo"
import * as storage from "@/lib/storage-client"

/**
 * CreativeCanvas — Tesseradraw
 *
 * Wraps the Excalidraw engine in permanent dark mode.
 * Automatically saves/loads canvas data to/from SQLite.
 */

const DARK_BG = "#121212"

/** Default canvas ID — a single persistent canvas (multi-canvas can be added later) */
const DEFAULT_CANVAS_ID = "default-canvas"

/** Fields from appState worth persisting (skip transient UI fields) */
const PERSIST_APP_STATE_KEYS = [
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

/* ── component ───────────────────────────────────────────── */

export function CreativeCanvas() {
  const apiRef = useRef<any>(null)
  const canvasIdRef = useRef<string>(DEFAULT_CANVAS_ID)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [initialData, setInitialData] = useState<any | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const readyToSave = useRef(false)

  // ── Load canvas from SQLite (or localStorage fallback) on mount ─
  useEffect(() => {
    let cancelled = false

    async function loadCanvas() {
      let canvasData: { elements: any[]; appState: Record<string, any>; files?: any } | null = null

      try {
        // Try storage API first (SQLite via IPC or localStorage fallback)
        let canvas = await storage.getCanvas(DEFAULT_CANVAS_ID)

        // Also check raw localStorage as a secondary source
        if (!canvas) {
          try {
            const lsRaw = localStorage.getItem(`tesserin:canvas:${DEFAULT_CANVAS_ID}`)
            if (lsRaw) canvas = JSON.parse(lsRaw)
          } catch {}
        }

        if (!canvas) {
          // Create a new default canvas
          canvas = await storage.createCanvas({
            id: DEFAULT_CANVAS_ID,
            name: "Default Canvas",
          })
        }

        if (canvas?.id) {
          canvasIdRef.current = canvas.id
        }

        if (canvas) {
          const elements = canvas.elements ? JSON.parse(canvas.elements) : []
          const appState = canvas.app_state ? JSON.parse(canvas.app_state) : {}
          const files = canvas.files ? JSON.parse(canvas.files) : undefined

          if (elements.length > 0) {
            canvasData = {
              elements,
              appState: {
                ...appState,
                theme: "dark",
                viewBackgroundColor: appState.viewBackgroundColor || DARK_BG,
              },
              files: files && Object.keys(files).length > 0 ? files : undefined,
            }
          }
        }
      } catch (err) {
        console.warn("[Tesserin] Failed to load canvas from DB:", err)
      }

      if (!cancelled) {
        if (canvasData) {
          setInitialData(canvasData)
        }
        setIsLoaded(true)
        // Allow saving after initial scene-load onChange calls settle
        setTimeout(() => {
          readyToSave.current = true
        }, 800)
      }
    }
    loadCanvas()

    return () => {
      cancelled = true
    }
  }, [])

  // ── Immediate save helper (non-debounced) ──────────────────────
  const saveNow = useCallback(() => {
    const api = apiRef.current
    if (!api || !readyToSave.current) return

    try {
      const elements = api.getSceneElements()
      const appState = api.getAppState()
      const persistAppState: Record<string, any> = {}
      for (const key of PERSIST_APP_STATE_KEYS) {
        if (key in appState) persistAppState[key] = appState[key]
      }

      // Synchronous localStorage write for immediate persistence
      const canvasId = canvasIdRef.current
      const elementsJson = JSON.stringify(elements)
      const appStateJson = JSON.stringify(persistAppState)

      // Always write to localStorage as immediate backup
      try {
        const lsKey = `tesserin:canvas:${canvasId}`
        const existing = localStorage.getItem(lsKey)
        const canvas = existing ? JSON.parse(existing) : {
          id: canvasId,
          name: "Default Canvas",
          files: "{}",
          created_at: new Date().toISOString(),
        }
        canvas.elements = elementsJson
        canvas.app_state = appStateJson
        canvas.updated_at = new Date().toISOString()
        localStorage.setItem(lsKey, JSON.stringify(canvas))
      } catch {}

      // Also fire async IPC save (may or may not complete before unload)
      storage.updateCanvas(canvasId, {
        elements: elementsJson,
        appState: appStateJson,
      }).catch(() => {})
    } catch {}
  }, [])

  // ── Debounced save ────────────────────────────────────────────
  const doSave = useCallback(
    (elements: readonly any[], appState: Record<string, any>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

      saveTimerRef.current = setTimeout(() => {
        try {
          // Pick only persistable appState keys
          const persistAppState: Record<string, any> = {}
          for (const key of PERSIST_APP_STATE_KEYS) {
            if (key in appState) persistAppState[key] = appState[key]
          }

          const elementsJson = JSON.stringify(elements)
          const appStateJson = JSON.stringify(persistAppState)
          const canvasId = canvasIdRef.current

          // Write to localStorage synchronously as backup
          try {
            const lsKey = `tesserin:canvas:${canvasId}`
            const existing = localStorage.getItem(lsKey)
            const canvas = existing ? JSON.parse(existing) : {
              id: canvasId,
              name: "Default Canvas",
              files: "{}",
              created_at: new Date().toISOString(),
            }
            canvas.elements = elementsJson
            canvas.app_state = appStateJson
            canvas.updated_at = new Date().toISOString()
            localStorage.setItem(lsKey, JSON.stringify(canvas))
          } catch {}

          // Also save via IPC/storage API
          storage
            .updateCanvas(canvasId, {
              elements: elementsJson,
              appState: appStateJson,
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

  // Cleanup save timer on unmount — always flush current state to DB
  useEffect(() => {
    return () => {
      // Cancel any pending debounced save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      // Always save current state on unmount
      saveNow()
    }
  }, [saveNow])

  const onAPI = useCallback((api: any) => {
    apiRef.current = api
    try {
      api.updateScene({
        appState: { viewBackgroundColor: DARK_BG },
      })
    } catch {}
  }, [])

  // Excalidraw onChange receives (elements, appState, files)
  const onChange = useCallback(
    (elements: readonly any[], appState: Record<string, any>) => {
      if (!readyToSave.current) return
      doSave(elements, appState)
    },
    [doSave],
  )

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
  `

  /* ── render ───────────────────────────────────────────── */
  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: DARK_BG }}>
        <TesserinLogo size={48} animated />
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <style>{brandCSS}</style>
      <Excalidraw
        excalidrawAPI={onAPI}
        theme="dark"
        initialData={initialData || undefined}
        onChange={onChange}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            export: { saveFileToDisk: true },
            loadScene: true,
            saveToActiveFile: false,
            toggleTheme: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.LoadScene />
          <MainMenu.DefaultItems.SaveToActiveFile />
          <MainMenu.DefaultItems.Export />
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.Separator />
          <MainMenu.DefaultItems.Help />
        </MainMenu>
        <WelcomeScreen>
          <WelcomeScreen.Hints.MenuHint />
          <WelcomeScreen.Hints.ToolbarHint />
          <WelcomeScreen.Center>
            <div className="flex flex-col items-center justify-center pointer-events-none select-none">
              <TesserinLogo size={64} animated />
              <h1
                className="text-3xl font-bold mt-4 tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Tesseradraw
              </h1>
              <p className="text-sm opacity-60 mt-2">AI-Enhanced Creative Canvas</p>
            </div>
          </WelcomeScreen.Center>
        </WelcomeScreen>
      </Excalidraw>
    </div>
  )
}
