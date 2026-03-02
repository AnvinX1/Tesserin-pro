import React from "react"
import { FiRepeat } from "react-icons/fi"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const spacedRepetitionPlugin: TesserinPlugin = {
  manifest: {
    id: "community.spaced-repetition",
    name: "Spaced Repetition",
    version: "1.0.0",
    description: "SM-2 flashcard system — generate flashcards from your notes and review them.",
    author: "Community",
    icon: React.createElement(FiRepeat, { size: 16 }),
    permissions: ["vault:read", "ui:notify", "commands", "settings:read", "settings:write", "panels"],
  },

  activate(api: TesserinPluginAPI) {
    interface Flashcard {
      id: string; front: string; back: string; noteId: string;
      interval: number; repetition: number; easeFactor: number; nextReview: string
    }

    function getCards(): Flashcard[] {
      try { return JSON.parse(api.settings.get("sr:cards") || "[]") } catch { return [] }
    }
    function saveCards(cards: Flashcard[]) {
      api.settings.set("sr:cards", JSON.stringify(cards))
    }

    function sm2(card: Flashcard, quality: number): Flashcard {
      let { interval, repetition, easeFactor } = card
      if (quality >= 3) {
        if (repetition === 0) interval = 1
        else if (repetition === 1) interval = 6
        else interval = Math.round(interval * easeFactor)
        repetition++
      } else {
        repetition = 0
        interval = 1
      }
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
      const next = new Date()
      next.setDate(next.getDate() + interval)
      return { ...card, interval, repetition, easeFactor, nextReview: next.toISOString() }
    }

    api.registerCommand({
      id: "generate-flashcards",
      label: "Generate Flashcards from Current Note",
      category: "Spaced Repetition",
      execute() {
        const note = api.vault.getSelected()
        if (!note) { api.ui.showNotice("No note selected"); return }

        const lines = note.content.split("\n")
        const cards = getCards()
        let added = 0

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim()
          const boldMatch = line.match(/^\*\*(.+?)\*\*[\s:—\-]+(.+)/)
          if (boldMatch) {
            cards.push({
              id: `sr-${Date.now()}-${i}`, front: boldMatch[1], back: boldMatch[2],
              noteId: note.id, interval: 0, repetition: 0, easeFactor: 2.5,
              nextReview: new Date().toISOString()
            })
            added++
          }
        }

        saveCards(cards)
        api.ui.showNotice(added > 0 ? `Created ${added} flashcards from "${note.title}"` : "No flashcard patterns found. Use **Term** — Definition format.")
      },
    })

    api.registerCommand({
      id: "review-flashcards",
      label: "Review Due Flashcards",
      category: "Spaced Repetition",
      execute() {
        const cards = getCards()
        const now = new Date()
        const due = cards.filter(c => new Date(c.nextReview) <= now)
        if (due.length === 0) {
          api.ui.showNotice("No flashcards due for review! 🎉")
          return
        }
        const card = due[0]
        const answer = prompt(`FRONT: ${card.front}\n\n(Think of the answer, then rate 0-5)\n0=forgot, 3=hard, 5=easy`)
        if (answer === null) return
        const quality = Math.min(5, Math.max(0, parseInt(answer) || 0))
        const updated = sm2(card, quality)
        const all = getCards().map(c => c.id === updated.id ? updated : c)
        saveCards(all)
        api.ui.showNotice(`BACK: ${card.back}\n\nRated ${quality}/5. Next review in ${updated.interval} day(s). ${due.length - 1} cards remaining.`)
      },
    })

    api.registerStatusBarWidget({
      id: "sr-due-count",
      align: "right",
      priority: 25,
      component: function SRWidget() {
        const cards = getCards()
        const due = cards.filter(c => new Date(c.nextReview) <= new Date()).length
        if (due === 0 && cards.length === 0) return null
        return React.createElement("span", {
          className: "text-[10px]",
          style: { color: due > 0 ? "var(--accent-primary)" : "var(--text-tertiary)" },
          title: "Flashcards due for review",
        }, `🧠 ${due} due`)
      },
    })
  },
}

export default spacedRepetitionPlugin
