import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const backlinksPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.backlinks",
    name: "Backlinks",
    version: "1.0.0",
    description: "Shows which notes link to the currently selected note via [[wiki-links]].",
    author: "Tesserin",
  },

  activate(api: TesserinPluginAPI) {
    api.registerCommand({
      id: "show-backlinks",
      label: "Show Backlinks",
      category: "Notes",
      shortcut: "Ctrl+Shift+B",
      execute() {
        const note = api.vault.getSelected()
        if (!note) {
          api.ui.showNotice("No note selected")
          return
        }

        const allNotes = api.vault.list()
        const backlinks = allNotes.filter((n) => {
          if (n.id === note.id) return false
          const regex = /\[\[([^\]]+)\]\]/g
          let match: RegExpExecArray | null
          while ((match = regex.exec(n.content)) !== null) {
            if (match[1].trim().toLowerCase() === note.title.toLowerCase()) return true
          }
          return false
        })

        if (backlinks.length === 0) {
          api.ui.showNotice(`No backlinks found for "${note.title}"`)
        } else {
          api.ui.showNotice(`${backlinks.length} backlinks: ${backlinks.map((n) => n.title).join(", ")}`)
        }
      },
    })
  },
}

export default backlinksPlugin
