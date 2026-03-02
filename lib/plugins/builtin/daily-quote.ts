import React from "react"
import type { TesserinPlugin, TesserinPluginAPI } from "../types"

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Knowledge is of no value unless you put it into practice.", author: "Anton Chekhov" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "The mind is not a vessel to be filled, but a fire to be kindled.", author: "Plutarch" },
  { text: "Research is formalized curiosity. It is poking and prying with a purpose.", author: "Zora Neale Hurston" },
  { text: "Writing is thinking. To write well is to think clearly.", author: "David McCullough" },
  { text: "The art of writing is the art of discovering what you believe.", author: "Gustave Flaubert" },
  { text: "All models are wrong, but some are useful.", author: "George E.P. Box" },
  { text: "If you can't explain it simply, you don't understand it well enough.", author: "Albert Einstein" },
  { text: "The purpose of writing is to inflate weak ideas, obscure pure reasoning, and inhibit clarity.", author: "Calvin (Bill Watterson)" },
]

const dailyQuotePlugin: TesserinPlugin = {
  manifest: {
    id: "com.tesserin.daily-quote",
    name: "Daily Quote",
    version: "1.0.0",
    description: "Shows an inspirational quote for researchers in the status bar.",
    author: "Tesserin",
  },

  activate(api: TesserinPluginAPI) {
    const todayIndex = new Date().getDate() % QUOTES.length
    const quote = QUOTES[todayIndex]

    api.registerStatusBarWidget({
      id: "daily-quote",
      align: "center",
      priority: 50,
      component: function DailyQuoteWidget() {
        return React.createElement("div", {
          className: "text-[10px] italic truncate max-w-md",
          style: { color: "var(--text-tertiary)", opacity: 0.7 },
          title: `— ${quote.author}`,
        },
          `"${quote.text}" — ${quote.author}`,
        )
      },
    })
  },
}

export default dailyQuotePlugin
