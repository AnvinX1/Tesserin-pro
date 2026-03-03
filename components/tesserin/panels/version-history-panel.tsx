"use client"

import React, { useState, useMemo } from "react"
import {
  FiClock, FiRotateCcw, FiTrash2, FiTag, FiChevronDown,
  FiChevronRight, FiPlus, FiMinus, FiCheck, FiX,
} from "react-icons/fi"
import { useNotes } from "@/lib/notes-store"
import {
  useVersionHistory,
  computeDiff,
  type NoteVersion,
  type DiffResult,
} from "@/lib/version-history"

/**
 * VersionHistoryPanel
 *
 * Sidebar panel showing version history for the selected note:
 * - List of all snapshots with timestamps
 * - Click to preview a version
 * - Diff view comparing any version to current
 * - Restore button to revert to a previous version
 * - Label versions for easy identification
 */

function formatVersionTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

/* ── Diff Viewer ── */
function DiffViewer({ diff }: { diff: DiffResult }) {
  if (diff.identical) {
    return (
      <div
        className="px-4 py-6 text-center text-xs"
        style={{ color: "var(--text-tertiary)" }}
      >
        <FiCheck size={16} className="mx-auto mb-2 opacity-50" />
        No changes between versions
      </div>
    )
  }

  return (
    <div
      className="text-[11px] font-mono overflow-x-auto"
      style={{ backgroundColor: "var(--bg-app)", borderRadius: 8 }}
    >
      {/* Stats header */}
      <div
        className="flex items-center gap-3 px-3 py-1.5 border-b"
        style={{ borderColor: "var(--border-dark)" }}
      >
        <span className="flex items-center gap-1" style={{ color: "#4ade80" }}>
          <FiPlus size={10} /> {diff.additions}
        </span>
        <span className="flex items-center gap-1" style={{ color: "#f87171" }}>
          <FiMinus size={10} /> {diff.removals}
        </span>
      </div>

      {/* Diff lines */}
      <div className="max-h-64 overflow-y-auto custom-scrollbar">
        {diff.lines.map((line, i) => (
          <div
            key={i}
            className="flex px-3 py-0.5"
            style={{
              backgroundColor:
                line.type === "added"
                  ? "rgba(74, 222, 128, 0.07)"
                  : line.type === "removed"
                    ? "rgba(248, 113, 113, 0.07)"
                    : "transparent",
            }}
          >
            <span
              className="w-8 flex-shrink-0 text-right pr-2 select-none"
              style={{ color: "var(--text-tertiary)", opacity: 0.4 }}
            >
              {line.lineNumber}
            </span>
            <span
              className="w-4 flex-shrink-0 select-none"
              style={{
                color:
                  line.type === "added"
                    ? "#4ade80"
                    : line.type === "removed"
                      ? "#f87171"
                      : "transparent",
              }}
            >
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
            </span>
            <span
              className="flex-1 break-all"
              style={{
                color:
                  line.type === "unchanged"
                    ? "var(--text-tertiary)"
                    : "var(--text-primary)",
              }}
            >
              {line.content || " "}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function VersionHistoryPanel() {
  const { notes, selectedNoteId, updateNote } = useNotes()
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  )

  const {
    versions,
    createSnapshot,
    removeVersion,
    clearAll,
  } = useVersionHistory(
    selectedNoteId,
    selectedNote?.title ?? "",
    selectedNote?.content ?? "",
  )

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [labelEditing, setLabelEditing] = useState<string | null>(null)
  const [labelText, setLabelText] = useState("")

  // Compute diff between selected version and current
  const diff = useMemo<DiffResult | null>(() => {
    if (!selectedVersion || !selectedNote) return null
    const version = versions.find((v) => v.id === selectedVersion)
    if (!version) return null
    return computeDiff(version.content, selectedNote.content)
  }, [selectedVersion, selectedNote, versions])

  if (!selectedNote) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 px-6"
        style={{ color: "var(--text-tertiary)" }}
      >
        <FiClock size={28} style={{ opacity: 0.4 }} />
        <p className="text-sm text-center">Select a note to see its version history</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 border-b flex items-center gap-2"
        style={{ borderColor: "var(--border-dark)" }}
      >
        <FiClock size={16} style={{ color: "var(--text-tertiary)" }} />
        <h3 className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
          Version History
        </h3>
        <span
          className="text-[11px]"
          style={{ color: "var(--text-tertiary)" }}
        >
          {versions.length}
        </span>
      </div>

      {/* Actions bar */}
      <div
        className="px-4 py-2 border-b flex items-center gap-2"
        style={{ borderColor: "var(--border-dark)" }}
      >
        <button
          onClick={() => createSnapshot("Manual snapshot")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
          style={{
            backgroundColor: "var(--bg-panel-inset)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-dark)",
          }}
        >
          <FiPlus size={11} /> Snapshot
        </button>
        {versions.length > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/10"
            style={{
              color: "var(--text-tertiary)",
            }}
          >
            <FiTrash2 size={11} /> Clear
          </button>
        )}
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {versions.length === 0 ? (
          <div
            className="px-4 py-8 text-center"
            style={{ color: "var(--text-tertiary)" }}
          >
            <FiClock size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">No versions yet.</p>
            <p className="text-xs mt-1 opacity-60">Versions are created automatically as you edit.</p>
          </div>
        ) : (
          <div className="py-2">
            {versions.map((version, i) => {
              const isSelected = selectedVersion === version.id
              const isLatest = i === 0

              return (
                <div key={version.id}>
                  <button
                    onClick={() => {
                      setSelectedVersion(isSelected ? null : version.id)
                      setShowDiff(false)
                    }}
                    className="w-full text-left px-4 py-3 transition-colors hover:bg-white/10"
                    style={{
                      backgroundColor: isSelected ? "var(--bg-panel-inset)" : "transparent",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: "var(--text-tertiary)",
                          opacity: isLatest ? 0.8 : 0.3,
                        }}
                      />
                      <span
                        className="text-xs font-medium flex-1 truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {version.label || formatVersionTime(version.createdAt)}
                      </span>
                      <span
                        className="text-[10px] flex-shrink-0"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {formatBytes(version.size)}
                      </span>
                      {isSelected ? (
                        <FiChevronDown size={12} style={{ color: "var(--text-tertiary)" }} />
                      ) : (
                        <FiChevronRight size={12} style={{ color: "var(--text-tertiary)" }} />
                      )}
                    </div>

                    {version.label && (
                      <div className="flex items-center gap-1 mt-1 ml-4">
                        <FiTag size={10} style={{ color: "var(--text-tertiary)", opacity: 0.5 }} />
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {formatVersionTime(version.createdAt)}
                        </span>
                      </div>
                    )}
                  </button>

                  {/* Expanded version details */}
                  {isSelected && (
                    <div
                      className="px-4 pb-3 space-y-2"
                      style={{ backgroundColor: "var(--bg-panel-inset)" }}
                    >
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            updateNote(selectedNote.id, {
                              title: version.title,
                              content: version.content,
                            })
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:bg-white/10"
                          style={{
                            backgroundColor: "var(--bg-panel-inset)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-dark)",
                          }}
                        >
                          <FiRotateCcw size={10} /> Restore
                        </button>
                        <button
                          onClick={() => setShowDiff(!showDiff)}
                          className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-colors hover:bg-white/10"
                          style={{
                            color: "var(--text-secondary)",
                          }}
                        >
                          {showDiff ? "Hide" : "Show"} Diff
                        </button>
                        <button
                          onClick={() => removeVersion(version.id)}
                          className="ml-auto p-1 rounded hover:bg-red-500/20 transition-colors"
                        >
                          <FiTrash2 size={11} style={{ color: "var(--text-tertiary)" }} />
                        </button>
                      </div>

                      {/* Diff view */}
                      {showDiff && diff && <DiffViewer diff={diff} />}

                      {/* Content preview */}
                      {!showDiff && (
                        <div
                          className="text-[11px] font-mono p-2 rounded-lg max-h-32 overflow-y-auto custom-scrollbar"
                          style={{
                            backgroundColor: "var(--bg-app)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          {version.content.substring(0, 500) || "Empty"}
                          {version.content.length > 500 && "..."}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
