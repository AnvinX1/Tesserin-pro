/**
 * Community Plugins — backward-compatible re-export
 *
 * The real implementation now lives in lib/plugins/community/.
 * This file exists so existing imports keep working.
 */

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
  COMMUNITY_PLUGINS,
} from "./plugins/community"
