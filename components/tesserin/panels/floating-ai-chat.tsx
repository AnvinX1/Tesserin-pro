"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { FiSend, FiWifi, FiWifiOff, FiLoader, FiPlus, FiCopy, FiCheck, FiX, FiChevronDown, FiAlertTriangle, FiFileText } from "react-icons/fi"
import { HiOutlineSparkles, HiOutlineCpuChip } from "react-icons/hi2"
import { useNotes } from "@/lib/notes-store"

/**
 * FloatingAIChat
 *
 * A floating AI assistant button that expands into a chat popup.
 * Positioned in the bottom-right corner of the viewport.
 * Supports Ollama streaming (direct HTTP) and insert-to-note.
 */

const OLLAMA_ENDPOINT = "http://localhost:11434"

interface ChatMessage {
    role: "user" | "assistant" | "system"
    content: string
    isError?: boolean
}

export function FloatingAIChat() {
    const [isOpen, setIsOpen] = useState(false)
    const [chatInput, setChatInput] = useState("")
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "Hi! I'm your Tesserin AI. Ask me anything — I can help brainstorm, summarize, or draft content for your notes.",
        },
    ])
    const [isLoading, setIsLoading] = useState(false)
    const [isConnected, setIsConnected] = useState<boolean | null>(null)
    const [selectedModel, setSelectedModel] = useState("llama3.2")
    const [availableModels, setAvailableModels] = useState<string[]>([])
    const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
    const [insertedIdx, setInsertedIdx] = useState<number | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const abortRef = useRef<AbortController | null>(null)

    const { selectedNoteId, notes, updateNote } = useNotes()
    const selectedNote = notes.find(n => n.id === selectedNoteId) || null

    // Check Ollama connection on mount
    useEffect(() => {
        checkConnection()
    }, [])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 200)
        }
    }, [isOpen])

    const checkConnection = useCallback(async () => {
        // Try Electron IPC first
        if (typeof window !== "undefined" && window.tesserin?.ai) {
            try {
                const result = await window.tesserin.ai.checkConnection()
                setIsConnected(result.connected)
                if (result.connected) {
                    const models = await window.tesserin.ai.listModels()
                    setAvailableModels(models)
                    if (models.length > 0 && !models.includes(selectedModel)) {
                        setSelectedModel(models[0])
                    }
                }
                return
            } catch {
                // Fall through to direct HTTP
            }
        }

        // Direct HTTP to Ollama
        try {
            const res = await fetch(`${OLLAMA_ENDPOINT}/api/version`, {
                signal: AbortSignal.timeout(3000),
            })
            if (res.ok) {
                setIsConnected(true)
                const tagRes = await fetch(`${OLLAMA_ENDPOINT}/api/tags`)
                if (tagRes.ok) {
                    const data = (await tagRes.json()) as { models?: Array<{ name: string }> }
                    const models = (data.models || []).map((m: { name: string }) => m.name)
                    setAvailableModels(models)
                    if (models.length > 0 && !models.includes(selectedModel)) {
                        setSelectedModel(models[0])
                    }
                }
            } else {
                setIsConnected(false)
            }
        } catch {
            setIsConnected(false)
        }
    }, [selectedModel])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const insertToNote = useCallback(
        (text: string, idx: number) => {
            if (!selectedNoteId || !selectedNote) return
            const separator = selectedNote.content.endsWith("\n") ? "\n" : "\n\n"
            const newContent = selectedNote.content + separator + "---\n\n" + text + "\n"
            updateNote(selectedNoteId, { content: newContent })
            setInsertedIdx(idx)
            setTimeout(() => setInsertedIdx(null), 2000)
        },
        [selectedNoteId, selectedNote, updateNote],
    )

    const copyToClipboard = useCallback(async (text: string, idx: number) => {
        await navigator.clipboard.writeText(text)
        setCopiedIdx(idx)
        setTimeout(() => setCopiedIdx(null), 2000)
    }, [])

    const streamOllamaHttp = useCallback(
        async (allMessages: ChatMessage[]) => {
            const assistantMsg: ChatMessage = { role: "assistant", content: "" }
            setMessages(prev => [...prev, assistantMsg])

            const controller = new AbortController()
            abortRef.current = controller

            try {
                const res = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: allMessages.map(m => ({ role: m.role, content: m.content })),
                        stream: true,
                    }),
                    signal: controller.signal,
                })

                if (!res.ok) throw new Error(`Ollama ${res.status}`)

                const reader = res.body?.getReader()
                if (!reader) throw new Error("No response body")

                const decoder = new TextDecoder()
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    const text = decoder.decode(value, { stream: true })
                    const lines = text.split("\n").filter(Boolean)

                    for (const line of lines) {
                        try {
                            const json = JSON.parse(line)
                            if (json.message?.content) {
                                setMessages(prev => {
                                    const updated = [...prev]
                                    const last = updated[updated.length - 1]
                                    if (last.role === "assistant") {
                                        updated[updated.length - 1] = { ...last, content: last.content + json.message.content }
                                    }
                                    return updated
                                })
                            }
                        } catch {
                            // skip
                        }
                    }
                }
            } catch (err: unknown) {
                if (err instanceof Error && err.name === "AbortError") return
                setMessages(prev => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    if (last.role === "assistant" && last.content === "") {
                        updated[updated.length - 1] = {
                            role: "assistant",
                            content: `Error: ${err instanceof Error ? err.message : String(err)}. Is Ollama running?`,
                            isError: true,
                        }
                    }
                    return updated
                })
            } finally {
                setIsLoading(false)
                abortRef.current = null
            }
        },
        [selectedModel],
    )

    const sendMessage = useCallback(async () => {
        const text = chatInput.trim()
        if (!text || isLoading) return

        const userMsg: ChatMessage = { role: "user", content: text }
        setMessages(prev => [...prev, userMsg])
        setChatInput("")
        setIsLoading(true)

        const allMessages = [...messages, userMsg]

        // Electron IPC
        if (typeof window !== "undefined" && window.tesserin?.ai && isConnected) {
            try {
                const assistantMsg: ChatMessage = { role: "assistant", content: "" }
                setMessages(prev => [...prev, assistantMsg])

                const stream = window.tesserin.ai.chatStream(
                    allMessages.map(m => ({ role: m.role, content: m.content })),
                    selectedModel,
                )
                stream.onChunk((chunk: string) => {
                    setMessages(prev => {
                        const updated = [...prev]
                        const last = updated[updated.length - 1]
                        if (last.role === "assistant") {
                            updated[updated.length - 1] = { ...last, content: last.content + chunk }
                        }
                        return updated
                    })
                })
                stream.onDone(() => setIsLoading(false))
                stream.onError((error: string) => {
                    setMessages(prev => {
                        const updated = [...prev]
                        updated[updated.length - 1] = { role: "assistant", content: `Error: ${error}`, isError: true }
                        return updated
                    })
                    setIsLoading(false)
                })
                return
            } catch {
                // Fall through
            }
        }

        // Direct HTTP
        if (isConnected) {
            await streamOllamaHttp(allMessages)
            return
        }

        // Demo fallback
        setTimeout(() => {
            const demos = [
                "I'd be happy to help! Use [[wiki-links]] to connect related notes and build your knowledge graph.",
                "Try organizing ideas using the Kanban board for project tracking.",
                "Press **Cmd+K** to open the search palette and quickly find notes.",
                "Break complex ideas into atomic notes — one idea per note, then link them together.",
                "Use Daily Notes to build a journaling habit. It auto-creates an entry for each day!",
            ]
            setMessages(prev => [
                ...prev,
                { role: "assistant", content: demos[Math.floor(Math.random() * demos.length)] },
            ])
            setIsLoading(false)
        }, 800 + Math.random() * 1200)
    }, [chatInput, messages, isLoading, isConnected, selectedModel, streamOllamaHttp])

    /* ── Floating Button (closed state) ── */
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
                style={{
                    background: "linear-gradient(135deg, #facc15 0%, #f59e0b 100%)",
                    boxShadow: "0 8px 32px rgba(250, 204, 21, 0.4), 0 2px 8px rgba(0,0,0,0.2)",
                }}
                aria-label="Open AI Assistant"
            >
                <HiOutlineSparkles size={24} className="text-gray-900" />
            </button>
        )
    }

    /* ── Chat Popup (open state) ── */
    return (
        <div
            className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
            style={{
                width: "380px",
                height: "520px",
                background: "var(--bg-panel)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px var(--border-dark)",
                backdropFilter: "blur(20px)",
            }}
        >
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center justify-between shrink-0"
                style={{
                    background: "linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, transparent 100%)",
                    borderBottom: "1px solid var(--border-dark)",
                }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #facc15, #f59e0b)" }}
                    >
                        <HiOutlineSparkles size={16} className="text-gray-900" />
                    </div>
                    <div>
                        <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                            Tesserin AI
                        </div>
                        <div className="flex items-center gap-1 text-[9px]">
                            {isConnected === true && (
                                <span style={{ color: "#22c55e" }} className="flex items-center gap-0.5">
                                    <FiWifi size={8} /> Connected
                                </span>
                            )}
                            {isConnected === false && (
                                <button onClick={checkConnection} style={{ color: "#ef4444" }} className="flex items-center gap-0.5 hover:opacity-80">
                                    <FiWifiOff size={8} /> Reconnect
                                </button>
                            )}
                            {isConnected === null && (
                                <span style={{ color: "var(--text-tertiary)" }}>Demo Mode</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Model selector */}
                    {availableModels.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedModel}
                                onChange={e => setSelectedModel(e.target.value)}
                                className="appearance-none skeuo-inset pl-2 pr-5 py-1 text-[9px] rounded-lg focus:outline-none cursor-pointer"
                                style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-panel-inset)", maxWidth: "100px" }}
                            >
                                {availableModels.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <FiChevronDown size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
                        </div>
                    )}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="skeuo-btn p-1.5 rounded-lg"
                        aria-label="Close AI chat"
                    >
                        <FiX size={12} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[85%] group">
                            <div
                                className="px-3 py-2 rounded-2xl text-xs leading-relaxed"
                                style={{
                                    backgroundColor: msg.role === "user" ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                                    color: msg.role === "user" ? "var(--text-on-accent)" : "var(--text-primary)",
                                    boxShadow: msg.role === "user" ? "0 2px 8px rgba(250, 204, 21, 0.3)" : "var(--input-inner-shadow)",
                                    borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                                    borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
                                }}
                            >
                                {msg.content}
                                {msg.role === "assistant" && (msg as any).isError && (
                                    <FiAlertTriangle className="inline-block ml-2 text-red-500" size={12} />
                                )}
                                {msg.role === "assistant" && i === messages.length - 1 && isLoading && (
                                    <span className="inline-block ml-1 animate-pulse">▊</span>
                                )}
                            </div>

                            {/* Action buttons */}
                            {msg.role === "assistant" && msg.content && !(i === messages.length - 1 && isLoading) && (
                                <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => insertToNote(msg.content, i)}
                                        disabled={!selectedNoteId}
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium hover:opacity-80 disabled:opacity-30 transition-colors"
                                        style={{ color: insertedIdx === i ? "#22c55e" : "var(--accent-primary)" }}
                                        title={selectedNoteId ? `Insert into "${selectedNote?.title}"` : "Select a note first"}
                                    >
                                        {insertedIdx === i ? <FiCheck size={8} /> : <FiPlus size={8} />}
                                        {insertedIdx === i ? "Inserted!" : "Insert"}
                                    </button>
                                    <button
                                        onClick={() => copyToClipboard(msg.content, i)}
                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium hover:opacity-80"
                                        style={{ color: copiedIdx === i ? "#22c55e" : "var(--text-tertiary)" }}
                                    >
                                        {copiedIdx === i ? <FiCheck size={8} /> : <FiCopy size={8} />}
                                        {copiedIdx === i ? "Copied" : "Copy"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-3 shrink-0" style={{ borderTop: "1px solid var(--border-dark)" }}>
                {selectedNote && (
                    <div className="text-[9px] mb-1.5 px-1 truncate flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
                        <FiFileText size={10} />
                        {selectedNote.title}
                    </div>
                )}
                <div className="relative">
                    <input
                        ref={inputRef}
                        className="w-full skeuo-inset py-2.5 pl-3 pr-10 text-xs focus:outline-none rounded-xl"
                        style={{ color: "var(--text-primary)" }}
                        placeholder={isLoading ? "Thinking..." : "Ask AI anything..."}
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                sendMessage()
                            }
                        }}
                        disabled={isLoading}
                        aria-label="AI chat input"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !chatInput.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 skeuo-btn p-1.5 rounded-lg disabled:opacity-30"
                        aria-label="Send message"
                    >
                        {isLoading ? <FiLoader size={12} className="animate-spin" /> : <FiSend size={12} />}
                    </button>
                </div>
            </div>
        </div>
    )
}
