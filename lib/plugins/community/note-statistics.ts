import React from "react"
import { FiBarChart2 } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const noteStatsPlugin: TesserinPlugin = {
  manifest: {
    id: "community.note-statistics",
    name: "Note Statistics",
    version: "1.0.0",
    description: "Analytics dashboard — writing frequency, word distribution, and note growth.",
    author: "Community",
    icon: React.createElement(FiBarChart2, { size: 16 }),
    permissions: ["vault:read", "ui:notify", "commands"],
  },

  activate(api: TesserinPluginAPI) {
    api.registerCommand({
      id: "show-vault-stats",
      label: "Show Vault Statistics",
      category: "Analytics",
      execute() {
        const notes = api.vault.list()
        const totalWords = notes.reduce((acc, n) => acc + n.content.split(/\s+/).filter(Boolean).length, 0)
        const totalChars = notes.reduce((acc, n) => acc + n.content.length, 0)
        const avgWords = notes.length > 0 ? Math.round(totalWords / notes.length) : 0
        const longest = notes.reduce((max, n) => {
          const wc = n.content.split(/\s+/).filter(Boolean).length
          return wc > max.count ? { title: n.title, count: wc } : max
        }, { title: "", count: 0 })

        const linkRegex = /\[\[([^\]]+)\]\]/g
        let totalLinks = 0
        for (const n of notes) {
          const matches = n.content.match(linkRegex)
          totalLinks += matches?.length || 0
        }

        const tagRegex = /#[\w-]+/g
        let totalTags = 0
        const tagCounts = new Map<string, number>()
        for (const n of notes) {
          const matches = n.content.match(tagRegex) || []
          totalTags += matches.length
          matches.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
        }
        const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

        api.ui.showNotice(
          `📊 Vault Statistics\n` +
          `─────────────────\n` +
          `Notes: ${notes.length}\n` +
          `Words: ${totalWords.toLocaleString()}\n` +
          `Characters: ${totalChars.toLocaleString()}\n` +
          `Avg words/note: ${avgWords}\n` +
          `Wiki-links: ${totalLinks}\n` +
          `Hashtags: ${totalTags}\n` +
          `${longest.title ? `Longest: "${longest.title}" (${longest.count} words)` : ""}\n` +
          `${topTags.length > 0 ? `Top tags: ${topTags.map(([t, c]) => `${t}(${c})`).join(", ")}` : ""}`
        )
      },
    })

    api.registerCommand({
      id: "show-note-details",
      label: "Show Current Note Details",
      category: "Analytics",
      execute() {
        const note = api.vault.getSelected()
        if (!note) { api.ui.showNotice("No note selected"); return }

        const text = note.content
        const words = text.split(/\s+/).filter(Boolean).length
        const chars = text.length
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
        const links = (text.match(/\[\[([^\]]+)\]\]/g) || []).length
        const headers = (text.match(/^#{1,6}\s/gm) || []).length
        const codeBlocks = (text.match(/```/g) || []).length / 2
        const readTime = Math.max(1, Math.ceil(words / 200))

        api.ui.showNotice(
          `📝 "${note.title}"\n` +
          `Words: ${words} · Chars: ${chars}\n` +
          `Sentences: ${sentences} · Paragraphs: ${paragraphs}\n` +
          `Headers: ${headers} · Links: ${links} · Code blocks: ${Math.floor(codeBlocks)}\n` +
          `Reading time: ~${readTime} min`
        )
      },
    })
  },
}

export default noteStatsPlugin
