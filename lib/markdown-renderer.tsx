"use client"

import React from "react"

/* ------------------------------------------------------------------ */
/*  Shared Markdown → React renderer                                    */
/* ------------------------------------------------------------------ */

/**
 * Render a Markdown string into themed React elements with support for:
 *
 * - Headings (h1-h6)
 * - Bold, italic, strikethrough, inline code
 * - Fenced code blocks with language hint
 * - Blockquotes (nested)
 * - Ordered and unordered lists (including nested via indent)
 * - Horizontal rules
 * - Tables (GFM-style)
 * - `[[Wiki Links]]` as clickable references (optional)
 * - Task lists (`- [ ]` / `- [x]`)
 *
 * @param markdown       Raw Markdown source.
 * @param options        Optional overrides.
 */
export function renderMarkdown(
  markdown: string,
  options?: {
    /** Set of existing note titles (lower-cased) for wiki-link styling. */
    existingTitles?: Set<string>
    /** Callback when a wiki-link is clicked. */
    onLinkClick?: (title: string) => void
    /** Base text size class (default: "text-xs") */
    textSize?: string
  },
): React.ReactNode {
  const existingTitles = options?.existingTitles ?? new Set<string>()
  const onLinkClick = options?.onLinkClick
  const textSize = options?.textSize ?? "text-xs"

  const lines = markdown.split("\n")
  const elements: React.ReactNode[] = []
  let i = 0
  let key = 0

  /** Parse inline formatting within a single line */
  function parseInline(text: string): React.ReactNode[] {
    const parts: React.ReactNode[] = []
    let remaining = text
    let inlineKey = 0

    while (remaining.length > 0) {
      // Wiki link
      const wikiMatch = remaining.match(/^\[\[([^\]]+)\]\]/)
      if (wikiMatch) {
        const title = wikiMatch[1].trim()
        const exists = existingTitles.has(title.toLowerCase())
        if (onLinkClick) {
          parts.push(
            <button
              key={`wiki-${inlineKey++}`}
              onClick={(e) => {
                e.preventDefault()
                onLinkClick(title)
              }}
              className="inline font-semibold cursor-pointer transition-colors duration-150"
              style={{
                color: "var(--accent-primary)",
                textDecoration: "underline",
                textDecorationStyle: exists ? "solid" : ("dashed" as any),
                textDecorationColor: "var(--accent-primary)",
                textUnderlineOffset: "3px",
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
              }}
              title={exists ? `Open "${title}"` : `Create "${title}"`}
            >
              {title}
            </button>,
          )
        } else {
          parts.push(
            <span
              key={`wiki-${inlineKey++}`}
              className="font-semibold"
              style={{ color: "var(--accent-primary)" }}
            >
              [[{title}]]
            </span>,
          )
        }
        remaining = remaining.slice(wikiMatch[0].length)
        continue
      }

      // Inline code
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        parts.push(
          <code
            key={`code-${inlineKey++}`}
            className="px-1.5 py-0.5 rounded font-mono"
            style={{
              backgroundColor: "var(--code-bg)",
              color: "var(--accent-primary)",
              border: "1px solid var(--border-dark)",
              fontSize: "0.85em",
            }}
          >
            {codeMatch[1]}
          </code>,
        )
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // Bold
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/)
      if (boldMatch) {
        parts.push(
          <strong key={`b-${inlineKey++}`} style={{ color: "var(--text-primary)" }}>
            {boldMatch[1]}
          </strong>,
        )
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Italic
      const italicMatch = remaining.match(/^\*(.+?)\*/)
      if (italicMatch) {
        parts.push(<em key={`i-${inlineKey++}`}>{italicMatch[1]}</em>)
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Strikethrough
      const strikeMatch = remaining.match(/^~~(.+?)~~/)
      if (strikeMatch) {
        parts.push(
          <del key={`s-${inlineKey++}`} style={{ opacity: 0.6 }}>
            {strikeMatch[1]}
          </del>,
        )
        remaining = remaining.slice(strikeMatch[0].length)
        continue
      }

      // Normal character
      parts.push(remaining[0])
      remaining = remaining.slice(1)
    }

    return parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      elements.push(
        <div key={key++} className="my-2 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-dark)" }}>
          {lang && (
            <div
              className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider border-b"
              style={{
                backgroundColor: "var(--bg-panel-inset)",
                borderColor: "var(--border-dark)",
                color: "var(--text-tertiary)",
              }}
            >
              {lang}
            </div>
          )}
          <pre
            className={`p-3 overflow-x-auto ${textSize} font-mono leading-relaxed custom-scrollbar`}
            style={{ backgroundColor: "var(--code-bg)", color: "var(--text-primary)" }}
          >
            <code>{codeLines.join("\n")}</code>
          </pre>
        </div>,
      )
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(
        <hr
          key={key++}
          className="my-4"
          style={{ borderColor: "var(--border-dark)", opacity: 0.3 }}
        />,
      )
      i++
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2]
      const sizes: Record<number, string> = {
        1: "text-xl font-bold mt-4 mb-2",
        2: "text-lg font-bold mt-3 mb-1.5",
        3: "text-base font-semibold mt-3 mb-1",
        4: "text-sm font-semibold mt-2 mb-1",
        5: "text-xs font-semibold mt-2 mb-1",
        6: "text-xs font-semibold mt-2 mb-1 uppercase tracking-wider",
      }
      const Tag = `h${level}` as React.ElementType
      elements.push(
        <Tag
          key={key++}
          className={`${sizes[level]} leading-tight`}
          style={{ color: "var(--text-primary)" }}
        >
          {parseInline(text)}
        </Tag>,
      )
      i++
      continue
    }

    // Blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      elements.push(
        <blockquote
          key={key++}
          className="my-2 pl-3 py-1.5 italic leading-relaxed"
          style={{
            borderLeft: "3px solid var(--accent-primary)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-panel-inset)",
            borderRadius: "0 8px 8px 0",
            fontSize: "inherit",
          }}
        >
          {quoteLines.map((ql, qi) => (
            <span key={qi}>
              {parseInline(ql)}
              {qi < quoteLines.length - 1 && <br />}
            </span>
          ))}
        </blockquote>,
      )
      continue
    }

    // Table (GFM)
    if (line.includes("|") && i + 1 < lines.length && /^\|?\s*[-:]+/.test(lines[i + 1])) {
      const headerCells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
      i++ // skip separator
      i++
      const rows: string[][] = []
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(
          lines[i]
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean),
        )
        i++
      }
      elements.push(
        <div key={key++} className="my-2 overflow-x-auto rounded-xl" style={{ border: "1px solid var(--border-dark)" }}>
          <table className={`w-full ${textSize}`}>
            <thead>
              <tr style={{ backgroundColor: "var(--bg-panel-inset)" }}>
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-3 py-1.5 text-left font-semibold border-b"
                    style={{ borderColor: "var(--border-dark)", color: "var(--text-primary)" }}
                  >
                    {parseInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: "1px solid var(--border-dark)" }}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    // Task list items
    const taskMatch = line.match(/^[-*]\s\[([ xX])\]\s(.+)/)
    if (taskMatch) {
      const checked = taskMatch[1] !== " "
      const taskText = taskMatch[2]
      elements.push(
        <div key={key++} className="flex items-start gap-2 my-0.5 ml-1">
          <span
            className="mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
            style={{
              borderColor: checked ? "var(--accent-primary)" : "var(--text-tertiary)",
              backgroundColor: checked ? "var(--accent-primary)" : "transparent",
              color: checked ? "var(--text-on-accent)" : "transparent",
              fontSize: "9px",
              fontWeight: 700,
            }}
          >
            {checked ? "✓" : ""}
          </span>
          <span
            className="leading-relaxed"
            style={{
              color: "var(--text-secondary)",
              textDecoration: checked ? "line-through" : "none",
              opacity: checked ? 0.6 : 1,
            }}
          >
            {parseInline(taskText)}
          </span>
        </div>,
      )
      i++
      continue
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""))
        i++
      }
      elements.push(
        <ul key={key++} className="my-1.5 ml-4 list-disc" style={{ color: "var(--text-secondary)" }}>
          {items.map((item, ii) => (
            <li key={ii} className="py-0.5 leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ul>,
      )
      continue
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""))
        i++
      }
      elements.push(
        <ol key={key++} className="my-1.5 ml-4 list-decimal" style={{ color: "var(--text-secondary)" }}>
          {items.map((item, ii) => (
            <li key={ii} className="py-0.5 leading-relaxed">
              {parseInline(item)}
            </li>
          ))}
        </ol>,
      )
      continue
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />)
      i++
      continue
    }

    // Paragraph
    elements.push(
      <p
        key={key++}
        className="my-1 leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        {parseInline(line)}
      </p>,
    )
    i++
  }

  return elements
}
