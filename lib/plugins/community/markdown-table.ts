import React from "react"
import { FiGrid } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const markdownTablePlugin: TesserinPlugin = {
  manifest: {
    id: "community.markdown-table",
    name: "Markdown Table Editor",
    version: "1.0.0",
    description: "Generate and format markdown tables with a visual builder.",
    author: "Community",
    icon: React.createElement(FiGrid, { size: 16 }),
    permissions: ["ui:notify", "commands", "vault:read"],
  },

  activate(api: TesserinPluginAPI) {
    api.registerCommand({
      id: "insert-table",
      label: "Insert Markdown Table",
      category: "Editor",
      execute() {
        const dims = prompt("Table dimensions (e.g. 3x4 for 3 columns, 4 rows):")
        if (!dims) return
        const match = dims.match(/^(\d+)\s*[xX×]\s*(\d+)$/)
        if (!match) { api.ui.showNotice("Invalid format. Use: 3x4"); return }
        const [, cols, rows] = match.map(Number)
        if (cols < 1 || cols > 20 || rows < 1 || rows > 100) {
          api.ui.showNotice("Table too large. Max 20 columns, 100 rows.")
          return
        }

        const header = "| " + Array(cols).fill("Header").map((h, i) => `${h} ${i + 1}`).join(" | ") + " |"
        const separator = "| " + Array(cols).fill("---").join(" | ") + " |"
        const dataRows = Array(rows).fill("| " + Array(cols).fill("   ").join(" | ") + " |").join("\n")
        const table = `\n${header}\n${separator}\n${dataRows}\n`

        navigator.clipboard.writeText(table).then(() => {
          api.ui.showNotice(`${cols}×${rows} table copied to clipboard. Paste it into your note.`)
        })
      },
    })

    api.registerCommand({
      id: "format-table",
      label: "Format Table from CSV",
      category: "Editor",
      execute() {
        const csv = prompt("Paste CSV data (first row = headers):")
        if (!csv) return
        const lines = csv.trim().split("\n").map(l => l.split(",").map(c => c.trim()))
        if (lines.length < 2) { api.ui.showNotice("Need at least a header + one data row"); return }

        const colWidths = lines[0].map((_, ci) => Math.max(...lines.map(l => (l[ci] || "").length)))
        const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length))

        const header = "| " + lines[0].map((h, i) => pad(h, colWidths[i])).join(" | ") + " |"
        const sep = "| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |"
        const rows = lines.slice(1).map(r => "| " + r.map((c, i) => pad(c || "", colWidths[i])).join(" | ") + " |")
        const table = `\n${header}\n${sep}\n${rows.join("\n")}\n`

        navigator.clipboard.writeText(table).then(() => {
          api.ui.showNotice("Formatted table copied to clipboard!")
        })
      },
    })
  },
}

export default markdownTablePlugin
