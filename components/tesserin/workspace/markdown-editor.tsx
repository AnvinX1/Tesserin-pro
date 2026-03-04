"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { FiEye, FiEdit2, FiPlus, FiTrash2, FiLink2, FiChevronDown, FiFileText, FiClock } from "react-icons/fi"
import { useNotes, parseWikiLinks } from "@/lib/notes-store"
import { renderMarkdown } from "@/lib/markdown-renderer"
import { SkeuoBadge } from "../core/skeuo-badge"

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

/* ------------------------------------------------------------------ */
/*  MarkdownEditor Component                                            */
/* ------------------------------------------------------------------ */

interface MarkdownEditorProps {
  /** Override note selection (for universal split pane secondary) */
  noteId?: string | null
  /** Custom note-select callback (for secondary pane) */
  onSelectNote?: (id: string) => void
  /** Whether this editor is in a secondary pane */
  isSecondary?: boolean
}

/**
 * MarkdownEditor
 *
 * A premium markdown editor with full wiki-link support.
 * Supports independent note selection for universal split panes.
 *
 * - **Edit mode**: Raw markdown textarea
 * - **Preview mode**: Rendered markdown with interactive wiki-links
 * - **Split mode**: Side-by-side edit + preview
 * - **Note switcher**: Dropdown to switch between notes
 * - **Note management**: Create, delete, rename notes
 * - **Backlink count**: Shows number of incoming links
 * - **Word count**: Live word, character, and reading time display
 *
 * Wiki-links (`[[Note Title]]`) are rendered as clickable accent-colored
 * links. Clicking navigates to (or creates) the target note.
 */
export function MarkdownEditor({ noteId: propsNoteId, onSelectNote, isSecondary }: MarkdownEditorProps = {}) {
  const {
    notes,
    selectedNoteId,
    selectNote,
    addNote,
    updateNote,
    deleteNote,
    navigateToWikiLink,
    graph,
  } = useNotes()

  // Use prop noteId if explicitly provided (secondary pane), otherwise global
  const effectiveNoteId = propsNoteId !== undefined ? propsNoteId : selectedNoteId
  const effectiveSelectNote = onSelectNote || selectNote

  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split")
  const [showNoteList, setShowNoteList] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === effectiveNoteId) ?? null,
    [notes, effectiveNoteId],
  )

  /** Set of existing titles (lower-cased) for wiki-link styling */
  const existingTitles = useMemo(
    () => new Set(notes.map((n) => n.title.toLowerCase())),
    [notes],
  )

  /** Backlinks pointing to the current note */
  const backlinks = useMemo(() => {
    if (!selectedNote) return []
    return notes.filter((n) => {
      if (n.id === selectedNote.id) return false
      const refs = parseWikiLinks(n.content)
      return refs.some(
        (ref) => ref.toLowerCase() === selectedNote.title.toLowerCase(),
      )
    })
  }, [notes, selectedNote])

  /** Word count, character count, reading time */
  const stats = useMemo(() => {
    if (!selectedNote) return { words: 0, chars: 0, readMin: 0 }
    const text = selectedNote.content.trim()
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0
    return { words, chars: text.length, readMin: Math.max(1, Math.ceil(words / 200)) }
  }, [selectedNote])

  /** Close dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNoteList(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleContentChange = useCallback(
    (value: string) => {
      if (selectedNote) {
        updateNote(selectedNote.id, { content: value })
      }
    },
    [selectedNote, updateNote],
  )

  const handleTitleChange = useCallback(
    (value: string) => {
      if (selectedNote) {
        updateNote(selectedNote.id, { title: value })
      }
    },
    [selectedNote, updateNote],
  )

  const handleDelete = useCallback(() => {
    if (selectedNote && window.confirm(`Delete "${selectedNote.title}"? This cannot be undone.`)) {
      deleteNote(selectedNote.id)
    }
  }, [selectedNote, deleteNote])

  /* ---- Empty state ---- */
  if (!selectedNote) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className="h-12 border-b flex items-center pl-20 pr-6 justify-between shrink-0"
          style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
        >
          <div className="flex items-center gap-3">
            <FiFileText size={16} style={{ color: "var(--text-tertiary)" }} />
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
              Notes
            </span>
          </div>
          <button
            onClick={() => addNote()}
            className="skeuo-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            <FiPlus size={13} />
            New Note
          </button>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 skeuo-inset"
              style={{ opacity: 0.7 }}
            >
              <FiFileText size={32} style={{ color: "var(--text-tertiary)" }} />
            </div>
            <p className="text-xl font-bold mb-2 tracking-tight" style={{ color: "var(--text-primary)" }}>
              No note selected
            </p>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
              Pick a note from the sidebar or graph, or start fresh with a new one.
            </p>
            <button
              onClick={() => addNote()}
              className="skeuo-btn px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              <FiPlus size={14} className="inline mr-1.5" />
              Create Note
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---- Active note editor ---- */
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="h-12 border-b flex items-center pl-20 pr-4 gap-2 shrink-0"
        style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
      >
        {/* Note switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNoteList(!showNoteList)}
            className="skeuo-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold max-w-[200px]"
          >
            <FiFileText size={13} />
            <span className="truncate">{selectedNote.title}</span>
            <FiChevronDown size={11} />
          </button>

          {showNoteList && (
            <div
              className="absolute top-full left-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-xl z-50 skeuo-panel custom-scrollbar"
              style={{ padding: "4px" }}
            >
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    effectiveSelectNote(n.id)
                    setShowNoteList(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors duration-150"
                  style={{
                    color:
                      n.id === effectiveNoteId
                        ? "var(--text-on-accent)"
                        : "var(--text-secondary)",
                    backgroundColor:
                      n.id === effectiveNoteId
                        ? "var(--accent-primary)"
                        : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (n.id !== effectiveNoteId) {
                      e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (n.id !== effectiveNoteId) {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }
                  }}
                >
                  <FiFileText size={14} className="shrink-0" />
                  <span className="truncate">{n.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <SkeuoBadge>
          {backlinks.length} backlink{backlinks.length !== 1 ? "s" : ""}
        </SkeuoBadge>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats badge */}
        <span
          className="hidden sm:flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md mr-1"
          style={{ color: "var(--text-tertiary)", backgroundColor: "var(--bg-panel-inset)" }}
        >
          {stats.words} words · {stats.readMin} min read
        </span>

        {/* Last modified */}
        {selectedNote.updatedAt && (
          <span
            className="hidden md:flex items-center gap-1 text-[10px] mr-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            <FiClock size={10} />
            {relativeTime(selectedNote.updatedAt)}
          </span>
        )}

        {/* View mode toggles */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setViewMode("edit")}
            className={`skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg ${viewMode === "edit" ? "active" : ""
              }`}
            aria-label="Edit mode"
            aria-pressed={viewMode === "edit"}
          >
            <FiEdit2 size={13} />
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg ${viewMode === "split" ? "active" : ""
              }`}
            aria-label="Split mode"
            aria-pressed={viewMode === "split"}
          >
            <div className="flex gap-px">
              <div className="w-1.5 h-3 rounded-sm" style={{ border: "1.5px solid currentColor" }} />
              <div className="w-1.5 h-3 rounded-sm" style={{ border: "1.5px solid currentColor" }} />
            </div>
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={`skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg ${viewMode === "preview" ? "active" : ""
              }`}
            aria-label="Preview mode"
            aria-pressed={viewMode === "preview"}
          >
            <FiEye size={13} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={() => addNote()}
            className="skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg"
            aria-label="New note"
          >
            <FiPlus size={13} />
          </button>
          <button
            onClick={handleDelete}
            className="skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg"
            aria-label="Delete note"
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      {/* Title editor */}
      <div className="px-8 pt-6 pb-3" style={{ background: "var(--bg-panel)" }}>
        <input
          value={selectedNote.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none tracking-tight"
          style={{ color: "var(--text-primary)", lineHeight: "1.2" }}
          placeholder="Untitled"
          aria-label="Note title"
        />
        {selectedNote.tags && selectedNote.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {selectedNote.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                style={{
                  color: tag.color || "var(--accent-primary)",
                  backgroundColor: tag.color ? `${tag.color}10` : "rgba(250, 204, 21, 0.06)",
                }}
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Editor / Preview area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Edit pane */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2 border-r" : "w-full"} flex flex-col min-h-0`} style={{ borderColor: "var(--border-dark)" }}>
            <div className="flex-1 overflow-hidden p-4">
              <div className="w-full h-full skeuo-inset overflow-hidden rounded-xl">
                <textarea
                  ref={textareaRef}
                  value={selectedNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full p-6 resize-none bg-transparent border-none text-[15px] leading-[1.85] custom-scrollbar font-mono focus:outline-none"
                  style={{ color: "var(--text-primary)" }}
                  placeholder="Start writing in Markdown...&#10;&#10;Link notes with [[Double Brackets]]"
                  aria-label="Markdown editor"
                  spellCheck={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Preview pane */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2" : "w-full"} flex flex-col min-h-0`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
              <article className="max-w-2xl mx-auto prose-tesserin">
                {renderMarkdown(selectedNote.content, { existingTitles, onLinkClick: navigateToWikiLink, textSize: "text-base" })}
              </article>

              {/* Backlinks section */}
              {backlinks.length > 0 && (
                <div className="max-w-2xl mx-auto mt-10 pt-6" style={{ borderTop: "1px solid var(--border-dark)" }}>
                  <h3
                    className="text-[10px] font-semibold uppercase tracking-widest mb-3 flex items-center gap-2"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <FiLink2 size={12} />
                    Backlinks ({backlinks.length})
                  </h3>
                  <div className="flex flex-col gap-1">
                    {backlinks.map((bl) => (
                      <button
                        key={bl.id}
                        onClick={() => effectiveSelectNote(bl.id)}
                        className="text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 flex items-center gap-2"
                        style={{ color: "var(--accent-primary)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent"
                        }}
                      >
                        <FiFileText size={14} className="shrink-0" />
                        {bl.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
