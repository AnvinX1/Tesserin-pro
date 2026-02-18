"use client"

import React from "react"

/**
 * SkeuoBadge
 *
 * A small, pill-shaped status indicator rendered with the accent colour.
 * Typically placed beside headings to convey live / active / beta state.
 *
 * @example
 * ```tsx
 * <SkeuoBadge>Live</SkeuoBadge>
 * ```
 */

interface SkeuoBadgeProps {
  children: React.ReactNode
}

export function SkeuoBadge({ children }: SkeuoBadgeProps) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider skeuo-inset"
      style={{
        color: "var(--text-on-accent)",
        backgroundColor: "var(--accent-primary)",
        border: "none",
        boxShadow: "none",
      }}
    >
      {children}
    </span>
  )
}
