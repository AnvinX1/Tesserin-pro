/**
 * Built-in Plugins — backward-compatible re-export
 *
 * The real implementation now lives in lib/plugins/builtin/.
 * This file exists so existing imports keep working.
 */

export { wordCountPlugin, dailyQuotePlugin, backlinksPlugin, BUILT_IN_PLUGINS } from "./plugins/builtin"
export { WORKSPACE_PLUGINS } from "./plugins/workspace"
