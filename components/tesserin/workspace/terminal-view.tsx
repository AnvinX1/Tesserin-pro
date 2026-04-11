"use client"

import React, { useEffect, useRef, useCallback, useState } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { SerializeAddon } from "@xterm/addon-serialize"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"
import { useTerminalStore, type TerminalSession } from "@/lib/terminal-store"
import { useTesserinTheme } from "@/components/tesserin/core/theme-provider"
import { FiPlus, FiX, FiExternalLink, FiTerminal } from "react-icons/fi"

/* ------------------------------------------------------------------ */
/*  Auth-URL detection                                                  */
/* ------------------------------------------------------------------ */

/** Strip ANSI escape codes so URL matching isn't fooled by color codes */
const ANSI_STRIP_RE = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g

/** Match any http/https URL in the cleaned output */
const URL_RE = /https?:\/\/[^\s\x1b\]"']+/g

/**
 * Keywords that suggest the URL is an OAuth / auth verification page.
 * Covers Google, GitHub, Microsoft, generic OAuth, and local callback servers.
 */
const AUTH_KEYWORD_RE =
  /oauth|auth\/callback|accounts\.google|github\.com\/login|microsoft\.com\/device|devicelogin|verification_uri|authorize\?|[?&]code=|[?&]token=/i

function extractAuthUrl(rawData: string): string | null {
  const clean = rawData.replace(ANSI_STRIP_RE, "")
  const matches = clean.match(URL_RE)
  if (!matches) return null
  for (const url of matches) {
    if (AUTH_KEYWORD_RE.test(url)) return url
  }
  return null
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ShellOption {
  name: string
  path: string
}

interface TerminalViewProps {
  paneId?: string
}

export function TerminalView({ paneId }: TerminalViewProps) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const serializeAddonRef = useRef<SerializeAddon | null>(null)
    const isInitializedRef = useRef(false)
    const dataHandlerRef = useRef<((...args: any[]) => void) | null>(null)
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null)
    const currentSessionIdRef = useRef<string | null>(null)

    // Shell picker state
    const [availableShells, setAvailableShells] = useState<ShellOption[]>([])
    const [selectedShell, setSelectedShell] = useState<string>("")

    // Auth URL banner state: url + dismissed flag
    const [authUrl, setAuthUrl] = useState<string | null>(null)
    const [authDismissed, setAuthDismissed] = useState(false)

    const {
        sessions, activeSessionId,
        createSession, setActiveSession, closeSession,
        updateBuffer, updateDimensions, getHistory,
        theme: terminalTheme, setTheme: setTerminalTheme,
    } = useTerminalStore()
    const { isDark } = useTesserinTheme()

    const activeSession = sessions.find(s => s.id === activeSessionId)

    /* ── Theme sync ──────────────────────────────────────────────── */

    useEffect(() => {
        const newTheme = isDark ? "dark" : "light"
        if (terminalTheme !== newTheme) setTerminalTheme(newTheme)
    }, [isDark, terminalTheme, setTerminalTheme])

    /* ── Available shells ────────────────────────────────────────── */

    useEffect(() => {
        const api = window.tesserin?.terminal
        if (!api?.getShells) return
        api.getShells().then((shells) => {
            setAvailableShells(shells)
            if (shells.length > 0 && !selectedShell) {
                setSelectedShell(shells[0].path)
            }
        }).catch(() => { /* not in Electron context */ })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Theme colours (transparent background for glass effect) ─── */

    const getThemeColors = useCallback(() => {
        const cs = getComputedStyle(document.documentElement)
        const getVar = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback

        const isCurrentlyDark = terminalTheme === "dark"
        const textPrimary  = getVar("--text-primary",   isCurrentlyDark ? "#e4e4e7" : "#1a1a1a")
        const textSecondary = getVar("--text-secondary", isCurrentlyDark ? "#888888" : "#52525b")
        const accentPrimary = getVar("--accent-primary", "#FACC15")

        // For light mode, we use darker variants of standard ANSI colors 
        // to prevent colors like "bright white" or "yellow" becoming invisible on standard light backgrounds.
        return isCurrentlyDark ? {
            background: isCurrentlyDark ? "#00000000" : "#ffffff",
            foreground: textPrimary,
            cursor: accentPrimary,
            cursorAccent: "#0d0d0d",
            selectionBackground: "rgba(63,63,70,0.8)",
            black: "#18181b",       red: "#ef4444",       green: "#22c55e",       yellow: "#eab308",
            blue: "#3b82f6",        magenta: "#a855f7",   cyan: "#06b6d4",        white: textPrimary,
            brightBlack: textSecondary, brightRed: "#f87171", brightGreen: "#4ade80",
            brightYellow: "#facc15",brightBlue: "#60a5fa",    brightMagenta: "#c084fc",
            brightCyan: "#22d3ee",  brightWhite: "#f4f4f5",
        } : {
            background: isCurrentlyDark ? "#00000000" : "#ffffff",
            foreground: textPrimary,
            cursor: accentPrimary,
            cursorAccent: "#fefefe",
            selectionBackground: "rgba(212,212,216,0.8)",
            black: "#1a1a1a",       red: "#dc2626",       green: "#16a34a",       yellow: "#ca8a04",
            blue: "#2563eb",        magenta: "#9333ea",   cyan: "#0891b2",        white: textPrimary,
            brightBlack: textSecondary, brightRed: "#b91c1c", brightGreen: "#15803d",
            brightYellow: "#b45309",brightBlue: "#1d4ed8",    brightMagenta: "#7e22ce",
            brightCyan: "#0e7490",  brightWhite: "#3f3f46", // Dark gray instead of invisible white
        }
    }, [terminalTheme])

    /* ── Live theme resync (community themes / CSS variable changes) */

    useEffect(() => {
        if (xtermRef.current) {
            xtermRef.current.options.theme = getThemeColors()
        }
        const observer = new MutationObserver(() => {
            if (xtermRef.current) xtermRef.current.options.theme = getThemeColors()
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] })
        return () => observer.disconnect()
    }, [terminalTheme, getThemeColors])

    /* ── Auto-save buffer ──────────────────────────────────────────── */

    const saveTerminalState = useCallback(() => {
        const sessionId = currentSessionIdRef.current
        if (!sessionId || !serializeAddonRef.current || !xtermRef.current) return
        try {
            const buffer = serializeAddonRef.current.serialize()
            if (buffer && buffer.length > 0) updateBuffer(sessionId, buffer)
        } catch (err) {
            console.error("[Terminal] Failed to save state:", err)
        }
    }, [updateBuffer])

    useEffect(() => {
        if (saveTimerRef.current) clearInterval(saveTimerRef.current)
        saveTimerRef.current = setInterval(saveTerminalState, 5000)
        return () => {
            if (saveTimerRef.current) { clearInterval(saveTimerRef.current); saveTimerRef.current = null }
        }
    }, [saveTerminalState])

    /* ── Terminal initialisation ───────────────────────────────────── */

    const initTerminal = useCallback(async (session: TerminalSession) => {
        if (!terminalRef.current || isInitializedRef.current) return

        const tesserin = window.tesserin
        if (!tesserin?.terminal) {
            console.error("[Terminal] Tesserin API not available")
            return
        }

        const terminalId = session.id

        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            theme: getThemeColors(),
            allowProposedApi: true,
            allowTransparency: true,   // ← required for transparent background
        })

        const fitAddon = new FitAddon()
        const serializeAddon = new SerializeAddon()

        // Web-links addon: Cmd/Ctrl+click opens URL in system browser
        const webLinksAddon = new WebLinksAddon((_e, url) => {
            tesserin.terminal?.openExternal?.(url)
        })

        terminal.loadAddon(fitAddon)
        terminal.loadAddon(serializeAddon)
        terminal.loadAddon(webLinksAddon)

        terminal.open(terminalRef.current)
        fitAddon.fit()

        xtermRef.current       = terminal
        fitAddonRef.current    = fitAddon
        serializeAddonRef.current = serializeAddon
        isInitializedRef.current  = true

        // Restore history if available
        const savedBuffer = getHistory(session.id)
        if (savedBuffer) {
            try { terminal.write(savedBuffer) } catch {}
        }

        try {
            const result = await tesserin.terminal.spawn(
                terminalId,
                undefined,
                selectedShell || undefined,
            )

            if (!result.success) {
                terminal.writeln(`\x1b[31mFailed to start terminal: ${result.error}\x1b[0m`)
                return
            }

            if (!savedBuffer && !result.reconnected) {
                terminal.writeln("\x1b[32mTerminal ready\x1b[0m")
                terminal.writeln("")
            }

            // Data handler: write to xterm AND scan for auth URLs
            const dataHandler = (data: string) => {
                terminal.write(data)
                const detected = extractAuthUrl(data)
                if (detected) {
                    setAuthUrl(detected)
                    setAuthDismissed(false)
                }
            }

            dataHandlerRef.current = dataHandler
            tesserin.terminal.onData(terminalId, dataHandler)

            terminal.onData((data) => {
                tesserin.terminal?.write(terminalId, data)
            })

            terminal.onResize(({ cols, rows }) => {
                tesserin.terminal?.resize(terminalId, cols, rows)
                updateDimensions(session.id, cols, rows)
            })

            const resizeObserver = new ResizeObserver(() => {
                if (fitAddonRef.current && xtermRef.current) {
                    fitAddonRef.current.fit()
                    const { cols, rows } = xtermRef.current
                    tesserin.terminal?.resize(terminalId, cols, rows)
                    updateDimensions(session.id, cols, rows)
                }
            })
            resizeObserver.observe(terminalRef.current)

            return () => {
                saveTerminalState()
                if (dataHandlerRef.current) {
                    tesserin.terminal?.offData(dataHandlerRef.current)
                    dataHandlerRef.current = null
                }
                resizeObserver.disconnect()
            }
        } catch (err) {
            terminal.writeln(`\x1b[31mError: ${err}\x1b[0m`)
        }
    }, [getThemeColors, getHistory, updateDimensions, saveTerminalState, selectedShell])

    /* ── Create first session if none exist ───────────────────────── */

    useEffect(() => {
        if (sessions.length === 0) createSession()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Switch sessions ───────────────────────────────────────────── */

    useEffect(() => {
        if (!activeSession) return
        if (currentSessionIdRef.current === activeSession.id && isInitializedRef.current) return

        // Tear down current UI (keep PTY alive)
        if (xtermRef.current && currentSessionIdRef.current !== activeSession.id) {
            saveTerminalState()
            if (dataHandlerRef.current && window.tesserin?.terminal) {
                window.tesserin.terminal.offData(dataHandlerRef.current)
                dataHandlerRef.current = null
            }
            xtermRef.current.dispose()
            xtermRef.current = null
            fitAddonRef.current = null
            serializeAddonRef.current = null
            isInitializedRef.current = false
        }

        // Reset auth banner on session switch
        setAuthUrl(null)
        setAuthDismissed(false)

        currentSessionIdRef.current = activeSession.id
        let cleanup: (() => void) | undefined
        initTerminal(activeSession).then(fn => { cleanup = fn })

        return () => {
            saveTerminalState()
            if (dataHandlerRef.current && window.tesserin?.terminal) {
                window.tesserin.terminal.offData(dataHandlerRef.current)
                dataHandlerRef.current = null
            }
        }
    }, [activeSession?.id]) // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Glass-panel colours (transparent over app background) ────── */

    const glassBg   = terminalTheme === "dark" ? "rgba(13,13,13,0.72)"    : "rgba(250,250,250,0.72)"
    const headerBg  = terminalTheme === "dark" ? "rgba(20,20,22,0.80)"    : "rgba(242,242,244,0.80)"
    const borderClr = terminalTheme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)"
    const textColor = terminalTheme === "dark" ? "#e4e4e7"                : "#1a1a1a"
    const textMuted = terminalTheme === "dark" ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.32)"
    const tabActive = terminalTheme === "dark" ? "rgba(42,42,46,0.90)"    : "rgba(255,255,255,0.90)"

    return (
        <div
            className="h-full w-full flex flex-col overflow-hidden rounded-xl"
            style={{
                background: glassBg,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: `1px solid ${borderClr}`,
            }}
        >
            {/* ── Header: session tabs + shell picker ──────────────────── */}
            <div
                className="flex items-center gap-1.5 px-2 py-1.5 flex-shrink-0 border-b"
                style={{ background: headerBg, borderBottomColor: borderClr }}
            >
                {/* Session tabs */}
                <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
                    {sessions.map((session) => {
                        const isActive = session.id === activeSessionId
                        return (
                            <div
                                key={session.id}
                                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition-all flex-shrink-0 select-none"
                                style={{
                                    background: isActive ? tabActive : "transparent",
                                    color: isActive ? textColor : textMuted,
                                    fontSize: "12px",
                                    fontWeight: isActive ? 500 : 400,
                                    border: isActive ? `1px solid ${borderClr}` : "1px solid transparent",
                                }}
                                onClick={() => setActiveSession(session.id)}
                            >
                                <FiTerminal size={11} style={{ flexShrink: 0 }} />
                                <span className="max-w-[80px] truncate">{session.name}</span>
                                {sessions.length > 1 && (
                                    <button
                                        title="Close terminal"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity rounded"
                                        style={{ padding: "1px 2px" }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            window.tesserin?.terminal?.kill(session.id)
                                            closeSession(session.id)
                                        }}
                                    >
                                        <FiX size={10} />
                                    </button>
                                )}
                            </div>
                        )
                    })}
                    <button
                        title="New terminal"
                        className="flex items-center justify-center rounded-lg transition-all flex-shrink-0 hover:opacity-70"
                        style={{ width: 24, height: 24, color: textMuted }}
                        onClick={() => createSession()}
                    >
                        <FiPlus size={13} />
                    </button>
                </div>

                {/* Shell picker — only shown when multiple shells are available */}
                {availableShells.length > 1 && (
                    <select
                        value={selectedShell}
                        onChange={(e) => setSelectedShell(e.target.value)}
                        title="Select shell"
                        className="flex-shrink-0 rounded-lg px-2 py-0.5 cursor-pointer transition-all"
                        style={{
                            background: "transparent",
                            border: `1px solid ${borderClr}`,
                            color: textMuted,
                            fontSize: "11px",
                            outline: "none",
                            maxWidth: 120,
                        }}
                    >
                        {availableShells.map((s) => (
                            <option key={s.path} value={s.path}>{s.name}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* ── Auth / OAuth URL banner ───────────────────────────────── */}
            {authUrl && !authDismissed && (
                <div
                    className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
                    style={{
                        background: "rgba(250,204,21,0.07)",
                        borderBottom: "1px solid rgba(250,204,21,0.18)",
                    }}
                >
                    <FiExternalLink size={12} style={{ color: "#facc15", flexShrink: 0 }} />
                    <span
                        className="flex-1 min-w-0 truncate"
                        style={{ fontSize: "11px", color: "rgba(250,204,21,0.85)" }}
                    >
                        Authentication required — agent needs browser access
                    </span>
                    <button
                        onClick={() => window.tesserin?.terminal?.openExternal?.(authUrl)}
                        className="flex-shrink-0 px-2.5 py-0.5 rounded-md font-medium transition-all hover:brightness-110 active:scale-95"
                        style={{
                            background: "rgba(250,204,21,0.14)",
                            border: "1px solid rgba(250,204,21,0.28)",
                            color: "#facc15",
                            fontSize: "11px",
                        }}
                    >
                        Open in browser ↗
                    </button>
                    <button
                        title="Dismiss"
                        onClick={() => setAuthDismissed(true)}
                        className="flex-shrink-0 transition-opacity hover:opacity-80"
                        style={{ color: "rgba(250,204,21,0.5)" }}
                    >
                        <FiX size={12} />
                    </button>
                </div>
            )}

            {/* ── xterm.js canvas ──────────────────────────────────────── */}
            <div
                ref={terminalRef}
                className="flex-1 overflow-hidden"
                style={{ padding: "4px 8px", minHeight: 0 }}
            />
        </div>
    )
}
