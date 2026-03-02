import React from "react"
import { FiCheckSquare } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const habitTrackerPlugin: TesserinPlugin = {
  manifest: {
    id: "community.habit-tracker",
    name: "Habit Tracker",
    version: "1.0.0",
    description: "Daily habit logging with streak tracking and visualization.",
    author: "Community",
    icon: React.createElement(FiCheckSquare, { size: 16 }),
    permissions: ["ui:notify", "commands", "settings:read", "settings:write", "panels"],
  },

  activate(api: TesserinPluginAPI) {
    interface Habit { id: string; name: string; emoji: string; log: string[] }

    function getHabits(): Habit[] {
      try { return JSON.parse(api.settings.get("habits:list") || "[]") } catch { return [] }
    }
    function saveHabits(h: Habit[]) { api.settings.set("habits:list", JSON.stringify(h)) }

    function today() { return new Date().toISOString().split("T")[0] }

    function streakFor(habit: Habit): number {
      const sorted = [...habit.log].sort().reverse()
      if (sorted.length === 0) return 0
      let streak = 0
      const d = new Date()
      for (let i = 0; i < 365; i++) {
        const dateStr = d.toISOString().split("T")[0]
        if (sorted.includes(dateStr)) { streak++; d.setDate(d.getDate() - 1) }
        else if (i === 0) { d.setDate(d.getDate() - 1); continue }
        else break
      }
      return streak
    }

    api.registerCommand({
      id: "add-habit",
      label: "Add New Habit",
      category: "Habits",
      execute() {
        const name = prompt("Habit name:")
        if (!name) return
        const emoji = prompt("Emoji (optional):") || "✅"
        const habits = getHabits()
        habits.push({ id: `habit-${Date.now()}`, name, emoji, log: [] })
        saveHabits(habits)
        api.ui.showNotice(`Added habit: ${emoji} ${name}`)
      },
    })

    api.registerCommand({
      id: "log-habit",
      label: "Log Habit for Today",
      category: "Habits",
      execute() {
        const habits = getHabits()
        if (habits.length === 0) { api.ui.showNotice("No habits created yet."); return }
        const name = prompt(`Which habit?\n${habits.map((h, i) => `${i + 1}. ${h.emoji} ${h.name}`).join("\n")}`)
        if (!name) return
        const idx = parseInt(name) - 1
        const habit = habits[idx] || habits.find(h => h.name.toLowerCase() === name.toLowerCase())
        if (!habit) { api.ui.showNotice("Habit not found"); return }

        const t = today()
        if (habit.log.includes(t)) { api.ui.showNotice(`Already logged ${habit.emoji} ${habit.name} today!`); return }
        habit.log.push(t)
        saveHabits(habits)
        const streak = streakFor(habit)
        api.ui.showNotice(`${habit.emoji} ${habit.name} logged! 🔥 ${streak}-day streak`)
      },
    })

    api.registerStatusBarWidget({
      id: "habit-streaks",
      align: "right",
      priority: 35,
      component: function HabitWidget() {
        const habits = getHabits()
        if (habits.length === 0) return null
        const t = today()
        const doneToday = habits.filter(h => h.log.includes(t)).length
        return React.createElement("span", {
          className: "text-[10px]",
          style: { color: doneToday === habits.length ? "#22c55e" : "var(--text-tertiary)" },
          title: `${doneToday}/${habits.length} habits done today`,
        }, `✅ ${doneToday}/${habits.length}`)
      },
    })
  },
}

export default habitTrackerPlugin
