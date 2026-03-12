"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { FiX, FiArrowRight, FiArrowDown } from "react-icons/fi"

/**
 * Universal Split Panes
 *
 * An Obsidian-style workspace pane system where any workspace view
 * (Notes, Canvas, Graph, SAM, Settings, plugin panels) can be placed
 * in any pane independently.
 *
 * Features:
 * - Each pane has a view selector dropdown to switch between any view
 * - Horizontal or vertical split direction
 * - Drag-to-resize divider with snap-to-center
 * - Close / toggle direction from pane headers
 * - Ctrl+\ keyboard shortcut to toggle split
 */

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface ViewDefinition {
  id: string
  label: string
  icon: React.ComponentType<{ size: number }>
}

export interface PaneRenderProps {
  noteId?: string | null
  onSelectNote?: (id: string) => void
  isSecondary?: boolean
  paneId: string
}

export interface SplitState {
  isActive: boolean
  secondaryViewType: string
  secondaryNoteId: string | null
  direction: "horizontal" | "vertical"
}

/* ================================================================== */
/*  useSplitPanes hook                                                 */
/* ================================================================== */

export function useSplitPanes() {
  const [splitState, setSplitState] = useState<SplitState>({
    isActive: false,
    secondaryViewType: "notes",
    secondaryNoteId: null,
    direction: "horizontal",
  })

  const openSplit = useCallback((viewType?: string, noteId?: string) => {
    setSplitState((prev) => ({
      ...prev,
      isActive: true,
      secondaryViewType: viewType || prev.secondaryViewType || "notes",
      secondaryNoteId: noteId || null,
    }))
  }, [])

  const closeSplit = useCallback(() => {
    setSplitState((prev) => ({
      ...prev,
      isActive: false,
      secondaryNoteId: null,
    }))
  }, [])

  const setSecondaryView = useCallback((viewType: string) => {
    setSplitState((prev) => ({ ...prev, secondaryViewType: viewType }))
  }, [])

  const setSecondaryNote = useCallback((noteId: string | null) => {
    setSplitState((prev) => ({ ...prev, secondaryNoteId: noteId }))
  }, [])

  const toggleDirection = useCallback(() => {
    setSplitState((prev) => ({
      ...prev,
      direction: prev.direction === "horizontal" ? "vertical" : "horizontal",
    }))
  }, [])

  return { splitState, openSplit, closeSplit, setSecondaryView, setSecondaryNote, toggleDirection }
}

/* ================================================================== */
/*  PaneHeader — compact view-selector bar for each pane               */
/* ================================================================== */

interface PaneHeaderProps {
  viewType: string
  views: ViewDefinition[]
  onViewChange: (viewType: string) => void
  onClose?: () => void
  onToggleDirection?: () => void
  isSecondary?: boolean
  direction?: "horizontal" | "vertical"
}

function PaneHeader({
  viewType,
  views,
  onViewChange,
  onClose,
  onToggleDirection,
  isSecondary,
  direction,
}: PaneHeaderProps) {
  const currentView = views.find((v) => v.id === viewType)

  return (
    <div
      className="pane-header h-8 flex items-center gap-1 px-1.5 border-b shrink-0 select-none"
      style={{ borderColor: "var(--border-dark)" }}
    >
      {/* Inline view tabs — secondary pane can switch, primary just shows label */}
      {isSecondary ? (
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-all duration-100"
              style={{
                color: v.id === viewType ? "var(--accent-primary)" : "var(--text-tertiary)",
                backgroundColor: v.id === viewType ? "rgba(250, 204, 21, 0.08)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (v.id !== viewType) e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)"
              }}
              onMouseLeave={(e) => {
                if (v.id !== viewType) e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <v.icon size={11} />
              <span>{v.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-1.5 text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
          {currentView && <currentView.icon size={11} />}
          <span>{currentView?.label || viewType}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Action buttons */}
      <div className="flex items-center gap-0.5">
        {onToggleDirection && (
          <button
            onClick={onToggleDirection}
            className="p-1 rounded-md transition-all duration-100"
            title={`Switch to ${direction === "horizontal" ? "vertical" : "horizontal"} split`}
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)" }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
          >
            {direction === "horizontal"
              ? <FiArrowRight size={11} />
              : <FiArrowDown size={11} />}
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-all duration-100"
            title="Close pane"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)"
              e.currentTarget.style.color = "#ef4444"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.color = "var(--text-tertiary)"
            }}
          >
            <FiX size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  SplitPaneLayout — the universal workspace container                */
/* ================================================================== */

export interface SplitPaneLayoutProps {
  views: ViewDefinition[]
  primaryViewType: string
  renderView: (viewType: string, props: PaneRenderProps) => React.ReactNode
  splitState: SplitState
  onSplitClose: () => void
  onSecondaryViewChange: (viewType: string) => void
  onDirectionToggle?: () => void
  // API-compat stubs (no longer used internally):
  onSplitOpen?: (viewType?: string) => void
  onPrimaryViewChange?: (viewType: string) => void
  splitEnabled?: boolean
}

export function SplitPaneLayout({
  views,
  primaryViewType,
  renderView,
  splitState,
  onSplitClose,
  onSecondaryViewChange,
  onDirectionToggle,
}: SplitPaneLayoutProps) {
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep-alive: track every primary view the user has visited so we can keep
  // them mounted (with display:none) instead of unmounting. This prevents
  // Excalidraw (canvas) and other heavy components from losing state on tab switch.
  const [mountedViews, setMountedViews] = useState<Set<string>>(() => new Set([primaryViewType]))
  useEffect(() => {
    setMountedViews((prev) => {
      if (prev.has(primaryViewType)) return prev
      const next = new Set(prev)
      next.add(primaryViewType)
      return next
    })
  }, [primaryViewType])

  const { isActive, direction } = splitState
  const isHorizontal = direction === "horizontal"

  // Keyboard-driven divider nudge: Ctrl+Arrow when split is open
  useEffect(() => {
    if (!isActive) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return
      const shrinkKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp'
      const growKey = isHorizontal ? 'ArrowRight' : 'ArrowDown'
      if (e.key === shrinkKey) {
        e.preventDefault()
        setSplitRatio((r) => Math.max(0.2, parseFloat((r - 0.05).toFixed(2))))
      } else if (e.key === growKey) {
        e.preventDefault()
        setSplitRatio((r) => Math.min(0.8, parseFloat((r + 0.05).toFixed(2))))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, isHorizontal])

  /* ── Divider drag ── */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      let ratio = isHorizontal
        ? (e.clientX - rect.left) / rect.width
        : (e.clientY - rect.top) / rect.height
      ratio = Math.max(0.2, Math.min(0.8, ratio))
      if (Math.abs(ratio - 0.5) < 0.03) ratio = 0.5
      setSplitRatio(ratio)
    }
    const handleMouseUp = () => setIsDragging(false)
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, isHorizontal])

  /* ── Single pane — keep-alive: render all visited views, display only the active one ── */
  if (!isActive) {
    return (
      <div className="w-full h-full relative">
        {Array.from(mountedViews).map((viewType) => (
          <div
            key={`primary-${viewType}`}
            className="w-full h-full"
            style={{ display: viewType === primaryViewType ? undefined : "none" }}
          >
            {renderView(viewType, { paneId: "primary" })}
          </div>
        ))}
      </div>
    )
  }

  /* ── Split mode ── */
  const primarySize = `${splitRatio * 100}%`
  const secondarySize = `${(1 - splitRatio) * 100}%`

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex ${isHorizontal ? "flex-row" : "flex-col"}`}
      style={{ cursor: isDragging ? (isHorizontal ? "col-resize" : "row-resize") : undefined }}
    >
      {/* Primary pane — minimal header matching secondary pane height */}
      <div
        className="flex flex-col overflow-hidden min-w-0 min-h-0"
        style={{ [isHorizontal ? "width" : "height"]: primarySize, flexShrink: 0 }}
      >
        <div
          className="pane-header h-8 flex items-center gap-1 px-2 border-b shrink-0 select-none"
          style={{ borderColor: "var(--border-dark)" }}
        >
          {(() => {
            const cv = views.find((v) => v.id === primaryViewType)
            return cv ? (
              <div className="flex items-center gap-1.5 px-1 text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
                <cv.icon size={11} />
                <span>{cv.label}</span>
              </div>
            ) : null
          })()}
          <div className="flex-1" />
          {onDirectionToggle && (
            <button
              onClick={onDirectionToggle}
              className="p-1 rounded-md transition-all duration-100"
              title={`Switch to ${direction === "horizontal" ? "vertical" : "horizontal"} split`}
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)" }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
            >
              {direction === "horizontal" ? <FiArrowRight size={11} /> : <FiArrowDown size={11} />}
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {Array.from(mountedViews).map((viewType) => (
            <div
              key={`split-primary-${viewType}`}
              className="w-full h-full"
              style={{ display: viewType === primaryViewType ? undefined : "none" }}
            >
              {renderView(viewType, { paneId: "primary" })}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div
        className={`relative flex-shrink-0 group ${
          isHorizontal ? "w-[3px] cursor-col-resize" : "h-[3px] cursor-row-resize"
        }`}
        onMouseDown={handleMouseDown}
        style={{
          backgroundColor: isDragging ? "var(--accent-primary)" : "var(--border-dark)",
          transition: isDragging ? "none" : "background-color 0.15s",
        }}
      >
        <div className={`absolute ${isHorizontal ? "inset-y-0 -left-1.5 -right-1.5" : "inset-x-0 -top-1.5 -bottom-1.5"}`} />
        <div className={`absolute ${
          isHorizontal
            ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5"
            : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-row gap-0.5"
        } opacity-0 group-hover:opacity-100 transition-opacity`}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--text-tertiary)" }} />
          ))}
        </div>
      </div>

      {/* Secondary pane — header with view-switcher + direction + close */}
      <div
        className="flex flex-col overflow-hidden min-w-0 min-h-0"
        style={{ [isHorizontal ? "width" : "height"]: secondarySize, flexShrink: 0 }}
      >
        <PaneHeader
          viewType={splitState.secondaryViewType}
          views={views}
          onViewChange={onSecondaryViewChange}
          onClose={onSplitClose}
          isSecondary
          direction={direction}
        />
        <div className="flex-1 min-h-0 overflow-hidden">
          {renderView(splitState.secondaryViewType, {
            paneId: "secondary",
            noteId: splitState.secondaryNoteId,
            isSecondary: true,
          })}
        </div>
      </div>
    </div>
  )
}
