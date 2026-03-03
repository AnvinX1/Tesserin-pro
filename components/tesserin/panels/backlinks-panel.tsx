"use client"

import React, { useMemo, useState } from "react"
import { FiLink2, FiArrowRight, FiChevronDown, FiChevronRight, FiFileText, FiExternalLink, FiEyeOff, FiBox } from "react-icons/fi"
import { useNotes, parseWikiLinks } from "@/lib/notes-store"
import { FuzzySearchEngine, type SearchableItem, type UnlinkedMention } from "@/lib/fuzzy-search"
import { buildBlockIndex, type BlockReference } from "@/lib/block-references"

/**
 * BacklinksPanel v2
 *
 * Shows which notes reference the currently selected note:
 *   1. Backlinks — notes that link TO this note via [[wiki-links]]
 *   2. Outgoing links — notes this note links TO
 *   3. Unlinked mentions — notes that mention this note's title but don't link it
 *   4. Block references — notes that reference blocks from this note via ((block-id))
 *
 * Each link is clickable, navigating to the linked note.
 */

interface BacklinkEntry {
  noteId: string
  noteTitle: string
  /** The line of content containing the link (for context) */
  contextLine: string
  /** How many times this note links here */
  count: number
}

interface BacklinksPanelProps {
  /** If true, render in compact mode for sidebar embedding */
  compact?: boolean
}

export function BacklinksPanel({ compact = false }: BacklinksPanelProps) {
  const { notes, selectedNoteId, selectNote, navigateToWikiLink } = useNotes()
  const [showBacklinks, setShowBacklinks] = useState(true)
  const [showOutgoing, setShowOutgoing] = useState(true)
  const [showUnlinked, setShowUnlinked] = useState(false)
  const [showBlockRefs, setShowBlockRefs] = useState(true)

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  )

  // Compute backlinks (notes that link TO this note)
  const backlinks = useMemo<BacklinkEntry[]>(() => {
    if (!selectedNote) return []

    const results: BacklinkEntry[] = []
    const targetTitle = selectedNote.title.toLowerCase()

    for (const note of notes) {
      if (note.id === selectedNote.id) continue

      const links = parseWikiLinks(note.content)
      const matchingLinks = links.filter((l) => l.toLowerCase() === targetTitle)

      if (matchingLinks.length > 0) {
        const lines = note.content.split("\n")
        let contextLine = ""
        for (const line of lines) {
          if (line.toLowerCase().includes(`[[${targetTitle}]]`) ||
              matchingLinks.some(ml => line.includes(`[[${ml}]]`))) {
            contextLine = line
              .replace(/^#{1,6}\s+/, "")
              .replace(/\[\[([^\]]+)\]\]/g, "$1")
              .trim()
            break
          }
        }

        results.push({
          noteId: note.id,
          noteTitle: note.title,
          contextLine: contextLine || note.content.substring(0, 80).replace(/[#\n]/g, " ").trim(),
          count: matchingLinks.length,
        })
      }
    }

    return results.sort((a, b) => b.count - a.count)
  }, [notes, selectedNote])

  // Compute outgoing links
  const outgoingLinks = useMemo<BacklinkEntry[]>(() => {
    if (!selectedNote) return []

    const links = parseWikiLinks(selectedNote.content)
    const results: BacklinkEntry[] = []
    const seen = new Set<string>()

    for (const linkTitle of links) {
      const lower = linkTitle.toLowerCase()
      if (seen.has(lower)) continue
      seen.add(lower)

      const targetNote = notes.find((n) => n.title.toLowerCase() === lower)
      if (targetNote) {
        results.push({
          noteId: targetNote.id,
          noteTitle: targetNote.title,
          contextLine: targetNote.content.substring(0, 80).replace(/[#\n]/g, " ").trim(),
          count: links.filter((l) => l.toLowerCase() === lower).length,
        })
      } else {
        results.push({
          noteId: `unresolved:${linkTitle}`,
          noteTitle: linkTitle,
          contextLine: "Note not yet created",
          count: links.filter((l) => l.toLowerCase() === lower).length,
        })
      }
    }

    return results
  }, [notes, selectedNote])

  // Compute unlinked mentions
  const unlinkedMentions = useMemo<UnlinkedMention[]>(() => {
    if (!selectedNote || !showUnlinked) return []

    const items: SearchableItem[] = notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
    }))
    const engine = new FuzzySearchEngine(items)
    return engine.findUnlinkedMentions(selectedNote.title, selectedNote.id)
  }, [notes, selectedNote, showUnlinked])

  // Compute block references pointing to blocks in this note
  const blockRefs = useMemo<Array<{ blockId: string; blockContent: string; refs: BlockReference[] }>>(() => {
    if (!selectedNote) return []

    const index = buildBlockIndex(notes)
    const results: Array<{ blockId: string; blockContent: string; refs: BlockReference[] }> = []

    // Find blocks defined in this note
    for (const [blockId, block] of index.blocks) {
      if (block.noteId !== selectedNote.id) continue
      const refs = index.references.get(blockId) || []
      if (refs.length > 0) {
        results.push({ blockId, blockContent: block.content, refs })
      }
    }

    return results
  }, [notes, selectedNote])

  if (!selectedNote) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 px-6"
        style={{ color: "var(--text-tertiary)" }}
      >
        <FiLink2 size={28} style={{ opacity: 0.4 }} />
        <p className="text-sm text-center">Select a note to see its backlinks</p>
      </div>
    )
  }

  const totalCount = backlinks.length + outgoingLinks.length + unlinkedMentions.length + blockRefs.reduce((s, b) => s + b.refs.length, 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      {!compact && (
        <div
          className="px-4 py-3 border-b flex items-center gap-2"
          style={{ borderColor: "var(--border-dark)" }}
        >
          <FiLink2 size={16} style={{ color: "var(--text-tertiary)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Backlinks
          </h3>
          <span
            className="ml-auto text-[11px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            {totalCount}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* ── Backlinks (incoming) ── */}
        <div className="py-2">
          <button
            className="w-full flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onClick={() => setShowBacklinks(!showBacklinks)}
          >
            {showBacklinks ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
            <span>Linked here</span>
            <span
              className="ml-auto px-1.5 py-0.5 rounded text-[10px]"
              style={{ backgroundColor: "var(--bg-panel-inset)" }}
            >
              {backlinks.length}
            </span>
          </button>

          {showBacklinks && (
            <div className="mt-1">
              {backlinks.length === 0 ? (
                <p
                  className="px-4 py-3 text-xs italic"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  No other notes link to this note yet.
                </p>
              ) : (
                backlinks.map((bl) => (
                  <button
                    key={bl.noteId}
                    onClick={() => selectNote(bl.noteId)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <FiFileText size={13} style={{ color: "var(--text-tertiary)", opacity: 0.7 }} />
                      <span
                        className="text-sm font-medium truncate flex-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {bl.noteTitle}
                      </span>
                      {bl.count > 1 && (
                        <span
                          className="text-[10px] px-1.5 rounded"
                          style={{
                            backgroundColor: "var(--bg-panel-inset)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          ×{bl.count}
                        </span>
                      )}
                      <FiArrowRight
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-tertiary)" }}
                      />
                    </div>
                    {bl.contextLine && (
                      <p
                        className="text-xs mt-1 truncate pl-5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {bl.contextLine}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="h-px mx-4"
          style={{ backgroundColor: "var(--border-dark)", opacity: 0.3 }}
        />

        {/* ── Outgoing links ── */}
        <div className="py-2">
          <button
            className="w-full flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onClick={() => setShowOutgoing(!showOutgoing)}
          >
            {showOutgoing ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
            <span>Outgoing links</span>
            <span
              className="ml-auto px-1.5 py-0.5 rounded text-[10px]"
              style={{ backgroundColor: "var(--bg-panel-inset)" }}
            >
              {outgoingLinks.length}
            </span>
          </button>

          {showOutgoing && (
            <div className="mt-1">
              {outgoingLinks.length === 0 ? (
                <p
                  className="px-4 py-3 text-xs italic"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  This note doesn&apos;t link to any other notes.
                </p>
              ) : (
                outgoingLinks.map((ol) => {
                  const isUnresolved = ol.noteId.startsWith("unresolved:")
                  return (
                    <button
                      key={ol.noteId}
                      onClick={() => {
                        if (!isUnresolved) selectNote(ol.noteId)
                      }}
                      className={`w-full text-left px-4 py-2.5 transition-colors group ${
                        isUnresolved ? "opacity-60 cursor-default" : "hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isUnresolved ? (
                          <FiExternalLink size={13} style={{ color: "var(--text-tertiary)" }} />
                        ) : (
                          <FiFileText size={13} style={{ color: "var(--text-tertiary)", opacity: 0.7 }} />
                        )}
                        <span
                          className={`text-sm truncate flex-1 ${isUnresolved ? "italic" : "font-medium"}`}
                          style={{ color: isUnresolved ? "var(--text-tertiary)" : "var(--text-primary)" }}
                        >
                          {ol.noteTitle}
                          {isUnresolved && " (unresolved)"}
                        </span>
                        {!isUnresolved && (
                          <FiArrowRight
                            size={12}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: "var(--text-tertiary)" }}
                          />
                        )}
                      </div>
                      {ol.contextLine && !isUnresolved && (
                        <p
                          className="text-xs mt-1 truncate pl-5"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {ol.contextLine}
                        </p>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="h-px mx-4"
          style={{ backgroundColor: "var(--border-dark)", opacity: 0.3 }}
        />

        {/* ── Block References ── */}
        {blockRefs.length > 0 && (
          <div className="py-2">
            <button
              className="w-full flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onClick={() => setShowBlockRefs(!showBlockRefs)}
            >
              {showBlockRefs ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
              <FiBox size={11} />
              <span>Block references</span>
              <span
                className="ml-auto px-1.5 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: "var(--bg-panel-inset)" }}
              >
                {blockRefs.reduce((s, b) => s + b.refs.length, 0)}
              </span>
            </button>

            {showBlockRefs && (
              <div className="mt-1">
                {blockRefs.map(({ blockId, blockContent, refs }) => (
                  <div key={blockId} className="px-4 py-2">
                    <div
                      className="text-xs px-2 py-1 rounded mb-1.5 truncate font-mono"
                      style={{
                        backgroundColor: "var(--bg-panel-inset)",
                        color: "var(--text-tertiary)",
                        border: "1px solid var(--border-dark)",
                      }}
                    >
                      ^{blockId}: {blockContent}
                    </div>
                    {refs.map((ref, idx) => (
                      <button
                        key={`${ref.sourceNoteId}-${idx}`}
                        onClick={() => selectNote(ref.sourceNoteId)}
                        className="w-full text-left py-1 pl-3 hover:bg-white/10 transition-colors group flex items-center gap-2"
                      >
                        <FiFileText size={11} style={{ color: "var(--text-tertiary)" }} />
                        <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                          {ref.sourceNoteTitle}
                        </span>
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {ref.isEmbed ? "embed" : "ref"}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            <div
              className="h-px mx-4"
              style={{ backgroundColor: "var(--border-dark)", opacity: 0.3 }}
            />
          </div>
        )}

        {/* ── Unlinked Mentions ── */}
        <div className="py-2">
          <button
            className="w-full flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            onClick={() => setShowUnlinked(!showUnlinked)}
          >
            {showUnlinked ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
            <FiEyeOff size={11} />
            <span>Unlinked mentions</span>
            {showUnlinked && (
              <span
                className="ml-auto px-1.5 py-0.5 rounded text-[10px]"
                style={{ backgroundColor: "var(--bg-panel-inset)" }}
              >
                {unlinkedMentions.length}
              </span>
            )}
          </button>

          {showUnlinked && (
            <div className="mt-1">
              {unlinkedMentions.length === 0 ? (
                <p
                  className="px-4 py-3 text-xs italic"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  No unlinked mentions found.
                </p>
              ) : (
                unlinkedMentions.map((mention) => (
                  <button
                    key={mention.item.id}
                    onClick={() => selectNote(mention.item.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <FiEyeOff size={13} style={{ color: "var(--text-tertiary)", opacity: 0.7 }} />
                      <span
                        className="text-sm font-medium truncate flex-1"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {mention.item.title}
                      </span>
                      <FiArrowRight
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-tertiary)" }}
                      />
                    </div>
                    <p
                      className="text-xs mt-1 truncate pl-5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {mention.snippet}
                    </p>
                    <p
                      className="text-[10px] mt-0.5 pl-5"
                      style={{ color: "var(--text-tertiary)", opacity: 0.7 }}
                    >
                      Line {mention.line + 1} — click to navigate, then add [[{selectedNote.title}]]
                    </p>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
