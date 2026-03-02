"use client"

import React, { useState, useEffect } from "react"
import { usePlugins } from "@/lib/plugin-system"
import { SkeuoPanel } from "../core/skeuo-panel"
import { TesserinLogo } from "../core/tesserin-logo"
import { AnimatedIcon } from "../core/animated-icon"
import {
  ScribbledNotes,
  ScribbledCanvas,
  ScribbledGraph,
  ScribbledSparkles,
  ScribbledSettings,
  ScribbledExpand,
  ScribbledCollapse,
} from "../core/scribbled-icons"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { getSetting } from "@/lib/storage-client"

/**
 * LeftDock
 *
 * A vertical navigation dock pinned to the left edge of the viewport.
 * Supports expanded (icon + label) and collapsed (icon-only w/ tooltips) modes.
 */

/** Core tab definitions — always visible */
/** Animation mode for each nav icon */
const TAB_ANIM: Record<string, "bounce" | "wobble" | "pulse" | "morph"> = {
  notes: "bounce",
  canvas: "wobble",
  graph: "pulse",
  sam: "morph",
  settings: "wobble",
}

const CORE_TABS = [
  { id: "notes", icon: ScribbledNotes, label: "Notes" },
  { id: "canvas", icon: ScribbledCanvas, label: "Canvas" },
  { id: "graph", icon: ScribbledGraph, label: "Graph" },
  { id: "sam", icon: ScribbledSparkles, label: "SAM" },
  { id: "settings", icon: ScribbledSettings, label: "Settings" },
] as const

export type CoreTabId = (typeof CORE_TABS)[number]["id"]
/** TabId includes core tabs plus any dynamic plugin panel IDs */
export type TabId = CoreTabId | (string & {})

interface LeftDockProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
}

/** Map tab IDs to their corresponding feature setting key */
const TAB_FEATURE_MAP: Record<string, string> = {
  canvas: "features.canvas",
  graph: "features.graph",
  sam: "features.sam",
}

export function LeftDock({ activeTab, setActiveTab }: LeftDockProps) {
  const [expanded, setExpanded] = useState(false)
  const { panels } = usePlugins()
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({})

  // Load feature toggles from settings
  useEffect(() => {
    async function load() {
      const features: Record<string, boolean> = {}
      for (const [tabId, key] of Object.entries(TAB_FEATURE_MAP)) {
        const val = await getSetting(key)
        features[tabId] = val !== "false" // default to true
      }
      setEnabledFeatures(features)
    }
    load()

    // Re-check periodically in case settings changed
    const interval = setInterval(load, 2000)
    return () => clearInterval(interval)
  }, [])

  // Build the full tab list: core tabs (with plugin workspace panels inserted before settings)
  const pluginWorkspacePanels = panels.filter((p) => p.location === "workspace")
  const allTabs: Array<{ id: string; icon: React.ComponentType<any>; label: string }> = []
  for (const tab of CORE_TABS) {
    // Skip tabs whose feature is disabled
    if (TAB_FEATURE_MAP[tab.id] && enabledFeatures[tab.id] === false) continue

    if (tab.id === "settings" && pluginWorkspacePanels.length > 0) {
      // Insert plugin panels before settings
      for (const pp of pluginWorkspacePanels) {
        allTabs.push({
          id: pp.id,
          icon: () => <>{pp.icon}</>,
          label: pp.label,
        })
      }
    }
    allTabs.push(tab)
  }

  return (
    <div
      className="m-3 mr-0 flex-shrink-0 z-30 flex flex-col gap-4 transition-all duration-300 ease-in-out"
      style={{ width: expanded ? 200 : 72 }}
    >
      <SkeuoPanel className="h-full flex flex-col py-6 gap-6 overflow-hidden">
        {/* Brand logo + app name */}
        <div className={`flex items-center gap-3 ${expanded ? "px-5" : "justify-center px-2"}`}>
          <div className="cursor-pointer hover:scale-110 transition-transform duration-300 flex-shrink-0">
            <TesserinLogo size={36} animated />
          </div>
          {expanded && (
            <span
              className="text-sm font-bold tracking-widest uppercase whitespace-nowrap overflow-hidden"
              style={{ color: "var(--accent-primary)" }}
            >
              Tesserin
            </span>
          )}
        </div>

        {/* Divider */}
        <div
          className={`h-px rounded-full ${expanded ? "mx-5" : "mx-4"}`}
          style={{ backgroundColor: "var(--border-dark)", opacity: 0.15 }}
        />

        {/* Navigation tabs */}
        <nav className="flex-1 flex flex-col gap-1.5 w-full px-2" aria-label="Main navigation">
          {allTabs.map((item) => {
            const isActive = activeTab === item.id

            const button = (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`skeuo-btn relative flex items-center rounded-xl transition-all duration-200 ${
                  expanded ? "w-full gap-3 px-3.5 h-11" : "w-12 h-12 justify-center mx-auto"
                } ${isActive ? "active" : ""}`}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active indicator pill */}
                {isActive && (
                  <div
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 rounded-full"
                    style={{ backgroundColor: "var(--accent-primary)" }}
                    aria-hidden="true"
                  />
                )}
                <AnimatedIcon animation={TAB_ANIM[item.id] || "bounce"} size={20}>
                  <item.icon size={20} className="flex-shrink-0" />
                </AnimatedIcon>
                {expanded && (
                  <span
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    style={{ color: isActive ? "var(--accent-primary)" : "var(--text-secondary)" }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            )

            // When collapsed, wrap in tooltip
            if (!expanded) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    sideOffset={12}
                    className="font-medium text-xs px-3 py-1.5 rounded-lg"
                    style={{
                      backgroundColor: "var(--tooltip-bg)",
                      color: "var(--tooltip-text)",
                      border: "1px solid var(--tooltip-border)",
                    }}
                  >
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return button
          })}
        </nav>

        {/* Bottom utility area */}
        <div className="flex flex-col gap-2 mb-2 px-2">
          {/* Divider */}
          <div
            className={`h-px rounded-full ${expanded ? "mx-3" : "mx-2"}`}
            style={{ backgroundColor: "var(--border-dark)", opacity: 0.15 }}
          />

          {/* Expand / Collapse toggle */}
          {expanded ? (
            <button
              onClick={() => setExpanded(false)}
              className="skeuo-btn w-full flex items-center gap-3 px-3.5 h-10 rounded-xl"
              aria-label="Collapse sidebar"
            >
              <AnimatedIcon animation="bounce" size={18}>
                <ScribbledCollapse size={18} className="flex-shrink-0" />
              </AnimatedIcon>
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Collapse
              </span>
            </button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setExpanded(true)}
                  className="skeuo-btn w-10 h-10 flex items-center justify-center rounded-full mx-auto"
                  aria-label="Expand sidebar"
                >
                  <AnimatedIcon animation="bounce" size={18}>
                    <ScribbledExpand size={18} />
                  </AnimatedIcon>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="font-medium text-xs px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: "var(--tooltip-bg)",
                  color: "var(--tooltip-text)",
                  border: "1px solid var(--tooltip-border)",
                }}
              >
                Expand sidebar
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SkeuoPanel>
    </div>
  )
}
