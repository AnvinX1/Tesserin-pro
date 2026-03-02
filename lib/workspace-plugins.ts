/**
 * Workspace Plugins — backward-compatible re-export
 *
 * The real implementation now lives in lib/plugins/workspace/.
 * This file exists so existing imports keep working.
 */

export { kanbanPlugin, dailyNotesPlugin, timelinePlugin, WORKSPACE_PLUGINS } from "./plugins/workspace"
