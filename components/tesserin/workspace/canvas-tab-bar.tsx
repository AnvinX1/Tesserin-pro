import React, { useState, useRef, useEffect, useCallback } from "react"
import { AnimatedIcon } from "../core/animated-icon"
import { ScribbledPlus, ScribbledEdit, ScribbledCopy, ScribbledTrash } from "../core/scribbled-icons"
import { FiX } from "react-icons/fi"
import type { CanvasInfo } from "@/lib/canvas-store"

interface CanvasTabBarProps {
  canvases: CanvasInfo[]
  activeCanvasId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onClose: (id: string) => void
  onRename: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export function CanvasTabBar({
  canvases,
  activeCanvasId,
  onSelect,
  onCreate,
  onClose,
  onRename,
  onDuplicate,
  onDelete,
}: CanvasTabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    window.addEventListener("click", handler)
    return () => window.removeEventListener("click", handler)
  }, [contextMenu])

  const startRename = useCallback(
    (id: string) => {
      const canvas = canvases.find((c) => c.id === id)
      if (canvas) {
        setEditValue(canvas.name)
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

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ id, x: e.clientX, y: e.clientY })
    },
    [],
  )

  if (canvases.length === 0) return null

  return (
    <>
      <div
        className="flex items-center h-10 min-h-[40px] overflow-hidden select-none"
        style={{
          background: "var(--bg-panel)",
          borderBottom: "1px solid var(--border-light)",
          boxShadow: "inset 0 -2px 6px rgba(0,0,0,0.15), 0 1px 0 var(--border-light)",
        }}
      >
        {/* Scrollable tab area */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-end overflow-x-auto custom-scrollbar gap-1 px-2 pt-1"
          style={{ scrollbarWidth: "none" }}
        >
          {canvases.map((canvas) => {
            const isActive = canvas.id === activeCanvasId
            return (
              <div
                key={canvas.id}
                className="flex items-center gap-1.5 px-3.5 py-1.5 cursor-pointer transition-all group shrink-0"
                style={{
                  background: isActive
                    ? "var(--bg-panel)"
                    : "transparent",
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-tertiary)",
                  borderRadius: "10px 10px 0 0",
                  boxShadow: isActive
                    ? "var(--btn-shadow), inset 0 1px 0 var(--border-light)"
                    : "none",
                  borderTop: isActive ? "1px solid var(--border-light)" : "1px solid transparent",
                  borderLeft: isActive ? "1px solid var(--border-light)" : "1px solid transparent",
                  borderRight: isActive ? "1px solid var(--border-light)" : "1px solid transparent",
                  borderBottom: isActive ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  transform: isActive ? "translateY(-1px)" : "none",
                }}
                onClick={() => onSelect(canvas.id)}
                onDoubleClick={() => startRename(canvas.id)}
                onContextMenu={(e) => handleContextMenu(e, canvas.id)}
              >
                {/* Canvas icon dot */}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: isActive ? "var(--accent-primary)" : "var(--text-tertiary)",
                    boxShadow: isActive ? "0 0 6px var(--accent-primary)" : "none",
                    flexShrink: 0,
                  }}
                />

                {editingId === canvas.id ? (
                  <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename()
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className="bg-transparent border-none text-xs font-semibold focus:outline-none w-24"
                    style={{ color: "var(--text-primary)" }}
                  />
                ) : (
                  <span
                    className="text-xs font-semibold truncate max-w-[120px]"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {canvas.name}
                  </span>
                )}

                {/* Close button */}
                {canvases.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose(canvas.id)
                    }}
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-all"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label={`Close ${canvas.name}`}
                  >
                    <FiX size={10} />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* New canvas button */}
        <button
          onClick={onCreate}
          className="skeuo-btn flex items-center justify-center shrink-0 mx-2 transition-all"
          style={{
            width: 28,
            height: 28,
            color: "var(--text-secondary)",
            borderRadius: "var(--radius-btn)",
          }}
          aria-label="New canvas"
        >
          <AnimatedIcon animation="bounce" size={13}>
            <ScribbledPlus size={13} />
          </AnimatedIcon>
        </button>
      </div>

      {/* Context Menu — neumorphic popover */}
      {contextMenu && (
        <div
          className="skeuo-panel fixed z-[200] py-1.5 min-w-[150px]"
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
    </>
  )
}
