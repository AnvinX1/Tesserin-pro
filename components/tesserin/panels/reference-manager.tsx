"use client"

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  FiBook, FiPlus, FiSearch, FiTag, FiTrash2, FiCopy, FiCheck,
  FiChevronDown, FiChevronRight, FiFileText, FiExternalLink,
  FiUpload, FiDownload, FiEdit2, FiX, FiMessageSquare,
} from "react-icons/fi"
import {
  parseBibTeX,
  formatCitation,
  formatInlineCitation,
  exportBibTeX,
  extractCitations,
  generateBibliography,
  type BibEntry,
  type Annotation,
  type CitationStyle,
} from "@/lib/reference-manager"
import { useNotes } from "@/lib/notes-store"

/**
 * ReferenceManager
 *
 * A full reference management panel for researchers:
 * - Import BibTeX files
 * - Browse, search, and filter references
 * - View citation details and annotations
 * - Insert citations into notes with [@key] syntax
 * - Generate bibliography sections
 * - Export library as BibTeX
 */

interface ReferenceManagerProps {
  isOpen: boolean
  onClose: () => void
  onInsertCitation?: (citation: string) => void
}

type ViewMode = "library" | "detail" | "import"

export function ReferenceManager({ isOpen, onClose, onInsertCitation }: ReferenceManagerProps) {
  const { notes, selectedNoteId, updateNote } = useNotes()
  const [library, setLibrary] = useState<BibEntry[]>(() => {
    try {
      const stored = localStorage.getItem("tesserin:references")
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [viewMode, setViewMode] = useState<ViewMode>("library")
  const [selectedEntry, setSelectedEntry] = useState<BibEntry | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [citationStyle, setCitationStyle] = useState<CitationStyle>("apa")
  const [bibtexInput, setBibtexInput] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showStyleMenu, setShowStyleMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Persist library to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("tesserin:references", JSON.stringify(library))
    } catch {}
  }, [library])

  // All unique tags across library
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    library.forEach((e) => e.tags.forEach((t) => tags.add(t)))
    return Array.from(tags).sort()
  }, [library])

  // Filtered & searched library
  const filteredLibrary = useMemo(() => {
    let items = library

    // Tag filter
    if (filterTag) {
      items = items.filter((e) => e.tags.includes(filterTag))
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.author.toLowerCase().includes(q) ||
          e.key.toLowerCase().includes(q) ||
          e.year.includes(q),
      )
    }

    // Sort by year desc, then author
    return items.sort((a, b) => {
      const yearDiff = parseInt(b.year || "0") - parseInt(a.year || "0")
      if (yearDiff !== 0) return yearDiff
      return a.author.localeCompare(b.author)
    })
  }, [library, searchQuery, filterTag])

  // Find citations in the current note
  const currentNoteCitations = useMemo(() => {
    const note = notes.find((n) => n.id === selectedNoteId)
    if (!note) return []
    return extractCitations(note.content)
  }, [notes, selectedNoteId])

  // Import BibTeX
  const handleImportBibtex = useCallback(() => {
    if (!bibtexInput.trim()) return
    const parsed = parseBibTeX(bibtexInput)
    if (parsed.length === 0) return

    setLibrary((prev) => {
      const existingKeys = new Set(prev.map((e) => e.key))
      const newEntries = parsed.filter((e) => !existingKeys.has(e.key))
      return [...prev, ...newEntries]
    })
    setBibtexInput("")
    setViewMode("library")
  }, [bibtexInput])

  // Import from file
  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) {
        const parsed = parseBibTeX(text)
        setLibrary((prev) => {
          const existingKeys = new Set(prev.map((entry) => entry.key))
          const newEntries = parsed.filter((entry) => !existingKeys.has(entry.key))
          return [...prev, ...newEntries]
        })
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  // Delete entry
  const handleDelete = useCallback((key: string) => {
    setLibrary((prev) => prev.filter((e) => e.key !== key))
    if (selectedEntry?.key === key) {
      setSelectedEntry(null)
      setViewMode("library")
    }
  }, [selectedEntry])

  // Insert citation into current note
  const handleInsertCitation = useCallback(
    (entry: BibEntry) => {
      const citation = `[@${entry.key}]`
      if (onInsertCitation) {
        onInsertCitation(citation)
      } else {
        // Try to append to current note
        const note = notes.find((n) => n.id === selectedNoteId)
        if (note) {
          updateNote(note.id, { content: note.content + ` ${citation}` })
        }
      }
      setCopiedKey(entry.key)
      setTimeout(() => setCopiedKey(null), 2000)
    },
    [notes, selectedNoteId, updateNote, onInsertCitation],
  )

  // Copy citation to clipboard
  const handleCopyCitation = useCallback(
    (entry: BibEntry) => {
      const text = formatCitation(entry, citationStyle)
      navigator.clipboard.writeText(text)
      setCopiedKey(entry.key)
      setTimeout(() => setCopiedKey(null), 2000)
    },
    [citationStyle],
  )

  // Generate bibliography
  const handleGenerateBibliography = useCallback(() => {
    const note = notes.find((n) => n.id === selectedNoteId)
    if (!note) return
    const bib = generateBibliography(note.content, library, citationStyle)
    if (bib) {
      updateNote(note.id, { content: note.content + bib })
    }
  }, [notes, selectedNoteId, library, citationStyle, updateNote])

  // Export library
  const handleExportLibrary = useCallback(() => {
    const bibtex = exportBibTeX(library)
    const blob = new Blob([bibtex], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tesserin-library.bib"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [library])

  // Add annotation to entry
  const handleAddAnnotation = useCallback(
    (entryKey: string, text: string, comment: string, color: Annotation["color"]) => {
      setLibrary((prev) =>
        prev.map((e) => {
          if (e.key !== entryKey) return e
          return {
            ...e,
            annotations: [
              ...e.annotations,
              {
                id: crypto.randomUUID(),
                text,
                comment,
                color,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        }),
      )
    },
    [],
  )

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[6vh]"
      onClick={onClose}
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        style={{
          maxHeight: "82vh",
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-mid)",
          borderRadius: 16,
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center gap-3 flex-shrink-0"
          style={{ borderColor: "var(--border-dark)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            References
          </h2>

          <div className="flex items-center gap-1 text-xs">
            {(["library", "import"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-2.5 py-1 rounded-lg capitalize transition-colors hover:bg-white/10"
                style={{
                  backgroundColor: viewMode === mode ? "var(--bg-panel-inset)" : "transparent",
                  color: viewMode === mode ? "var(--text-primary)" : "var(--text-tertiary)",
                  border: viewMode === mode ? "1px solid var(--border-dark)" : "1px solid transparent",
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Citation style selector */}
          <div className="relative">
            <button
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              className="px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 transition-colors hover:bg-white/10"
              style={{
                backgroundColor: "var(--bg-panel-inset)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-dark)",
              }}
            >
              {citationStyle.toUpperCase()} <FiChevronDown size={10} />
            </button>
            {showStyleMenu && (
              <div
                className="absolute top-full right-0 mt-1 rounded-lg overflow-hidden z-50"
                style={{
                  backgroundColor: "var(--bg-panel)",
                  border: "1px solid var(--border-mid)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              >
                {(["apa", "chicago", "ieee", "mla"] as CitationStyle[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setCitationStyle(s)
                      setShowStyleMenu(false)
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors"
                    style={{
                      color: s === citationStyle ? "var(--text-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {library.length} refs
          </span>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
            style={{ color: "var(--text-tertiary)" }}
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {viewMode === "import" && (
            <div className="flex-1 flex flex-col p-5 gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
                  style={{
                    backgroundColor: "var(--bg-panel-inset)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-dark)",
                  }}
                >
                  <FiUpload size={14} />
                  Import .bib File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".bib,.bibtex"
                  className="hidden"
                  onChange={handleFileImport}
                />
                <button
                  onClick={handleExportLibrary}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/10"
                  style={{
                    backgroundColor: "var(--bg-panel-inset)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-dark)",
                  }}
                >
                  <FiDownload size={14} />
                  Export Library
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>
                  Or paste BibTeX entries:
                </label>
                <textarea
                  value={bibtexInput}
                  onChange={(e) => setBibtexInput(e.target.value)}
                  className="flex-1 w-full p-4 rounded-xl text-xs font-mono resize-none focus:outline-none custom-scrollbar"
                  style={{
                    backgroundColor: "var(--bg-panel-inset)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-dark)",
                  }}
                  placeholder={`@article{smith2023,
  author = {Smith, John and Jones, Jane},
  title = {A Great Paper on Something},
  journal = {Nature},
  year = {2023},
  volume = {600},
  pages = {1--10},
  doi = {10.1234/example}
}`}
                />
                <button
                  onClick={handleImportBibtex}
                  className="px-4 py-2 rounded-xl text-sm font-medium self-end transition-colors hover:bg-white/10"
                  style={{
                    backgroundColor: "var(--bg-panel-inset)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-dark)",
                  }}
                >
                  <FiPlus size={14} className="inline mr-1" />
                  Import {bibtexInput ? `(${parseBibTeX(bibtexInput).length} entries)` : ""}
                </button>
              </div>
            </div>
          )}

          {viewMode === "library" && (
            <>
              {/* Left: List */}
              <div
                className="w-72 flex-shrink-0 flex flex-col border-r"
                style={{ borderColor: "var(--border-dark)" }}
              >
                {/* Search */}
                <div className="p-3 border-b" style={{ borderColor: "var(--border-dark)" }}>
                  <div
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                    style={{ backgroundColor: "var(--bg-panel-inset)" }}
                  >
                    <FiSearch size={13} style={{ color: "var(--text-tertiary)" }} />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent text-xs focus:outline-none"
                      style={{ color: "var(--text-primary)" }}
                      placeholder="Search references..."
                    />
                  </div>
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <div
                    className="px-3 py-2 flex flex-wrap gap-1 border-b"
                    style={{ borderColor: "var(--border-dark)" }}
                  >
                    {filterTag && (
                      <button
                        onClick={() => setFilterTag(null)}
                        className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors hover:bg-white/10"
                        style={{
                          backgroundColor: "var(--bg-panel-inset)",
                          color: "var(--text-tertiary)",
                          border: "1px solid var(--border-dark)",
                        }}
                      >
                        <FiX size={8} /> clear
                      </button>
                    )}
                    {allTags.slice(0, 8).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                        className="text-[10px] px-1.5 py-0.5 rounded transition-colors hover:bg-white/10"
                        style={{
                          backgroundColor: "var(--bg-panel-inset)",
                          color: filterTag === tag ? "var(--text-primary)" : "var(--text-tertiary)",
                          border: filterTag === tag ? "1px solid var(--border-mid)" : "1px solid var(--border-dark)",
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Entry list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {filteredLibrary.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
                      <FiBook size={24} style={{ color: "var(--text-tertiary)", opacity: 0.5 }} />
                      <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>
                        {library.length === 0
                          ? "Import BibTeX to get started"
                          : "No matches found"}
                      </p>
                      {library.length === 0 && (
                        <button
                          onClick={() => setViewMode("import")}
                          className="skeuo-btn px-3 py-1.5 rounded-lg text-xs"
                        >
                          <FiPlus size={12} className="inline mr-1" />
                          Import
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredLibrary.map((entry) => {
                      const isSelected = selectedEntry?.key === entry.key
                      const isCited = currentNoteCitations.some((c) => c.key === entry.key)

                      return (
                        <button
                          key={entry.key}
                          onClick={() => {
                            setSelectedEntry(entry)
                            setViewMode("detail")
                          }}
                          className="w-full text-left px-3 py-2.5 border-b transition-colors hover:bg-white/10"
                          style={{
                            borderColor: "var(--border-dark)",
                            backgroundColor: isSelected ? "var(--bg-panel-inset)" : "transparent",
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-xs font-medium truncate"
                                style={{ color: "var(--text-primary)" }}
                              >
                                {entry.title || "Untitled"}
                              </div>
                              <div
                                className="text-[10px] truncate mt-0.5"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                {entry.author ? entry.author.split(" and ")[0] : "Unknown"} · {entry.year}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isCited && (
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: "var(--text-tertiary)", opacity: 0.6 }}
                                  title="Cited in current note"
                                />
                              )}
                              {entry.annotations.length > 0 && (
                                <FiMessageSquare size={10} style={{ color: "var(--text-tertiary)" }} />
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Actions */}
                <div
                  className="px-3 py-2 border-t flex items-center gap-2"
                  style={{ borderColor: "var(--border-dark)" }}
                >
                  <button
                    onClick={() => setViewMode("import")}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <FiPlus size={12} /> Import
                  </button>
                  {currentNoteCitations.length > 0 && (
                    <button
                      onClick={handleGenerateBibliography}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10"
                      style={{ color: "var(--text-secondary)" }}
                      title="Generate bibliography for current note"
                    >
                      <FiBook size={12} /> Bibliography
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Detail or placeholder */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selectedEntry && viewMode === "library" ? (
                  <ReferenceDetail
                    entry={selectedEntry}
                    citationStyle={citationStyle}
                    onInsert={handleInsertCitation}
                    onCopy={handleCopyCitation}
                    onDelete={handleDelete}
                    onAddAnnotation={handleAddAnnotation}
                    copiedKey={copiedKey}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <FiBook size={32} style={{ color: "var(--text-tertiary)", opacity: 0.3 }} />
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      Select a reference to view details
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {viewMode === "detail" && selectedEntry && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <button
                onClick={() => setViewMode("library")}
                className="px-4 py-2 text-xs flex items-center gap-1 hover:bg-white/10 transition-colors"
                style={{ color: "var(--text-tertiary)" }}
              >
                ← Back to library
              </button>
              <ReferenceDetail
                entry={selectedEntry}
                citationStyle={citationStyle}
                onInsert={handleInsertCitation}
                onCopy={handleCopyCitation}
                onDelete={handleDelete}
                onAddAnnotation={handleAddAnnotation}
                copiedKey={copiedKey}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Detail Subcomponent ── */

interface ReferenceDetailProps {
  entry: BibEntry
  citationStyle: CitationStyle
  onInsert: (entry: BibEntry) => void
  onCopy: (entry: BibEntry) => void
  onDelete: (key: string) => void
  onAddAnnotation: (key: string, text: string, comment: string, color: Annotation["color"]) => void
  copiedKey: string | null
}

function ReferenceDetail({
  entry,
  citationStyle,
  onInsert,
  onCopy,
  onDelete,
  onAddAnnotation,
  copiedKey,
}: ReferenceDetailProps) {
  const [showAnnotationForm, setShowAnnotationForm] = useState(false)
  const [annotText, setAnnotText] = useState("")
  const [annotComment, setAnnotComment] = useState("")
  const [annotColor, setAnnotColor] = useState<Annotation["color"]>("yellow")

  const formattedCitation = useMemo(
    () => formatCitation(entry, citationStyle),
    [entry, citationStyle],
  )

  const inlineCitation = useMemo(
    () => formatInlineCitation(entry, citationStyle),
    [entry, citationStyle],
  )

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
      {/* Title & meta */}
      <h3
        className="text-base font-bold mb-1"
        style={{ color: "var(--text-primary)" }}
      >
        {entry.title}
      </h3>
      <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
        {entry.author}
      </p>
      <div className="flex items-center gap-3 text-[10px] mb-4" style={{ color: "var(--text-tertiary)" }}>
        <span>{entry.year}</span>
        {entry.journal && <span>· {entry.journal}</span>}
        {entry.booktitle && <span>· {entry.booktitle}</span>}
        <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-panel-inset)" }}>
          {entry.type}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => onInsert(entry)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: copiedKey === entry.key ? "#4ade80" : "var(--text-secondary)",
            border: "1px solid var(--border-dark)",
          }}
        >
          {copiedKey === entry.key ? <FiCheck size={12} /> : <FiEdit2 size={12} />}
          Insert [@{entry.key}]
        </button>
        <button
          onClick={() => onCopy(entry)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <FiCopy size={12} />
          Copy Citation
        </button>
        <button
          onClick={() => onDelete(entry.key)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-red-500/10"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: "var(--text-tertiary)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <FiTrash2 size={12} />
        </button>
      </div>

      {/* Formatted citation */}
      <div
        className="p-3 rounded-xl text-xs leading-relaxed mb-4"
        style={{
          backgroundColor: "var(--bg-panel-inset)",
          color: "var(--text-secondary)",
          border: "1px solid var(--border-dark)",
        }}
      >
        <div className="text-[10px] font-semibold mb-1" style={{ color: "var(--text-tertiary)" }}>
          {citationStyle.toUpperCase()} Format:
        </div>
        {formattedCitation}
        <div className="mt-2 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          Inline: {inlineCitation}
        </div>
      </div>

      {/* Abstract */}
      {entry.abstract && (
        <div className="mb-4">
          <h4
            className="text-[10px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            Abstract
          </h4>
          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {entry.abstract}
          </p>
        </div>
      )}

      {/* DOI / URL */}
      {(entry.doi || entry.url) && (
        <div className="flex items-center gap-3 mb-4">
          {entry.doi && (
            <a
              href={`https://doi.org/${entry.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 underline"
              style={{ color: "var(--text-secondary)" }}
            >
              <FiExternalLink size={11} />
              DOI: {entry.doi}
            </a>
          )}
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs flex items-center gap-1 underline"
              style={{ color: "var(--text-secondary)" }}
            >
              <FiExternalLink size={11} />
              URL
            </a>
          )}
        </div>
      )}

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          <FiTag size={11} style={{ color: "var(--text-tertiary)" }} />
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: "var(--bg-panel-inset)", color: "var(--text-tertiary)" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Annotations */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Annotations ({entry.annotations.length})
          </h4>
          <button
            onClick={() => setShowAnnotationForm(!showAnnotationForm)}
            className="px-2 py-1 rounded text-[10px] flex items-center gap-1 transition-colors hover:bg-white/10"
            style={{
              backgroundColor: "var(--bg-panel-inset)",
              color: "var(--text-tertiary)",
              border: "1px solid var(--border-dark)",
            }}
          >
            <FiPlus size={10} /> Add
          </button>
        </div>

        {showAnnotationForm && (
          <div
            className="p-3 rounded-xl mb-3"
            style={{
              backgroundColor: "var(--bg-panel-inset)",
              border: "1px solid var(--border-dark)",
            }}
          >
            <input
              value={annotText}
              onChange={(e) => setAnnotText(e.target.value)}
              className="w-full bg-transparent text-xs mb-2 focus:outline-none"
              style={{ color: "var(--text-primary)" }}
              placeholder="Highlighted text..."
            />
            <textarea
              value={annotComment}
              onChange={(e) => setAnnotComment(e.target.value)}
              className="w-full bg-transparent text-xs mb-2 resize-none h-16 focus:outline-none"
              style={{ color: "var(--text-secondary)" }}
              placeholder="Your comment..."
            />
            <div className="flex items-center gap-2">
              {(["yellow", "green", "blue", "red", "purple"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setAnnotColor(c)}
                  className="w-5 h-5 rounded-full border-2"
                  style={{
                    backgroundColor: {
                      yellow: "#FACC15",
                      green: "#22C55E",
                      blue: "#3B82F6",
                      red: "#EF4444",
                      purple: "#8B5CF6",
                    }[c],
                    borderColor: annotColor === c ? "white" : "transparent",
                  }}
                />
              ))}
              <div className="flex-1" />
              <button
                onClick={() => {
                  if (annotText.trim()) {
                    onAddAnnotation(entry.key, annotText, annotComment, annotColor)
                    setAnnotText("")
                    setAnnotComment("")
                    setShowAnnotationForm(false)
                  }
                }}
                className="px-3 py-1 rounded text-[10px] font-medium transition-colors hover:bg-white/10"
                style={{
                  backgroundColor: "var(--bg-panel-inset)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-dark)",
                }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {entry.annotations.map((annot) => (
          <div
            key={annot.id}
            className="p-2.5 rounded-lg mb-2"
            style={{
              backgroundColor: "var(--bg-panel-inset)",
              borderLeft: `3px solid ${{
                yellow: "#FACC15",
                green: "#22C55E",
                blue: "#3B82F6",
                red: "#EF4444",
                purple: "#8B5CF6",
              }[annot.color]}`,
            }}
          >
            <p className="text-xs italic mb-1" style={{ color: "var(--text-primary)" }}>
              &ldquo;{annot.text}&rdquo;
            </p>
            {annot.comment && (
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {annot.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
