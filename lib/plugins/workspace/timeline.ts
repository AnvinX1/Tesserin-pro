import React from "react"
import { FiClock } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const LazyTimelineView = React.lazy(() =>
  import("@/components/tesserin/workspace/timeline-view").then((m) => ({ default: m.TimelineView }))
)

function TimelinePanel() {
  return React.createElement(
    React.Suspense,
    { fallback: React.createElement("div", {
        className: "flex items-center justify-center h-full",
        style: { color: "var(--text-tertiary)" },
      }, "Loading Timeline…") },
    React.createElement(LazyTimelineView)
  )
}

const timelinePlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.timeline",
    name: "Timeline",
    version: "1.0.0",
    description: "Browse your notes chronologically and track writing activity.",
    author: "Tesserin",
    icon: React.createElement(FiClock, { size: 16 }),
  },

  activate(api: TesserinPluginAPI) {
    api.registerPanel({
      id: "timeline",
      label: "Timeline",
      icon: React.createElement(FiClock, { size: 18 }),
      component: TimelinePanel,
      location: "workspace",
    })

    api.registerCommand({
      id: "open-timeline",
      label: "Open Timeline",
      category: "Navigation",
      execute() {
        api.ui.navigateToTab("timeline")
      },
    })
  },
}

export default timelinePlugin
