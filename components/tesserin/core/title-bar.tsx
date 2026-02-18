import React from "react"
import { FiMinus, FiSquare, FiX } from "react-icons/fi"
import { TesserinLogo } from "./tesserin-logo"

/**
 * TitleBar
 *
 * Custom frameless title bar for the Electron window.
 * Provides drag region, window controls, and branding.
 */
export function TitleBar() {
    const isElectron = typeof window !== 'undefined' && window.tesserin?.window

    const handleMinimize = () => window.tesserin?.window.minimize()
    const handleMaximize = () => window.tesserin?.window.maximize()
    const handleClose = () => window.tesserin?.window.close()

    return (
        <div
            className="titlebar-drag h-10 flex items-center justify-between px-4 shrink-0 select-none"
            style={{
                backgroundColor: "var(--bg-app)",
                borderBottom: "1px solid var(--border-dark)",
            }}
        >
            {/* Left: App title */}
            <div className="flex items-center gap-2 titlebar-no-drag">
                <TesserinLogo size={18} animated={false} />
                <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: "var(--text-tertiary)" }}
                >
                    Tesserin
                </span>
            </div>

            {/* Centre: Drag area (implicit from parent) */}

            {/* Right: Window controls */}
            {isElectron && (
                <div className="flex items-center gap-1 titlebar-no-drag">
                    <button
                        onClick={handleMinimize}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
                        aria-label="Minimize"
                    >
                        <FiMinus size={14} style={{ color: "var(--text-secondary)" }} />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
                        aria-label="Maximize"
                    >
                        <FiSquare size={11} style={{ color: "var(--text-secondary)" }} />
                    </button>
                    <button
                        onClick={handleClose}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/80 transition-colors"
                        aria-label="Close"
                    >
                        <FiX size={14} style={{ color: "var(--text-secondary)" }} />
                    </button>
                </div>
            )}
        </div>
    )
}
