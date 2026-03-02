"use client"

import React from "react"

/**
 * ScribbledIcons — Hand-drawn SVG navigation icons
 *
 * These match the rough/scribbled aesthetic of the TesserinLogo,
 * using sketchy strokes, wobbly lines, and imperfect geometry.
 * All icons use CSS variables for theming.
 */

interface IconProps {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/** Notes — scribbled document with folded corner */
export function ScribbledNotes({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path
        d="M6 3.5 C5.8 3.4, 4.5 3.6, 4.2 4 C3.9 4.5, 4 5.5, 4 6 L4.1 18 C4 18.8, 4.3 20.2, 5.2 20.5 C5.8 20.7, 7 20.5, 7 20.5 L16 20.4 C17 20.5, 18 20.2, 18.2 19.5 L18.1 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.1 9 L14.5 9.1 C13.8 9, 13.2 8.5, 13.1 7.8 L13 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13 3.5 L18.1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* Text lines */}
      <line x1="7.5" y1="13" x2="14.5" y2="12.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="7.5" y1="16" x2="12" y2="15.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

/** Canvas / Compass — scribbled compass rose */
export function ScribbledCanvas({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
        strokeDasharray="2 0" opacity="0.3" />
      <path
        d="M12 3.5 C12.5 3, 11.5 3, 12 3.5 L13.5 10 L12 12 L10.5 10 Z"
        stroke="currentColor" strokeWidth="1.4" fill="currentColor" opacity="0.7" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M20.5 12 L14 13.5 L12 12 L14 10.5 Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.45" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M12 20.5 L10.5 14 L12 12 L13.5 14 Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.45" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M3.5 12 L10 10.5 L12 12 L10 13.5 Z"
        stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.45" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

/** Graph / Network — scribbled interconnected nodes */
export function ScribbledGraph({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      {/* Edges */}
      <line x1="7" y1="7" x2="17" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="7" y1="7" x2="10" y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="17" y1="7.5" x2="16.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="10" y1="17" x2="16.5" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="12" y1="11.5" x2="7" y2="7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <line x1="12" y1="11.5" x2="17" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      <line x1="12" y1="11.5" x2="10" y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
      {/* Nodes */}
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.7" />
      <circle cx="17" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.7" />
      <circle cx="10" cy="17" r="2.3" stroke="currentColor" strokeWidth="1.6" fill="none" opacity="0.7" />
      <circle cx="16.5" cy="16" r="2" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.5" />
      <circle cx="12" cy="11.5" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

/** SAM / AI Sparkles — scribbled sparkle burst */
export function ScribbledSparkles({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      {/* Main sparkle */}
      <path
        d="M12 3 C12.3 7, 12.8 8.5, 12 9 C11.2 9.5, 8 9.5, 4 10 C8 10.5, 11 10.5, 12 11 C13 11.5, 12.5 14, 12 18 C12.5 14, 13 11.5, 14 11 C15 10.5, 17 10.5, 21 10 C17 9.5, 15 9.5, 14 9 C13 8.5, 12.5 7, 12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        opacity="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Small sparkle top-right */}
      <path
        d="M18 2 C18.2 3.5, 18.5 4, 19.5 4.2 C18.5 4.5, 18.2 5, 18 6.5 C17.8 5, 17.5 4.5, 16.5 4.2 C17.5 4, 17.8 3.5, 18 2Z"
        stroke="currentColor"
        strokeWidth="1"
        fill="currentColor"
        opacity="0.4"
        strokeLinecap="round"
      />
      {/* Tiny sparkle bottom-left */}
      <path
        d="M6 17 C6.1 18, 6.3 18.3, 7 18.5 C6.3 18.7, 6.1 19, 6 20 C5.9 19, 5.7 18.7, 5 18.5 C5.7 18.3, 5.9 18, 6 17Z"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="currentColor"
        opacity="0.35"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Settings — scribbled gear with rough teeth */
export function ScribbledSettings({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path
        d="M10.5 3.5 L13.5 3.3 L14.2 5.8 C14.5 6, 15 6.3, 15.4 6.5 L17.8 5.5 L19.5 7.8 L17.8 9.6 C17.9 10, 18 10.5, 18 11 L18 12 C18 12.5, 17.9 13, 17.8 13.4 L19.5 15.2 L17.8 17.5 L15.4 16.5 C15 16.7, 14.5 16.9, 14.2 17.1 L13.5 19.7 L10.5 19.5 L9.8 17.1 C9.5 16.9, 9 16.7, 8.6 16.5 L6.2 17.5 L4.5 15.2 L6.2 13.4 C6.1 13, 6 12.5, 6 12 L6 11 C6 10.5, 6.1 10, 6.2 9.6 L4.5 7.8 L6.2 5.5 L8.6 6.5 C9 6.3, 9.5 6, 9.8 5.8 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.7"
      />
      <circle cx="12" cy="11.5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" />
    </svg>
  )
}

/** Search — scribbled magnifying glass */
export function ScribbledSearch({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <line x1="15.5" y1="15.5" x2="20.5" y2="20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

/** Plus — scribbled plus sign */
export function ScribbledPlus({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

/** Zap / Lightning — scribbled bolt */
export function ScribbledZap({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path
        d="M13 2 L5.5 13 L11 13 L10 22 L18.5 10 L13 10.5 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="currentColor"
        opacity="0.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Layers — scribbled stacked layers */
export function ScribbledLayers({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M12 4 L21 9 L12 14 L3 9 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 13 L12 18 L21 13" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 17 L12 22 L21 17" stroke="currentColor" strokeWidth="1.3" fill="none" opacity="0.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Trash — scribbled bin */
export function ScribbledTrash({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M4 7 L20 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <path d="M9 7 L9 4.5 C9.1 3.8, 9.5 3.2, 10.5 3 L13.5 3 C14.5 3.2, 14.9 3.8, 15 4.5 L15 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      <path d="M6 7 L7 19.5 C7.1 20.5, 7.8 21, 8.5 21 L15.5 21 C16.2 21, 16.9 20.5, 17 19.5 L18 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
      <line x1="10" y1="11" x2="10.2" y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
      <line x1="14" y1="11" x2="13.8" y2="17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
    </svg>
  )
}

/** Edit / Pencil — scribbled pencil */
export function ScribbledEdit({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path
        d="M16.5 3.5 C17.2 2.8, 18.5 2.8, 19.2 3.5 L20.5 4.8 C21.2 5.5, 21.2 6.8, 20.5 7.5 L8 20 L3 21 L4 16 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line x1="14.5" y1="5.5" x2="18.5" y2="9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />
    </svg>
  )
}

/** Copy / Duplicate — scribbled overlapping documents */
export function ScribbledCopy({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="8" y="8" width="12" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d="M16 8 L16 5 C16 3.8, 15.2 3, 14 3 L6 3 C4.8 3, 4 3.8, 4 5 L4 15 C4 16.2, 4.8 17, 6 17 L8 17" stroke="currentColor" strokeWidth="1.4" fill="none" opacity="0.45" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Expand / Chevrons Right */
export function ScribbledExpand({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M7 6 L13 12 L7 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <path d="M13 6 L19 12 L13 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  )
}

/** Collapse / Chevrons Left */
export function ScribbledCollapse({ size = 20, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M17 6 L11 12 L17 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <path d="M11 6 L5 12 L11 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  )
}
