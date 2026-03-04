import React, { useState, useMemo, useEffect, useCallback, useRef } from "react"
import {
  FiChevronLeft, FiChevronRight, FiCalendar, FiPlus,
  FiTrendingUp, FiZap, FiClock,
  FiChevronDown, FiFileText,
} from "react-icons/fi"
import { HiOutlineSparkles } from "react-icons/hi2"
import { useNotes } from "@/lib/notes-store"

/**
 * DailyNotes v2
 *
 * Enhanced daily journal with:
 * - Automatic daily note creation (persisted via notes-store)
 * - Template selection and injection on note creation
 * - Navigation between days with calendar strip
 * - Streak tracking
 * - Quick capture mode (global hotkey overlay)
 * - Linked to notes-store for full backlinks/graph integration
 */

/* ── Helpers ── */

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function dateKey(date: Date): string {
  return date.toISOString().split("T")[0]
}

function getRelativeLabel(date: Date): string {
  const today = new Date()
  const todayKey = dateKey(today)
  const dk = dateKey(date)
  if (dk === todayKey) return "Today"
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dk === dateKey(yesterday)) return "Yesterday"
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dk === dateKey(tomorrow)) return "Tomorrow"
  return ""
}

function dailyNoteTitle(date: Date): string {
  return `Daily Note — ${dateKey(date)}`
}

/* ── Templates ── */

const DAILY_TEMPLATES = [
  {
    id: "default",
    name: "Default Journal",
    content: `## Today's Focus

- 

## Tasks

- [ ] 

## Notes



## End of Day Reflection

`,
  },
  {
    id: "research",
    name: "Research Log",
    content: `## Research Focus

**Topic:**

## Key Findings

1. 

## Papers / Sources

- 

## Questions & Next Steps

- [ ] 

## Connections

*Related notes:*

`,
  },
  {
    id: "meeting",
    name: "Meeting Notes",
    content: `## Meeting Notes

**Date:** {{date}}
**Attendees:**

## Agenda

1. 

## Discussion

- 

## Action Items

- [ ] 

## Follow-up

`,
  },
  {
    id: "standup",
    name: "Daily Standup",
    content: `## Daily Standup — {{date}}

### Yesterday
- 

### Today
- 

### Blockers
- 

`,
  },
  {
    id: "zettel",
    name: "Zettelkasten Daily",
    content: `## Fleeting Notes — {{date}}

*Capture ideas quickly. Process into permanent notes later.*

---

### Idea 1


---

### Idea 2


---

## Processing Queue
- [ ] Process fleeting notes above
- [ ] Update index notes
- [ ] Review connections

## References Read Today
- 

`,
  },
  {
    id: "minimal",
    name: "Minimal",
    content: `## {{date}}

`,
  },
]

function applyTemplateVars(content: string, date: Date): string {
  return content
    .replace(/\{\{date\}\}/g, formatDate(date))
    .replace(/\{\{date_short\}\}/g, formatDateShort(date))
    .replace(/\{\{date_iso\}\}/g, dateKey(date))
}

/* ── Component ── */

interface DailyNotesProps {
  /** If true, render in quick-capture overlay mode */
  quickCapture?: boolean
  onClose?: () => void
}

export function DailyNotes({ quickCapture = false, onClose }: DailyNotesProps) {
  const { notes, addNote, updateNote, selectNote } = useNotes()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedTemplate, setSelectedTemplate] = useState("default")
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const templateRef = useRef<HTMLDivElement>(null)

  const key = useMemo(() => dateKey(currentDate), [currentDate])
  const title = useMemo(() => dailyNoteTitle(currentDate), [currentDate])

  // Find the corresponding note from notes-store
  const dailyNote = useMemo(
    () => notes.find((n) => n.title === title),
    [notes, title],
  )

  // Auto-create today's note on mount if it doesn't exist
  useEffect(() => {
    const todayTitle = dailyNoteTitle(new Date())
    const exists = notes.some((n) => n.title === todayTitle)
    if (!exists && notes.length > 0) {
      // Only auto-create once notes are loaded
      const template = DAILY_TEMPLATES[0]
      const content = `# ${todayTitle}\n\n${applyTemplateVars(template.content, new Date())}`
      const id = addNote(todayTitle)
      setTimeout(() => {
        updateNote(id, { content })
      }, 100)
    }
  }, [notes.length > 0]) // eslint-disable-line react-hooks/exhaustive-deps

  // Create a daily note for the current date if it doesn't exist
  const createEntry = useCallback(
    (templateId?: string) => {
      const tmpl = DAILY_TEMPLATES.find((t) => t.id === (templateId || selectedTemplate))
        || DAILY_TEMPLATES[0]
      const content = `# ${title}\n\n${applyTemplateVars(tmpl.content, currentDate)}`
      const id = addNote(title)

      setTimeout(() => {
        updateNote(id, { content })
      }, 50)

      setShowTemplateMenu(false)
    },
    [title, currentDate, selectedTemplate, addNote, updateNote],
  )

  const handleContentChange = useCallback(
    (value: string) => {
      if (dailyNote) {
        updateNote(dailyNote.id, { content: value })
      }
    },
    [dailyNote, updateNote],
  )

  const navigateDay = (offset: number) => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + offset)
      return next
    })
  }

  const goToToday = () => setCurrentDate(new Date())

  const openInEditor = useCallback(() => {
    if (dailyNote) {
      selectNote(dailyNote.id)
    }
  }, [dailyNote, selectNote])

  const relativeLabel = getRelativeLabel(currentDate)
  const isToday = dateKey(currentDate) === dateKey(new Date())

  // Streak calculation
  const streakDays = useMemo(() => {
    let count = 0
    const d = new Date()
    while (true) {
      const t = dailyNoteTitle(d)
      const exists = notes.some((n) => n.title === t)
      if (!exists) break
      count++
      d.setDate(d.getDate() - 1)
    }
    return count
  }, [notes])

  // Calendar mini-view: show which days have entries
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; hasEntry: boolean; isToday: boolean; isCurrent: boolean }> = []
    const start = new Date(currentDate)
    start.setDate(start.getDate() - 15)

    for (let i = 0; i < 31; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const t = dailyNoteTitle(d)
      days.push({
        date: d,
        hasEntry: notes.some((n) => n.title === t),
        isToday: dateKey(d) === dateKey(new Date()),
        isCurrent: dateKey(d) === key,
      })
    }

    return days
  }, [currentDate, notes, key])

  // Close template menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (templateRef.current && !templateRef.current.contains(e.target as Node)) {
        setShowTemplateMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Quick capture mode
  if (quickCapture) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]"
        onClick={onClose}
        style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(8px)" }}
      >
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: "var(--bg-panel)",
            border: "1px solid var(--border-mid)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border-dark)" }}>
            <FiZap size={16} style={{ color: "var(--accent-primary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Quick Capture
            </span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              — {formatDateShort(new Date())}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            autoFocus
            className="w-full h-40 p-4 text-sm font-mono resize-none bg-transparent focus:outline-none custom-scrollbar"
            style={{ color: "var(--text-primary)", caretColor: "var(--accent-primary)" }}
            placeholder="Quick thought... (appends to today's daily note)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                const text = textareaRef.current?.value.trim()
                if (text && dailyNote) {
                  const appendText = `\n\n---\n*Captured at ${new Date().toLocaleTimeString()}*\n\n${text}`
                  updateNote(dailyNote.id, {
                    content: dailyNote.content + appendText,
                  })
                  onClose?.()
                } else if (text) {
                  createEntry("minimal")
                  onClose?.()
                }
              } else if (e.key === "Escape") {
                onClose?.()
              }
            }}
          />
          <div
            className="px-4 py-2 flex items-center justify-between text-[10px] border-t"
            style={{ borderColor: "var(--border-dark)", color: "var(--text-tertiary)" }}
          >
            <span>Ctrl+Enter to save · Esc to cancel</span>
            <span>Appends to today&apos;s daily note</span>
          </div>
        </div>
      </div>
    )
  }

  // Full daily notes view
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex items-center pl-[72px] justify-between"
        style={{ borderColor: "var(--border-dark)" }}
      >
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateDay(-1)}
              className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
              aria-label="Previous day"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              onClick={goToToday}
              className={`skeuo-btn px-3 h-8 flex items-center justify-center rounded-lg text-xs font-medium ${isToday ? "active" : ""}`}
            >
              Today
            </button>
            <button
              onClick={() => navigateDay(1)}
              className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
              aria-label="Next day"
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          {/* Date display */}
          <div>
            <h2
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              <FiCalendar size={18} style={{ color: "var(--accent-primary)" }} />
              {formatDate(currentDate)}
              {relativeLabel && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isToday ? "var(--accent-primary)" : "var(--border-dark)",
                    color: isToday ? "var(--text-on-accent)" : "var(--text-secondary)",
                  }}
                >
                  {relativeLabel}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {streakDays > 0 && (
            <div
              className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
              style={{
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                color: "var(--text-on-accent)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <FiTrendingUp size={12} />
              {streakDays} day streak
            </div>
          )}

          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className={`skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg ${showCalendar ? "active" : ""}`}
            aria-label="Toggle calendar"
          >
            <FiClock size={14} />
          </button>

          {dailyNote && (
            <button
              onClick={openInEditor}
              className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
              aria-label="Open in editor"
              title="Open in main editor (for backlinks & graph)"
            >
              <FiFileText size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Calendar strip */}
      {showCalendar && (
        <div
          className="px-6 py-3 border-b flex items-center gap-1 overflow-x-auto custom-scrollbar"
          style={{ borderColor: "var(--border-dark)" }}
        >
          {calendarDays.map((day) => (
            <button
              key={dateKey(day.date)}
              onClick={() => setCurrentDate(new Date(day.date))}
              className="flex flex-col items-center px-2 py-1.5 rounded-lg min-w-[40px] transition-colors"
              style={{
                backgroundColor: day.isCurrent
                  ? "var(--accent-primary)"
                  : day.hasEntry
                    ? "var(--bg-panel-inset)"
                    : "transparent",
                color: day.isCurrent
                  ? "var(--text-on-accent)"
                  : day.isToday
                    ? "var(--accent-primary)"
                    : "var(--text-tertiary)",
              }}
            >
              <span className="text-[9px] uppercase font-medium">
                {day.date.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}
              </span>
              <span className="text-xs font-bold">{day.date.getDate()}</span>
              {day.hasEntry && !day.isCurrent && (
                <div
                  className="w-1 h-1 rounded-full mt-0.5"
                  style={{ backgroundColor: "var(--accent-primary)" }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Editor / Create entry */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {dailyNote ? (
          <textarea
            value={dailyNote.content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="flex-1 w-full resize-none p-6 text-sm font-mono leading-relaxed focus:outline-none custom-scrollbar"
            style={{
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              caretColor: "var(--accent-primary)",
            }}
            placeholder="Start writing your daily note..."
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <FiCalendar size={48} style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              No entry for {formatDate(currentDate)}
            </p>

            {/* Template selector */}
            <div className="relative" ref={templateRef}>
              <button
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                className="skeuo-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
              >
                <FiPlus size={14} />
                Create with Template
                <FiChevronDown size={12} />
              </button>

              {showTemplateMenu && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-xl overflow-hidden z-50"
                  style={{
                    backgroundColor: "var(--bg-panel)",
                    border: "1px solid var(--border-mid)",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
                  }}
                >
                  <div
                    className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider border-b"
                    style={{ borderColor: "var(--border-dark)", color: "var(--text-tertiary)" }}
                  >
                    Choose Template
                  </div>
                  {DAILY_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => createEntry(tmpl.id)}
                      className="w-full text-left px-3 py-2.5 hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                      <HiOutlineSparkles
                        size={14}
                        style={{
                          color: tmpl.id === selectedTemplate
                            ? "var(--accent-primary)"
                            : "var(--text-tertiary)",
                        }}
                      />
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {tmpl.name}
                        </div>
                        <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {tmpl.content.split("\n").filter(Boolean).length} sections
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => createEntry("minimal")}
              className="text-xs underline"
              style={{ color: "var(--text-tertiary)" }}
            >
              or create a blank entry
            </button>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div
        className="px-6 py-2 border-t flex items-center justify-between text-xs"
        style={{
          borderColor: "var(--border-dark)",
          color: "var(--text-tertiary)",
        }}
      >
        <span>
          {dailyNote
            ? `${dailyNote.content.split("\n").length} lines · ${dailyNote.content.length} chars`
            : "No entry"}
        </span>
        <span>
          {notes.filter((n) => n.title.startsWith("Daily Note —")).length} journal entries
        </span>
      </div>
    </div>
  )
}
