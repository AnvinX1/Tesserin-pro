"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { FiEye, FiEdit2, FiPlus, FiTrash2, FiLink2, FiChevronDown, FiFileText, FiClock, FiColumns, FiMenu } from "react-icons/fi"
import { useNotes, parseWikiLinks } from "@/lib/notes-store"
import { renderMarkdown } from "@/lib/markdown-renderer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

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
  /** Whether the notes sidebar is currently visible (primary pane only) */
  showSidebar?: boolean
  /** Callback to toggle the notes sidebar (primary pane only) */
  onToggleSidebar?: () => void
}

export function MarkdownEditor({ noteId: propsNoteId, onSelectNote, isSecondary, showSidebar, onToggleSidebar }: MarkdownEditorProps = {}) {
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

  // Secondary pane tracks its own selected note locally so it never
  // touches the global selectedNoteId used by the primary pane.
  const [secondaryNoteId, setSecondaryNoteId] = useState<string | null>(propsNoteId ?? null)
  // Sync when the parent explicitly changes the prop (e.g. opening a link in split)
  useEffect(() => {
    if (isSecondary && propsNoteId !== undefined) setSecondaryNoteId(propsNoteId)
  }, [isSecondary, propsNoteId])

  const effectiveNoteId = isSecondary
    ? (secondaryNoteId ?? propsNoteId ?? null)
    : (propsNoteId !== undefined ? propsNoteId : selectedNoteId)

  // For the secondary pane, note selection stays local;
  // for the primary pane, fall back to global selectNote.
  const effectiveSelectNote = useCallback((id: string) => {
    if (isSecondary) {
      setSecondaryNoteId(id)
      onSelectNote?.(id)
    } else {
      (onSelectNote || selectNote)(id)
    }
  }, [isSecondary, onSelectNote, selectNote])

  // Intercept addNote for secondary pane: create the note but select it
  // only within this pane — pass autoSelect=false so the global selectedNoteId
  // (which drives the primary pane) is never touched.
  const handleAddNote = useCallback(() => {
    if (isSecondary) {
      const id = addNote(undefined, undefined, undefined, false)
      // effectiveSelectNote updates both local state AND parent splitState.secondaryNoteId
      effectiveSelectNote(id)
    } else {
      addNote() // default autoSelect=true, handled inside the store
    }
  }, [addNote, isSecondary, effectiveSelectNote])

  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split")
  const [showNoteList, setShowNoteList] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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
      const links = parseWikiLinks(n.content)
      return links.some((l) => l.toLowerCase() === selectedNote.title.toLowerCase())
    })
  }, [notes, selectedNote])

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
    setShowDeleteConfirm(true)
  }, [])

  const confirmDelete = useCallback(() => {
    if (selectedNote) {
      deleteNote(selectedNote.id)
    }
    setShowDeleteConfirm(false)
  }, [selectedNote, deleteNote])

  /* ---- Empty state ---- */
  if (!selectedNote) {
    // Secondary pane: show a note list so the user can pick or create.
    if (isSecondary) {
      return (
        <div className="flex flex-col h-full">
          <div
            className="h-10 border-b flex items-center px-3 justify-between shrink-0"
            style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
          >
            <div className="flex items-center gap-2">
              <FiFileText size={13} style={{ color: "var(--text-tertiary)" }} />
              <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
                Notes
              </span>
            </div>
            <button
              onClick={handleAddNote}
              className="skeuo-btn flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            >
              <FiPlus size={12} />
              New
            </button>
          </div>
          {notes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={handleAddNote}
                className="skeuo-btn px-4 py-2.5 rounded-xl text-sm font-semibold"
              >
                <FiPlus size={13} className="inline mr-1.5" />
                Create Note
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => effectiveSelectNote(n.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors duration-150"
                  style={{ color: "var(--text-secondary)", backgroundColor: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
                >
                  <FiFileText size={13} className="shrink-0" style={{ color: "var(--text-tertiary)" }} />
                  <span className="truncate">{n.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    // Primary pane: centered empty state
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className="h-12 border-b flex items-center pl-3 pr-6 justify-between shrink-0"
          style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
        >
          <div className="flex items-center gap-2">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg"
                aria-label={showSidebar ? "Hide notes sidebar" : "Show notes sidebar"}
                title={showSidebar ? "Hide sidebar" : "Show sidebar"}
              >
                <FiMenu size={13} style={{ color: showSidebar ? "var(--accent-primary)" : "var(--text-tertiary)" }} />
              </button>
            )}
            <FiFileText size={14} style={{ color: "var(--text-tertiary)" }} />
            <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)" }}>
              No note selected
            </span>
          </div>
          <button
            onClick={handleAddNote}
            className="skeuo-btn px-3 py-1 text-[11px] flex items-center gap-1.5 rounded-lg"
          >
            <FiPlus size={12} /> New Note
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 opacity-30 select-none">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center skeuo-panel"
            style={{ background: "var(--bg-panel-inset)" }}
          >
            <FiFileText size={32} style={{ color: "var(--text-tertiary)" }} />
          </div>
          <div className="text-center">
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              Knowledge Vault Empty
            </h3>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Select a note or create a new one to begin.
            </p>
          </div>
        </div>
      </div>
    )
  }

  /* ---- Active state ---- */
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="h-12 border-b flex items-center pl-3 pr-4 gap-2 shrink-0 justify-between relative z-40"
        style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
      >
        {/* Sidebar toggle — primary pane only */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="skeuo-btn w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
            aria-label={showSidebar ? "Hide notes sidebar" : "Show notes sidebar"}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            <FiMenu size={13} style={{ color: showSidebar ? "var(--accent-primary)" : "var(--text-tertiary)" }} />
          </button>
        )}

        {/* Left: Note switcher */}
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNoteList(!showNoteList)}
            className="flex items-center gap-2 px-2  rounded-lg transition-colors hover:bg-white/5"
          >
            <FiFileText size={14} style={{ color: "var(--accent-primary)" }} />
            <span className="text-[11px] font-semibold tracking-wide truncate max-w-[160px]" style={{ color: "var(--text-primary)" }}>
              {selectedNote.title}
            </span>
            <FiChevronDown
              size={12}
              style={{
                color: "var(--text-tertiary)",
                transform: showNoteList ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
          </button>

          {showNoteList && (
            <div
              className="absolute top-full left-0 mt-1 w-64 max-h-80 overflow-y-auto skeuo-panel z-50 py-1.5 custom-scrollbar border shadow-2xl"
              style={{ 
                backgroundColor: "var(--bg-menu-obsidian)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
              }}
            >
              {notes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    effectiveSelectNote(n.id)
                    setShowNoteList(false)
                  }}
                  className="w-full text-left px-4 py-2 text-[11px] flex items-center justify-between group transition-colors hover:bg-white/5"
                  style={{
                    color: n.id === effectiveNoteId ? "var(--accent-primary)" : "var(--text-on-obsidian)",
                    fontWeight: n.id === effectiveNoteId ? 600 : 400,
                  }}
                >
                  <span className="truncate flex-1">{n.title}</span>
                  <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-on-obsidian)", opacity: 0.5 }}>
                    {relativeTime(n.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: View mode pill */}
        <div className="flex items-center gap-1 skeuo-inset p-0.5 rounded-lg">
          {([
            { id: "edit" as const, icon: FiEdit2 },
            { id: "split" as const, icon: FiColumns },
            { id: "preview" as const, icon: FiEye },
          ]).map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                viewMode === mode.id
                  ? "shadow-sm"
                  : "opacity-40 hover:opacity-70"
              }`}
              style={{
                background: viewMode === mode.id ? "var(--accent-primary)" : "transparent",
                color: viewMode === mode.id ? "#000" : "var(--text-primary)",
              }}
              title={mode.id}
            >
              <mode.icon size={14} />
            </button>
          ))}
        </div>

        {/* Right: Stats + Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end leading-none gap-1">
              <span className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>
                {stats.words} words
              </span>
              <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>
                {stats.readMin}m read
              </span>
            </div>
            <div className="w-px h-6 opacity-20" style={{ background: "var(--text-tertiary)" }} />
            <div className="flex flex-col items-start leading-none gap-1">
              <span className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: "var(--text-secondary)" }}>
                Updated
              </span>
              <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>
                {relativeTime(selectedNote.updatedAt)}
              </span>
            </div>
          </div>

          <div className="w-px h-6 opacity-20" style={{ background: "var(--text-tertiary)" }} />

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleAddNote}
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

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{selectedNote.title}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
