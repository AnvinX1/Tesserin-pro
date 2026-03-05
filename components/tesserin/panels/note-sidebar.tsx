"use client"

import React, { useState, useMemo, useCallback } from "react"
import { FiSearch, FiPlus, FiFileText, FiLink2, FiList, FiClock, FiX, FiFolder, FiFolderPlus, FiTag, FiChevronRight, FiChevronDown, FiMoreHorizontal, FiTrash2, FiEdit2 } from "react-icons/fi"
import { useNotes, parseWikiLinks, type Note, type NoteTag, type NoteFolder } from "@/lib/notes-store"
import { SkeuoPanel } from "../core/skeuo-panel"
import { TesserinLogo } from "../core/tesserin-logo"
import { AnimatedIcon } from "../core/animated-icon"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type SortMode = "recent" | "alpha" | "links"
type ViewMode = "all" | "folders" | "tags"

/* ------------------------------------------------------------------ */
/*  Tag color presets                                                   */
/* ------------------------------------------------------------------ */

const TAG_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
]

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

interface NoteSidebarProps {
  visible: boolean
  onClose: () => void
}

export function NoteSidebar({ visible, onClose }: NoteSidebarProps) {
  const {
    notes, selectedNoteId, selectNote, addNote, graph,
    tags, folders,
    createTag, deleteTag, addTagToNote, removeTagFromNote,
    createFolder, renameFolder, deleteFolder, moveNoteToFolder,
  } = useNotes()

  const [search, setSearch] = useState("")
  const [sortMode, setSortMode] = useState<SortMode>("recent")
  const [viewMode, setViewMode] = useState<ViewMode>("all")
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["__root__"]))

  // Tag/folder creation
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renamingFolderName, setRenamingFolderName] = useState("")

  // Tag popover for notes
  const [tagPopoverNoteId, setTagPopoverNoteId] = useState<string | null>(null)

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
  /** Filtered and sorted notes */
  const displayNotes = useMemo(() => {
    let filtered = notes
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.tags.some((t) => t.name.toLowerCase().includes(q)),
      )
    }

    // Apply tag filter
    if (activeTagFilter) {
      filtered = filtered.filter((n) =>
        n.tags.some((t) => t.id === activeTagFilter),
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
  }, [notes, search, sortMode, backlinkCounts, activeTagFilter])

  const folderNotes = (folderId: string) => displayNotes.filter((n) => n.folderId === folderId)

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim()) return
    await createTag(newTagName.trim(), newTagColor)
    setNewTagName("")
    setShowNewTag(false)
  }, [newTagName, newTagColor, createTag])

  const [creatingInFolderId, setCreatingInFolderId] = useState<string | null>(null)

  const handleCreateFolder = useCallback(async (parentId?: string) => {
    if (!newFolderName.trim()) return
    await createFolder(newFolderName.trim(), parentId)
    setNewFolderName("")
    setShowNewFolder(false)
    setCreatingInFolderId(null)
  }, [newFolderName, createFolder])

  const handleRenameFolder = useCallback(
    (id: string) => {
      if (!renamingFolderName.trim()) return
      renameFolder(id, renamingFolderName.trim())
      setRenamingFolderId(null)
    },
    [renamingFolderName, renameFolder],
  )

  /** Render a single note item */
  const renderNoteItem = (note: Note, depth: number = 0) => {
    const isSelected = note.id === selectedNoteId
    const blCount = backlinkCounts.get(note.id) ?? 0

    return (
      <div key={note.id} className="relative group" style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        <button
          onClick={() => selectNote(note.id)}
          className="w-full text-left px-3 py-2 rounded-xl mb-1 transition-all duration-150 flex items-start gap-2.5"
          style={{
            backgroundColor: isSelected ? "var(--accent-primary)" : "var(--bg-panel-inset)",
            color: isSelected ? "var(--text-on-accent)" : "var(--text-secondary)",
            boxShadow: isSelected ? "var(--input-inner-shadow)" : "none",
            border: isSelected ? "none" : "1px solid var(--border-dark)",
          }}
          aria-current={isSelected ? "true" : undefined}
        >
          <FiFileText size={14} className="shrink-0 mt-0.5" style={{ opacity: isSelected ? 1 : 0.6 }} />
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold truncate"
              style={{ color: isSelected ? "var(--text-on-accent)" : "var(--text-primary)" }}
            >
              {note.title || "Untitled"}
            </p>
            <p className="text-[10px] mt-0.5 truncate leading-normal" style={{ opacity: 0.6, color: isSelected ? "inherit" : "var(--text-tertiary)" }}>
              {note.content.replace(/[#*`\[\]]/g, "").substring(0, 40) || "No content..."}
            </p>
            {/* Tags row */}
            {note.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {note.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-[8px] px-1 py-0 rounded-full font-bold"
                    style={{
                      backgroundColor: isSelected ? "rgba(0,0,0,0.15)" : tag.color + "22",
                      color: isSelected ? "var(--text-on-accent)" : tag.color,
                      border: `1px solid ${isSelected ? "transparent" : tag.color + "44"}`,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {blCount > 0 && (
            <div 
              className="flex items-center gap-0.5 px-1 rounded text-[9px] font-bold shrink-0 mt-0.5"
              style={{ 
                backgroundColor: isSelected ? "rgba(0,0,0,0.2)" : "var(--bg-panel)",
                color: isSelected ? "var(--text-on-accent)" : "var(--accent-primary)" 
              }}
            >
              <FiLink2 size={8} />
              {blCount}
            </div>
          )}
        </button>
        {/* Tag action button */}
        <button
          onClick={(e) => { e.stopPropagation(); setTagPopoverNoteId(tagPopoverNoteId === note.id ? null : note.id) }}
          className="absolute right-1 top-1 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10"
          style={{ color: isSelected ? "#000" : "var(--text-tertiary)" }}
        >
          <FiTag size={10} />
        </button>
        {/* Tag popover */}
        {tagPopoverNoteId === note.id && (
          <div
            className="absolute top-full right-0 mt-1 z-50 w-52 rounded-xl p-2.5 shadow-2xl border skeuo-panel"
            style={{
              backgroundColor: "var(--bg-menu-obsidian)",
              borderColor: "rgba(255,255,255,0.08)",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold mb-1.5 px-1 opacity-50" style={{ color: "var(--text-on-obsidian)" }}>TAGS</p>
            {tags.map((tag) => {
              const hasTag = note.tags.some((t) => t.id === tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => hasTag ? removeTagFromNote(note.id, tag.id) : addTagToNote(note.id, tag)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
                  style={{ color: "var(--text-on-obsidian)" }}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 text-left truncate">{tag.name}</span>
                  {hasTag && <span className="text-[10px]" style={{ color: "var(--accent-primary)" }}>✓</span>}
                </button>
              )
            })}
            {/* Folder assignment */}
            {folders.length > 0 && (
              <>
                <div className="border-t my-1.5" style={{ borderColor: "var(--border-dark)" }} />
                <p className="text-[10px] font-bold mb-1 px-1 opacity-50" style={{ color: "var(--text-on-obsidian)" }}>MOVE TO</p>
                {folders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => moveNoteToFolder(note.id, f.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/5"
                    style={{ color: "var(--text-on-obsidian)" }}
                  >
                    <FiFolder size={10} />
                    <span className="flex-1 text-left truncate">{f.name}</span>
                    {note.folderId === f.id && <span className="text-[10px]" style={{ color: "var(--accent-primary)" }}>✓</span>}
                  </button>
                ))}
              </>
            )}
            <button
              onClick={() => setTagPopoverNoteId(null)}
              className="w-full mt-1.5 text-center text-[10px] py-1 rounded-lg"
              style={{ color: "var(--text-tertiary)" }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    )
  }

  /** Render a single folder with its notes and children */
  const renderFolderItem = (folder: NoteFolder, depth: number = 0): React.ReactNode => {
    const fNotes = folderNotes(folder.id)
    const isExpanded = expandedFolders.has(folder.id)
    const childFolders = folders.filter((f) => f.parentId === folder.id)

    return (
      <div key={folder.id} style={{ marginLeft: depth > 0 ? 12 : 0 }}>
        <div className="flex items-center gap-1 group">
          <button
            onClick={() => toggleFolder(folder.id)}
            className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
            style={{ color: "var(--text-secondary)" }}
          >
            {isExpanded ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
            <FiFolder size={12} style={{ color: "var(--accent-primary)" }} />
            {renamingFolderId === folder.id ? (
              <input
                autoFocus
                value={renamingFolderName}
                onChange={(e) => setRenamingFolderName(e.target.value)}
                onBlur={() => handleRenameFolder(folder.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameFolder(folder.id)
                  if (e.key === "Escape") setRenamingFolderId(null)
                }}
                className="flex-1 bg-transparent border-none text-xs focus:outline-none"
                style={{ color: "var(--text-primary)" }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate">{folder.name}</span>
            )}
            <span className="ml-auto text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {fNotes.length}
            </span>
          </button>
          <div className="flex opacity-0 group-hover:opacity-60 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setCreatingInFolderId(folder.id); setShowNewFolder(true) }}
              className="w-5 h-5 flex items-center justify-center rounded hover:opacity-100"
              style={{ color: "var(--text-tertiary)" }}
              title="Add subfolder"
            >
              <FiPlus size={10} />
            </button>
            <button
              onClick={() => { setRenamingFolderId(folder.id); setRenamingFolderName(folder.name) }}
              className="w-5 h-5 flex items-center justify-center rounded hover:opacity-100"
              style={{ color: "var(--text-tertiary)" }}
              aria-label="Rename folder"
            >
              <FiEdit2 size={10} />
            </button>
            <button
              onClick={() => deleteFolder(folder.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:opacity-100"
              style={{ color: "var(--text-tertiary)" }}
              aria-label="Delete folder"
            >
              <FiTrash2 size={10} />
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="border-l ml-2.5 pl-1.5" style={{ borderColor: "var(--border-dark)" }}>
            {fNotes.map((n) => renderNoteItem(n, 0))}
            {childFolders.map((child) => renderFolderItem(child, 0))}
            {fNotes.length === 0 && childFolders.length === 0 && (
              <p className="text-[10px] px-3 py-1" style={{ color: "var(--text-tertiary)" }}>Empty</p>
            )}
          </div>
        )}
      </div>
    )
  }

  /** Render folder tree view */
  const renderFolderView = () => {
    const rootNotes = displayNotes.filter((n) => !n.folderId)
    const rootFolders = folders.filter((f) => !f.parentId)

    return (
      <>
        {rootFolders.map((f) => renderFolderItem(f))}

        {/* Unfiled notes */}
        {rootNotes.length > 0 && (
          <div className="mt-2">
            <div
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold"
              style={{ color: "var(--text-tertiary)" }}
            >
              <FiFileText size={12} />
              <span>Unfiled</span>
              <span className="ml-auto text-[10px]">{rootNotes.length}</span>
            </div>
            {rootNotes.map((n) => renderNoteItem(n))}
          </div>
        )}
      </>
    )
  }

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

      {/* View mode tabs */}
      <div className="px-3 pb-1 flex gap-1 shrink-0">
        {(
          [
            { id: "all" as ViewMode, icon: FiList, label: "All" },
            { id: "folders" as ViewMode, icon: FiFolder, label: "Folders" },
            { id: "tags" as ViewMode, icon: FiTag, label: "Tags" },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => { setViewMode(v.id); setActiveTagFilter(null) }}
            className={`skeuo-btn flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
              viewMode === v.id ? "active" : ""
            }`}
            aria-label={`View ${v.label}`}
            aria-pressed={viewMode === v.id}
          >
            <v.icon size={11} />
            {v.label}
          </button>
        ))}
      </div>

      {/* Sort controls (all & folders views) */}
      {viewMode !== "tags" && (
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
      )}

      {/* Tag filter strip */}
      {viewMode === "tags" && (
        <div className="px-3 pb-2 shrink-0">
          {/* Tag management header */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold" style={{ color: "var(--text-tertiary)" }}>FILTER BY TAG</span>
            <button
              onClick={() => setShowNewTag(!showNewTag)}
              className="skeuo-btn w-5 h-5 flex items-center justify-center rounded"
              aria-label="Create tag"
            >
              <FiPlus size={10} />
            </button>
          </div>
          {/* New tag form */}
          {showNewTag && (
            <div className="skeuo-inset p-2 rounded-lg mb-2">
              <input
                autoFocus
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); if (e.key === "Escape") setShowNewTag(false) }}
                className="w-full bg-transparent border-none text-xs focus:outline-none mb-1.5"
                style={{ color: "var(--text-primary)" }}
                placeholder="Tag name..."
              />
              <div className="flex gap-1 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className="w-4 h-4 rounded-full transition-transform"
                    style={{
                      backgroundColor: c,
                      transform: newTagColor === c ? "scale(1.3)" : "scale(1)",
                      boxShadow: newTagColor === c ? `0 0 0 2px ${c}44` : "none",
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleCreateTag}
                className="skeuo-btn w-full mt-2 py-1 rounded-lg text-[10px] font-semibold"
                disabled={!newTagName.trim()}
              >
                Create Tag
              </button>
            </div>
          )}
          {/* Tag chips */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setActiveTagFilter(null)}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
              style={{
                backgroundColor: !activeTagFilter ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                color: !activeTagFilter ? "var(--text-on-accent)" : "var(--text-secondary)",
              }}
            >
              All
            </button>
            {tags.map((tag) => (
              <div key={tag.id} className="relative group/tag inline-flex">
                <button
                  onClick={() => setActiveTagFilter(activeTagFilter === tag.id ? null : tag.id)}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
                  style={{
                    backgroundColor: activeTagFilter === tag.id ? tag.color : tag.color + "22",
                    color: activeTagFilter === tag.id ? "#fff" : tag.color,
                    border: `1px solid ${tag.color}44`,
                  }}
                >
                  {tag.name}
                </button>
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center opacity-0 group-hover/tag:opacity-100 transition-opacity"
                  style={{ backgroundColor: "var(--bg-panel)", color: "var(--text-tertiary)", fontSize: 8 }}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {tags.length === 0 && !showNewTag && (
            <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>
              No tags yet — create one to organize notes
            </p>
          )}
        </div>
      )}

      {/* Folder create button (folder view) */}
      {viewMode === "folders" && (
        <div className="px-3 pb-2 shrink-0">
          {showNewFolder ? (
            <div className="skeuo-inset flex items-center gap-2 px-2 py-1.5 rounded-lg">
              <FiFolderPlus size={12} style={{ color: "var(--accent-primary)" }} />
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") setShowNewFolder(false) }}
                className="flex-1 bg-transparent border-none text-xs focus:outline-none"
                style={{ color: "var(--text-primary)" }}
                placeholder="Folder name..."
              />
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="skeuo-btn w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs"
            >
              <FiFolderPlus size={12} />
              New Folder
            </button>
          )}
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {displayNotes.length === 0 && (
          <div className="text-center py-8 flex flex-col items-center gap-3">
            <AnimatedIcon animation="pulse" size={32} autoPlay>
              <TesserinLogo size={32} animated={false} />
            </AnimatedIcon>
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              {search ? "No matching notes" : activeTagFilter ? "No notes with this tag" : "No notes yet"}
            </p>
            {!search && !activeTagFilter && (
              <p className="text-[10px]" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
                Press Ctrl+K to search or create
              </p>
            )}
          </div>
        )}

        {viewMode === "folders"
          ? renderFolderView()
          : displayNotes.map(renderNoteItem)}
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
        <span>{tags.length} tags · {folders.length} folders</span>
      </div>
    </SkeuoPanel>
  )
}
