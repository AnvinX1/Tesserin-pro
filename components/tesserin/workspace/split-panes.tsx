"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { FiColumns, FiX, FiArrowRight, FiArrowDown } from "react-icons/fi"

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

interface SplitPaneLayoutProps {
  /** Available workspace views */
  views: ViewDefinition[]
  /** Currently active view in the primary pane (synced w/ LeftDock) */
  primaryViewType: string
  /** Called when the primary pane view changes (updates LeftDock) */
  onPrimaryViewChange: (viewType: string) => void
  /** Render callback — returns the component for a given view type */
  renderView: (viewType: string, props: PaneRenderProps) => React.ReactNode
  /** Split state from useSplitPanes */
  splitState: SplitState
  /** Open a split pane */
  onSplitOpen: (viewType?: string) => void
  /** Close the secondary pane */
  onSplitClose: () => void
  /** Change the secondary pane's view */
  onSecondaryViewChange: (viewType: string) => void
  /** Toggle horizontal / vertical split direction */
  onDirectionToggle: () => void
  /** Whether splitting is enabled (feature flag) */
  splitEnabled?: boolean
}

export function SplitPaneLayout({
  views,
  primaryViewType,
  onPrimaryViewChange,
  renderView,
  splitState,
  onSplitOpen,
  onSplitClose,
  onSecondaryViewChange,
  onDirectionToggle,
  splitEnabled = true,
}: SplitPaneLayoutProps) {
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep-alive: track every view that has been opened so it stays mounted
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

  /* ── Single pane mode ── */
  if (!isActive) {
    return (
      <div className="relative w-full h-full">
        {Array.from(mountedViews).map((viewId) => (
          <div
            key={viewId}
            className="absolute inset-0"
            style={{ display: viewId === primaryViewType ? "contents" : "none" }}
          >
            {renderView(viewId, { paneId: "primary" })}
          </div>
        ))}

        {/* Floating split button — hidden for canvas (canvas has its own toolbar) */}
        {splitEnabled && primaryViewType !== "canvas" && (
          <button
            onClick={() => onSplitOpen(primaryViewType)}
            className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              backgroundColor: "var(--bg-panel-inset)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-dark)",
              opacity: 0.7,
            }}
            title="Split pane (Ctrl+\\)"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent-primary)"
              e.currentTarget.style.color = "var(--text-on-accent)"
              e.currentTarget.style.borderColor = "var(--accent-primary)"
              e.currentTarget.style.opacity = "1"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)"
              e.currentTarget.style.color = "var(--text-secondary)"
              e.currentTarget.style.borderColor = "var(--border-dark)"
              e.currentTarget.style.opacity = "0.7"
            }}
          >
            <FiColumns size={13} />
            <span>Split</span>
          </button>
        )}
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
      {/* Primary pane */}
      <div
        className="flex flex-col overflow-hidden min-w-0 min-h-0"
        style={{
          [isHorizontal ? "width" : "height"]: primarySize,
          transition: isDragging ? "none" : "all 0.15s ease",
        }}
      >
        <PaneHeader
          viewType={primaryViewType}
          views={views}
          onViewChange={onPrimaryViewChange}
          onToggleDirection={onDirectionToggle}
          direction={direction}
        />
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {Array.from(mountedViews).map((viewId) => (
            <div
              key={viewId}
              className="absolute inset-0"
              style={{ display: viewId === primaryViewType ? "contents" : "none" }}
            >
              {renderView(viewId, { paneId: "primary" })}
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
        {/* Larger hit target */}
        <div
          className={`absolute ${
            isHorizontal
              ? "inset-y-0 -left-1.5 -right-1.5"
              : "inset-x-0 -top-1.5 -bottom-1.5"
          }`}
        />
        {/* Drag handle dots */}
        <div
          className={`absolute ${
            isHorizontal
              ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-0.5"
              : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-row gap-0.5"
          } opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: "var(--text-tertiary)" }}
            />
          ))}
        </div>
      </div>

      {/* Secondary pane */}
      <div
        className="flex flex-col overflow-hidden min-w-0 min-h-0"
        style={{
          [isHorizontal ? "width" : "height"]: secondarySize,
          transition: isDragging ? "none" : "all 0.15s ease",
        }}
      >
        <PaneHeader
          viewType={splitState.secondaryViewType}
          views={views}
          onViewChange={onSecondaryViewChange}
          onClose={onSplitClose}
          isSecondary
          onToggleDirection={onDirectionToggle}
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
