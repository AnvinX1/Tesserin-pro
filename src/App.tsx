import React, { useState, useEffect, useCallback, useMemo, useRef, Component, type ErrorInfo, type ReactNode } from "react"

// Core
import { TesserinThemeProvider } from "@/components/tesserin/core/theme-provider"
import { SkeuoPanel } from "@/components/tesserin/core/skeuo-panel"
import { LoadingScreen } from "@/components/tesserin/core/loading-screen"
import { TitleBar } from "@/components/tesserin/core/title-bar"
import { PluginProvider, StatusBar } from "@/components/tesserin/core/plugin-provider"
import { OnboardingWelcome, useOnboarding, ONBOARDING_SAMPLE_CONTENT } from "@/components/tesserin/core/onboarding"

// Panels
import { LeftDock, type TabId } from "@/components/tesserin/panels/left-dock"
import { NoteSidebar } from "@/components/tesserin/panels/note-sidebar"
import { SearchPalette } from "@/components/tesserin/panels/search-palette"
import { ExportPanel } from "@/components/tesserin/panels/export-panel"
import { TemplateManager } from "@/components/tesserin/panels/template-manager"
import { BacklinksPanel } from "@/components/tesserin/panels/backlinks-panel"
import { VersionHistoryPanel } from "@/components/tesserin/panels/version-history-panel"
import { ReferenceManager } from "@/components/tesserin/panels/reference-manager"

// Workspace
import { MarkdownEditor } from "@/components/tesserin/workspace/markdown-editor"
import { CreativeCanvas } from "@/components/tesserin/workspace/creative-canvas"
import { CanvasSidebar } from "@/components/tesserin/workspace/canvas-sidebar"
import { D3GraphView } from "@/components/tesserin/workspace/d3-graph-view"
import { SplitPaneLayout, useSplitPanes, type ViewDefinition, type PaneRenderProps } from "@/components/tesserin/workspace/split-panes"
import { SettingsPanel } from "@/components/tesserin/panels/settings-panel"
import { FiFileText, FiCompass, FiSettings } from "react-icons/fi"
import { HiOutlineCpuChip } from "react-icons/hi2"

// Lazy import for quick capture overlay (not a core tab, just an overlay)
const DailyNotes = React.lazy(() =>
    import("@/components/tesserin/workspace/daily-notes").then((m) => ({ default: m.DailyNotes }))
)

import { NotesProvider, useNotes } from "@/lib/notes-store"
import { useCanvasStore } from "@/lib/canvas-store"
import { usePlugins } from "@/lib/plugin-system"
import { DEFAULT_SHORTCUTS, matchesShortcut, loadCustomShortcuts, getEffectiveBinding } from "@/lib/keyboard-shortcuts"
import { getStartupTip, formatShortcut, type TesserinTip } from "@/lib/tips"
import { getSetting } from "@/lib/storage-client"

/**
 * Error Boundary — catches any unhandled render error and shows a
 * recovery screen instead of a white page.
 */
interface EBProps { children: ReactNode }
interface EBState { error: Error | null }

class ErrorBoundary extends Component<EBProps, EBState> {
    state: EBState = { error: null }

    static getDerivedStateFromError(error: Error): EBState {
        return { error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[Tesserin] Uncaught render error:", error, info.componentStack)
    }

    render() {
        if (this.state.error) {
            return (
                <div
                    className="w-full h-screen flex flex-col items-center justify-center gap-4 p-8 font-sans"
                    style={{ backgroundColor: "#050505", color: "#e4e4e7" }}
                >
                    <h1 className="text-xl font-bold">Something went wrong</h1>
                    <pre className="max-w-xl text-sm opacity-70 whitespace-pre-wrap break-words">
                        {this.state.error.message}
                    </pre>
                    <button
                        className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46" }}
                        onClick={() => this.setState({ error: null })}
                    >
                        Try Again
                    </button>
                </div>
            )
        }
        return this.props.children
    }
}

/**
 * Tesserin App — Root Component
 *
 * Orchestrates the entire workspace:
 * 1. Custom title bar (frameless window)
 * 2. A 2-second loading splash
 * 3. Three-column layout: Left Dock | Centre Stage | Gadget Sidebar
 * 4. Bottom Timeline toolbar
 * 5. Overlays: Search (Cmd+K), Export (Cmd+E), Templates (Cmd+T)
 */

function AppContent() {
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        // Initial sync from localStorage (fastest)
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("tesserin:active-tab")
            if (saved === "notes" || saved === "canvas" || saved === "graph" || saved === "settings") {
                return saved as TabId
            }
        }
        return "notes"
    })

    // Save active tab to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("tesserin:active-tab", activeTab)
    }, [activeTab])

    // Respect the "Startup tab" setting from database on mount
    useEffect(() => {
        async function loadStartupTab() {
            const startup = await getSetting("general.startupTab")
            if (startup && startup !== "last-active") {
                if (startup === "notes" || startup === "canvas" || startup === "graph" || startup === "settings") {
                    setActiveTab(startup as TabId)
                }
            }
        }
        loadStartupTab()
    }, [])

    const [showNotes, setShowNotes] = useState(true)

    // Switching to the Notes tab from another tab always shows the sidebar.
    const handleSetActiveTab = useCallback((tab: TabId) => {
        setActiveTab(tab)
        if (tab === "notes") setShowNotes(true)
    }, [])
    const [showSearch, setShowSearch] = useState(false)
    const [showExport, setShowExport] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)
    const [showBacklinks, setShowBacklinks] = useState(false)
    const [showVersionHistory, setShowVersionHistory] = useState(false)
    const [showReferences, setShowReferences] = useState(false)
    const [showQuickCapture, setShowQuickCapture] = useState(false)
    const [notice, setNotice] = useState<{ message: string; visible: boolean }>({ message: "", visible: false })
    const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Auto-updater ────────────────────────────────────────────────────
    type UpdateStatus =
        | { type: 'available'; version: string }
        | { type: 'downloading'; percent: number }
        | { type: 'downloaded'; version: string }
        | { type: 'error'; message: string }
    const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
    useEffect(() => {
        const api = (window as any).tesserin?.updater
        if (!api) return
        const handler = api.onStatus((status: UpdateStatus) => {
            if (status.type === 'available' || status.type === 'downloading' || status.type === 'downloaded') {
                setUpdateStatus(status)
            }
        })
        return () => api.offStatus(handler)
    }, [])
    const { notes, selectedNoteId, selectNote, addNote, updateNote, isLoading } = useNotes()

    // Onboarding — shown once when vault is empty
    const { showOnboarding, dismissOnboarding } = useOnboarding(notes.length, isLoading)

    const handleOnboardingDone = useCallback(
        (navigate?: "notes" | "graph" | "settings") => {
            dismissOnboarding()
            if (navigate === "notes") {
                const id = addNote("Welcome to Tesserin ✦")
                updateNote(id, { content: ONBOARDING_SAMPLE_CONTENT })
                setActiveTab("notes")
            } else if (navigate) {
                setActiveTab(navigate as TabId)
            }
        },
        [dismissOnboarding, addNote, updateNote],
    )

    const { panels } = usePlugins()
    const canvasStore = useCanvasStore()
    const { splitState, openSplit, closeSplit, setSecondaryView, setSecondaryNote, toggleDirection } = useSplitPanes()

    const selectedNote = notes.find(n => n.id === selectedNoteId) || null

    // Universal workspace views for the split pane system
    const workspaceViews = useMemo<ViewDefinition[]>(() => {
        const views: ViewDefinition[] = [
            { id: "notes", label: "Notes", icon: FiFileText },
            { id: "canvas", label: "Canvas", icon: FiCompass },
            { id: "graph", label: "Graph", icon: HiOutlineCpuChip },
            { id: "settings", label: "Settings", icon: FiSettings },
        ]
        for (const p of panels.filter((pl) => pl.location === "workspace")) {
            views.splice(views.length - 1, 0, {
                id: p.id,
                label: p.label,
                icon: (props: { size: number }) => <span style={{ fontSize: props.size }}>{p.icon}</span>,
            })
        }
        return views
    }, [panels])

    // Render callback for universal panes
    const renderView = useCallback((viewType: string, props: PaneRenderProps) => { // eslint-disable-line react-hooks/exhaustive-deps
        const key = `${props.paneId}-${viewType}`
        switch (viewType) {
            case "notes":
                return <MarkdownEditor
                    key={key}
                    noteId={props.noteId}
                    onSelectNote={props.isSecondary ? setSecondaryNote : props.onSelectNote}
                    isSecondary={props.isSecondary}
                    showSidebar={props.isSecondary ? undefined : showNotes}
                    onToggleSidebar={props.isSecondary ? undefined : () => setShowNotes(p => !p)}
                />
            case "canvas":
                return <CreativeCanvas
                    key={key}
                    paneId={props.paneId}
                    onSplitOpen={splitState.isActive ? undefined : () => openSplit("canvas")}
                />
            case "graph":
                return <D3GraphView key={key} />
            case "settings":
                return <SettingsPanel key={key} />
            default: {
                const panel = panels.find((p) => p.location === "workspace" && p.id === viewType)
                if (panel) return <panel.component key={key} />
                return null
            }
        }
    }, [panels, splitState.isActive, openSplit, setSecondaryNote])

    // Feature toggles — control which features are shown
    const [features, setFeatures] = useState<Record<string, boolean>>({})
    useEffect(() => {
        async function loadFeatures() {
            const keys = [
                "features.statusBar", "features.backlinks",
                "features.versionHistory", "features.references", "features.splitPanes",
                "features.dailyNotes", "features.templates",
            ]
            const f: Record<string, boolean> = {}
            for (const key of keys) {
                const val = await getSetting(key)
                f[key] = val !== "false" // default true
            }
            setFeatures(f)
        }
        loadFeatures()
        const interval = setInterval(loadFeatures, 2000)
        return () => clearInterval(interval)
    }, [])

    const isFeatureEnabled = useCallback((key: string) => features[key] !== false, [features])

    // Plugin notice handler
    const handleNotice = useCallback((message: string, duration = 3000) => {
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
        setNotice({ message, visible: true })
        noticeTimerRef.current = setTimeout(() => {
            setNotice(prev => ({ ...prev, visible: false }))
        }, duration)
    }, [])

    // Cleanup notice timer on unmount
    useEffect(() => {
        return () => {
            if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current)
        }
    }, [])

    // Startup tip — show one random tip 3s after first render
    useEffect(() => {
        const timer = setTimeout(() => {
            const tip = getStartupTip()
            const shortcutBadge = tip.shortcut ? ` (${formatShortcut(tip.shortcut)})` : ""
            handleNotice(`💡 ${tip.text}${shortcutBadge}`, 6000)
        }, 3000)
        return () => clearTimeout(timer)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Tip action handler — maps tip actions to actual state toggles
    const handleTipAction = useCallback((action: string) => {
        switch (action) {
            case "open-search": setShowSearch(true); break
            case "open-export": setShowExport(true); break
            case "open-templates": setShowTemplates(true); break
            case "open-backlinks": setShowBacklinks(true); break
            case "open-version-history": setShowVersionHistory(true); break
            case "open-quick-capture": setShowQuickCapture(true); break
            case "open-references": setShowReferences(true); break
            case "open-split": openSplit(); break
            case "navigate-graph": setActiveTab("graph"); break
            case "navigate-canvas": setActiveTab("canvas"); break
            case "navigate-settings": setActiveTab("settings"); break
        }
    }, [openSplit])

    // Keyboard shortcuts — load custom overrides and match dynamically
    const [shortcutOverrides, setShortcutOverrides] = useState<Record<string, string>>({})
    useEffect(() => {
        loadCustomShortcuts().then(setShortcutOverrides)
        // Reload when settings change (same interval as feature toggles)
        const interval = setInterval(() => loadCustomShortcuts().then(setShortcutOverrides), 2000)
        return () => clearInterval(interval)
    }, [])

    const shortcutActions = useMemo(() => {
        const bindings: Record<string, string> = {}
        for (const def of DEFAULT_SHORTCUTS) {
            bindings[def.id] = getEffectiveBinding(def.id, shortcutOverrides)
        }
        return bindings
    }, [shortcutOverrides])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            for (const [actionId, keys] of Object.entries(shortcutActions)) {
                if (matchesShortcut(e, keys)) {
                    e.preventDefault()
                    switch (actionId) {
                        case "search-palette": setShowSearch(prev => !prev); break
                        case "export-panel": setShowExport(prev => !prev); break
                        case "template-manager": setShowTemplates(prev => !prev); break
                        case "toggle-backlinks": setShowBacklinks(prev => !prev); break
                        case "version-history": setShowVersionHistory(prev => !prev); break
                        case "quick-capture": setShowQuickCapture(prev => !prev); break
                        case "references": setShowReferences(prev => !prev); break
                        case "toggle-split":
                            if (splitState.isActive) closeSplit()
                            else openSplit()
                            break
                    }
                    return
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [shortcutActions, splitState.isActive, openSplit, closeSplit])

    const handleSelectNote = useCallback(
        (noteId: string) => {
            selectNote(noteId)
            setActiveTab("notes")
            setShowSearch(false)
        },
        [selectNote],
    )

    const handleNavigateTab = useCallback(
        (tabId: string) => {
            setActiveTab(tabId as TabId)
        },
        [],
    )

    return (
        <PluginProvider onNotice={handleNotice} onNavigateTab={handleNavigateTab}>
            <div
                className="w-full h-screen flex flex-col overflow-hidden font-sans transition-colors duration-300"
                style={{ backgroundColor: "var(--bg-app)", color: "var(--text-primary)" }}
            >
                {/* Custom Title Bar */}
                <TitleBar />

                <div className="flex-1 flex overflow-hidden">
                    {/* ── Left Dock ── */}
                    <LeftDock
                        activeTab={activeTab}
                        setActiveTab={handleSetActiveTab}
                        splitActive={splitState.isActive}
                        onSplitOpen={() => openSplit()}
                        onSplitClose={closeSplit}
                        splitDirection={splitState.direction}
                        onSplitDirection={toggleDirection}
                    />

                    {/* ── Centre Stage ── */}
                    <main className="flex-1 flex flex-col min-w-0 m-3 relative z-10">
                        <div className="flex-1 flex gap-4 min-h-0">
                            {/* Note sidebar (visible on notes tab) */}
                            {activeTab === "notes" && (
                                <NoteSidebar
                                    visible={showNotes}
                                    onClose={() => setShowNotes(false)}
                                />
                            )}

                            {/* Canvas sidebar (visible on canvas tab) */}
                            {activeTab === "canvas" && (
                                <CanvasSidebar
                                    canvases={canvasStore.canvases}
                                    activeCanvasId={canvasStore.activeCanvasId}
                                    isLoading={canvasStore.isLoading}
                                    onSelect={canvasStore.setActiveCanvas}
                                    onCreate={() => canvasStore.createCanvas("Untitled Canvas")}
                                    onRename={canvasStore.renameCanvas}
                                    onDuplicate={canvasStore.duplicateCanvas}
                                    onDelete={canvasStore.deleteCanvas}
                                />
                            )}

                            {/* Active workspace panel – all panels stay mounted, only the active one is visible. */}
                            <SkeuoPanel className="flex-1 h-full flex flex-col overflow-hidden">
                                <SplitPaneLayout
                                    views={workspaceViews}
                                    primaryViewType={activeTab}
                                    onPrimaryViewChange={(v) => setActiveTab(v as TabId)}
                                    renderView={renderView}
                                    splitState={splitState}
                                    onSplitOpen={openSplit}
                                    onSplitClose={closeSplit}
                                    onSecondaryViewChange={setSecondaryView}
                                    onDirectionToggle={toggleDirection}
                                    splitEnabled={isFeatureEnabled("features.splitPanes")}
                                />
                            </SkeuoPanel>

                            {/* Right panels: Backlinks / Version History */}
                            {((showBacklinks && isFeatureEnabled("features.backlinks")) || (showVersionHistory && isFeatureEnabled("features.versionHistory"))) && activeTab === "notes" && (
                                <SkeuoPanel className="w-72 flex-shrink-0 h-full flex flex-col overflow-hidden">
                                    {showBacklinks && isFeatureEnabled("features.backlinks") && <BacklinksPanel />}
                                    {showVersionHistory && isFeatureEnabled("features.versionHistory") && !(showBacklinks && isFeatureEnabled("features.backlinks")) && <VersionHistoryPanel />}
                                    {showBacklinks && isFeatureEnabled("features.backlinks") && showVersionHistory && isFeatureEnabled("features.versionHistory") && (
                                        <div className="border-t" style={{ borderColor: "var(--border-dark)" }}>
                                            <VersionHistoryPanel />
                                        </div>
                                    )}
                                </SkeuoPanel>
                            )}
                        </div>
                    </main>
                </div>

                {/* ── Status Bar (plugin widgets + rotating tips) ── */}
                {isFeatureEnabled("features.statusBar") && (
                    <StatusBar activeTab={activeTab} onTipAction={handleTipAction} />
                )}

                {/* ── Notice Toast ── */}
                {notice.visible && (
                    <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-200"
                        style={{
                            backgroundColor: "var(--bg-panel)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-mid)",
                            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                        }}
                    >
                        {notice.message}
                    </div>
                )}

                {/* ── Overlays ── */}
                <SearchPalette
                    isOpen={showSearch}
                    onClose={() => setShowSearch(false)}
                    onSelectNote={handleSelectNote}
                    onNavigateTab={handleNavigateTab}
                    onOpenSplit={() => openSplit()}
                />
                <ExportPanel
                    isOpen={showExport}
                    onClose={() => setShowExport(false)}
                    note={selectedNote}
                />
                {isFeatureEnabled("features.templates") && (
                    <TemplateManager
                        isOpen={showTemplates}
                        onClose={() => setShowTemplates(false)}
                        onCreateNote={handleSelectNote}
                    />
                )}
                {isFeatureEnabled("features.references") && (
                    <ReferenceManager
                        isOpen={showReferences}
                        onClose={() => setShowReferences(false)}
                    />
                )}
                {showQuickCapture && isFeatureEnabled("features.dailyNotes") && (
                    <React.Suspense fallback={null}>
                        <DailyNotes quickCapture onClose={() => setShowQuickCapture(false)} />
                    </React.Suspense>
                )}

                {/* ── Update banner ── */}
                {updateStatus && (updateStatus.type === 'available' || updateStatus.type === 'downloading' || updateStatus.type === 'downloaded') && (
                    <div
                        className="fixed bottom-8 right-5 z-[200] flex items-center gap-3 px-4 py-3 rounded-2xl text-sm shadow-2xl"
                        style={{
                            backgroundColor: "var(--bg-panel)",
                            border: "1px solid var(--border-mid)",
                            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                        }}
                    >
                        {updateStatus.type === 'available' && (
                            <>
                                <span style={{ color: "var(--text-secondary)" }}>
                                    v{updateStatus.version} is available
                                </span>
                                <button
                                    onClick={() => (window as any).tesserin?.updater?.download()}
                                    className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                                    style={{ backgroundColor: "var(--bg-panel-inset)", color: "var(--text-primary)", border: "1px solid var(--border-dark)" }}
                                >
                                    Download
                                </button>
                                <button onClick={() => setUpdateStatus(null)} style={{ color: "var(--text-tertiary)" }} className="hover:opacity-70 text-xs">✕</button>
                            </>
                        )}
                        {updateStatus.type === 'downloading' && (
                            <span style={{ color: "var(--text-secondary)" }}>
                                Downloading update… {updateStatus.percent}%
                            </span>
                        )}
                        {updateStatus.type === 'downloaded' && (
                            <>
                                <span style={{ color: "var(--text-secondary)" }}>
                                    v{updateStatus.version} ready to install
                                </span>
                                <button
                                    onClick={() => (window as any).tesserin?.updater?.install()}
                                    className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
                                    style={{ backgroundColor: "var(--bg-panel-inset)", color: "var(--text-primary)", border: "1px solid var(--border-dark)" }}
                                >
                                    Restart &amp; Install
                                </button>
                            </>
                        )}
                    </div>
                )}

                {/* ── First-run onboarding ── */}
                {showOnboarding && (
                    <OnboardingWelcome onDone={handleOnboardingDone} />
                )}
            </div>
        </PluginProvider>
    )
}

export default function App() {
    const [loading, setLoading] = useState(true)
    const [fadingOut, setFadingOut] = useState(false)

    useEffect(() => {
        const fadeTimer = setTimeout(() => setFadingOut(true), 1600)
        const removeTimer = setTimeout(() => setLoading(false), 2000)
        return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer) }
    }, [])

    return (
        <TesserinThemeProvider>
            <ErrorBoundary>
                <NotesProvider>
                    <AppContent />
                </NotesProvider>
            </ErrorBoundary>
            {loading && <LoadingScreen fadingOut={fadingOut} />}
        </TesserinThemeProvider>
    )
}
