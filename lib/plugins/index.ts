/**
 * Tesserin Plugin System – barrel export
 *
 * All public surface re-exported from one place so the rest of the app
 * (and backward-compat shims) can simply `import { … } from "lib/plugins"`.
 */

// Types
export type {
  PluginPermission,
  PluginManifest,
  PluginEventType,
  PluginEvent,
  PluginEventHandler,
  PluginCommand,
  PluginPanel,
  StatusBarWidget,
  MarkdownProcessor,
  CodeBlockRenderer,
  SAMTool,
  TesserinPluginAPI,
  TesserinPlugin,
} from "./types"

// Runtime
export { pluginRegistry, sandboxAPI, usePlugins } from "./registry"

// Plugin collections
export { BUILT_IN_PLUGINS }  from "./builtin"
export { WORKSPACE_PLUGINS } from "./workspace"
export { COMMUNITY_PLUGINS } from "./community"
