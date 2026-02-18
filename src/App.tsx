import React, { useState, useEffect, useCallback } from "react"

// Core
import { TesserinThemeProvider } from "@/components/tesserin/core/theme-provider"
import { SkeuoPanel } from "@/components/tesserin/core/skeuo-panel"
import { LoadingScreen } from "@/components/tesserin/core/loading-screen"
import { TitleBar } from "@/components/tesserin/core/title-bar"

// Panels
import { LeftDock, type TabId } from "@/components/tesserin/panels/left-dock"
import { NoteSidebar } from "@/components/tesserin/panels/note-sidebar"
import { FloatingAIChat } from "@/components/tesserin/panels/floating-ai-chat"
import { SearchPalette } from "@/components/tesserin/panels/search-palette"
import { ExportPanel } from "@/components/tesserin/panels/export-panel"
import { TemplateManager } from "@/components/tesserin/panels/template-manager"

// Workspace
import { MarkdownEditor } from "@/components/tesserin/workspace/markdown-editor"
import { CreativeCanvas } from "@/components/tesserin/workspace/creative-canvas"
import { D3GraphView } from "@/components/tesserin/workspace/d3-graph-view"
import { CodeView } from "@/components/tesserin/workspace/code-view"
import { KanbanView } from "@/components/tesserin/workspace/kanban-view"
import { DailyNotes } from "@/components/tesserin/workspace/daily-notes"
import { SAMNode } from "@/components/tesserin/workspace/sam-node"
import { SettingsPanel } from "@/components/tesserin/panels/settings-panel"

import { NotesProvider, useNotes } from "@/lib/notes-store"

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
    const [activeTab, setActiveTab] = useState<TabId>("graph")
    const [showNotes, setShowNotes] = useState(true)
    const [showSearch, setShowSearch] = useState(false)
    const [showExport, setShowExport] = useState(false)
    const [showTemplates, setShowTemplates] = useState(false)
    const { notes, selectedNoteId, selectNote } = useNotes()

    const selectedNote = notes.find(n => n.id === selectedNoteId) || null

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey
            if (mod && e.key === 'k') {
                e.preventDefault()
                setShowSearch(prev => !prev)
            } else if (mod && e.key === 'e') {
                e.preventDefault()
                setShowExport(prev => !prev)
            } else if (mod && e.key === 't') {
                e.preventDefault()
                setShowTemplates(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    const handleSelectNote = useCallback(
        (noteId: string) => {
            selectNote(noteId)
            setActiveTab("notes")
            setShowSearch(false)
        },
        [selectNote],
    )

    return (
        <div
            className="w-full h-screen flex flex-col overflow-hidden font-sans transition-colors duration-300"
            style={{ backgroundColor: "var(--bg-app)", color: "var(--text-primary)" }}
        >
            {/* Custom Title Bar */}
            <TitleBar />

            <div className="flex-1 flex overflow-hidden">
                {/* ── Left Dock ── */}
                <LeftDock activeTab={activeTab} setActiveTab={setActiveTab} />

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

                        {/* Active workspace panel – all panels stay mounted, only the active one is visible.
                            This prevents Excalidraw (and other stateful components) from losing state on tab switch. */}
                        <SkeuoPanel className="flex-1 h-full flex flex-col overflow-hidden">
                            <div className={`w-full h-full ${activeTab === "notes" ? "" : "hidden"}`}><MarkdownEditor /></div>
                            <div className={`w-full h-full ${activeTab === "canvas" ? "" : "hidden"}`}><CreativeCanvas /></div>
                            <div className={`w-full h-full ${activeTab === "graph" ? "" : "hidden"}`}><D3GraphView /></div>
                            <div className={`w-full h-full ${activeTab === "code" ? "" : "hidden"}`}><CodeView /></div>
                            <div className={`w-full h-full ${activeTab === "kanban" ? "" : "hidden"}`}><KanbanView /></div>
                            <div className={`w-full h-full ${activeTab === "daily" ? "" : "hidden"}`}><DailyNotes /></div>
                            <div className={`w-full h-full ${activeTab === "sam" ? "" : "hidden"}`}><SAMNode /></div>
                            <div className={`w-full h-full ${activeTab === "settings" ? "" : "hidden"}`}><SettingsPanel /></div>
                        </SkeuoPanel>
                    </div>
                </main>
            </div>

            {/* ── Floating AI Chat ── */}
            <FloatingAIChat />

            {/* ── Overlays ── */}
            <SearchPalette
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                onSelectNote={handleSelectNote}
            />
            <ExportPanel
                isOpen={showExport}
                onClose={() => setShowExport(false)}
                note={selectedNote}
            />
            <TemplateManager
                isOpen={showTemplates}
                onClose={() => setShowTemplates(false)}
                onCreateNote={handleSelectNote}
            />
        </div>
    )
}

export default function App() {
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 2000)
        return () => clearTimeout(timer)
    }, [])

    if (loading) {
        return (
            <TesserinThemeProvider>
                <LoadingScreen />
            </TesserinThemeProvider>
        )
    }

    return (
        <TesserinThemeProvider>
            <NotesProvider>
                <AppContent />
            </NotesProvider>
        </TesserinThemeProvider>
    )
}
