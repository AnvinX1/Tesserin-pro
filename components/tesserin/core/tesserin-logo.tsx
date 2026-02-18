"use client"

/**
 * TesserinLogo – The Hyper-Crystal Brand Mark
 *
 * An SVG-based, animated crystal logo for the Tesserin design system.
 * Features counter-rotating geometric shards with a glowing central core.
 *
 * @param size     - Pixel dimension (width & height) of the logo container. Default `48`.
 * @param animated - When `true`, enables perpetual rotation animation. Default `false`.
 *
 * @example
 * ```tsx
 * <TesserinLogo size={64} animated />
 * ```
 */

interface TesserinLogoProps {
  /** Pixel dimension (width & height) of the logo. */
  size?: number
  /** Enable continuous rotation animation. */
  animated?: boolean
}

export function TesserinLogo({ size = 48, animated = false }: TesserinLogoProps) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label="Tesserin logo"
    >
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full ${animated ? "animate-spin" : ""}`}
        style={{ animationDuration: "30s" }}
      >
        <defs>
          <filter id="crystal-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="shard-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--text-primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--text-tertiary)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Geometric shards */}
        <g transform="translate(50,50)">
          {/* Outer counter-rotating pair */}
          <g
            style={{
              animation: animated ? "animate-spin-reverse 20s linear infinite" : "none",
            }}
          >
            <path
              d="M-20 -30 L0 -45 L20 -30 L0 -10 Z"
              fill="url(#shard-gradient)"
              stroke="var(--border-dark)"
              strokeWidth="0.5"
            />
            <path
              d="M-20 30 L0 45 L20 30 L0 10 Z"
              fill="url(#shard-gradient)"
              stroke="var(--border-dark)"
              strokeWidth="0.5"
            />
          </g>

          {/* Inner slow-rotating accent shards */}
          <g
            className={animated ? "animate-spin" : ""}
            style={{ animationDuration: "15s" }}
          >
            <path d="M-35 0 L-15 -10 L-15 10 Z" fill="var(--accent-primary)" opacity="0.8" />
            <path d="M35 0 L15 -10 L15 10 Z" fill="var(--accent-primary)" opacity="0.8" />
          </g>

          {/* Central glowing core */}
          <circle r="6" fill="var(--accent-primary)" filter="url(#crystal-glow)" />
          <circle r="3" fill="#ffffff" />
        </g>
      </svg>
    </div>
  )
}
