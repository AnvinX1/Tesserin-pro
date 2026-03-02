"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"

/**
 * AnimatedIcon – Lordicon-style hover-to-animate wrapper
 *
 * Wraps any child (icon, SVG, etc.) with a hover-triggered animation.
 * Supports multiple animation modes: pulse, bounce, wobble, spin, morph, draw.
 *
 * Animation keyframes are injected ONCE globally to prevent style-recalc flicker.
 */

type AnimationMode = "pulse" | "bounce" | "wobble" | "spin" | "morph" | "draw" | "none"

interface AnimatedIconProps {
  children: React.ReactNode
  animation?: AnimationMode
  size?: number
  color?: string
  /** Play animation once on mount */
  autoPlay?: boolean
  /** Custom CSS class on the wrapper */
  className?: string
  style?: React.CSSProperties
}

/* ── Global style injection (once) ─── */
let globalStylesInjected = false

function ensureGlobalStyles() {
  if (globalStylesInjected) return
  if (typeof document === "undefined") return
  globalStylesInjected = true

  const style = document.createElement("style")
  style.setAttribute("data-aicon", "1")
  style.textContent = `
    @keyframes aicon-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.18); opacity: 0.85; }
    }
    @keyframes aicon-bounce {
      0%, 100% { transform: translateY(0); }
      30% { transform: translateY(-4px); }
      60% { transform: translateY(1px); }
    }
    @keyframes aicon-wobble {
      0%, 100% { transform: rotate(0deg); }
      20% { transform: rotate(-12deg); }
      40% { transform: rotate(10deg); }
      60% { transform: rotate(-6deg); }
      80% { transform: rotate(4deg); }
    }
    @keyframes aicon-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes aicon-morph {
      0%, 100% { transform: scale(1) rotate(0deg); filter: brightness(1); }
      25% { transform: scale(1.1) rotate(-3deg); filter: brightness(1.15); }
      50% { transform: scale(0.95) rotate(2deg); filter: brightness(1.3); }
      75% { transform: scale(1.05) rotate(-1deg); filter: brightness(1.1); }
    }
    @keyframes aicon-draw {
      0% { stroke-dashoffset: 100; opacity: 0.4; }
      100% { stroke-dashoffset: 0; opacity: 1; }
    }
  `
  document.head.appendChild(style)
}

const ANIM_STYLES: Record<AnimationMode, string> = {
  pulse: "aicon-pulse 0.6s ease-in-out",
  bounce: "aicon-bounce 0.5s ease-in-out",
  wobble: "aicon-wobble 0.5s ease-in-out",
  spin: "aicon-spin 0.6s ease-in-out",
  morph: "aicon-morph 0.7s ease-in-out",
  draw: "aicon-draw 0.6s ease-out forwards",
  none: "none",
}

export function AnimatedIcon({
  children,
  animation = "bounce",
  size,
  color,
  autoPlay = false,
  className = "",
  style,
}: AnimatedIconProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { ensureGlobalStyles() }, [])

  const handleEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsPlaying(true)
  }, [])

  const handleLeave = useCallback(() => {
    timerRef.current = setTimeout(() => setIsPlaying(false), 600)
  }, [])

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        color,
        animation: isPlaying ? ANIM_STYLES[animation] : "none",
        willChange: "transform",
        ...style,
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onAnimationEnd={() => setIsPlaying(false)}
    >
      {children}
    </div>
  )
}
