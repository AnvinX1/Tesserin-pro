import React from "react"
import { FiHash } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const zettelkastenPlugin: TesserinPlugin = {
  manifest: {
    id: "community.zettelkasten-id",
    name: "Zettelkasten ID Generator",
    version: "1.0.0",
    description: "Auto-generate unique Zettelkasten-style timestamp IDs for notes.",
    author: "Community",
    icon: React.createElement(FiHash, { size: 16 }),
    permissions: ["vault:read", "vault:write", "ui:notify", "commands"],
  },

  activate(api: TesserinPluginAPI) {
    function generateZettelId(): string {
      const now = new Date()
      return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
      ].join("")
    }

    api.registerCommand({
      id: "create-zettel",
      label: "Create Zettelkasten Note",
      category: "Zettelkasten",
      execute() {
        const id = generateZettelId()
        const title = prompt(`Zettelkasten note title (ID: ${id}):`)
        if (!title) return
        const noteId = api.vault.create(`${id} ${title}`, `---\nzettel-id: ${id}\ncreated: ${new Date().toISOString()}\ntags: []\n---\n\n# ${title}\n\n`)
        api.ui.showNotice(`Created zettel: ${id} ${title}`)
      },
    })

    api.registerCommand({
      id: "insert-zettel-id",
      label: "Copy Zettelkasten ID to Clipboard",
      category: "Zettelkasten",
      execute() {
        const id = generateZettelId()
        navigator.clipboard.writeText(id).then(() => {
          api.ui.showNotice(`Copied Zettel ID: ${id}`)
        })
      },
    })
  },
}

export default zettelkastenPlugin
