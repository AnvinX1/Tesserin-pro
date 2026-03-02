import React from "react"
import { FiBookOpen } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const readingListPlugin: TesserinPlugin = {
  manifest: {
    id: "community.reading-list",
    name: "Reading List",
    version: "1.0.0",
    description: "Bookmark manager with tags and archive — save links and articles for later.",
    author: "Community",
    icon: React.createElement(FiBookOpen, { size: 16 }),
    permissions: ["ui:notify", "commands", "settings:read", "settings:write", "panels"],
  },

  activate(api: TesserinPluginAPI) {
    interface ReadingItem {
      id: string; url: string; title: string; tags: string[];
      addedAt: string; archived: boolean; notes: string
    }

    function getItems(): ReadingItem[] {
      try { return JSON.parse(api.settings.get("readinglist:items") || "[]") } catch { return [] }
    }
    function saveItems(items: ReadingItem[]) {
      api.settings.set("readinglist:items", JSON.stringify(items))
    }

    api.registerCommand({
      id: "add-to-reading-list",
      label: "Add URL to Reading List",
      category: "Reading List",
      execute() {
        const url = prompt("Enter URL to save:")
        if (!url) return
        const title = prompt("Title (optional):") || url
        const tagsStr = prompt("Tags (comma-separated, optional):") || ""
        const tags = tagsStr.split(",").map(t => t.trim()).filter(Boolean)
        const items = getItems()
        items.unshift({
          id: `rl-${Date.now()}`, url, title, tags,
          addedAt: new Date().toISOString(), archived: false, notes: ""
        })
        saveItems(items)
        api.ui.showNotice(`Saved "${title}" to reading list`)
      },
    })

    api.registerCommand({
      id: "show-reading-list",
      label: "Show Reading List",
      category: "Reading List",
      execute() {
        const items = getItems().filter(i => !i.archived)
        if (items.length === 0) {
          api.ui.showNotice("Reading list is empty. Use 'Add URL to Reading List' to add items.")
          return
        }
        api.ui.showNotice(`📚 ${items.length} items: ${items.slice(0, 5).map(i => i.title).join(", ")}${items.length > 5 ? "…" : ""}`)
      },
    })

    api.registerStatusBarWidget({
      id: "reading-list-count",
      align: "right",
      priority: 20,
      component: function ReadingListWidget() {
        const count = getItems().filter(i => !i.archived).length
        return React.createElement("span", {
          className: "text-[10px]",
          style: { color: "var(--text-tertiary)" },
          title: "Reading List items",
        }, `📚 ${count}`)
      },
    })
  },
}

export default readingListPlugin
