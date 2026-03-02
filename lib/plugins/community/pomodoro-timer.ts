import React from "react"
import { FiClock, FiPlay, FiPause, FiRotateCcw } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const pomodoroPlugin: TesserinPlugin = {
  manifest: {
    id: "community.pomodoro-timer",
    name: "Pomodoro Timer",
    version: "1.0.0",
    description: "Focus timer with 25/5 intervals and session tracking in the status bar.",
    author: "Community",
    icon: React.createElement(FiClock, { size: 16 }),
    permissions: ["ui:notify", "commands", "panels", "settings:read", "settings:write"],
  },

  activate(api: TesserinPluginAPI) {
    let seconds = 25 * 60
    let isRunning = false
    let isBreak = false
    let sessions = parseInt(api.settings.get("pomodoro:sessions") || "0")
    let interval: ReturnType<typeof setInterval> | null = null
    let listeners: Array<() => void> = []

    const notify = () => listeners.forEach(fn => fn())
    const subscribe = (fn: () => void) => { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn) } }

    function tick() {
      if (seconds <= 0) {
        if (interval) clearInterval(interval)
        interval = null
        isRunning = false
        if (!isBreak) {
          sessions++
          api.settings.set("pomodoro:sessions", String(sessions))
          api.ui.showNotice(`🍅 Pomodoro #${sessions} complete! Take a break.`)
          isBreak = true
          seconds = 5 * 60
        } else {
          api.ui.showNotice("Break over! Ready for another pomodoro.")
          isBreak = false
          seconds = 25 * 60
        }
        notify()
        return
      }
      seconds--
      notify()
    }

    function start() {
      if (isRunning) return
      isRunning = true
      interval = setInterval(tick, 1000)
      notify()
    }

    function pause() {
      if (!isRunning) return
      isRunning = false
      if (interval) clearInterval(interval)
      interval = null
      notify()
    }

    function reset() {
      pause()
      isBreak = false
      seconds = 25 * 60
      notify()
    }

    api.registerStatusBarWidget({
      id: "pomodoro",
      align: "right",
      priority: 5,
      component: function PomodoroWidget() {
        const [, setTick] = React.useState(0)
        React.useEffect(() => subscribe(() => setTick(t => t + 1)), [])

        const min = Math.floor(seconds / 60)
        const sec = seconds % 60
        const display = `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`

        return React.createElement("div", {
          className: "flex items-center gap-2 text-[11px]",
          style: { color: isBreak ? "#22c55e" : "var(--text-tertiary)" },
        },
          React.createElement("span", null, isBreak ? "☕" : "🍅"),
          React.createElement("span", { className: "font-mono" }, display),
          React.createElement("button", {
            onClick: isRunning ? pause : start,
            className: "hover:brightness-125 transition-all",
            style: { color: "var(--accent-primary)" },
          }, React.createElement(isRunning ? FiPause : FiPlay, { size: 10 })),
          React.createElement("button", {
            onClick: reset,
            className: "hover:brightness-125 transition-all",
            style: { color: "var(--text-tertiary)" },
          }, React.createElement(FiRotateCcw, { size: 10 })),
          React.createElement("span", {
            className: "text-[9px]",
            style: { color: "var(--text-tertiary)", opacity: 0.6 },
          }, `#${sessions}`),
        )
      },
    })

    api.registerCommand({
      id: "pomodoro-start",
      label: "Start Pomodoro",
      category: "Focus",
      execute: start,
    })

    api.registerCommand({
      id: "pomodoro-reset",
      label: "Reset Pomodoro",
      category: "Focus",
      execute: reset,
    })
  },
}

export default pomodoroPlugin
