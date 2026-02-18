"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { FiSearch, FiFileText, FiPlus, FiCommand, FiHash, FiCalendar, FiLayout, FiX } from "react-icons/fi"
import { useNotes } from "@/lib/notes-store"

/**
 * SearchPalette
 *
 * Cmd+K command palette with:
 * - Fuzzy note search (from store or SQLite FTS)
 * - Quick note creation
 * - Command execution (new note, toggle theme, etc.)
 * - Keyboard navigation (↑/↓, Enter, Esc)
 */

interface SearchPaletteProps {
    isOpen: boolean
    onClose: () => void
    onSelectNote: (noteId: string) => void
}

interface SearchResult {
    id: string
    type: "note" | "command" | "create"
    title: string
    subtitle?: string
    icon: React.ReactNode
    action: () => void
}

const COMMANDS: Array<{ id: string; title: string; subtitle: string; icon: React.ReactNode; action: () => void }> = [
    {
        id: "cmd-new-note",
        title: "New Note",
        subtitle: "Create a blank note",
        icon: <FiPlus size={14} />,
        action: () => { },
    },
    {
        id: "cmd-daily",
        title: "Today's Daily Note",
        subtitle: "Open today's journal",
        icon: <FiCalendar size={14} />,
        action: () => { },
    },
    {
        id: "cmd-kanban",
        title: "Open Kanban Board",
        subtitle: "View task board",
        icon: <FiLayout size={14} />,
        action: () => { },
    },
]

export function SearchPalette({ isOpen, onClose, onSelectNote }: SearchPaletteProps) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SearchResult[]>([])
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const { notes, addNote, searchNotes } = useNotes()

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery("")
            setActiveIndex(0)
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // Update results when query or notes change
    useEffect(() => {
        async function updateResults() {
            if (!query.trim()) {
                // Show recent notes + commands when no query
                const recent = notes.slice(0, 5).map((n): SearchResult => ({
                    id: n.id,
                    type: "note",
                    title: n.title,
                    subtitle: `Updated ${new Date(n.updatedAt).toLocaleDateString()}`,
                    icon: <FiFileText size={14} />,
                    action: () => onSelectNote(n.id),
                }))

                const cmds = COMMANDS.map((c): SearchResult => ({
                    ...c,
                    type: "command",
                    action: c.action,
                }))

                setResults([...recent, ...cmds])
                return
            }

            // Search notes (uses FTS in Electron, in-memory in browser)
            const q = query.toLowerCase()
            let matchedNotes: typeof notes

            try {
                matchedNotes = await searchNotes(q)
            } catch {
                matchedNotes = notes.filter(
                    (n) =>
                        n.title.toLowerCase().includes(q) ||
                        n.content.toLowerCase().includes(q),
                )
            }

            const noteResults: SearchResult[] = matchedNotes.slice(0, 8).map((n) => ({
                id: n.id,
                type: "note",
                title: n.title,
                subtitle: n.content.substring(0, 80).replace(/[#\n]/g, " ").trim(),
                icon: <FiFileText size={14} />,
                action: () => onSelectNote(n.id),
            }))

            // "Create note" option if no exact match
            const hasExactMatch = notes.some(
                (n) => n.title.toLowerCase() === q,
            )
            if (!hasExactMatch && query.trim()) {
                noteResults.push({
                    id: "create-new",
                    type: "create",
                    title: `Create "${query.trim()}"`,
                    subtitle: "New note",
                    icon: <FiPlus size={14} />,
                    action: () => {
                        const id = addNote(query.trim())
                        onSelectNote(id)
                    },
                })
            }

            // Filter commands matching query
            const matchingCmds: SearchResult[] = COMMANDS
                .filter((c) => c.title.toLowerCase().includes(q))
                .map((c) => ({
                    ...c,
                    type: "command",
                    action: c.action,
                }))

            setResults([...noteResults, ...matchingCmds])
            setActiveIndex(0)
        }

        updateResults()
    }, [query, notes, searchNotes, addNote, onSelectNote])

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "ArrowDown") {
                e.preventDefault()
                setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))
            } else if (e.key === "ArrowUp") {
                e.preventDefault()
                setActiveIndex((prev) => Math.max(prev - 1, 0))
            } else if (e.key === "Enter" && results[activeIndex]) {
                e.preventDefault()
                results[activeIndex].action()
                onClose()
            } else if (e.key === "Escape") {
                onClose()
            }
        },
        [results, activeIndex, onClose],
    )

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
            onClick={onClose}
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
        >
            <div
                className="w-full max-w-lg rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
                onClick={(e) => e.stopPropagation()}
                style={{
                    backgroundColor: "var(--bg-panel)",
                    border: "1px solid var(--border-mid)",
                    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.25)",
                }}
            >
                {/* Search input */}
                <div
                    className="flex items-center gap-3 px-4 py-4 border-b"
                    style={{ borderColor: "var(--border-dark)" }}
                >
                    <FiSearch size={18} style={{ color: "var(--text-tertiary)" }} />
                    <input
                        ref={inputRef}
                        className="flex-1 bg-transparent text-base focus:outline-none"
                        style={{ color: "var(--text-primary)" }}
                        placeholder="Search notes, commands..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        aria-label="Search notes"
                    />
                    <kbd
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                            backgroundColor: "var(--bg-panel-inset)",
                            color: "var(--text-tertiary)",
                            border: "1px solid var(--border-mid)",
                        }}
                    >
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar py-2">
                    {results.length === 0 ? (
                        <div
                            className="px-4 py-8 text-center text-sm"
                            style={{ color: "var(--text-tertiary)" }}
                        >
                            No results found for &quot;{query}&quot;
                        </div>
                    ) : (
                        results.map((result, i) => (
                            <button
                                key={result.id}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                                style={{
                                    backgroundColor:
                                        i === activeIndex ? "var(--bg-panel-inset)" : "transparent",
                                    color: "var(--text-primary)",
                                }}
                                onMouseEnter={() => setActiveIndex(i)}
                                onClick={() => {
                                    result.action()
                                    onClose()
                                }}
                            >
                                <span
                                    className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{
                                        backgroundColor:
                                            result.type === "create"
                                                ? "var(--accent-primary)"
                                                : "var(--bg-panel-inset)",
                                        color:
                                            result.type === "create"
                                                ? "var(--text-on-accent)"
                                                : "var(--text-secondary)",
                                    }}
                                >
                                    {result.icon}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{result.title}</div>
                                    {result.subtitle && (
                                        <div
                                            className="text-xs truncate"
                                            style={{ color: "var(--text-tertiary)" }}
                                        >
                                            {result.subtitle}
                                        </div>
                                    )}
                                </div>
                                {result.type === "note" && (
                                    <FiHash size={12} style={{ color: "var(--text-tertiary)" }} />
                                )}
                                {result.type === "command" && (
                                    <FiCommand size={12} style={{ color: "var(--text-tertiary)" }} />
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div
                    className="px-4 py-2 flex items-center gap-4 text-[10px] border-t"
                    style={{
                        borderColor: "var(--border-dark)",
                        color: "var(--text-tertiary)",
                    }}
                >
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 rounded" style={{ backgroundColor: "var(--bg-panel-inset)" }}>↑↓</kbd> Navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 rounded" style={{ backgroundColor: "var(--bg-panel-inset)" }}>↵</kbd> Open
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1 rounded" style={{ backgroundColor: "var(--bg-panel-inset)" }}>esc</kbd> Close
                    </span>
                </div>
            </div>
        </div>
    )
}
