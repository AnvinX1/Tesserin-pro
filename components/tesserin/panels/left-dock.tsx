"use client"

import React, { useState } from "react"
import { FiFileText, FiCompass, FiCode, FiSettings, FiGrid, FiCalendar, FiChevronsRight, FiChevronsLeft } from "react-icons/fi"
import { HiOutlineCpuChip, HiOutlineSparkles } from "react-icons/hi2"
import { SkeuoPanel } from "../core/skeuo-panel"
import { TesserinLogo } from "../core/tesserin-logo"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"

/**
 * LeftDock
 *
 * A vertical navigation dock pinned to the left edge of the viewport.
 * Supports expanded (icon + label) and collapsed (icon-only w/ tooltips) modes.
 */

/** Tab definitions */
const TABS = [
  { id: "notes", icon: FiFileText, label: "Notes" },
  { id: "canvas", icon: FiCompass, label: "Canvas" },
  { id: "graph", icon: HiOutlineCpuChip, label: "Graph" },
  { id: "code", icon: FiCode, label: "Code" },
  { id: "kanban", icon: FiGrid, label: "Kanban" },
  { id: "daily", icon: FiCalendar, label: "Daily" },
  { id: "sam", icon: HiOutlineSparkles, label: "SAM" },
  { id: "settings", icon: FiSettings, label: "Settings" },
] as const

export type TabId = (typeof TABS)[number]["id"]

interface LeftDockProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
}

export function LeftDock({ activeTab, setActiveTab }: LeftDockProps) {
  const [expanded, setExpanded] = useState(false)

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
          {TABS.map((item) => {
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
                <item.icon size={20} className="flex-shrink-0" />
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
                      backgroundColor: "#1a1a1a",
                      color: "#ededed",
                      border: "1px solid rgba(255,255,255,0.08)",
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
              <FiChevronsLeft size={18} className="flex-shrink-0" />
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
                  <FiChevronsRight size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="font-medium text-xs px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: "#1a1a1a",
                  color: "#ededed",
                  border: "1px solid rgba(255,255,255,0.08)",
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
