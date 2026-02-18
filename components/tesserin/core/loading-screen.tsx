"use client"

import React from "react"
import { TesserinLogo } from "./tesserin-logo"

/**
 * LoadingScreen
 *
 * A full-viewport splash screen displayed during the initial app boot.
 * Shows the animated Tesserin Hyper-Crystal logo with a progress bar
 * that fills over the loading duration.
 *
 * @example
 * ```tsx
 * if (isLoading) return <LoadingScreen />
 * ```
 */

export function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ backgroundColor: "#050505" }}
      role="status"
      aria-label="Loading Tessaradraw"
    >
      <TesserinLogo size={120} animated />

      {/* App name */}
      <p className="mt-6 text-sm font-medium tracking-widest uppercase" style={{ color: '#FACC15' }}>Tesserin</p>

      {/* Progress bar */}
      <div className="mt-6 w-64 h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: '#FACC15',
            animation: 'progress 2s ease-in-out forwards',
            width: '0%',
          }}
        />
      </div>

      <span className="sr-only">Loading application</span>
    </div>
  )
}
