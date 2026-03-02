import React from "react"
import { FiGrid } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const LazyKanbanView = React.lazy(() =>
  import("@/components/tesserin/workspace/kanban-view").then((m) => ({ default: m.KanbanView }))
)

function KanbanPanel() {
  return React.createElement(
    React.Suspense,
    { fallback: React.createElement("div", {
        className: "flex items-center justify-center h-full",
        style: { color: "var(--text-tertiary)" },
      }, "Loading Kanban…") },
    React.createElement(LazyKanbanView)
  )
}

const kanbanPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.kanban",
    name: "Kanban Board",
    version: "1.0.0",
    description: "A drag-and-drop task board for visual project management.",
    author: "Tesserin",
    icon: React.createElement(FiGrid, { size: 16 }),
  },

  activate(api: TesserinPluginAPI) {
    api.registerPanel({
      id: "kanban",
      label: "Kanban",
      icon: React.createElement(FiGrid, { size: 18 }),
      component: KanbanPanel,
      location: "workspace",
    })

    api.registerCommand({
      id: "open-kanban",
      label: "Open Kanban Board",
      category: "Navigation",
      execute() {
        api.ui.navigateToTab("kanban")
      },
    })
  },
}

export default kanbanPlugin
