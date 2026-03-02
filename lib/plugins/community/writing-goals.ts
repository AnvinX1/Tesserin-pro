import React from "react"
import { FiTarget } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const writingGoalsPlugin: TesserinPlugin = {
  manifest: {
    id: "community.writing-goals",
    name: "Writing Goals",
    version: "1.0.0",
    description: "Track daily/weekly/monthly word count targets with progress visualization.",
    author: "Community",
    icon: React.createElement(FiTarget, { size: 16 }),
    permissions: ["vault:read", "ui:notify", "commands", "settings:read", "settings:write", "panels"],
  },

  activate(api: TesserinPluginAPI) {
    function getDailyGoal(): number {
      return parseInt(api.settings.get("writing:dailyGoal") || "500")
    }

    function getTodayCount(): number {
      return parseInt(api.settings.get(`writing:count:${new Date().toISOString().split("T")[0]}`) || "0")
    }

    function recordWords(count: number) {
      const key = `writing:count:${new Date().toISOString().split("T")[0]}`
      api.settings.set(key, String(count))
    }

    let lastTotal = 0

    api.registerCommand({
      id: "set-writing-goal",
      label: "Set Daily Writing Goal",
      category: "Writing Goals",
      execute() {
        const goal = prompt(`Current goal: ${getDailyGoal()} words/day\nEnter new daily goal:`)
        if (!goal) return
        const num = parseInt(goal)
        if (isNaN(num) || num <= 0) { api.ui.showNotice("Invalid number"); return }
        api.settings.set("writing:dailyGoal", String(num))
        api.ui.showNotice(`Daily writing goal set to ${num} words`)
      },
    })

    api.registerCommand({
      id: "check-writing-progress",
      label: "Check Writing Progress",
      category: "Writing Goals",
      execute() {
        const notes = api.vault.list()
        const totalWords = notes.reduce((acc, n) => acc + n.content.split(/\s+/).filter(Boolean).length, 0)
        const todayCount = getTodayCount()
        const goal = getDailyGoal()
        const pct = Math.min(100, Math.round((todayCount / goal) * 100))
        api.ui.showNotice(`📝 Today: ${todayCount}/${goal} words (${pct}%)\nTotal vault: ${totalWords.toLocaleString()} words`)
      },
    })

    api.registerCommand({
      id: "log-writing-session",
      label: "Log Writing Session",
      category: "Writing Goals",
      execute() {
        const words = prompt("How many words did you write this session?")
        if (!words) return
        const num = parseInt(words)
        if (isNaN(num) || num <= 0) { api.ui.showNotice("Invalid number"); return }
        const current = getTodayCount()
        recordWords(current + num)
        const goal = getDailyGoal()
        const total = current + num
        const pct = Math.min(100, Math.round((total / goal) * 100))
        api.ui.showNotice(`Added ${num} words. Today: ${total}/${goal} (${pct}%)${total >= goal ? " 🎉 Goal reached!" : ""}`)
      },
    })

    api.registerStatusBarWidget({
      id: "writing-progress",
      align: "right",
      priority: 15,
      component: function WritingGoalWidget() {
        const todayCount = getTodayCount()
        const goal = getDailyGoal()
        const pct = Math.min(100, Math.round((todayCount / goal) * 100))

        return React.createElement("div", {
          className: "flex items-center gap-2 text-[10px]",
          style: { color: pct >= 100 ? "#22c55e" : "var(--text-tertiary)" },
          title: `Writing goal: ${todayCount}/${goal} words`,
        },
          React.createElement("span", null, "✍️"),
          React.createElement("div", {
            className: "w-12 h-1.5 rounded-full overflow-hidden",
            style: { backgroundColor: "var(--bg-panel-inset)" },
          },
            React.createElement("div", {
              className: "h-full rounded-full transition-all",
              style: {
                width: `${pct}%`,
                backgroundColor: pct >= 100 ? "#22c55e" : "var(--accent-primary)",
              },
            }),
          ),
          React.createElement("span", null, `${pct}%`),
        )
      },
    })
  },
}

export default writingGoalsPlugin
