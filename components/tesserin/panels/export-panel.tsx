"use client"

import React, { useState, useCallback } from "react"
import {
  FiFileText, FiCode, FiFile, FiCopy, FiCheck,
  FiPrinter, FiBook, FiGlobe, FiPackage, FiChevronDown, FiX,
  FiUpload, FiFilePlus,
} from "react-icons/fi"
import { useNotes, type Note } from "@/lib/notes-store"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

/**
 * ExportPanel v2
 *
 * Full export pipeline with:
 * - Markdown (.md)
 * - HTML (styled web page with Tesserin theme)
 * - Plain Text (.txt)
 * - JSON (full vault backup)
 * - PDF (via browser print API)
 * - LaTeX (.tex)
 * - DOCX (simplified XML-based)
 * - Batch vault export
 */

interface ExportPanelProps {
  isOpen: boolean
  onClose: () => void
  note?: Note | null
}

type ExportFormat = "markdown" | "html" | "txt" | "json" | "pdf" | "latex" | "docx"

/* ── Converters ── */

function noteToHTML(note: Note, standalone = true): string {
  let html = note.content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[\[(.+?)\]\]/g, '<a href="#$1" class="wiki-link">$1</a>')
    .replace(/\(\(([a-z0-9]{4,12})\)\)/g, '<span class="block-ref" data-block="$1">↗ $1</span>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="task done"><input type="checkbox" checked disabled> $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="task"><input type="checkbox" disabled> $1</li>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n\n/g, "</p><p>")

  if (!standalone) return html

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title} — Tesserin</title>
  <style>
    :root { --gold: #FACC15; --bg: #FAFAF8; --text: #1a1a1a; --text-light: #555; --border: #e5e5e5; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: #0a0a0a; --text: #ededed; --text-light: #888; --border: #222; }
    }
    body { font-family: 'Inter', -apple-system, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: var(--text); background: var(--bg); line-height: 1.75; }
    h1 { font-size: 2em; margin-top: 1.5em; border-bottom: 2px solid var(--gold); padding-bottom: 8px; }
    h2 { font-size: 1.5em; margin-top: 1.5em; }
    h3 { font-size: 1.2em; margin-top: 1.2em; }
    code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: 'JetBrains Mono', monospace; }
    pre { background: rgba(0,0,0,0.06); padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 3px solid var(--gold); margin: 1em 0; padding: 8px 16px; color: var(--text-light); font-style: italic; }
    a, .wiki-link { color: var(--gold); text-decoration: underline; text-underline-offset: 3px; }
    .block-ref { color: var(--gold); font-size: 0.85em; opacity: 0.8; }
    li { margin: 4px 0; }
    .task { list-style: none; margin-left: -20px; }
    .task.done { text-decoration: line-through; opacity: 0.6; }
    .meta { color: var(--text-light); font-size: 0.85em; margin-bottom: 2em; }
    hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
    @media print { body { max-width: 100%; margin: 0; } }
  </style>
</head>
<body>
  <div class="meta">
    <p><strong>${note.title}</strong></p>
    <p>Created: ${new Date(note.createdAt).toLocaleDateString()} · Updated: ${new Date(note.updatedAt).toLocaleDateString()}</p>
    <p><em>Exported from Tesserin</em></p>
  </div>
  <p>${html}</p>
</body>
</html>`
}

function noteToLatex(note: Note): string {
  let latex = note.content
    // Headers
    .replace(/^# (.+)$/gm, "\\section{$1}")
    .replace(/^## (.+)$/gm, "\\subsection{$1}")
    .replace(/^### (.+)$/gm, "\\subsubsection{$1}")
    .replace(/^#### (.+)$/gm, "\\paragraph{$1}")
    // Formatting
    .replace(/\*\*(.+?)\*\*/g, "\\textbf{$1}")
    .replace(/\*(.+?)\*/g, "\\textit{$1}")
    .replace(/~~(.+?)~~/g, "\\sout{$1}")
    .replace(/`(.+?)`/g, "\\texttt{$1}")
    // Wiki links → footnotes
    .replace(/\[\[(.+?)\]\]/g, "$1\\footnote{See note: $1}")
    // Block references
    .replace(/\(\(([a-z0-9]{4,12})\)\)/g, "[ref: $1]")
    // Lists (simple conversion)
    .replace(/^- \[x\] (.+)$/gm, "  \\item[$\\boxtimes$] $1")
    .replace(/^- \[ \] (.+)$/gm, "  \\item[$\\square$] $1")
    .replace(/^- (.+)$/gm, "  \\item $1")
    // Blockquotes
    .replace(/^> (.+)$/gm, "\\begin{quote}\n$1\n\\end{quote}")
    // Horizontal rules
    .replace(/^(-{3,}|_{3,}|\*{3,})$/gm, "\\hrulefill")
    // Escape special chars (after all other replacements)
    .replace(/%/g, "\\%")
    .replace(/&(?!\\)/g, "\\&")

  return `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{hyperref}
\\usepackage{geometry}
\\usepackage{ulem}
\\usepackage{amssymb}
\\usepackage{enumitem}

\\geometry{margin=1in}
\\hypersetup{colorlinks=true,linkcolor=blue,urlcolor=blue}

\\title{${note.title.replace(/[%&_#{}]/g, (m) => "\\" + m)}}
\\date{${new Date(note.updatedAt).toLocaleDateString()}}
\\author{Tesserin Export}

\\begin{document}
\\maketitle

${latex}

\\end{document}
`
}

function noteToDocx(note: Note): string {
  // Simplified DOCX as XML (can be opened by LibreOffice/Word)
  const escaped = note.content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\[\[(.+?)\]\]/g, "$1")
    .replace(/\(\(([a-z0-9]{4,12})\)\)/g, "[ref: $1]")

  const lines = escaped.split("\n")
  const paragraphs = lines
    .map((line) => {
      // Headings
      const h1 = line.match(/^# (.+)$/)
      if (h1) return `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${h1[1]}</w:t></w:r></w:p>`
      const h2 = line.match(/^## (.+)$/)
      if (h2) return `<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>${h2[1]}</w:t></w:r></w:p>`
      const h3 = line.match(/^### (.+)$/)
      if (h3) return `<w:p><w:pPr><w:pStyle w:val="Heading3"/></w:pPr><w:r><w:t>${h3[1]}</w:t></w:r></w:p>`

      // Bold
      let text = line
        .replace(/\*\*(.+?)\*\*/g, "</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>$1</w:t></w:r><w:r><w:t>")
        .replace(/\*(.+?)\*/g, "</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>$1</w:t></w:r><w:r><w:t>")
        .replace(/`(.+?)`/g, "</w:t></w:r><w:r><w:rPr><w:rFonts w:ascii=\"Courier New\" w:hAnsi=\"Courier New\"/></w:rPr><w:t>$1</w:t></w:r><w:r><w:t>")

      // Strip remaining markdown
      text = text.replace(/^[-*] /, "• ").replace(/^\d+\. /, "")
        .replace(/^> /, "")
        .replace(/^- \[.\] /, "☐ ")

      return `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml"
  xmlns:wx="http://schemas.microsoft.com/office/word/2003/auxHint">
<w:body>
  <w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t>${note.title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</w:t></w:r></w:p>
  <w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:rPr><w:color w:val="888888"/></w:rPr><w:t>Exported from Tesserin — ${new Date().toLocaleDateString()}</w:t></w:r></w:p>
  ${paragraphs}
</w:body>
</w:wordDocument>`
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

function safeName(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
}

/* ── Component ── */

export function ExportPanel({ isOpen, onClose, note }: ExportPanelProps) {
  const { notes, addNote } = useNotes()
  const [exported, setExported] = useState<string | null>(null)
  const [imported, setImported] = useState<number | null>(null)
  const [batchFormat, setBatchFormat] = useState<ExportFormat>("markdown")
  const [showBatchMenu, setShowBatchMenu] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const exportNote = useCallback(
    (format: ExportFormat) => {
      const target = note || (notes.length > 0 ? notes[0] : null)
      if (!target) return

      const name = safeName(target.title)

      switch (format) {
        case "markdown":
          downloadFile(`${name}.md`, target.content, "text/markdown")
          break
        case "html":
          downloadFile(`${name}.html`, noteToHTML(target), "text/html")
          break
        case "txt":
          downloadFile(
            `${name}.txt`,
            target.content.replace(/[#*`\[\]]/g, ""),
            "text/plain",
          )
          break
        case "json":
          downloadFile(
            `${name}.json`,
            JSON.stringify(target, null, 2),
            "application/json",
          )
          break
        case "pdf": {
          // Open HTML in new window and trigger print
          const htmlContent = noteToHTML(target)
          const printWindow = window.open("", "_blank")
          if (printWindow) {
            printWindow.document.write(htmlContent)
            printWindow.document.close()
            setTimeout(() => {
              printWindow.print()
            }, 500)
          }
          break
        }
        case "latex":
          downloadFile(`${name}.tex`, noteToLatex(target), "application/x-tex")
          break
        case "docx":
          downloadFile(`${name}.xml`, noteToDocx(target), "application/msword")
          break
      }
      setExported(format)
      setTimeout(() => setExported(null), 2000)
    },
    [note, notes],
  )

  const exportVault = useCallback(() => {
    if (batchFormat === "json") {
      const vault = {
        version: "2.0",
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
    } else {
      // Export each note individually in the selected format
      notes.forEach((n) => {
        const name = safeName(n.title)
        switch (batchFormat) {
          case "markdown":
            downloadFile(`${name}.md`, n.content, "text/markdown")
            break
          case "html":
            downloadFile(`${name}.html`, noteToHTML(n), "text/html")
            break
          case "latex":
            downloadFile(`${name}.tex`, noteToLatex(n), "application/x-tex")
            break
          case "txt":
            downloadFile(`${name}.txt`, n.content.replace(/[#*`\[\]]/g, ""), "text/plain")
            break
        }
      })
    }
    setExported("json")
    setTimeout(() => setExported(null), 2000)
  }, [notes, batchFormat])

  const handleImportMarkdown = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    let count = 0
    for (const file of Array.from(files)) {
      try {
        const text = await file.text()
        const title = file.name.replace(/\.md$/i, "")
        addNote(title, text)
        count++
      } catch (err) {
        console.error("Failed to import", file.name, err)
      }
    }
    setImported(count)
    setTimeout(() => setImported(null), 3000)
    if (e.target) e.target.value = ""
  }

  const handleImportVault = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (data && Array.isArray(data.notes)) {
        data.notes.forEach((n: any) => {
          addNote(n.title, n.content)
        })
        setImported(data.notes.length)
      } else if (data && data.title && data.content) {
        addNote(data.title, data.content)
        setImported(1)
      }
    } catch (err) {
      console.error("Failed to import vault", err)
    }
    setTimeout(() => setImported(null), 3000)
    if (e.target) e.target.value = ""
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    let count = 0
    for (const file of files) {
      if (file.name.endsWith(".md")) {
        const text = await file.text()
        const title = file.name.replace(/\.md$/i, "")
        addNote(title, text)
        count++
      } else if (file.name.endsWith(".json")) {
        try {
          const text = await file.text()
          const data = JSON.parse(text)
          if (data && Array.isArray(data.notes)) {
            data.notes.forEach((n: any) => addNote(n.title, n.content))
            count += data.notes.length
          } else if (data && data.title && data.content) {
            addNote(data.title, data.content)
            count++
          }
        } catch {}
      }
    }
    if (count > 0) {
      setImported(count)
      setTimeout(() => setImported(null), 3000)
    }
  }

  if (!isOpen) return null

  const formats: Array<{
    id: ExportFormat
    label: string
    desc: string
    icon: React.ReactNode
  }> = [
    { id: "markdown", label: "Markdown", desc: ".md", icon: <FiFileText size={14} /> },
    { id: "html",     label: "HTML",     desc: "Styled web page", icon: <FiGlobe size={14} /> },
    { id: "pdf",      label: "PDF",      desc: "Print dialog", icon: <FiPrinter size={14} /> },
    { id: "latex",    label: "LaTeX",    desc: ".tex", icon: <FiBook size={14} /> },
    { id: "docx",     label: "DOCX",     desc: "Word XML", icon: <FiFile size={14} /> },
    { id: "txt",      label: "Plain Text", desc: ".txt", icon: <FiCode size={14} /> },
    { id: "json",     label: "JSON",     desc: "Structured data", icon: <FiCopy size={14} /> },
  ]

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[10vh]"
      onClick={onClose}
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "var(--bg-panel)",
          border: "1px solid var(--border-mid)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: "var(--border-dark)" }}
        >
          <span className="text-sm font-semibold flex-1" style={{ color: "var(--text-primary)" }}>
            Exchange
          </span>
          {note && (
            <span className="text-xs truncate max-w-[160px]" style={{ color: "var(--text-tertiary)" }}>
              {note.title}
            </span>
          )}
          <button onClick={onClose} style={{ color: "var(--text-tertiary)" }}>
            <FiX size={14} />
          </button>
        </div>

        <Tabs defaultValue="export" className="w-full">
          <div className="px-4 py-2 border-b" style={{ borderColor: "var(--border-dark)" }}>
            <TabsList className="w-full grid grid-cols-2 bg-transparent p-0 h-auto">
              <TabsTrigger
                value="export"
                className="py-1.5 text-xs data-[state=active]:bg-panel-inset"
              >
                Export
              </TabsTrigger>
              <TabsTrigger
                value="import"
                className="py-1.5 text-xs data-[state=active]:bg-panel-inset"
              >
                Import
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="export" className="m-0">
            {/* Format list */}
            <div className="py-1">
              {formats.map((f) => (
                <button
                  key={f.id}
                  onClick={() => exportNote(f.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <span style={{ color: "var(--text-tertiary)" }}>{f.icon}</span>
                  <span className="flex-1 text-sm">{f.label}</span>
                  <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>{f.desc}</span>
                  {exported === f.id && <FiCheck size={13} className="text-green-500 shrink-0" />}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px mx-4" style={{ backgroundColor: "var(--border-dark)" }} />

            {/* Vault export */}
            <div className="px-4 py-3 flex items-center gap-2">
              <button
                onClick={exportVault}
                className="flex-1 flex items-center gap-2 text-sm py-1.5 transition-colors"
                style={{ color: "var(--text-secondary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
              >
                <FiPackage size={14} />
                Export vault
                <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                  ({notes.length} notes)
                </span>
                {exported === "json" && <FiCheck size={13} className="text-green-500" />}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowBatchMenu(!showBatchMenu)}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md"
                  style={{
                    color: "var(--text-tertiary)",
                    backgroundColor: "var(--bg-panel-inset)",
                    border: "1px solid var(--border-dark)",
                  }}
                >
                  {batchFormat.toUpperCase()} <FiChevronDown size={9} />
                </button>
                {showBatchMenu && (
                  <div
                    className="absolute bottom-full right-0 mb-1 rounded-xl overflow-hidden z-50 py-1"
                    style={{
                      backgroundColor: "var(--bg-panel)",
                      border: "1px solid var(--border-mid)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                  >
                    {(["markdown", "html", "latex", "txt", "json"] as ExportFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => { setBatchFormat(fmt); setShowBatchMenu(false) }}
                        className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                        style={{ color: fmt === batchFormat ? "var(--text-primary)" : "var(--text-tertiary)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-panel-inset)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="m-0">
            <div className="py-2">
              {/* Import Markdown */}
              <label className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-panel-inset group">
                <input
                  type="file"
                  multiple
                  accept=".md"
                  className="hidden"
                  onChange={handleImportMarkdown}
                />
                <span style={{ color: "var(--text-tertiary)" }}>
                  <FiFilePlus size={14} className="group-hover:text-primary transition-colors" />
                </span>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>Import Markdown</div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Select .md files</div>
                </div>
                {imported && imported > 0 && <FiCheck size={13} className="text-green-500 shrink-0" />}
              </label>

              {/* Import Vault */}
              <label className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-panel-inset group">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportVault}
                />
                <span style={{ color: "var(--text-tertiary)" }}>
                  <FiUpload size={14} className="group-hover:text-primary transition-colors" />
                </span>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>Import Tesserin Vault</div>
                  <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Select .json backup</div>
                </div>
                {imported && imported > 0 && <FiCheck size={13} className="text-green-500 shrink-0" />}
              </label>

              {imported && (
                <div className="px-4 py-2 text-[11px] text-green-500 bg-green-500/10 mx-4 my-2 rounded-lg flex items-center gap-2">
                  <FiCheck size={12} />
                  Successfully imported {imported} {imported === 1 ? "note" : "notes"}
                </div>
              )}
            </div>
            
            <div className="px-4 py-4 text-center">
              <div 
                className={`border-2 border-dashed rounded-xl p-6 transition-all border-mid group ${isDragging ? "border-primary bg-primary/5 scale-[0.98]" : "hover:border-primary"}`}
                style={{ borderColor: isDragging ? "var(--gold)" : "var(--border-dark)" }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <FiUpload size={24} className={`mx-auto mb-2 transition-colors ${isDragging ? "text-primary opacity-100" : "text-tertiary opacity-40 group-hover:text-primary"}`} />
                <p className="text-xs" style={{ color: isDragging ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                  {isDragging ? "Drop to import" : "Drag and drop files here to import"}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer hint */}
        <div
          className="px-4 py-2 text-[10px] border-t"
          style={{ borderColor: "var(--border-dark)", color: "var(--text-tertiary)" }}
        >
          Esc to close · PDF uses browser print dialog
        </div>
      </div>
    </div>
  )
}
