/**
 * TesseradrawLogo — Hand-drawn/scribbled aesthetic logo for Tesseradraw
 *
 * Uses rough, sketchy strokes to match the Excalidraw hand-drawn feel,
 * showing seamless integration between Tesserin and the drawing canvas.
 */

import React, { useEffect } from "react"

interface TesseradrawLogoProps {
  size?: number
  animated?: boolean
}

export function TesseradrawLogo({ size = 64, animated = false }: TesseradrawLogoProps) {
  const s = size
  const stroke = "var(--accent-primary)"
  const textFill = "var(--text-primary)"

  // Ensure logo keyframes are defined globally (shared with TesserinLogo)
  useEffect(() => {
    if (typeof document === "undefined") return
    if (document.querySelector('style[data-tess-logo]')) return
    // Import TesserinLogo module to trigger its global style injection
    import("../core/tesserin-logo").catch(() => {})
  }, [])

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: s, height: s }}
      role="img"
      aria-label="Tesseradraw logo"
    >
      <svg
        viewBox="0 0 100 100"
        width={s}
        height={s}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={animated ? { animation: "tesseradraw-breathe 3s ease-in-out infinite" } : undefined}
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
            ...(animated ? { animation: "tesseradraw-draw 2s ease-out forwards" } : {}),
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

        {/* Pencil / pen nib scribble — bottom right corner */}
        <g transform="translate(62, 62) rotate(-45)" opacity="0.8">
          {/* Pencil body */}
          <path
            d="M0 0 L18 0 L22 4 L18 8 L0 8 Z"
            stroke={textFill}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Pencil tip */}
          <path
            d="M-5 4 L0 0 L0 8 Z"
            stroke={stroke}
            strokeWidth="1.5"
            fill={stroke}
            opacity="0.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Eraser band */}
          <line x1="16" y1="0" x2="16" y2="8" stroke={textFill} strokeWidth="1.2" opacity="0.4" strokeLinecap="round" />
        </g>

        {/* Small scribble decoration — top left (hand-drawn feel) */}
        <path
          d="M15 20 Q18 16, 22 19 Q19 22, 15 20"
          stroke={stroke}
          strokeWidth="1.2"
          fill="none"
          opacity="0.4"
          strokeLinecap="round"
        />

        {/* Sparkle dots — AI hint */}
        <circle cx="82" cy="22" r="1.5" fill={stroke} opacity="0.6" />
        <circle cx="86" cy="18" r="1" fill={stroke} opacity="0.4" />
        <circle cx="80" cy="16" r="1" fill={stroke} opacity="0.3" />
      </svg>
    </div>
  )
}
