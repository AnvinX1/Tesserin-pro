"use client"

import React from "react"
import { cn } from "@/lib/utils"

/**
 * SkeuoPanel
 *
 * The foundational container for the Tesserin design system. Renders a
 * rounded panel with neumorphic outer shadows, a subtle gradient
 * background, and a highlight/dark border to simulate physical depth.
 *
 * It automatically inherits the active palette (Ceramic White / Obsidian
 * Black) from the nearest `TesserinThemeProvider`.
 *
 * @example
 * ```tsx
 * <SkeuoPanel className="p-6">
 *   <h2>Panel Content</h2>
 * </SkeuoPanel>
 * ```
 */

interface SkeuoPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function SkeuoPanel({
  children,
  className,
  ...props
}: SkeuoPanelProps) {
  return (
    <div
      className={cn("skeuo-panel relative overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  )
}
