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
        className="relative"
        style={{
          opacity: phase >= 0 ? 1 : 0,
          transform: phase >= 0 ? "scale(1) translateY(0)" : "scale(0.85) translateY(10px)",
          transition: "all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <TesserinLogo size={110} animated />
        {/* Secondary inner glow */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: isDark ? "rgba(250, 204, 21, 0.4)" : "rgba(212, 168, 41, 0.4)",
            filter: "blur(25px)",
            opacity: phase >= 1 ? 0.6 : 0,
            transform: phase >= 1 ? "scale(1.2)" : "scale(0.5)",
            transition: "all 1s cubic-bezier(0.2, 0.8, 0.2, 1)",
            zIndex: -1
          }} 
        />
      </div>

      {/* Brand name */}
      <div
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(15px)",
          transition: "all 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s",
        }}
      >
        <p
          className="mt-6 text-xl font-bold tracking-[0.4em] uppercase"
          style={{ 
            color: isDark ? "#FACC15" : "#d4a829",
            textShadow: isDark ? "0 2px 10px rgba(250, 204, 21, 0.3)" : "none",
            background: isDark 
              ? "linear-gradient(90deg, #FACC15 0%, #FFFFFF 50%, #FACC15 100%)" 
              : "linear-gradient(90deg, #d4a829 0%, #a17f1e 50%, #d4a829 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "loading-text-shimmer 3s linear infinite"
          }}
        >
          Tesserin
        </p>
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(12px)",
          transition: "all 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.25s",
        }}
      >
        <p
          className="mt-3 text-sm font-light tracking-wide"
          style={{ color: isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(44, 42, 38, 0.7)" }}
        >
          {tagline}
        </p>
      </div>

      {/* Progress bar wrapper */}
      <div
        className="mt-10 w-64 h-[4px] rounded-full overflow-hidden relative backdrop-blur-sm"
        style={{
          backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(120, 100, 70, 0.15)",
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "scaleX(1)" : "scaleX(0.8)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: isDark ? "inset 0 1px 3px rgba(0,0,0,0.5)" : "inset 0 1px 2px rgba(0,0,0,0.1)",
        }}
      >
        <div
          className="h-full rounded-full relative"
          style={{
            background: isDark
              ? "linear-gradient(90deg, transparent, #FACC15, #F59E0B)"
              : "linear-gradient(90deg, transparent, #d4a829, #c49b22)",
            animation: "loading-progress 2.2s cubic-bezier(0.65, 0, 0.15, 1) forwards",
            width: "0%",
          }}
        >
          {/* Progress bar glow cap */}
          <div 
             className="absolute top-0 right-0 bottom-0 w-8 rounded-full"
             style={{
               background: "white",
               filter: "blur(4px)",
               opacity: 0.6
             }}
          />
        </div>
      </div>

      {/* Version badge */}
      <p
        className="mt-6 text-[11px] tracking-[0.2em] font-medium"
        style={{
          color: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(51, 48, 43, 0.3)",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.8s ease 0.4s",
        }}
      >
        v1.0.7
      </p>

      <span className="sr-only">Loading application</span>
    </div>
  )
}
