import React, { useState, useCallback } from "react"
import { AnimatedIcon } from "../core/animated-icon"
import { ScribbledPlus, ScribbledSearch, ScribbledTrash, ScribbledEdit, ScribbledCopy, ScribbledLayers } from "../core/scribbled-icons"
import type { CanvasInfo } from "@/lib/canvas-store"

interface CanvasSidebarProps {
  canvases: CanvasInfo[]
  activeCanvasId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function CanvasSidebar({
  canvases,
  activeCanvasId,
  isLoading,
  onSelect,
  onCreate,
  onRename,
  onDuplicate,
  onDelete,
}: CanvasSidebarProps) {
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [contextMenu, setContextMenu] = useState<{
    id: string
    x: number
    y: number
  } | null>(null)

  const filtered = search.trim()
    ? canvases.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
      )
    : canvases

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault()
      e.stopPropagation()
      const rect = (e.target as HTMLElement).closest(".canvas-sidebar-wrapper")?.getBoundingClientRect()
      setContextMenu({
        id,
        x: e.clientX - (rect?.left ?? 0),
        y: e.clientY - (rect?.top ?? 0),
      })
    },
    [],
  )

  const startRename = useCallback(
    (id: string) => {
      const c = canvases.find((c) => c.id === id)
      if (c) {
        setEditValue(c.name)
        setEditingId(id)
        setContextMenu(null)
      }
    },
    [canvases],
  )

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }, [editingId, editValue, onRename])

  return (
    <div
      className="canvas-sidebar-wrapper skeuo-panel w-56 flex-shrink-0 flex flex-col h-full overflow-hidden relative"
      onClick={() => setContextMenu(null)}
    >
      {/* Header */}
      <div
        className="px-3 py-3 flex items-center justify-between"
        style={{
          borderBottom: "1px solid var(--border-light)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 8,
              background: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 8px rgba(250,204,21,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <ScribbledLayers size={12} style={{ color: "var(--text-on-accent)" }} />
          </div>
          <span
            className="text-xs font-bold tracking-wide uppercase"
            style={{ color: "var(--text-primary)", letterSpacing: "0.05em" }}
          >
            Canvases
          </span>
          <span
            className="skeuo-inset text-[10px] px-1.5 py-0.5 font-semibold"
            style={{
              color: "var(--text-tertiary)",
              borderRadius: 8,
            }}
          >
            {canvases.length}
          </span>
        </div>
        <button
          onClick={onCreate}
          className="skeuo-btn flex items-center justify-center transition-all"
          style={{
            width: 26,
            height: 26,
            color: "var(--accent-primary)",
            borderRadius: "var(--radius-btn)",
          }}
          aria-label="New canvas"
        >
          <AnimatedIcon animation="bounce" size={13}>
            <ScribbledPlus size={13} />
          </AnimatedIcon>
        </button>
      </div>

      {/* Search — inset field */}
      <div className="px-2.5 py-2">
        <div
          className="skeuo-inset flex items-center gap-2 px-2.5 py-1.5"
        >
          <ScribbledSearch size={12} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-xs focus:outline-none"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search canvases..."
          />
        </div>
      </div>

      {/* Canvas List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        {isLoading && (
          <div
            className="text-[10px] text-center py-8"
            style={{ color: "var(--text-tertiary)" }}
          >
            Loading...
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div
            className="text-[10px] text-center py-8"
            style={{ color: "var(--text-tertiary)" }}
          >
            {search ? "No canvases found" : "No canvases yet"}
          </div>
        )}

        {filtered.map((canvas) => {
          const isActive = canvas.id === activeCanvasId
          return (
            <button
              key={canvas.id}
              onClick={() => onSelect(canvas.id)}
              onContextMenu={(e) => handleContextMenu(e, canvas.id)}
              onDoubleClick={() => startRename(canvas.id)}
              className="w-full text-left px-3 py-2.5 mb-1 transition-all"
              style={{
                background: isActive ? "var(--bg-panel-inset)" : "transparent",
                color: "var(--text-primary)",
                borderRadius: "var(--radius-inset)",
                boxShadow: isActive ? "var(--input-inner-shadow)" : "none",
                border: isActive ? "1px solid var(--border-light)" : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "var(--bg-panel-inset)"
                  e.currentTarget.style.boxShadow = "var(--input-inner-shadow)"
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent"
                  e.currentTarget.style.boxShadow = "none"
                }
              }}
            >
              {editingId === canvas.id ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename()
                    if (e.key === "Escape") setEditingId(null)
                  }}
                  className="bg-transparent border-none text-xs font-semibold focus:outline-none w-full"
                  style={{ color: "var(--text-primary)" }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex items-center gap-2">
                  {/* Active indicator dot */}
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: isActive ? "var(--accent-primary)" : "var(--text-tertiary)",
                      boxShadow: isActive ? "0 0 6px var(--accent-primary)" : "none",
                      flexShrink: 0,
                      opacity: isActive ? 1 : 0.4,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {canvas.name}
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {timeAgo(canvas.updatedAt)}
                    </p>
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Context Menu — neumorphic popover */}
      {contextMenu && (
        <div
          className="skeuo-panel absolute z-[200] py-1.5 min-w-[140px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            borderRadius: "var(--radius-inset)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { icon: <ScribbledEdit size={12} />, label: "Rename", action: () => startRename(contextMenu.id) },
            { icon: <ScribbledCopy size={12} />, label: "Duplicate", action: () => { onDuplicate(contextMenu.id); setContextMenu(null) } },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium transition-all"
              style={{ color: "var(--text-primary)", borderRadius: 8 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-panel-inset)"
                e.currentTarget.style.boxShadow = "var(--input-inner-shadow)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent"
                e.currentTarget.style.boxShadow = "none"
              }}
              onClick={item.action}
            >
              {item.icon} {item.label}
            </button>
          ))}
          <div
            className="mx-2.5 my-1"
            style={{ borderTop: "1px solid var(--border-light)", opacity: 0.5 }}
          />
          <button
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium transition-all"
            style={{ color: "#ef4444", borderRadius: 8 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-panel-inset)"
              e.currentTarget.style.boxShadow = "var(--input-inner-shadow)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
              e.currentTarget.style.boxShadow = "none"
            }}
            onClick={() => {
              onDelete(contextMenu.id)
              setContextMenu(null)
            }}
          >
            <ScribbledTrash size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
