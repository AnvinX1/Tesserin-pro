"use client"

import React, { useState, useCallback } from "react"
import { FiLayers, FiPlus, FiCopy, FiCheck, FiClipboard, FiTarget, FiBook, FiCalendar, FiTrendingUp, FiCpu, FiMessageSquare, FiFileText } from "react-icons/fi"
import { HiOutlineSparkles } from "react-icons/hi2"
import { SkeuoPanel } from "../core/skeuo-panel"
import { useNotes } from "@/lib/notes-store"

/**
 * TemplateManager
 *
 * Pre-built note templates for common use cases.
 * Allows creating notes from templates instantly.
 */

interface TemplateManagerProps {
    isOpen: boolean
    onClose: () => void
    onCreateNote: (noteId: string) => void
}

interface Template {
    id: string
    name: string
    category: string
    icon: React.ElementType
    content: string
}

const BUILT_IN_TEMPLATES: Template[] = [
    {
        id: "tpl-meeting",
        name: "Meeting Notes",
        category: "Work",
        icon: FiClipboard,
        content: `# Meeting Notes — {{date}}

## Attendees
- 

## Agenda
1. 

## Discussion Points
- 

## Action Items
- [ ] 

## Follow-up
- Next meeting: 
`,
    },
    {
        id: "tpl-project",
        name: "Project Plan",
        category: "Work",
        icon: FiTarget,
        content: `# Project: {{title}}

## Overview
Brief description of the project.

## Goals
1. 
2. 
3. 

## Timeline
| Phase | Dates | Status |
|-------|-------|--------|
| Planning | | ⬜ |
| Development | | ⬜ |
| Testing | | ⬜ |
| Launch | | ⬜ |

## Resources
- 

## Risks & Mitigations
- 
`,
    },
    {
        id: "tpl-research",
        name: "Research Note",
        category: "Learning",
        icon: FiFileText,
        content: `# Research: {{title}}

## Key Question
What am I trying to understand?

## Sources
1. 

## Key Findings
- 

## Connections
- Related to: [[]]

## Open Questions
- 
`,
    },
    {
        id: "tpl-book",
        name: "Book Notes",
        category: "Learning",
        icon: FiBook,
        content: `# Book: {{title}}

**Author:** 
**Rating:** ⭐⭐⭐⭐⭐

## Summary
One-paragraph summary.

## Key Ideas
1. 
2. 
3. 

## Favorite Quotes
> 

## How This Applies
- 

## Related
- [[]]
`,
    },
    {
        id: "tpl-weekly",
        name: "Weekly Review",
        category: "Productivity",
        icon: FiCalendar,
        content: `# Weekly Review — Week of {{date}}

## 🏆 Wins
- 

## 📝 Lessons Learned
- 

## 📊 Goals Review
- [ ] Goal 1: 
- [ ] Goal 2: 
- [ ] Goal 3: 

## 🎯 Next Week's Focus
1. 
2. 
3. 

## 💡 Ideas & Thoughts
- 
`,
    },
    {
        id: "tpl-decision",
        name: "Decision Log",
        category: "Productivity",
        icon: FiTrendingUp,
        content: `# Decision: {{title}}

**Date:** {{date}}
**Status:** 🟡 Pending

## Context
What situation prompted this decision?

## Options Considered
| Option | Pros | Cons |
|--------|------|------|
| A | | |
| B | | |
| C | | |

## Decision
What was decided and why.

## Expected Outcome
- 

## Review Date
- 
`,
    },
    {
        id: "tpl-brainstorm",
        name: "Brainstorm",
        category: "Creative",
        icon: FiMessageSquare,
        content: `# Brainstorm: {{title}}

## Central Question
What are we brainstorming about?

## Ideas
1. 
2. 
3. 
4. 
5. 

## Clusters / Themes
- **Theme A:** 
- **Theme B:** 

## Top 3 to Explore
1. 
2. 
3. 

## Next Steps
- 
`,
    },
    {
        id: "tpl-zettel",
        name: "Zettelkasten Note",
        category: "Knowledge",
        icon: FiCpu,
        content: `# {{title}}

## Idea
State the core idea in one clear sentence.

## Elaboration
Expand on the idea with your own understanding.

## Evidence / Sources
- 


## Connections
- Supports: [[]]
- Contradicts: [[]]
- Relates to: [[]]

## Questions
- 
`,
    },
]

export function TemplateManager({ isOpen, onClose, onCreateNote }: TemplateManagerProps) {
    const { addNote, updateNote } = useNotes()
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [createdId, setCreatedId] = useState<string | null>(null)

    const categories = [...new Set(BUILT_IN_TEMPLATES.map((t) => t.category))]

    const filteredTemplates = selectedCategory
        ? BUILT_IN_TEMPLATES.filter((t) => t.category === selectedCategory)
        : BUILT_IN_TEMPLATES

    const createFromTemplate = useCallback(
        (template: Template) => {
            const now = new Date()
            const dateStr = now.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            })
            const title = template.name + " — " + now.toLocaleDateString()
            const content = template.content
                .replace(/\{\{date\}\}/g, dateStr)
                .replace(/\{\{title\}\}/g, title)

            const id = addNote(title)
            // Update with template content
            updateNote(id, { content })

            setCreatedId(template.id)
            setTimeout(() => {
                setCreatedId(null)
                onCreateNote(id)
                onClose()
            }, 600)
        },
        [addNote, updateNote, onCreateNote, onClose],
    )

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center"
            onClick={onClose}
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
        >
            <SkeuoPanel
                className="w-full max-w-2xl max-h-[80vh] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-4 border-b" style={{ borderColor: "var(--border-dark)" }}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <FiLayers size={20} style={{ color: "var(--accent-primary)" }} />
                            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                                Templates
                            </h2>
                            <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: "var(--bg-panel-inset)", color: "var(--text-tertiary)" }}
                            >
                                {BUILT_IN_TEMPLATES.length} templates
                            </span>
                        </div>
                        <button onClick={onClose} className="skeuo-btn px-2 py-1 text-xs rounded-lg">
                            Close
                        </button>
                    </div>

                    {/* Category filter */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!selectedCategory ? "skeuo-btn" : ""}`}
                            style={{
                                backgroundColor: !selectedCategory ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                                color: !selectedCategory ? "var(--text-on-accent)" : "var(--text-secondary)",
                            }}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedCategory === cat ? "skeuo-btn" : ""}`}
                                style={{
                                    backgroundColor: selectedCategory === cat ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                                    color: selectedCategory === cat ? "var(--text-on-accent)" : "var(--text-secondary)",
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Template grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-2 gap-3">
                        {filteredTemplates.map((tpl) => (
                            <button
                                key={tpl.id}
                                onClick={() => createFromTemplate(tpl)}
                                className="skeuo-btn p-4 rounded-xl text-left flex flex-col gap-2 active hover:scale-[1.01] transition-transform"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500">
                                        <tpl.icon size={20} />
                                    </div>
                                    {createdId === tpl.id ? (
                                        <FiCheck size={16} className="text-green-500" />
                                    ) : (
                                        <FiCopy size={12} style={{ color: "var(--text-tertiary)" }} />
                                    )}
                                </div>
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                        {tpl.name}
                                    </div>
                                    <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                                        {tpl.category}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </SkeuoPanel>
        </div>
    )
}
