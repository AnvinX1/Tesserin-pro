"use client"

import React, { useEffect } from "react"

/* ── Global style injection (once) ─── */
let logoStylesInjected = false

function ensureLogoStyles() {
  if (logoStylesInjected) return
  if (typeof document === "undefined") return
  logoStylesInjected = true

  const style = document.createElement("style")
  style.setAttribute("data-tess-logo", "1")
  style.textContent = `
    @keyframes tess-logo-breathe {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.3)); transform: scale(1); }
      50% { filter: drop-shadow(0 0 14px rgba(250, 204, 21, 0.6)); transform: scale(1.03); }
    }
    @keyframes tess-logo-draw {
      0% { stroke-dashoffset: 310; }
      100% { stroke-dashoffset: 0; }
    }
    @keyframes tesseradraw-breathe {
      0%, 100% { filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.3)); transform: scale(1); }
      50% { filter: drop-shadow(0 0 14px rgba(250, 204, 21, 0.6)); transform: scale(1.03); }
    }
    @keyframes tesseradraw-draw {
      0% { stroke-dashoffset: 310; }
      100% { stroke-dashoffset: 0; }
    }
  `
  document.head.appendChild(style)
}

/**
 * TesserinLogo – Hand-drawn / scribbled SVG brand mark
 *
 * A rough-stroked tesseract crystal with sketchy geometry,
 * matching the hand-drawn aesthetic throughout the app.
 *
 * @param size     - Pixel dimension (width & height). Default `48`.
 * @param animated - Enable a breathing glow + stroke draw-on. Default `false`.
 */

interface TesserinLogoProps {
  size?: number
  animated?: boolean
}

export function TesserinLogo({ size = 48, animated = false }: TesserinLogoProps) {
  const stroke = "var(--accent-primary)"
  const textFill = "var(--text-primary)"

  useEffect(() => { ensureLogoStyles() }, [])

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Tesserin logo"
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={animated ? { animation: "tess-logo-breathe 3s ease-in-out infinite" } : undefined}
      >
        {/* Outer rough circle — hand-drawn wobble */}
        <path
          d="M50 6 C72 4, 92 20, 95 42 C98 64, 84 88, 60 95 C36 102, 10 86, 5 62 C0 38, 18 8, 50 6Z"
          stroke={stroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.35"
          style={{
            strokeDasharray: animated ? "310" : "none",
            strokeDashoffset: animated ? "0" : "0",
            ...(animated ? { animation: "tess-logo-draw 2s ease-out forwards" } : {}),
          }}
        />

        {/* Inner rough diamond / tesseract shape — hand-sketched */}
        <path
          d="M50 18 L78 40 L68 72 L32 72 L22 40 Z"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.7"
        />

        {/* Inner smaller shape offset — depth illusion */}
        <path
          d="M50 28 L70 44 L62 66 L38 66 L30 44 Z"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.3"
        />

        {/* Cross-connecting sketchy lines — tesseract edges */}
        <line x1="50" y1="18" x2="50" y2="28" stroke={stroke} strokeWidth="1.8" opacity="0.5" strokeLinecap="round" />
        <line x1="78" y1="40" x2="70" y2="44" stroke={stroke} strokeWidth="1.8" opacity="0.5" strokeLinecap="round" />
        <line x1="68" y1="72" x2="62" y2="66" stroke={stroke} strokeWidth="1.8" opacity="0.5" strokeLinecap="round" />
        <line x1="32" y1="72" x2="38" y2="66" stroke={stroke} strokeWidth="1.8" opacity="0.5" strokeLinecap="round" />
        <line x1="22" y1="40" x2="30" y2="44" stroke={stroke} strokeWidth="1.8" opacity="0.5" strokeLinecap="round" />

        {/* Center crystal facet accent */}
        <path
          d="M50 38 L58 48 L50 58 L42 48 Z"
          stroke={stroke}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={stroke}
          opacity="0.15"
        />

        {/* Small scribble decoration — top left (hand-drawn feel) */}
        <path
          d="M15 20 Q18 16, 22 19 Q19 22, 15 20"
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
          opacity="0.4"
          strokeLinecap="round"
        />

        {/* Sparkle dots — brand accent */}
        <circle cx="82" cy="22" r="1.5" fill={stroke} opacity="0.6" />
        <circle cx="86" cy="18" r="1" fill={stroke} opacity="0.4" />
        <circle cx="80" cy="16" r="1" fill={stroke} opacity="0.3" />
      </svg>
    </div>
  )
}
