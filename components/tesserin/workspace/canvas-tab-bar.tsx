import React, { useState, useRef, useEffect, useCallback } from "react"
import { AnimatedIcon } from "../core/animated-icon"
import { ScribbledPlus, ScribbledEdit, ScribbledCopy, ScribbledTrash } from "../core/scribbled-icons"
import { FiX } from "react-icons/fi"
import type { CanvasInfo } from "@/lib/canvas-store"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"

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
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  const startRename = useCallback(
    (id: string) => {
      const canvas = canvases.find((c) => c.id === id)
      if (canvas) {
        setEditValue(canvas.name)
        setEditingId(id)
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

  if (canvases.length === 0) return null

  return (
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
            <ContextMenu key={canvas.id}>
              <ContextMenuTrigger asChild>
                <div
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
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onClick={() => startRename(canvas.id)} className="gap-2">
                  <ScribbledEdit size={12} /> Rename
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onDuplicate(canvas.id)} className="gap-2">
                  <ScribbledCopy size={12} /> Duplicate
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem 
                  onClick={() => onDelete(canvas.id)} 
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <ScribbledTrash size={12} /> Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
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
  )
}
