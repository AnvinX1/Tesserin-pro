"use client"

import React, { useState, useEffect } from "react"
import { TesserinLogo } from "./tesserin-logo"
import { AnimatedIcon } from "./animated-icon"
import { useTesserinTheme } from "./theme-provider"

/**
 * LoadingScreen
 *
 * A cinematic splash screen with the Tesserin crystal logo,
 * a rotating tagline, particle-like ambient dots, and a sleek
 * progress bar — all on the signature Obsidian Black canvas.
 */

const TAGLINES = [
  "Think deeper. Write freely.",
  "Your second brain, offline.",
  "Research. Connect. Discover.",
  "Where ideas become knowledge.",
  "Craft your thoughts in gold.",
  "Local-first. Endlessly powerful.",
]

export function LoadingScreen({ fadingOut = false }: { fadingOut?: boolean }) {
  const { isDark } = useTesserinTheme()
  const [tagline] = useState(
    () => TAGLINES[Math.floor(Math.random() * TAGLINES.length)],
  )
  const [phase, setPhase] = useState(0) // 0→ logo fading in, 1→ text, 2→ bar

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: isDark ? "#050505" : "#f8f6f1",
        opacity: fadingOut ? 0 : 1,
        transition: "opacity 0.4s ease-out",
        pointerEvents: fadingOut ? "none" : undefined,
      }}
      role="status"
      aria-label="Loading Tesserin"
    >
      {/* Ambient glow behind logo */}
      <div
        className="absolute rounded-full"
        style={{
          width: 320,
          height: 320,
          background: "radial-gradient(circle, rgba(250,204,21,0.06) 0%, transparent 70%)",
          animation: "loading-pulse 3s ease-in-out infinite",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
          pointerEvents: "none",
        }}
      />

      {/* Floating ambient particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            backgroundColor: isDark ? "rgba(250, 204, 21, 0.15)" : "rgba(212, 168, 41, 0.2)",
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
            animation: `loading-float ${4 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Logo with scale-in */}
      <div
        style={{
          opacity: phase >= 0 ? 1 : 0,
          transform: phase >= 0 ? "scale(1)" : "scale(0.7)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <TesserinLogo size={100} animated />
      </div>

      {/* Brand name */}
      <div
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(8px)",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <p
          className="mt-5 text-base font-bold tracking-[0.35em] uppercase"
          style={{ color: isDark ? "#FACC15" : "#d4a829" }}
        >
          Tesserin
        </p>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(12px)",
          transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
        }}
      >
        <p
          className="mt-2 text-sm font-light tracking-wide"
          style={{ color: isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(44, 42, 38, 0.6)" }}
        >
          {tagline}
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="mt-8 w-56 h-[3px] rounded-full overflow-hidden"
        style={{
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(120, 100, 70, 0.1)",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: isDark
              ? "linear-gradient(90deg, #FACC15, #F59E0B)"
              : "linear-gradient(90deg, #d4a829, #c49b22)",
            animation: "loading-progress 1.6s cubic-bezier(0.65, 0, 0.35, 1) forwards",
            width: "0%",
            boxShadow: isDark
              ? "0 0 12px rgba(250, 204, 21, 0.4)"
              : "0 0 12px rgba(212, 168, 41, 0.3)",
          }}
        />
      </div>

      {/* Version badge */}
      <p
        className="mt-4 text-[10px] tracking-wider"
        style={{
          color: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(51, 48, 43, 0.2)",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.5s ease 0.3s",
        }}
      >
        v1.0.0
      </p>

      <span className="sr-only">Loading application</span>
    </div>
  )
}
