import React from "react"
import { FiBookmark } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const citationPlugin: TesserinPlugin = {
  manifest: {
    id: "community.citation-manager",
    name: "Citation Manager",
    version: "1.0.0",
    description: "Import BibTeX/DOI references and auto-format citations in your notes.",
    author: "Community",
    icon: React.createElement(FiBookmark, { size: 16 }),
    permissions: ["ui:notify", "commands", "settings:read", "settings:write", "vault:read", "panels"],
  },

  activate(api: TesserinPluginAPI) {
    interface Citation {
      id: string; key: string; type: string; title: string;
      authors: string[]; year: string; journal?: string; doi?: string; url?: string
    }

    function getCitations(): Citation[] {
      try { return JSON.parse(api.settings.get("citations:library") || "[]") } catch { return [] }
    }
    function saveCitations(cites: Citation[]) {
      api.settings.set("citations:library", JSON.stringify(cites))
    }

    function parseBibtex(bib: string): Partial<Citation> {
      const type = bib.match(/@(\w+)\{/)?.[1] || "misc"
      const key = bib.match(/@\w+\{([^,]+)/)?.[1]?.trim() || ""
      const getField = (name: string) => {
        const m = bib.match(new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`))
        return m?.[1]?.trim() || ""
      }
      return {
        type, key, title: getField("title"),
        authors: getField("author").split(" and ").map(a => a.trim()).filter(Boolean),
        year: getField("year"), journal: getField("journal"),
        doi: getField("doi"), url: getField("url"),
      }
    }

    api.registerCommand({
      id: "add-citation-bibtex",
      label: "Add Citation (BibTeX)",
      category: "Citations",
      execute() {
        const bib = prompt("Paste BibTeX entry:")
        if (!bib) return
        const parsed = parseBibtex(bib)
        if (!parsed.title) { api.ui.showNotice("Could not parse BibTeX entry"); return }
        const cites = getCitations()
        cites.push({
          id: `cite-${Date.now()}`, key: parsed.key || `ref${cites.length + 1}`,
          type: parsed.type || "misc", title: parsed.title,
          authors: parsed.authors || [], year: parsed.year || "",
          journal: parsed.journal, doi: parsed.doi, url: parsed.url,
        })
        saveCitations(cites)
        api.ui.showNotice(`Added citation: ${parsed.title}`)
      },
    })

    api.registerCommand({
      id: "list-citations",
      label: "List All Citations",
      category: "Citations",
      execute() {
        const cites = getCitations()
        if (cites.length === 0) { api.ui.showNotice("No citations in library. Use 'Add Citation (BibTeX)' to add."); return }
        const list = cites.map(c => `[@${c.key}] ${c.authors.join(", ")} (${c.year}) — "${c.title}"`).join("\n")
        api.ui.showNotice(`📖 ${cites.length} citations:\n${list.substring(0, 300)}${list.length > 300 ? "…" : ""}`)
      },
    })

    api.registerCommand({
      id: "format-citation",
      label: "Insert Formatted Citation",
      category: "Citations",
      execute() {
        const cites = getCitations()
        if (cites.length === 0) { api.ui.showNotice("No citations available"); return }
        const key = prompt(`Enter citation key:\nAvailable: ${cites.map(c => c.key).join(", ")}`)
        if (!key) return
        const cite = cites.find(c => c.key === key)
        if (!cite) { api.ui.showNotice(`Citation not found: ${key}`); return }
        const formatted = `${cite.authors.join(", ")} (${cite.year}). *${cite.title}*${cite.journal ? `. ${cite.journal}` : ""}${cite.doi ? `. doi:${cite.doi}` : ""}`
        navigator.clipboard.writeText(formatted).then(() => {
          api.ui.showNotice(`Copied formatted citation for [@${key}]`)
        })
      },
    })

    api.registerStatusBarWidget({
      id: "citation-count",
      align: "right",
      priority: 30,
      component: function CitationWidget() {
        const count = getCitations().length
        if (count === 0) return null
        return React.createElement("span", {
          className: "text-[10px]",
          style: { color: "var(--text-tertiary)" },
        }, `📖 ${count} refs`)
      },
    })
  },
}

export default citationPlugin
