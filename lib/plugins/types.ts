/**
 * Plugin Types
 *
 * Shared type definitions for the Tesserin plugin system.
 * If you're contributing a new plugin, your file should export an object
 * satisfying the `TesserinPlugin` interface.
 */

import React from "react"

/* ================================================================== */
/*  Core types                                                         */
/* ================================================================== */

/** Metadata every plugin must declare */
export interface PluginManifest {
  /** Unique reverse-domain ID, e.g. "com.tesserin.word-count" */
  id: string
  /** Human-readable name */
  name: string
  /** Semver string */
  version: string
  /** Short description */
  description: string
  /** Author name */
  author: string
  /** Minimum Tesserin version required */
  minAppVersion?: string
  /** Optional homepage / repo URL */
  url?: string
  /** Icon React node (optional) */
  icon?: React.ReactNode
  /**
   * Permissions the plugin requests.
   * Built-in plugins automatically get all permissions.
   * Third-party plugins must declare what they need.
   */
  permissions?: PluginPermission[]
}

export type PluginPermission =
  | "vault:read"       // list, get, search notes
  | "vault:write"      // create, update, delete notes
  | "settings:read"
  | "settings:write"
  | "ui:notify"        // show notices / navigate tabs
  | "commands"         // register commands
  | "panels"           // register panels
  | "sam:tools"        // register SAM tools
  | "events"           // subscribe to events

/** Events plugins can subscribe to */
export type PluginEventType =
  | "note:created"
  | "note:updated"
  | "note:deleted"
  | "note:selected"
  | "vault:loaded"
  | "search:query"
  | "command:executed"
  | "theme:changed"
  | "app:ready"
  | "app:beforeQuit"

export interface PluginEvent {
  type: PluginEventType
  data?: unknown
  timestamp: number
}

export type PluginEventHandler = (event: PluginEvent) => void | Promise<void>

/** A command registered by a plugin */
export interface PluginCommand {
  /** Unique command ID within the plugin, e.g. "toggle-word-count" */
  id: string
  /** Display label in the command palette */
  label: string
  /** Optional category for grouping */
  category?: string
  /** Keyboard shortcut hint (display only) */
  shortcut?: string
  /** Optional icon */
  icon?: React.ReactNode
  /** The handler to execute */
  execute: () => void | Promise<void>
}

/** A sidebar or workspace panel contributed by a plugin */
export interface PluginPanel {
  /** Panel ID */
  id: string
  /** Tab label */
  label: string
  /** Tab icon */
  icon: React.ReactNode
  /** The React component to render */
  component: React.ComponentType
  /** Where to show: workspace tab or sidebar panel */
  location: "workspace" | "sidebar" | "statusbar"
}

/** A status bar widget */
export interface StatusBarWidget {
  id: string
  /** React component rendering the widget inline */
  component: React.ComponentType
  /** left | center | right alignment */
  align?: "left" | "center" | "right"
  /** Sort priority (lower = further left) */
  priority?: number
}

/** A markdown post-processor (runs after rendering) */
export type MarkdownProcessor = (
  content: string,
  element: HTMLElement,
) => void | Promise<void>

/** A custom code-block renderer (```lang → custom component) */
export interface CodeBlockRenderer {
  /** The language identifier, e.g. "chart", "mermaid", "dataview" */
  language: string
  /** React component receiving the raw code-block content */
  component: React.ComponentType<{ code: string }>
}

/** A SAM tool that plugins can register */
export interface SAMTool {
  /** Tool name, e.g. "web-search" */
  name: string
  /** Short description shown to SAM in context */
  description: string
  /** Parameter schema */
  parameters?: Record<string, { type: string; description: string; required?: boolean }>
  /** Execute the tool and return a result string */
  execute: (params: Record<string, unknown>) => Promise<string>
}

/* ================================================================== */
/*  Plugin API — what the plugin receives to interact with Tesserin    */
/* ================================================================== */

export interface TesserinPluginAPI {
  /** Register commands */
  registerCommand(command: PluginCommand): void
  /** Register a panel (workspace tab, sidebar, or statusbar widget) */
  registerPanel(panel: PluginPanel): void
  /** Register a status-bar widget */
  registerStatusBarWidget(widget: StatusBarWidget): void
  /** Register a markdown post-processor */
  registerMarkdownProcessor(processor: MarkdownProcessor): void
  /** Register a custom code-block renderer */
  registerCodeBlockRenderer(renderer: CodeBlockRenderer): void
  /** Register a SAM tool */
  registerSAMTool(tool: SAMTool): void
  /** Subscribe to plugin events */
  on(event: PluginEventType, handler: PluginEventHandler): void
  /** Unsubscribe from events */
  off(event: PluginEventType, handler: PluginEventHandler): void

  /** Notes CRUD (read-only + append helpers for safety) */
  vault: {
    list(): Array<{ id: string; title: string; content: string; createdAt: string; updatedAt: string }>
    get(id: string): { id: string; title: string; content: string } | undefined
    getSelected(): { id: string; title: string; content: string } | null
    search(query: string): Array<{ id: string; title: string; content: string }>
    create(title: string, content?: string): string
    update(id: string, updates: { title?: string; content?: string }): void
    delete(id: string): void
    selectNote(id: string): void
  }

  /** Settings */
  settings: {
    get(key: string): string | null
    set(key: string, value: string): void
  }

  /** UI helpers */
  ui: {
    showNotice(message: string, duration?: number): void
    navigateToTab(tabId: string): void
  }
}

/* ================================================================== */
/*  Plugin interface                                                    */
/* ================================================================== */

/** The contract every plugin must implement */
export interface TesserinPlugin {
  /** Plugin metadata */
  manifest: PluginManifest
  /** Called when the plugin is activated */
  activate(api: TesserinPluginAPI): void | Promise<void>
  /** Called when the plugin is deactivated */
  deactivate?(): void | Promise<void>
}
