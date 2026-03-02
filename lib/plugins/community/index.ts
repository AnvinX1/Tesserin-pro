import type { TesserinPlugin } from "../types"
import pomodoroPlugin from "./pomodoro-timer"
import readingListPlugin from "./reading-list"
import spacedRepetitionPlugin from "./spaced-repetition"
import zettelkastenPlugin from "./zettelkasten-id"
import citationPlugin from "./citation-manager"
import habitTrackerPlugin from "./habit-tracker"
import writingGoalsPlugin from "./writing-goals"
import markdownTablePlugin from "./markdown-table"
import noteStatsPlugin from "./note-statistics"
import voiceNotesPlugin from "./voice-notes"

export {
  pomodoroPlugin,
  readingListPlugin,
  spacedRepetitionPlugin,
  zettelkastenPlugin,
  citationPlugin,
  habitTrackerPlugin,
  writingGoalsPlugin,
  markdownTablePlugin,
  noteStatsPlugin,
  voiceNotesPlugin,
}

/** All community-contributed plugins */
export const COMMUNITY_PLUGINS: TesserinPlugin[] = [
  pomodoroPlugin,
  readingListPlugin,
  spacedRepetitionPlugin,
  zettelkastenPlugin,
  citationPlugin,
  habitTrackerPlugin,
  writingGoalsPlugin,
  markdownTablePlugin,
  noteStatsPlugin,
  voiceNotesPlugin,
]
