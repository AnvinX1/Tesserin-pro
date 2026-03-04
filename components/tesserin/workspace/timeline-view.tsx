"use client"

import React, { useState, useMemo, useCallback } from "react"
import {
  FiClock, FiFileText, FiEdit3, FiPlus, FiTrash2,
  FiChevronDown, FiChevronRight, FiCalendar, FiFilter,
  FiSearch,
} from "react-icons/fi"
import { useNotes, type Note } from "@/lib/notes-store"

/**
 * TimelineView
 *
 * A chronological visualisation of note activity:
 * - Groups notes by day (created / updated)
 * - Shows a visual timeline with gold accent line
 * - Filter by: all activity, created only, updated only
 * - Search within timeline
 * - Click any entry to navigate to that note
 */

type TimelineFilter = "all" | "created" | "updated"
type TimelineSort = "newest" | "oldest"

interface TimelineEntry {
  id: string
  noteId: string
  noteTitle: string
  type: "created" | "updated"
  timestamp: string
  /** Preview of the note content */
  preview: string
}

interface DayGroup {
  date: string
  label: string
  entries: TimelineEntry[]
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const dateOnly = date.toDateString()
  if (dateOnly === today.toDateString()) return "Today"
  if (dateOnly === yesterday.toDateString()) return "Yesterday"

  const dayDiff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (dayDiff < 7) return date.toLocaleDateString(undefined, { weekday: "long" })

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function TimelineView() {
  const { notes, selectNote } = useNotes()
  const [filter, setFilter] = useState<TimelineFilter>("all")
  const [sort, setSort] = useState<TimelineSort>("newest")
  const [searchQuery, setSearchQuery] = useState("")
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set())

  // Build timeline entries from notes
  const allEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = []

    for (const note of notes) {
      const preview = note.content
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\n+/g, " ")
        .trim()
        .substring(0, 100)

      // Created event
      entries.push({
        id: `${note.id}-created`,
        noteId: note.id,
        noteTitle: note.title,
        type: "created",
        timestamp: note.createdAt,
        preview,
      })

      // Updated event (only if different from created)
      if (note.updatedAt !== note.createdAt) {
        entries.push({
          id: `${note.id}-updated`,
          noteId: note.id,
          noteTitle: note.title,
          type: "updated",
          timestamp: note.updatedAt,
          preview,
        })
      }
    }

    return entries
  }, [notes])

  // Filter and sort
  const filteredEntries = useMemo(() => {
    let result = allEntries

    // Apply type filter
    if (filter === "created") {
      result = result.filter((e) => e.type === "created")
    } else if (filter === "updated") {
      result = result.filter((e) => e.type === "updated")
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (e) =>
          e.noteTitle.toLowerCase().includes(q) ||
          e.preview.toLowerCase().includes(q),
      )
    }

    // Sort
    result.sort((a, b) => {
      const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      return sort === "newest" ? diff : -diff
    })

    return result
  }, [allEntries, filter, sort, searchQuery])

  // Group by day
  const dayGroups = useMemo<DayGroup[]>(() => {
    const groups = new Map<string, TimelineEntry[]>()

    for (const entry of filteredEntries) {
      const dateKey = new Date(entry.timestamp).toDateString()
      const existing = groups.get(dateKey) || []
      existing.push(entry)
      groups.set(dateKey, existing)
    }

    return Array.from(groups.entries()).map(([date, entries]) => ({
      date,
      label: formatDateLabel(entries[0].timestamp),
      entries,
    }))
  }, [filteredEntries])

  const toggleDay = useCallback((date: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }, [])

  // Stats
  const totalNotes = notes.length
  const todayCount = allEntries.filter(
    (e) => new Date(e.timestamp).toDateString() === new Date().toDateString(),
  ).length

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex-shrink-0 flex items-center pl-[72px]"
        style={{ borderColor: "var(--border-dark)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(250, 204, 21, 0.1)" }}
            >
              <FiClock size={18} style={{ color: "var(--accent-primary)" }} />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                Timeline
              </h2>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {totalNotes} notes · {todayCount} changes today
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div
            className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: "var(--bg-panel-inset)",
              border: "1px solid var(--border-dark)",
            }}
          >
            <FiSearch size={13} style={{ color: "var(--text-tertiary)" }} />
            <input
              className="flex-1 bg-transparent text-xs focus:outline-none"
              style={{ color: "var(--text-primary)" }}
              placeholder="Filter timeline..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter buttons */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--border-dark)" }}
          >
            {(["all", "created", "updated"] as TimelineFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-2.5 py-1.5 text-xs font-medium capitalize transition-colors"
                style={{
                  backgroundColor: filter === f ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                  color: filter === f ? "var(--text-on-accent)" : "var(--text-secondary)",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <button
            onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              backgroundColor: "var(--bg-panel-inset)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-dark)",
            }}
            title={`Sort: ${sort}`}
          >
            {sort === "newest" ? "↓ New" : "↑ Old"}
          </button>
        </div>
      </div>

      {/* Timeline body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4">
        {dayGroups.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            style={{ color: "var(--text-tertiary)" }}
          >
            <FiClock size={32} style={{ opacity: 0.3 }} />
            <p className="text-sm">No activity to show</p>
            {searchQuery && (
              <p className="text-xs">
                Try a different search or filter
              </p>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical timeline line */}
            <div
              className="absolute left-4 top-0 bottom-0 w-px"
              style={{ backgroundColor: "var(--accent-primary)", opacity: 0.15 }}
            />

            {dayGroups.map((group) => {
              const isCollapsed = collapsedDays.has(group.date)

              return (
                <div key={group.date} className="mb-6">
                  {/* Day header */}
                  <button
                    onClick={() => toggleDay(group.date)}
                    className="relative flex items-center gap-3 mb-3 group w-full text-left"
                  >
                    {/* Timeline dot */}
                    <div
                      className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: "var(--bg-panel)",
                        border: "2px solid var(--accent-primary)",
                      }}
                    >
                      <FiCalendar size={13} style={{ color: "var(--accent-primary)" }} />
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                        {group.label}
                      </span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: "var(--bg-panel-inset)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {group.entries.length}
                      </span>
                      {isCollapsed ? (
                        <FiChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
                      ) : (
                        <FiChevronDown size={14} style={{ color: "var(--text-tertiary)" }} />
                      )}
                    </div>
                  </button>

                  {/* Entries */}
                  {!isCollapsed && (
                    <div className="ml-4 pl-7 border-l border-dashed space-y-2" style={{ borderColor: "rgba(250, 204, 21, 0.1)" }}>
                      {group.entries.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => selectNote(entry.noteId)}
                          className="w-full text-left p-3 rounded-xl transition-all duration-200 hover:scale-[1.01] group/entry"
                          style={{
                            backgroundColor: "var(--bg-panel-inset)",
                            border: "1px solid var(--border-dark)",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {entry.type === "created" ? (
                              <FiPlus size={12} style={{ color: "#4ade80" }} />
                            ) : (
                              <FiEdit3 size={12} style={{ color: "var(--accent-primary)" }} />
                            )}
                            <span
                              className="text-sm font-medium truncate flex-1"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {entry.noteTitle}
                            </span>
                            <span
                              className="text-[10px] flex-shrink-0"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded capitalize"
                              style={{
                                backgroundColor: entry.type === "created"
                                  ? "rgba(74, 222, 128, 0.1)"
                                  : "rgba(250, 204, 21, 0.1)",
                                color: entry.type === "created" ? "#4ade80" : "var(--accent-primary)",
                              }}
                            >
                              {entry.type}
                            </span>
                            <span
                              className="text-xs truncate flex-1"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {entry.preview || "Empty note"}
                            </span>
                            <span
                              className="text-[10px] flex-shrink-0 opacity-60"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {getRelativeTime(entry.timestamp)}
                            </span>
                          </div>
                        </button>
                      ))}
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
