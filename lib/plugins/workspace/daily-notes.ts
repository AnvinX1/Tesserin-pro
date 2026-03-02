import React from "react"
import { FiCalendar } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const LazyDailyNotes = React.lazy(() =>
  import("@/components/tesserin/workspace/daily-notes").then((m) => ({ default: m.DailyNotes }))
)

function DailyNotesPanel() {
  return React.createElement(
    React.Suspense,
    { fallback: React.createElement("div", {
        className: "flex items-center justify-center h-full",
        style: { color: "var(--text-tertiary)" },
      }, "Loading Daily Notes…") },
    React.createElement(LazyDailyNotes)
  )
}

const dailyNotesPlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.daily-notes",
    name: "Daily Notes",
    version: "1.0.0",
    description: "Journaling with templates — auto-creates a note for each day.",
    author: "Tesserin",
    icon: React.createElement(FiCalendar, { size: 16 }),
  },

  activate(api: TesserinPluginAPI) {
    api.registerPanel({
      id: "daily",
      label: "Daily",
      icon: React.createElement(FiCalendar, { size: 18 }),
      component: DailyNotesPanel,
      location: "workspace",
    })

    api.registerCommand({
      id: "open-daily-notes",
      label: "Open Daily Notes",
      category: "Navigation",
      execute() {
        api.ui.navigateToTab("daily")
      },
    })
  },
}

export default dailyNotesPlugin
