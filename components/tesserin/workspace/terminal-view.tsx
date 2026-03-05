"use client"

import React, { useEffect, useRef, useCallback } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import "@xterm/xterm/css/xterm.css"

interface TerminalViewProps {
    paneId?: string
}

export function TerminalView({ paneId }: TerminalViewProps) {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)
    const terminalIdRef = useRef<string>(`terminal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`)
    const isInitializedRef = useRef(false)
    const dataHandlerRef = useRef<(...args: any[]) => void | null>(null)

    const initTerminal = useCallback(async () => {
        if (!terminalRef.current || isInitializedRef.current) return

        const tesserin = window.tesserin
        if (!tesserin?.terminal) {
            console.error("[Terminal] Tesserin API not available")
            return
        }

        const terminalId = terminalIdRef.current

        const terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            theme: {
                background: "#0d0d0d",
                foreground: "#e4e4e7",
                cursor: "#a1a1aa",
                cursorAccent: "#0d0d0d",
                selectionBackground: "#3f3f46",
                black: "#18181b",
                red: "#ef4444",
                green: "#22c55e",
                yellow: "#eab308",
                blue: "#3b82f6",
                magenta: "#a855f7",
                cyan: "#06b6d4",
                white: "#e4e4e7",
                brightBlack: "#3f3f46",
                brightRed: "#f87171",
                brightGreen: "#4ade80",
                brightYellow: "#facc15",
                brightBlue: "#60a5fa",
                brightMagenta: "#c084fc",
                brightCyan: "#22d3ee",
                brightWhite: "#f4f4f5",
            },
            allowProposedApi: true,
        })

        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)

        terminal.open(terminalRef.current)
        fitAddon.fit()

        xtermRef.current = terminal
        fitAddonRef.current = fitAddon
        isInitializedRef.current = true

        try {
            const result = await tesserin.terminal.spawn(terminalId)

            if (!result.success) {
                terminal.writeln(`\x1b[31mFailed to start terminal: ${result.error}\x1b[0m`)
                return
            }

            terminal.writeln(`\x1b[32mTerminal started (PID: ${result.pid})\x1b[0m`)

            const dataHandler = (data: string) => {
                terminal.write(data)
            }

            dataHandlerRef.current = dataHandler
            tesserin.terminal.onData(terminalId, dataHandler)

            terminal.onData((data) => {
                tesserin.terminal?.write(terminalId, data)
            })

            terminal.onResize(({ cols, rows }) => {
                tesserin.terminal?.resize(terminalId, cols, rows)
            })

            const resizeObserver = new ResizeObserver(() => {
                if (fitAddonRef.current && xtermRef.current) {
                    fitAddonRef.current.fit()
                    const { cols, rows } = xtermRef.current
                    tesserin.terminal?.resize(terminalId, cols, rows)
                }
            })

            resizeObserver.observe(terminalRef.current)

            terminal.writeln("")
            terminal.writeln("\x1b[90mType commands to interact with your system terminal.\x1b[0m")
            terminal.writeln("")

            const cleanup = () => {
                if (dataHandlerRef.current) {
                    tesserin.terminal?.offData(dataHandlerRef.current)
                    dataHandlerRef.current = null
                }
                tesserin.terminal?.kill(terminalId)
                resizeObserver.disconnect()
            }

            return cleanup
        } catch (err) {
            terminal.writeln(`\x1b[31mError: ${err}\x1b[0m`)
        }
    }, [])

    useEffect(() => {
        let cleanup: (() => void) | undefined

        initTerminal().then((cleanupFn) => {
            cleanup = cleanupFn
        })

        return () => {
            if (xtermRef.current) {
                xtermRef.current.dispose()
                xtermRef.current = null
                isInitializedRef.current = false
            }
            if (cleanup) cleanup()
        }
    }, [initTerminal])

    return (
        <div className="h-full w-full flex flex-col overflow-hidden bg-[#0d0d0d]">
            <div
                ref={terminalRef}
                className="flex-1 p-2 overflow-hidden"
                style={{ minHeight: 0 }}
            />
        </div>
    )
}
