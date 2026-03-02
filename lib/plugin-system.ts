/**
 * Tesserin Plugin System — backward-compatible re-export
 *
 * The real implementation now lives in lib/plugins/.
 * This file exists so existing imports keep working.
 */

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
} from "./plugins"

export { pluginRegistry, sandboxAPI, usePlugins } from "./plugins"
