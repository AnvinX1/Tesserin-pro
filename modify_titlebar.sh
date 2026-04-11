cat > components/tesserin/core/title-bar.tsx << 'INNER_EOF'
import React, { useEffect, useState } from "react"
import { FiMinus, FiSquare, FiX } from "react-icons/fi"
import { TesserinLogo } from "./tesserin-logo"
import { AnimatedIcon } from "./animated-icon"

export function TitleBar() {
    const isElectron = typeof window !== 'undefined' && window.tesserin?.window
    
    // Default to true for safety, then detect mac
    const [isMac, setIsMac] = useState(true)

    useEffect(() => {
        // Simple heuristic: if platform string contains Mac, it's macOS
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
    }, [])

    const handleMinimize = () => window.tesserin?.window.minimize()
    const handleMaximize = () => window.tesserin?.window.maximize()
    const handleClose = () => window.tesserin?.window.close()

    return (
        <div
            className="titlebar-drag h-10 flex items-center px-4 shrink-0 select-none z-50 border-b"
            style={{
                backgroundColor: "var(--bg-app)",
                borderColor: "var(--border-dark)",
                // If Mac, pad the left side so native traffic lights don't conflict with our logo
                paddingLeft: isMac && isElectron ? "80px" : "1rem"
            }}
        >
            {/* Left: App title (shifted if macOS traffic lights are present) */}
            <div className="flex items-center gap-2 titlebar-no-drag">
                <AnimatedIcon animation="pulse" size={18}>
                    <TesserinLogo size={18} animated={false} />
                </AnimatedIcon>
                <span
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: "var(--text-tertiary)" }}
                >
                    Tesserin
                </span>
            </div>

            {/* Spacer pushing right controls */}
            <div className="flex-1" />

            {/* Right: Window controls (Hide entirely on macOS, use native traffic lights) */}
            {isElectron && !isMac && (
                <div className="flex items-center gap-1 titlebar-no-drag pb-1">
                    <button
                        onClick={handleMinimize}
                        className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-dark)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        aria-label="Minimize"
                    >
                        <FiMinus size={14} style={{ color: "var(--text-secondary)" }} />
                    </button>
                    <button
                        onClick={handleMaximize}
                        className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border-dark)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        aria-label="Maximize"
                    >
                        <FiSquare size={11} style={{ color: "var(--text-secondary)" }} />
                    </button>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-500/80 transition-colors"
                        aria-label="Close"
                    >
                        <FiX size={14} style={{ color: "var(--text-secondary)" }} />
                    </button>
                </div>
            )}
        </div>
    )
}
INNER_EOF
