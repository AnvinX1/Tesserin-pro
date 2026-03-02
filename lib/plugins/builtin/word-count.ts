import React from "react"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const wordCountPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.word-count",
    name: "Word Count",
    version: "1.0.0",
    description: "Shows live word, character, and reading time stats in the status bar.",
    author: "Tesserin",
  },

  activate(api: TesserinPluginAPI) {
    api.registerStatusBarWidget({
      id: "word-count",
      align: "right",
      priority: 10,
      component: function WordCountWidget() {
        const note = api.vault.getSelected()
        if (!note) return null

        const text = note.content.replace(/^#.*$/gm, "").trim()
        const words = text.split(/\s+/).filter(Boolean).length
        const chars = text.length
        const readMin = Math.max(1, Math.ceil(words / 200))

        return React.createElement("div", {
          className: "flex items-center gap-3 text-[11px]",
          style: { color: "var(--text-tertiary)" },
        },
          React.createElement("span", null, `${words} words`),
          React.createElement("span", { style: { opacity: 0.3 } }, "·"),
          React.createElement("span", null, `${chars} chars`),
          React.createElement("span", { style: { opacity: 0.3 } }, "·"),
          React.createElement("span", null, `${readMin} min read`),
        )
      },
    })

    api.registerCommand({
      id: "show-word-count",
      label: "Show Word Count",
      category: "Editor",
      execute() {
        const note = api.vault.getSelected()
        if (!note) {
          api.ui.showNotice("No note selected")
          return
        }
        const words = note.content.split(/\s+/).filter(Boolean).length
        api.ui.showNotice(`${words} words in "${note.title}"`)
      },
    })
  },
}

export default wordCountPlugin
