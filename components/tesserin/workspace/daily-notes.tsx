import React, { useState, useMemo } from "react"
import { FiChevronLeft, FiChevronRight, FiCalendar, FiPlus, FiSave, FiTrendingUp } from "react-icons/fi"

/**
 * DailyNotes
 *
 * Auto-creates daily journal notes with date-based navigation.
 * Each day gets a markdown entry that persists independently.
 */

function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
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

const DEFAULT_TEMPLATE = `## Today's Focus

- 

## Tasks

- [ ] 

## Notes



## End of Day Reflection

`

export function DailyNotes() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [entries, setEntries] = useState<Record<string, string>>(() => {
        const today = dateKey(new Date())
        return { [today]: DEFAULT_TEMPLATE }
    })

    const key = useMemo(() => dateKey(currentDate), [currentDate])
    const content = entries[key] || ""

    const navigateDay = (offset: number) => {
        setCurrentDate(prev => {
            const next = new Date(prev)
            next.setDate(next.getDate() + offset)
            return next
        })
    }

    const goToToday = () => setCurrentDate(new Date())

    const ensureEntry = () => {
        if (!entries[key]) {
            setEntries(prev => ({ ...prev, [key]: DEFAULT_TEMPLATE }))
        }
    }

    const updateContent = (value: string) => {
        setEntries(prev => ({ ...prev, [key]: value }))
    }

    const relativeLabel = getRelativeLabel(currentDate)
    const isToday = dateKey(currentDate) === dateKey(new Date())
    const streakDays = useMemo(() => {
        let count = 0
        const d = new Date()
        while (entries[dateKey(d)]) {
            count++
            d.setDate(d.getDate() - 1)
        }
        return count
    }, [entries])

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div
                className="px-6 py-4 border-b flex items-center justify-between"
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

                {/* Streak */}
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
                </div>
            </div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {content || entries[key] !== undefined ? (
                    <textarea
                        value={content}
                        onChange={e => updateContent(e.target.value)}
                        className="flex-1 w-full resize-none p-6 text-sm font-mono leading-relaxed focus:outline-none custom-scrollbar"
                        style={{
                            backgroundColor: "transparent",
                            color: "var(--text-primary)",
                            caretColor: "var(--accent-primary)",
                        }}
                        placeholder="Start writing your daily note..."
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <FiCalendar size={48} style={{ color: "var(--text-tertiary)" }} />
                        <p
                            className="text-sm"
                            style={{ color: "var(--text-tertiary)" }}
                        >
                            No entry for {formatDate(currentDate)}
                        </p>
                        <button
                            onClick={ensureEntry}
                            className="skeuo-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                        >
                            <FiPlus size={14} />
                            Create Entry
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
                <span>{content.split("\n").length} lines · {content.length} chars</span>
                <span>{Object.keys(entries).length} journal entries</span>
            </div>
        </div>
    )
}
