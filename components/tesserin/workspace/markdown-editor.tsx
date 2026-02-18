"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { FiEye, FiEdit2, FiPlus, FiTrash2, FiLink2, FiChevronDown, FiFileText } from "react-icons/fi"
import { useNotes, parseWikiLinks } from "@/lib/notes-store"
import { renderMarkdown } from "@/lib/markdown-renderer"
import { SkeuoBadge } from "../core/skeuo-badge"

/* ------------------------------------------------------------------ */
/*  Markdown renderer (legacy wrapper — uses shared renderer)           */
/* ------------------------------------------------------------------ */

function renderMarkdownLocal(
  markdown: string,
  existingTitles: Set<string>,
  onLinkClick: (title: string) => void,
): React.ReactNode {
  const lines = markdown.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0
  let key = 0

  /** Parse inline formatting within a single line */
  function parseInline(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    let remaining = text
    let inlineKey = 0

    while (remaining.length > 0) {
      // Wiki link
      const wikiMatch = remaining.match(/^\[\[([^\]]+)\]\]/)
      if (wikiMatch) {
        const title = wikiMatch[1].trim()
        const exists = existingTitles.has(title.toLowerCase())
        parts.push(
          <button
            key={`wiki-${inlineKey++}`}
            onClick={(e) => {
              e.preventDefault()
              onLinkClick(title)
            }}
            className="inline font-semibold cursor-pointer transition-colors duration-150"
            style={{
              color: "var(--accent-primary)",
              textDecoration: "underline",
              textDecorationStyle: exists ? "solid" : ("dashed" as any),
              textDecorationColor: "var(--accent-primary)",
              textUnderlineOffset: "3px",
              background: "none",
              border: "none",
              padding: 0,
              font: "inherit",
            }}
            title={exists ? `Open "${title}"` : `Create "${title}"`}
          >
            {title}
          </button>,
        )
        remaining = remaining.slice(wikiMatch[0].length)
        continue
      }

      // Inline code
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        parts.push(
          <code
            key={`code-${inlineKey++}`}
            className="px-1.5 py-0.5 rounded text-sm font-mono"
            style={{
              backgroundColor: "var(--code-bg)",
              color: "var(--accent-primary)",
              border: "1px solid var(--border-dark)",
            }}
          >
            {codeMatch[1]}
          </code>,
        )
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // Bold
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/)
      if (boldMatch) {
        parts.push(
          <strong key={`b-${inlineKey++}`} style={{ color: "var(--text-primary)" }}>
            {boldMatch[1]}
          </strong>,
        )
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Italic
      const italicMatch = remaining.match(/^\*(.+?)\*/)
      if (italicMatch) {
        parts.push(<em key={`i-${inlineKey++}`}>{italicMatch[1]}</em>)
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Strikethrough
      const strikeMatch = remaining.match(/^~~(.+?)~~/)
      if (strikeMatch) {
        parts.push(
          <del key={`s-${inlineKey++}`} style={{ opacity: 0.6 }}>
            {strikeMatch[1]}
          </del>,
        )
        remaining = remaining.slice(strikeMatch[0].length)
        continue
      }

      // Normal character
      parts.push(remaining[0])
      remaining = remaining.slice(1)
    }

    return parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <div key={key++} className="my-3 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-dark)" }}>
          {lang && (
            <div
              className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider border-b"
              style={{
                backgroundColor: "var(--bg-panel-inset)",
                borderColor: "var(--border-dark)",
                color: "var(--text-tertiary)",
              }}
            >
              {lang}
            </div>
          )}
          <pre
            className="p-4 overflow-x-auto text-sm font-mono leading-relaxed custom-scrollbar"
            style={{ backgroundColor: "var(--code-bg)", color: "var(--text-primary)" }}
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>,
      )
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(
        <hr
          key={key++}
          className="my-6"
          style={{ borderColor: "var(--border-dark)", opacity: 0.3 }}
        />,
      )
      i++
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const sizes: Record<number, string> = {
        1: "text-3xl font-bold mt-6 mb-3",
        2: "text-2xl font-bold mt-5 mb-2",
        3: "text-xl font-semibold mt-4 mb-2",
        4: "text-lg font-semibold mt-3 mb-1",
        5: "text-base font-semibold mt-2 mb-1",
        6: "text-sm font-semibold mt-2 mb-1 uppercase tracking-wider",
      }
      const Tag = `h${level}` as React.ElementType
      elements.push(
        <Tag
          key={key++}
          className={`${sizes[level]} leading-tight`}
          style={{ color: "var(--text-primary)" }}
        >
          {parseInline(text)}
        </Tag>,
      )
      i++
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <blockquote
          key={key++}
          className="my-3 pl-4 py-2 italic leading-relaxed"
          style={{
            borderLeft: "3px solid var(--accent-primary)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-panel-inset)",
            borderRadius: "0 8px 8px 0",
          }}
        >
          {quoteLines.map((ql, qi) => (
            <span key={qi}>
              {parseInline(ql)}
              {qi < quoteLines.length - 1 && <br />}
            </span>
          ))}
        </blockquote>,
      )
      continue
    }

    // Table (GFM)
    if (line.includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+/.test(lines[i + 1])) {
      const headerCells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
      i++ // skip separator
      i++
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(
          lines[i]
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean),
        )
        i++
      }
      elements.push(
        <div key={key++} className="my-3 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border-dark)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--bg-panel-inset)" }}>
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-4 py-2 text-left font-semibold border-b"
                    style={{ borderColor: "var(--border-dark)", color: "var(--text-primary)" }}
                  >
                    {parseInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid var(--border-dark)" }}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-4 py-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""))
        i++
      }
      elements.push(
        <ul key={key++} className="my-2 ml-6 list-disc" style={{ color: "var(--text-secondary)" }}>
          {items.map((item, ii) => (
            <li key={ii} className="py-0.5 leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ul>,
      )
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""))
        i++
      }
      elements.push(
        <ol key={key++} className="my-2 ml-6 list-decimal" style={{ color: "var(--text-secondary)" }}>
          {items.map((item, ii) => (
            <li key={ii} className="py-0.5 leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ol>,
      )
      continue
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-3" />)
      i++
      continue
    }

    // Paragraph
    elements.push(
      <p
        key={key++}
        className="my-1.5 leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {parseInline(line)}
      </p>,
    )
    i++
  }

  return elements
}

/* Overload: prefer the new shared renderer when the local wrapper is
   not needed for backwards compatibility. The markdown-editor preview
   pane still calls the 3-arg local function. */
void renderMarkdownLocal // keep TS from complaining about unused

/* ------------------------------------------------------------------ */
/*  MarkdownEditor Component                                            */
/* ------------------------------------------------------------------ */

/**
 * MarkdownEditor
 *
 * A Notion-style split-pane markdown editor with full wiki-link support.
 * Provides:
 *
 * - **Edit mode**: Raw markdown textarea with syntax highlighting hints
 * - **Preview mode**: Rendered markdown with interactive wiki-links
 * - **Split mode**: Side-by-side edit + preview
 * - **Note switcher**: Dropdown to switch between notes
 * - **Note management**: Create, delete, rename notes
 * - **Backlink count**: Shows number of incoming links
 *
 * Wiki-links (`[[Note Title]]`) are rendered as clickable accent-colored
 * links. Clicking navigates to (or creates) the target note.
 *
 * @example
 * ```tsx
 * <MarkdownEditor />
 * ```
 */
export function MarkdownEditor() {
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

  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("split")
  const [showNoteList, setShowNoteList] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
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
    if (selectedNote) {
      deleteNote(selectedNote.id)
    }
  }, [selectedNote, deleteNote])

  /* ---- Empty state ---- */
  if (!selectedNote) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className="h-14 border-b flex items-center px-6 justify-between shrink-0"
          style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
        >
          <div className="flex items-center gap-3">
            <FiFileText size={18} style={{ color: "var(--text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
              Notes
            </span>
          </div>
          <button
            onClick={() => addNote()}
            className="skeuo-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
          >
            <FiPlus size={14} />
            New Note
          </button>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 skeuo-inset"
            >
              <FiFileText size={28} style={{ color: "var(--text-tertiary)" }} />
            </div>
            <p className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
              No note selected
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
              Pick a note from the sidebar or graph, or create a new one.
            </p>
            <button
              onClick={() => addNote()}
              className="skeuo-btn px-4 py-2 rounded-xl text-sm font-semibold"
            >
              <FiPlus size={14} className="inline mr-1" />
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
        className="h-14 border-b flex items-center px-4 gap-3 shrink-0"
        style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
      >
        {/* Note switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNoteList(!showNoteList)}
            className="skeuo-btn flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold max-w-[200px]"
          >
            <FiFileText size={14} />
            <span className="truncate">{selectedNote.title}</span>
            <FiChevronDown size={12} />
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
                    selectNote(n.id)
                    setShowNoteList(false)
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors duration-150"
                  style={{
                    color:
                      n.id === selectedNoteId
                        ? "var(--text-on-accent)"
                        : "var(--text-secondary)",
                    backgroundColor:
                      n.id === selectedNoteId
                        ? "var(--accent-primary)"
                        : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (n.id !== selectedNoteId) {
                      e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (n.id !== selectedNoteId) {
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

        {/* View mode toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode("edit")}
            className={`skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg ${
              viewMode === "edit" ? "active" : ""
            }`}
            aria-label="Edit mode"
            aria-pressed={viewMode === "edit"}
          >
            <FiEdit2 size={14} />
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg ${
              viewMode === "split" ? "active" : ""
            }`}
            aria-label="Split mode"
            aria-pressed={viewMode === "split"}
          >
            <div className="flex gap-0.5">
              <div className="w-1.5 h-3 rounded-sm" style={{ border: "1.5px solid currentColor" }} />
              <div className="w-1.5 h-3 rounded-sm" style={{ border: "1.5px solid currentColor" }} />
            </div>
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={`skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg ${
              viewMode === "preview" ? "active" : ""
            }`}
            aria-label="Preview mode"
            aria-pressed={viewMode === "preview"}
          >
            <FiEye size={14} />
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={() => addNote()}
          className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
          aria-label="New note"
        >
          <FiPlus size={14} />
        </button>
        <button
          onClick={handleDelete}
          className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
          aria-label="Delete note"
        >
          <FiTrash2 size={14} />
        </button>
      </div>

      {/* Title editor */}
      <div className="px-6 pt-4 pb-2" style={{ background: "var(--bg-panel)" }}>
        <input
          value={selectedNote.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-2xl font-bold bg-transparent border-none focus:outline-none"
          style={{ color: "var(--text-primary)" }}
          placeholder="Note title..."
          aria-label="Note title"
        />
      </div>

      {/* Editor / Preview area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Edit pane */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className={`${viewMode === "split" ? "w-1/2 border-r" : "w-full"} flex flex-col min-h-0`} style={{ borderColor: "var(--border-dark)" }}>
            <div className="flex-1 overflow-hidden p-4">
              <div className="w-full h-full skeuo-inset overflow-hidden">
                <textarea
                  ref={textareaRef}
                  value={selectedNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-full p-6 resize-none bg-transparent border-none text-sm leading-relaxed custom-scrollbar font-mono focus:outline-none"
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
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <article className="max-w-none prose-tesserin">
                {renderMarkdown(selectedNote.content, { existingTitles, onLinkClick: navigateToWikiLink, textSize: "text-sm" })}
              </article>

              {/* Backlinks section */}
              {backlinks.length > 0 && (
                <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border-dark)" }}>
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <FiLink2 size={14} />
                    Backlinks ({backlinks.length})
                  </h3>
                  <div className="flex flex-col gap-2">
                    {backlinks.map((bl) => (
                      <button
                        key={bl.id}
                        onClick={() => selectNote(bl.id)}
                        className="text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 flex items-center gap-2"
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
