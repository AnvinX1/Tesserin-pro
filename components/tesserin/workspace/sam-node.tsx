"use client"

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react"
import {
  FiSend,
  FiWifi,
  FiWifiOff,
  FiLoader,
  FiPlus,
  FiCopy,
  FiCheck,
  FiTrash2,
  FiFileText,
  FiTag,
  FiLink2,
  FiBookOpen,
  FiMessageSquare,
  FiChevronDown,
  FiAlertTriangle,
  FiZap,
  FiEdit3,
  FiRefreshCw,
  FiSquare,
  FiList,
  FiFeather,
  FiArrowDownCircle,
} from "react-icons/fi"
import {
  HiOutlineSparkles,
  HiOutlineCpuChip,
} from "react-icons/hi2"
import { useNotes } from "@/lib/notes-store"
import { renderMarkdown } from "@/lib/markdown-renderer"

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const OLLAMA_ENDPOINT = "http://localhost:11434"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
  isError?: boolean
  createdNoteId?: string
  insertedToNote?: boolean
  timestamp: number
}

interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

/* ------------------------------------------------------------------ */
/*  SAM System Prompt                                                   */
/* ------------------------------------------------------------------ */

const SAM_SYSTEM_PROMPT = `You are SAM — Simulated Adaptive Matrix — a personal AI embedded inside Tesserin, a premium knowledge-management application.

PERSONALITY
- Calm, precise, helpful — a research partner, never a chatbot.
- Speak with quiet confidence. Never over-explain.
- Use clean **markdown** formatting.
- Never start with filler ("Sure!", "Of course!", "Here you go!", "Here is what you requested", "Absolutely!", "Certainly!"). Jump straight to the substance.

RULES FOR NOTE CONTENT
When the user asks you to write, draft, or create a note:
1. Start the content directly — NO preamble, NO "Here is…", NO commentary before or after the note body.
2. Use a markdown heading as the first line (# Title).
3. Write clean, well-structured markdown with proper headings, lists, code blocks.
4. Do NOT wrap the note in a code fence. Just write the markdown directly.
5. Do NOT add a sign-off like "Let me know if you need changes".

CAPABILITIES
- **Create Note** — draft new notes directly into the vault
- **Summarize** — summarize the currently selected note (2-3 sentences)
- **Suggest Tags** — recommend 3-5 concise tags (single-word or hyphenated)
- **Find Connections** — suggest wiki-links ([[Title]]) to related notes
- **Expand** — elaborate on a topic or section
- **Outline** — create a structured outline for a topic
- **Brainstorm** — generate ideas around a theme
- **Rewrite** — improve or rewrite selected note content

When summarizing, give only the summary — no "Here is the summary:" prefix.
When suggesting tags, return a bulleted list with one-line explanations.
When suggesting links, explain each connection briefly.

Keep responses focused and concise unless the user asks for detail.`

/* ------------------------------------------------------------------ */
/*  AI Fluff Stripper                                                   */
/* ------------------------------------------------------------------ */

/**
 * Strip common AI preamble / postamble from content before saving as a note.
 * This ensures notes are clean markdown without "Here is what you requested" etc.
 */
function stripAIFluff(content: string): string {
  let text = content.trim()

  // Remove common AI preamble patterns (case-insensitive, first paragraph only)
  const preamblePatterns = [
    /^(?:Sure[!,.]?\s*)?(?:Here(?:'s| is| are)\s+(?:the|a|an|your)\s+(?:note|draft|content|summary|outline|response|result|text|rewrite|version|updated|revised|expanded)[\s\S]*?(?::\s*\n|—\s*\n|\.\s*\n))/i,
    /^(?:Certainly[!,.]?\s*)?(?:Here(?:'s| is| are)\s+(?:what you (?:requested|asked for|wanted))[\s\S]*?(?::\s*\n|—\s*\n|\.\s*\n))/i,
    /^(?:Absolutely[!,.]?\s*)?(?:I(?:'ve| have)\s+(?:created|drafted|written|prepared|put together)[\s\S]*?(?::\s*\n|—\s*\n|\.\s*\n))/i,
    /^(?:Of course[!,.]?\s*)?(?:(?:Let me|I'll)\s+(?:create|draft|write|prepare)[\s\S]*?(?::\s*\n|—\s*\n|\.\s*\n))/i,
    /^(?:Sure|Certainly|Absolutely|Of course|Great|Alright|Okay)[!,.]?\s*\n+/i,
    /^(?:Here(?:'s| is| are))\s+(?:the|a|your)\s+[\w\s]+(?::\s*\n)/i,
  ]

  for (const pattern of preamblePatterns) {
    text = text.replace(pattern, "")
  }

  // Remove common AI sign-off patterns (last paragraph)
  const signoffPatterns = [
    /\n+(?:Let me know|Feel free|Hope this helps|I hope this|Would you like|Shall I|Do you want|If you (?:need|want|have)|Is there anything)[\s\S]*$/i,
    /\n+---\n+(?:Let me know|Feel free)[\s\S]*$/i,
  ]

  for (const pattern of signoffPatterns) {
    text = text.replace(pattern, "")
  }

  // Remove wrapping code fences if the AI wrapped the whole note in them
  const fenceMatch = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/)
  if (fenceMatch) {
    text = fenceMatch[1]
  }

  return text.trim()
}

/* ------------------------------------------------------------------ */
/*  Quick Actions                                                       */
/* ------------------------------------------------------------------ */

interface QuickAction {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  requiresNote: boolean
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "create-note",
    label: "Create Note",
    icon: <FiPlus size={13} />,
    description: "Draft a new note into your vault",
    requiresNote: false,
  },
  {
    id: "summarize",
    label: "Summarize",
    icon: <FiBookOpen size={13} />,
    description: "Summarize the current note",
    requiresNote: true,
  },
  {
    id: "suggest-tags",
    label: "Tags",
    icon: <FiTag size={13} />,
    description: "Suggest tags for the note",
    requiresNote: true,
  },
  {
    id: "find-connections",
    label: "Links",
    icon: <FiLink2 size={13} />,
    description: "Discover related notes",
    requiresNote: true,
  },
  {
    id: "outline",
    label: "Outline",
    icon: <FiList size={13} />,
    description: "Create a structured outline",
    requiresNote: false,
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    icon: <FiZap size={13} />,
    description: "Generate ideas around a theme",
    requiresNote: false,
  },
  {
    id: "expand",
    label: "Expand",
    icon: <FiFeather size={13} />,
    description: "Elaborate on the current note",
    requiresNote: true,
  },
  {
    id: "rewrite",
    label: "Rewrite",
    icon: <FiRefreshCw size={13} />,
    description: "Improve current note writing",
    requiresNote: true,
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" })
}

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem("tesserin:sam:conversations")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveConversations(convos: Conversation[]) {
  localStorage.setItem("tesserin:sam:conversations", JSON.stringify(convos))
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function SAMNode() {
  /* ---- Notes store ---- */
  const { notes, selectedNoteId, selectNote, addNote, updateNote } = useNotes()

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId],
  )

  const existingTitles = useMemo(
    () => new Set(notes.map((n) => n.title.toLowerCase())),
    [notes],
  )

  /* ---- Conversation state ---- */
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations)
  const [activeConvoId, setActiveConvoId] = useState<string | null>(() => {
    const convos = loadConversations()
    return convos.length > 0 ? convos[0].id : null
  })

  const activeConvo = useMemo(
    () => conversations.find((c) => c.id === activeConvoId) ?? null,
    [conversations, activeConvoId],
  )
  const messages = activeConvo?.messages ?? []

  /* ---- Chat UI state ---- */
  const [chatInput, setChatInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [selectedModel, setSelectedModel] = useState("llama3.2")
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const streamRef = useRef<{ cancel: () => void } | null>(null)

  /* ---- Persist conversations ---- */
  useEffect(() => {
    saveConversations(conversations)
  }, [conversations])

  /* ---- Ollama connection ---- */
  useEffect(() => {
    checkConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkConnection = useCallback(async () => {
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
        /* fall through */
      }
    }
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

  /* ---- Auto-scroll ---- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  /* ---- Focus input ---- */
  useEffect(() => {
    inputRef.current?.focus()
  }, [activeConvoId])

  /* ---- Auto-resize textarea ---- */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target
    setChatInput(el.value)
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }, [])

  /* ---- Conversation CRUD ---- */
  const createConversation = useCallback((): string => {
    const id = generateId()
    const now = Date.now()
    const welcome: ChatMessage = {
      role: "assistant",
      content:
        "I'm **SAM** — your Simulated Adaptive Matrix.\n\nI can help you draft notes, summarise content, suggest connections, brainstorm ideas, and more. Ask me anything or use the **quick actions** below.",
      timestamp: now,
    }
    const convo: Conversation = {
      id,
      title: "New Conversation",
      messages: [welcome],
      createdAt: now,
      updatedAt: now,
    }
    setConversations((prev) => [convo, ...prev])
    setActiveConvoId(id)
    return id
  }, [])

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeConvoId === id) setActiveConvoId(null)
    },
    [activeConvoId],
  )

  const clearConversation = useCallback(() => {
    if (!activeConvoId) return
    const now = Date.now()
    const welcome: ChatMessage = {
      role: "assistant",
      content: "Conversation cleared. How can I help?",
      timestamp: now,
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvoId
          ? { ...c, messages: [welcome], updatedAt: now }
          : c,
      ),
    )
  }, [activeConvoId])

  const updateConvoMessages = useCallback(
    (convoId: string, updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convoId
            ? { ...c, messages: updater(c.messages), updatedAt: Date.now() }
            : c,
        ),
      )
    },
    [],
  )

  /* ---- Clipboard ---- */
  const copyToClipboard = useCallback(async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }, [])

  /* ---- Create note from message ---- */
  const createNoteFromMessage = useCallback(
    (rawContent: string, msgIdx: number) => {
      const content = stripAIFluff(rawContent)
      const lines = content.split("\n").filter(Boolean)
      let title = "SAM Note"
      let body = content

      // Extract title from first heading or short first line
      if (lines[0]?.startsWith("#")) {
        title = lines[0].replace(/^#+\s*/, "").trim()
        body = lines.slice(1).join("\n").trim()
      } else if (lines[0] && lines[0].length <= 60) {
        title = lines[0]
        body = lines.slice(1).join("\n").trim()
      }

      const noteId = addNote(title)
      if (body) updateNote(noteId, { content: body })
      selectNote(noteId)

      if (activeConvoId) {
        updateConvoMessages(activeConvoId, (msgs) =>
          msgs.map((m, i) => (i === msgIdx ? { ...m, createdNoteId: noteId } : m)),
        )
      }
    },
    [addNote, updateNote, selectNote, activeConvoId, updateConvoMessages],
  )

  /* ---- Insert / append to current note ---- */
  const insertToCurrentNote = useCallback(
    (rawContent: string, msgIdx: number) => {
      if (!selectedNoteId || !selectedNote) return
      const content = stripAIFluff(rawContent)
      const separator = selectedNote.content.endsWith("\n") ? "\n" : "\n\n"
      const newContent = selectedNote.content + separator + content + "\n"
      updateNote(selectedNoteId, { content: newContent })

      if (activeConvoId) {
        updateConvoMessages(activeConvoId, (msgs) =>
          msgs.map((m, i) => (i === msgIdx ? { ...m, insertedToNote: true } : m)),
        )
      }
    },
    [selectedNoteId, selectedNote, updateNote, activeConvoId, updateConvoMessages],
  )

  /* ---- Stop generation ---- */
  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    // Also cancel any active IPC stream
    if (streamRef.current) {
      streamRef.current.cancel()
      streamRef.current = null
    }
    setIsLoading(false)
  }, [])

  /* ---- Cleanup IPC listeners on unmount ---- */
  useEffect(() => {
    return () => {
      streamRef.current?.cancel()
    }
  }, [])

  /* ---- Streaming send ---- */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      let convoId = activeConvoId
      if (!convoId) {
        convoId = createConversation()
      }

      const userMsg: ChatMessage = { role: "user", content: trimmed, timestamp: Date.now() }
      const assistantMsg: ChatMessage = { role: "assistant", content: "", timestamp: Date.now() }

      // Update title from first user message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convoId) return c
          const isFirstUser = c.messages.filter((m) => m.role === "user").length === 0
          return {
            ...c,
            title: isFirstUser ? trimmed.slice(0, 50) + (trimmed.length > 50 ? "…" : "") : c.title,
            messages: [...c.messages, userMsg, assistantMsg],
            updatedAt: Date.now(),
          }
        }),
      )

      setChatInput("")
      if (inputRef.current) inputRef.current.style.height = "auto"
      setIsLoading(true)

      // Build context
      const currentConvo = conversations.find((c) => c.id === convoId)
      const history = currentConvo?.messages ?? []
      const allMsgs = [...history, userMsg]

      let systemPrompt = SAM_SYSTEM_PROMPT
      if (selectedNote) {
        systemPrompt += `\n\nCURRENT NOTE\nTitle: ${selectedNote.title}\nContent (first 800 chars):\n${selectedNote.content.slice(0, 800)}`
      }
      if (notes.length > 0) {
        systemPrompt += `\n\nVAULT (${notes.length} notes): ${notes.slice(0, 60).map((n) => n.title).join(", ")}`
      }

      const apiMessages = [
        { role: "system", content: systemPrompt },
        ...allMsgs.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
      ]

      const controller = new AbortController()
      abortRef.current = controller

      try {
        // Electron IPC
        if (typeof window !== "undefined" && window.tesserin?.ai && isConnected) {
          // Cancel any previous stream to avoid duplicate listeners
          streamRef.current?.cancel()

          const stream = window.tesserin.ai.chatStream(apiMessages, selectedModel)
          streamRef.current = stream

          stream.onChunk((chunk: string) => {
            updateConvoMessages(convoId!, (msgs) => {
              const updated = [...msgs]
              const last = updated[updated.length - 1]
              if (last.role === "assistant") {
                updated[updated.length - 1] = { ...last, content: last.content + chunk }
              }
              return updated
            })
          })
          stream.onDone(() => {
            stream.cancel()          // clean up IPC listeners
            streamRef.current = null
            setIsLoading(false)
          })
          stream.onError((error: string) => {
            stream.cancel()          // clean up IPC listeners
            streamRef.current = null
            updateConvoMessages(convoId!, (msgs) => {
              const updated = [...msgs]
              updated[updated.length - 1] = { role: "assistant", content: `Error: ${error}`, isError: true, timestamp: Date.now() }
              return updated
            })
            setIsLoading(false)
          })
          return
        }

        // Direct HTTP streaming
        if (isConnected) {
          const res = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: selectedModel, messages: apiMessages, stream: true }),
            signal: controller.signal,
          })
          if (!res.ok) throw new Error(`Ollama ${res.status}`)
          const reader = res.body?.getReader()
          if (!reader) throw new Error("No response body")

          const decoder = new TextDecoder()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const raw = decoder.decode(value, { stream: true })
            for (const line of raw.split("\n").filter(Boolean)) {
              try {
                const json = JSON.parse(line)
                if (json.message?.content) {
                  updateConvoMessages(convoId!, (msgs) => {
                    const updated = [...msgs]
                    const last = updated[updated.length - 1]
                    if (last.role === "assistant") {
                      updated[updated.length - 1] = { ...last, content: last.content + json.message.content }
                    }
                    return updated
                  })
                }
              } catch { /* skip */ }
            }
          }
          setIsLoading(false)
          return
        }

        // Demo fallback
        setTimeout(() => {
          const demos = [
            `I can see **${notes.length} notes** in your vault. Select a note and try **Summarize** or **Tags**, or ask me to draft something new.`,
            "Use **[[wiki-links]]** to build your knowledge graph. I can help discover which notes should be linked.\n\nTry the **Links** quick action on any note.",
            "## Zettelkasten Workflow\n\n1. **Fleeting notes** — quick captures in Daily Notes\n2. **Literature notes** — summaries of sources\n3. **Permanent notes** — your own ideas, linked together\n\nWant me to create templates for these?",
            "Break complex ideas into atomic notes — one idea per note — then link them.\n\nThe **Graph View** will show you the emerging connections.",
            "## Quick Tips\n\n- Use `Cmd+K` to search across all notes\n- Use **Tags** for vertical categories\n- Use **[[wiki-links]]** for horizontal connections\n- Use **Daily Notes** for journaling",
          ]
          updateConvoMessages(convoId!, (msgs) => {
            const updated = [...msgs]
            updated[updated.length - 1] = {
              role: "assistant",
              content: demos[Math.floor(Math.random() * demos.length)],
              timestamp: Date.now(),
            }
            return updated
          })
          setIsLoading(false)
        }, 600 + Math.random() * 800)
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          setIsLoading(false)
          return
        }
        updateConvoMessages(convoId!, (msgs) => {
          const updated = [...msgs]
          const last = updated[updated.length - 1]
          if (last.role === "assistant" && last.content === "") {
            updated[updated.length - 1] = {
              role: "assistant",
              content: `Connection error: ${err instanceof Error ? err.message : String(err)}. Is Ollama running on localhost:11434?`,
              isError: true,
              timestamp: Date.now(),
            }
          }
          return updated
        })
        setIsLoading(false)
      } finally {
        abortRef.current = null
      }
    },
    [activeConvoId, createConversation, conversations, isLoading, isConnected, selectedModel, selectedNote, notes, updateConvoMessages],
  )

  /* ---- Quick action handlers ---- */
  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      if (action.requiresNote && !selectedNote) return
      const t = selectedNote?.title ?? ""
      switch (action.id) {
        case "create-note":
          sendMessage("Create a new note for me. Ask me what topic I'd like to write about, then draft the content.")
          break
        case "summarize":
          sendMessage(`Summarize my note "${t}".`)
          break
        case "suggest-tags":
          sendMessage(`Suggest tags for my note "${t}".`)
          break
        case "find-connections":
          sendMessage(`Which of my other notes should "${t}" be linked to with [[wiki-links]]? Explain each connection.`)
          break
        case "outline":
          sendMessage("Create a structured outline for a topic. Ask me what I want to outline.")
          break
        case "brainstorm":
          sendMessage("Help me brainstorm. Ask me the topic or theme to explore.")
          break
        case "expand":
          sendMessage(`Expand and elaborate on my note "${t}". Add more detail, examples, or related ideas.`)
          break
        case "rewrite":
          sendMessage(`Rewrite my note "${t}" with better clarity, structure, and prose. Keep the core ideas.`)
          break
      }
    },
    [selectedNote, sendMessage],
  )

  /* ---- Keyboard ---- */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage(chatInput)
      }
    },
    [chatInput, sendMessage],
  )

  /* ════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                         */
  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex h-full w-full">
      {/* ══ SIDEBAR ══ */}
      {showSidebar && (
        <div
          className="w-64 shrink-0 flex flex-col border-r"
          style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
        >
          {/* Header */}
          <div className="px-4 py-4 border-b" style={{ borderColor: "var(--border-dark)" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, #FACC15 0%, #F59E0B 50%, #D97706 100%)",
                  boxShadow: "0 0 20px rgba(250,204,21,0.35), inset 0 1px 2px rgba(255,255,255,0.3)",
                }}
              >
                <HiOutlineCpuChip size={22} className="text-gray-900" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-wide" style={{ color: "var(--accent-primary)" }}>SAM</div>
                <div className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                  Simulated Adaptive Matrix
                </div>
              </div>
            </div>

            {/* Connection + model */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px]">
                {isConnected === true && (
                  <span style={{ color: "#22c55e" }} className="flex items-center gap-1">
                    <FiWifi size={10} /> Online
                  </span>
                )}
                {isConnected === false && (
                  <button onClick={checkConnection} style={{ color: "#ef4444" }} className="flex items-center gap-1 hover:opacity-80">
                    <FiWifiOff size={10} /> Reconnect
                  </button>
                )}
                {isConnected === null && (
                  <span style={{ color: "var(--text-tertiary)" }} className="flex items-center gap-1">
                    <FiZap size={10} /> Demo
                  </span>
                )}
              </div>
              {availableModels.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="appearance-none skeuo-inset pl-2 pr-5 py-0.5 text-[9px] rounded-lg focus:outline-none cursor-pointer"
                    style={{ color: "var(--text-secondary)", backgroundColor: "var(--bg-panel-inset)", maxWidth: "95px" }}
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <FiChevronDown size={8} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
                </div>
              )}
            </div>
          </div>

          {/* New conversation */}
          <div className="px-3 py-2">
            <button
              onClick={createConversation}
              className="w-full skeuo-btn px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
              style={{ color: "var(--text-primary)" }}
            >
              <FiPlus size={14} />
              New Conversation
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-1">
            {conversations.map((convo) => (
              <div
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${convo.id === activeConvoId ? "active" : ""}`}
                style={{
                  background: convo.id === activeConvoId ? "var(--accent-primary)" : "transparent",
                  color: convo.id === activeConvoId ? "var(--text-on-accent)" : "var(--text-secondary)",
                }}
              >
                <FiMessageSquare size={13} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{convo.title}</div>
                  <div
                    className="text-[9px] opacity-60"
                    style={{ color: convo.id === activeConvoId ? "var(--text-on-accent)" : "var(--text-tertiary)" }}
                  >
                    {formatTime(convo.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-black/10"
                  aria-label="Delete conversation"
                >
                  <FiTrash2 size={11} />
                </button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center text-[11px] py-8 px-4" style={{ color: "var(--text-tertiary)" }}>
                No conversations yet.<br />Start one to begin.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MAIN CHAT ══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div
          className="h-12 border-b flex items-center px-4 justify-between shrink-0"
          style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar((p) => !p)}
              className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Toggle sidebar"
            >
              <FiMessageSquare size={14} />
            </button>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>SAM Node</span>
            {activeConvo && (
              <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>— {activeConvo.title}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedNote && (
              <div
                className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
                style={{ color: "var(--accent-primary)", background: "var(--bg-panel-inset)", border: "1px solid rgba(250,204,21,0.1)", boxShadow: "var(--input-inner-shadow)" }}
              >
                <FiFileText size={10} />
                <span className="truncate max-w-[140px]">{selectedNote.title}</span>
              </div>
            )}
            {activeConvo && (
              <button
                onClick={clearConversation}
                className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
                style={{ color: "var(--text-tertiary)" }}
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <FiTrash2 size={13} />
              </button>
            )}
            <button
              onClick={checkConnection}
              className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: isConnected ? "#22c55e" : "var(--text-tertiary)" }}
              aria-label="Check connection"
            >
              <FiRefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ backgroundColor: "var(--bg-app)" }}>
          {!activeConvo ? (
            /* ── Welcome screen ── */
            <div className="flex flex-col items-center justify-center h-full px-8">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: "linear-gradient(135deg, #FACC15 0%, #F59E0B 50%, #D97706 100%)",
                  boxShadow: "0 0 40px rgba(250,204,21,0.3), 0 0 80px rgba(250,204,21,0.1), inset 0 2px 4px rgba(255,255,255,0.3)",
                }}
              >
                <HiOutlineCpuChip size={40} className="text-gray-900" />
              </div>
              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--accent-primary)" }}>SAM</h2>
              <p className="text-xs mb-1 font-mono" style={{ color: "var(--text-tertiary)" }}>Simulated Adaptive Matrix</p>
              <p className="text-xs text-center max-w-md mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Your personal AI for knowledge management. I write notes, summarise, find connections, brainstorm, and more.
              </p>

              {/* Quick action grid */}
              <div className="grid grid-cols-4 gap-2 max-w-lg w-full mb-8">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => { createConversation(); setTimeout(() => handleQuickAction(action), 100) }}
                    disabled={action.requiresNote && !selectedNote}
                    className="skeuo-btn p-2.5 rounded-xl text-center transition-all hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <div className="flex justify-center mb-1" style={{ color: "var(--accent-primary)" }}>{action.icon}</div>
                    <div className="text-[10px] font-semibold" style={{ color: "var(--text-secondary)" }}>{action.label}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={createConversation}
                className="skeuo-btn px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                style={{ color: "var(--text-on-accent)", background: "var(--accent-primary)" }}
              >
                <HiOutlineSparkles size={14} />
                Start Conversation
              </button>
              <div className="mt-6 text-[9px] font-mono" style={{ color: "var(--text-tertiary)", opacity: 0.5 }}>
                Powered by Ollama · Open-source local AI
              </div>
            </div>
          ) : (
            /* ── Chat messages ── */
            <div className="p-4 space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`group max-w-[85%] ${msg.role === "user" ? "" : "flex gap-3"}`}>
                    {/* SAM avatar */}
                    {msg.role === "assistant" && (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "linear-gradient(135deg, #FACC15, #D97706)", boxShadow: "0 0 12px rgba(250,204,21,0.25)" }}
                      >
                        <HiOutlineCpuChip size={14} className="text-gray-900" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Message bubble */}
                      <div
                        className="px-4 py-3 rounded-2xl text-xs leading-relaxed overflow-hidden"
                        style={{
                          backgroundColor: msg.role === "user" ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                          color: msg.role === "user" ? "var(--text-on-accent)" : "var(--text-primary)",
                          boxShadow: msg.role === "user" ? "0 2px 12px rgba(250,204,21,0.3)" : "var(--input-inner-shadow)",
                          borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                          borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
                        }}
                      >
                        {msg.role === "assistant" ? (
                          /* Rendered markdown for assistant messages */
                          <div className="sam-markdown">
                            {renderMarkdown(msg.content, { existingTitles })}
                            {msg.isError && <FiAlertTriangle className="inline-block ml-2 text-red-500" size={12} />}
                            {i === messages.length - 1 && isLoading && (
                              <span className="inline-block ml-1 animate-pulse">▊</span>
                            )}
                          </div>
                        ) : (
                          /* Plain text for user messages */
                          <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      {msg.role === "assistant" && msg.content && !(i === messages.length - 1 && isLoading) && (
                        <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Create note */}
                          <button
                            onClick={() => createNoteFromMessage(msg.content, i)}
                            className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-medium hover:opacity-80 transition-colors"
                            style={{ color: msg.createdNoteId ? "#22c55e" : "var(--accent-primary)" }}
                          >
                            {msg.createdNoteId ? <FiCheck size={9} /> : <FiEdit3 size={9} />}
                            {msg.createdNoteId ? "Created" : "New Note"}
                          </button>
                          {/* Insert to current note */}
                          {selectedNote && (
                            <button
                              onClick={() => insertToCurrentNote(msg.content, i)}
                              className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-medium hover:opacity-80 transition-colors"
                              style={{ color: msg.insertedToNote ? "#22c55e" : "var(--text-secondary)" }}
                              title={`Append to "${selectedNote.title}"`}
                            >
                              {msg.insertedToNote ? <FiCheck size={9} /> : <FiArrowDownCircle size={9} />}
                              {msg.insertedToNote ? "Inserted" : "Append"}
                            </button>
                          )}
                          {/* Copy */}
                          <button
                            onClick={() => copyToClipboard(msg.content, i)}
                            className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-medium hover:opacity-80"
                            style={{ color: copiedIdx === i ? "#22c55e" : "var(--text-tertiary)" }}
                          >
                            {copiedIdx === i ? <FiCheck size={9} /> : <FiCopy size={9} />}
                            {copiedIdx === i ? "Copied" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick actions strip */}
        {activeConvo && (
          <div
            className="px-4 py-2 flex items-center gap-1.5 border-t overflow-x-auto custom-scrollbar"
            style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
          >
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading || (action.requiresNote && !selectedNote)}
                className="skeuo-btn px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 shrink-0 hover:brightness-110 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ color: "var(--text-secondary)" }}
                title={action.description}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 border-t" style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}>
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={inputRef}
              className="w-full skeuo-inset py-3 pl-4 pr-12 text-xs focus:outline-none rounded-xl resize-none"
              style={{ color: "var(--text-primary)", minHeight: "44px", maxHeight: "160px" }}
              placeholder={isLoading ? "SAM is thinking…" : "Message SAM…  (Enter to send, Shift+Enter for new line)"}
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              aria-label="Message SAM"
            />
            {isLoading ? (
              <button
                onClick={stopGeneration}
                className="absolute right-2 bottom-2 skeuo-btn p-2 rounded-lg transition-all hover:brightness-110 active:scale-95"
                style={{ color: "#ef4444" }}
                aria-label="Stop generation"
                title="Stop generation"
              >
                <FiSquare size={14} />
              </button>
            ) : (
              <button
                onClick={() => sendMessage(chatInput)}
                disabled={!chatInput.trim()}
                className="absolute right-2 bottom-2 skeuo-btn p-2 rounded-lg disabled:opacity-30 transition-all hover:brightness-110 active:scale-95"
                style={{ color: chatInput.trim() ? "var(--accent-primary)" : "var(--text-tertiary)" }}
                aria-label="Send message"
              >
                <FiSend size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
