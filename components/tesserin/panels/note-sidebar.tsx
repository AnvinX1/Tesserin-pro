"use client"

import React, { useState, useMemo } from "react"
import { FiSearch, FiPlus, FiFileText, FiLink2, FiList, FiClock, FiX } from "react-icons/fi"
import { useNotes, parseWikiLinks } from "@/lib/notes-store"
import { SkeuoPanel } from "../core/skeuo-panel"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type SortMode = "recent" | "alpha" | "links"

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * NoteSidebar
 *
 * A compact sidebar panel that displays the full list of notes in the
 * Zettelkasten vault. Supports search/filter, multiple sort modes,
 * and shows backlink counts per note.
 *
 * Features:
 * - **Search** -- real-time filter by title
 * - **Sort modes** -- Recently modified, Alphabetical, Most linked
 * - **Backlink count** -- badge showing inbound link count per note
 * - **Quick create** -- new note button in the header
 * - **Click to open** -- selects the note in the editor
 *
 * Styled with the existing skeuomorphic panel and inset classes
 * to match the Tesserin design system.
 *
 * @param visible - Whether the sidebar is shown
 * @param onClose - Callback to close/hide the sidebar
 *
 * @example
 * ```tsx
 * <NoteSidebar visible={true} onClose={() => setShow(false)} />
 * ```
 */

interface NoteSidebarProps {
  /** Whether the panel is visible */
  visible: boolean
  /** Called when the close button is clicked */
  onClose: () => void
}

export function NoteSidebar({ visible, onClose }: NoteSidebarProps) {
  const { notes, selectedNoteId, selectNote, addNote, graph } = useNotes()
  const [search, setSearch] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("recent")

  /** Compute backlink counts from graph data */
  const backlinkCounts = useMemo(() => {
    const counts = new Map<string, number>()
    notes.forEach((n) => counts.set(n.id, 0))
    notes.forEach((note) => {
      const refs = parseWikiLinks(note.content)
      refs.forEach((ref) => {
        const target = notes.find(
          (n) => n.title.toLowerCase() === ref.toLowerCase(),
        )
        if (target && target.id !== note.id) {
          counts.set(target.id, (counts.get(target.id) ?? 0) + 1)
        }
      })
    })
    return counts
  }, [notes])

  /** Filtered and sorted notes */
  const displayNotes = useMemo(() => {
    let filtered = notes
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      )
    }

    const sorted = [...filtered]
    switch (sortMode) {
      case "recent":
        sorted.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        break
      case "alpha":
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      case "links":
        sorted.sort(
          (a, b) =>
            (backlinkCounts.get(b.id) ?? 0) - (backlinkCounts.get(a.id) ?? 0),
        )
        break
    }

    return sorted
  }, [notes, search, sortMode, backlinkCounts])

  if (!visible) return null

  return (
    <SkeuoPanel className="w-72 h-full flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: "var(--border-dark)" }}
      >
        <h2
          className="text-sm font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Notes ({notes.length})
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => addNote()}
            className="skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg"
            aria-label="Create new note"
          >
            <FiPlus size={14} />
          </button>
          <button
            onClick={onClose}
            className="skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg"
            aria-label="Close notes panel"
          >
            <FiX size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="skeuo-inset flex items-center gap-2 px-3 py-1.5">
          <FiSearch size={14} style={{ color: "var(--text-tertiary)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-sm focus:outline-none"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search notes..."
            aria-label="Search notes"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Clear search"
            >
              <FiX size={12} style={{ color: "var(--text-secondary)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Sort controls */}
      <div className="px-3 pb-2 flex gap-1 shrink-0">
        {(
          [
            { id: "recent" as SortMode, icon: FiClock, label: "Recent" },
            { id: "alpha" as SortMode, icon: FiList, label: "A-Z" },
            { id: "links" as SortMode, icon: FiLink2, label: "Links" },
          ] as const
        ).map((s) => (
          <button
            key={s.id}
            onClick={() => setSortMode(s.id)}
            className={`skeuo-btn flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
              sortMode === s.id ? "active" : ""
            }`}
            aria-label={`Sort by ${s.label}`}
            aria-pressed={sortMode === s.id}
          >
            <s.icon size={11} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {displayNotes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {search ? "No matching notes" : "No notes yet"}
            </p>
          </div>
        )}

        {displayNotes.map((note) => {
          const isSelected = note.id === selectedNoteId
          const blCount = backlinkCounts.get(note.id) ?? 0

          return (
            <button
              key={note.id}
              onClick={() => selectNote(note.id)}
              className="w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-all duration-150 flex items-start gap-2.5"
              style={{
                backgroundColor: isSelected
                  ? "var(--accent-primary)"
                  : "transparent",
                color: isSelected
                  ? "var(--text-on-accent)"
                  : "var(--text-secondary)",
                boxShadow: isSelected ? "var(--input-inner-shadow)" : "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected)
                  e.currentTarget.style.backgroundColor =
                    "var(--bg-panel-inset)"
              }}
              onMouseLeave={(e) => {
                if (!isSelected)
                  e.currentTarget.style.backgroundColor = "transparent"
              }}
              aria-current={isSelected ? "true" : undefined}
            >
              <FiFileText size={15} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={{
                    color: isSelected
                      ? "var(--text-on-accent)"
                      : "var(--text-primary)",
                  }}
                >
                  {note.title}
                </p>
                <p className="text-xs mt-0.5 truncate opacity-70">
                  {note.content
                    .replace(/^#.*\n?/gm, "")
                    .replace(/\[\[([^\]]+)\]\]/g, "$1")
                    .trim()
                    .slice(0, 60)}
                </p>
              </div>
              {blCount > 0 && (
                <span
                  className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-md mt-0.5"
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(0,0,0,0.15)"
                      : "var(--bg-panel-inset)",
                    color: isSelected
                      ? "var(--text-on-accent)"
                      : "var(--text-tertiary)",
                  }}
                >
                  {blCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer stats */}
      <div
        className="px-4 py-2 border-t text-xs font-mono shrink-0 flex items-center justify-between"
        style={{
          borderColor: "var(--border-dark)",
          color: "var(--text-tertiary)",
        }}
      >
        <span>{graph.nodes.length} notes</span>
        <span>{graph.links.length} links</span>
      </div>
    </SkeuoPanel>
  )
}
