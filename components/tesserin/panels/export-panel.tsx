"use client"

import React, { useState, useCallback } from "react"
import { FiDownload, FiFileText, FiCode, FiFile, FiCopy, FiCheck } from "react-icons/fi"
import { SkeuoPanel } from "../core/skeuo-panel"
import { useNotes, type Note } from "@/lib/notes-store"

/**
 * ExportPanel
 *
 * Export notes in multiple formats:
 * - Markdown (.md)
 * - HTML (.html) 
 * - Plain Text (.txt)
 * - JSON (full vault backup)
 */

interface ExportPanelProps {
    isOpen: boolean
    onClose: () => void
    note?: Note | null
}

type ExportFormat = "markdown" | "html" | "txt" | "json"

function noteToHTML(note: Note): string {
    // Simple Markdown→HTML conversion
    let html = note.content
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/\[\[(.+?)\]\]/g, '<a href="#$1">$1</a>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title} — Tesserin</title>
  <style>
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
    h1, h2, h3 { margin-top: 2em; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    a { color: #d4a800; text-decoration: underline; }
    li { margin: 4px 0; }
    .meta { color: #888; font-size: 0.85em; margin-bottom: 2em; }
  </style>
</head>
<body>
  <div class="meta">
    <p>Created: ${new Date(note.createdAt).toLocaleDateString()} · Updated: ${new Date(note.updatedAt).toLocaleDateString()}</p>
  </div>
  <p>${html}</p>
</body>
</html>`
}

function downloadFile(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function ExportPanel({ isOpen, onClose, note }: ExportPanelProps) {
    const { notes } = useNotes()
    const [exported, setExported] = useState<string | null>(null)

    const exportNote = useCallback(
        (format: ExportFormat) => {
            const target = note || (notes.length > 0 ? notes[0] : null)
            if (!target) return

            const safeName = target.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-").toLowerCase()

            switch (format) {
                case "markdown":
                    downloadFile(`${safeName}.md`, target.content, "text/markdown")
                    break
                case "html":
                    downloadFile(`${safeName}.html`, noteToHTML(target), "text/html")
                    break
                case "txt":
                    downloadFile(
                        `${safeName}.txt`,
                        target.content.replace(/[#*`\[\]]/g, ""),
                        "text/plain",
                    )
                    break
                case "json":
                    downloadFile(
                        `${safeName}.json`,
                        JSON.stringify(target, null, 2),
                        "application/json",
                    )
                    break
            }
            setExported(format)
            setTimeout(() => setExported(null), 2000)
        },
        [note, notes],
    )

    const exportVault = useCallback(() => {
        const vault = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            noteCount: notes.length,
            notes: notes.map((n) => ({
                id: n.id,
                title: n.title,
                content: n.content,
                createdAt: n.createdAt,
                updatedAt: n.updatedAt,
            })),
        }
        downloadFile("tesserin-vault.json", JSON.stringify(vault, null, 2), "application/json")
        setExported("json")
        setTimeout(() => setExported(null), 2000)
    }, [notes])

    if (!isOpen) return null

    const formats: Array<{
        id: ExportFormat
        label: string
        desc: string
        icon: React.ReactNode
    }> = [
            { id: "markdown", label: "Markdown", desc: ".md file", icon: <FiFileText size={16} /> },
            { id: "html", label: "HTML", desc: "Styled web page", icon: <FiCode size={16} /> },
            { id: "txt", label: "Plain Text", desc: ".txt file", icon: <FiFile size={16} /> },
            { id: "json", label: "JSON", desc: "Structured data", icon: <FiCopy size={16} /> },
        ]

    return (
        <div
            className="fixed inset-0 z-[90] flex items-center justify-center"
            onClick={onClose}
            style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
        >
            <SkeuoPanel
                className="w-full max-w-md p-6 animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <FiDownload size={20} style={{ color: "var(--accent-primary)" }} />
                        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                            Export
                        </h2>
                    </div>
                    <button onClick={onClose} className="skeuo-btn px-2 py-1 text-xs rounded-lg">
                        Close
                    </button>
                </div>

                {/* Single note export */}
                {note && (
                    <div className="mb-4">
                        <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
                            Exporting: <strong style={{ color: "var(--text-primary)" }}>{note.title}</strong>
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {formats.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => exportNote(f.id)}
                            className="skeuo-btn p-4 rounded-xl text-left flex flex-col gap-1 active"
                        >
                            <div className="flex items-center gap-2">
                                {exported === f.id ? (
                                    <FiCheck size={16} className="text-green-500" />
                                ) : (
                                    f.icon
                                )}
                                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                                    {f.label}
                                </span>
                            </div>
                            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                                {f.desc}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Full vault export */}
                <button
                    onClick={exportVault}
                    className="w-full skeuo-btn p-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 active"
                    style={{ color: "var(--accent-primary)" }}
                >
                    <FiDownload size={16} />
                    Export Entire Vault ({notes.length} notes)
                </button>
            </SkeuoPanel>
        </div>
    )
}
