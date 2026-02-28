"use client"
import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react"
import {
  FiFolderPlus, FiMessageSquare, FiCode, FiX, FiChevronUp, FiChevronDown,
  FiSave, FiMaximize2, FiColumns, FiLayout, FiZap, FiArrowRight,
} from "react-icons/fi"
import { HiOutlineSparkles } from "react-icons/hi2"
import { useTesserinTheme } from "../core/theme-provider"
import { CodeEditor, detectLanguage } from "./code-editor"
import { CodeFileTree } from "./code-file-tree"
import { CodeAIChat, type CodeAIChatHandle } from "./code-ai-chat"

interface OpenFile {
  path: string
  name: string
  content: string
  isDirty: boolean
}
/** Hook for draggable resize handles */
function useResize(initial: number, min: number, max: number, direction: "horizontal" | "vertical") {
  const [size, setSize] = useState(initial)
  const dragging = useRef(false)
  const startPos = useRef(0)
  const startSize = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startPos.current = direction === "horizontal" ? e.clientX : e.clientY
    startSize.current = size

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = direction === "horizontal"
        ? ev.clientX - startPos.current
        : startPos.current - ev.clientY // inverted for bottom panels
      setSize(Math.max(min, Math.min(max, startSize.current + delta)))
    }
    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [size, min, max, direction])

  return { size, onMouseDown }
}

/** Right-side resize (for AI chat width, dragged from left edge) */
function useResizeRight(initial: number, min: number, max: number) {
  const [size, setSize] = useState(initial)
  const dragging = useRef(false)
  const startPos = useRef(0)
  const startSize = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startPos.current = e.clientX
    startSize.current = size

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = startPos.current - ev.clientX // inverted: drag left = grow
      setSize(Math.max(min, Math.min(max, startSize.current + delta)))
    }
    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }, [size, min, max])

  return { size, onMouseDown }
}
export function CodeView() {
  const { isDark } = useTesserinTheme()

  // Layout state
  const [showSidebar, setShowSidebar] = useState(true)
  const [showAIChat, setShowAIChat] = useState(true)
  const sidebar = useResize(220, 140, 400, "horizontal")
  const aiChat = useResizeRight(340, 240, 600)

  // Project state
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [projectName, setProjectName] = useState("")

  // Builder prompt state
  const [buildPrompt, setBuildPrompt] = useState("")
  const [isBuilding, setIsBuilding] = useState(false)
  const aiChatRef = useRef<CodeAIChatHandle>(null)

  // File state
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFileIndex, setActiveFileIndex] = useState(-1)
  const activeFile = activeFileIndex >= 0 ? openFiles[activeFileIndex] : null

  const openFolder = useCallback(async () => {
    const api = window.tesserin
    if (!api?.dialog) return
    const folder = await api.dialog.openFolder()
    if (folder) {
      setProjectPath(folder)
      setProjectName(folder.split("/").pop() || folder.split("\\").pop() || folder)
      setOpenFiles([])
      setActiveFileIndex(-1)
    }
  }, [])

  const openFile = useCallback(async (filePath: string) => {
    // Check if already open
    const idx = openFiles.findIndex(f => f.path === filePath)
    if (idx >= 0) {
      setActiveFileIndex(idx)
      return
    }

    const api = window.tesserin
    if (!api?.fs) return

    try {
      const content = await api.fs.readFile(filePath)
      const name = filePath.split("/").pop() || filePath.split("\\").pop() || filePath
      const newFile: OpenFile = { path: filePath, name, content, isDirty: false }
      setOpenFiles(prev => [...prev, newFile])
      setActiveFileIndex(openFiles.length)
    } catch (err) {
      console.error("Failed to read file:", err)
    }
  }, [openFiles])

  const closeFile = useCallback((index: number) => {
    setOpenFiles(prev => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        setActiveFileIndex(-1)
      } else {
        setActiveFileIndex(prevActive => {
          if (prevActive === index) return Math.min(index, next.length - 1)
          if (prevActive > index) return prevActive - 1
          return prevActive
        })
      }
      return next
    })
  }, [])

  const updateFileContent = useCallback((content: string) => {
    if (activeFileIndex < 0) return
    setOpenFiles(prev => prev.map((f, i) =>
      i === activeFileIndex ? { ...f, content, isDirty: true } : f
    ))
  }, [activeFileIndex])

  const saveFile = useCallback(async (content: string) => {
    if (activeFileIndex < 0) return
    const file = openFiles[activeFileIndex]
    const api = window.tesserin
    if (!api?.fs) return

    try {
      await api.fs.writeFile(file.path, content)
      setOpenFiles(prev => prev.map((f, i) =>
        i === activeFileIndex ? { ...f, content, isDirty: false } : f
      ))
    } catch (err) {
      console.error("Failed to save file:", err)
    }
  }, [activeFileIndex, openFiles])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B or Cmd+B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        setShowSidebar(prev => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Build from prompt — creates a project dir and sends the prompt to AI
  const startBuild = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return
    const api = window.tesserin
    if (!api?.fs || !api?.shell) return

    setIsBuilding(true)

    // Derive a project name from the prompt
    const slug = prompt.trim().toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .split(/\s+/).slice(0, 4).join("-")
      .slice(0, 40) || "new-project"
    const homeDir = await api.shell.exec("echo $HOME").then(r => r.stdout.trim())
    const projDir = `${homeDir}/Desktop/${slug}`

    try {
      await api.fs.mkdir(projDir)
    } catch { /* may already exist */ }

    setProjectPath(projDir)
    setProjectName(slug)
    setShowAIChat(true)
    setShowSidebar(true)
    setBuildPrompt("")

    // Use requestAnimationFrame to ensure state has propagated before sending
    requestAnimationFrame(() => {
      aiChatRef.current?.sendBuildPrompt(prompt, projDir)
      setIsBuilding(false)
    })
  }, [])

  // Called by AI chat when it creates files — auto-sets project if not set
  const handleProjectCreated = useCallback((dirPath: string) => {
    if (!projectPath) {
      setProjectPath(dirPath)
      setProjectName(dirPath.split("/").pop() || dirPath)
      setShowSidebar(true)
    }
  }, [projectPath])

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "var(--bg-app)" }}>
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div
        className="h-10 border-b flex items-center px-3 gap-2 shrink-0"
        style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <FiCode size={13} className="text-white" />
          </div>
          <div>
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
              {projectName || "Code"}
            </span>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={openFolder}
            className="skeuo-btn h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all"
            style={{ color: "var(--text-secondary)" }}
            title="Open Folder"
          >
            <FiFolderPlus size={13} />
            Open Folder
          </button>

          <div className="w-px h-5 mx-1" style={{ background: "var(--border-dark)" }} />

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={`skeuo-btn w-7 h-7 rounded-lg flex items-center justify-center transition-all ${showSidebar ? 'brightness-110' : ''}`}
            style={{ color: showSidebar ? "var(--accent-primary)" : "var(--text-muted)" }}
            title="Toggle Explorer"
          >
            <FiColumns size={13} />
          </button>
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className={`skeuo-btn w-7 h-7 rounded-lg flex items-center justify-center transition-all ${showAIChat ? 'brightness-110' : ''}`}
            style={{ color: showAIChat ? "var(--accent-primary)" : "var(--text-muted)" }}
            title="Toggle AI Chat"
          >
            <HiOutlineSparkles size={13} />
          </button>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* File Explorer Sidebar */}
        {showSidebar && (
          <div className="flex shrink-0">
            <div
              className="border-r overflow-hidden"
              style={{ width: sidebar.size, borderColor: "var(--border-dark)" }}
            >
              {projectPath ? (
                <CodeFileTree
                  rootPath={projectPath}
                  onFileSelect={openFile}
                  activeFile={activeFile?.path}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 p-4">
                  <FiFolderPlus size={24} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                  <p className="text-[11px] text-center opacity-40" style={{ color: "var(--text-muted)" }}>
                    Open a folder to browse files
                  </p>
                  <button
                    onClick={openFolder}
                    className="skeuo-btn px-3 py-1.5 rounded-lg text-[11px] font-semibold hover:brightness-110 active:scale-95 transition-all"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Open Folder
                  </button>
                </div>
              )}
            </div>
            {/* Sidebar resize handle */}
            <div
              className="w-1 cursor-col-resize hover:bg-amber-500/30 active:bg-amber-500/50 transition-colors"
              onMouseDown={sidebar.onMouseDown}
            />
          </div>
        )}

        {/* Center: Editor + Terminal */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Tab Bar */}
          {openFiles.length > 0 && (
            <div
              className="h-8 border-b flex items-center shrink-0 overflow-x-auto custom-scrollbar"
              style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
            >
              {openFiles.map((file, i) => (
                <div
                  key={file.path}
                  className={`flex items-center gap-1.5 h-full px-3 text-[11px] border-r cursor-pointer transition-colors group shrink-0 ${
                    i === activeFileIndex ? "" : "hover:bg-[var(--bg-panel-inset)]"
                  }`}
                  style={{
                    borderColor: "var(--border-dark)",
                    background: i === activeFileIndex ? "var(--bg-app)" : undefined,
                    color: i === activeFileIndex ? "var(--text-primary)" : "var(--text-muted)",
                    borderBottom: i === activeFileIndex ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  }}
                  onClick={() => setActiveFileIndex(i)}
                >
                  <span className="truncate max-w-[120px]">
                    {file.isDirty && <span className="text-amber-500 mr-0.5">●</span>}
                    {file.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); closeFile(i) }}
                    className="opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-panel-inset)] rounded p-0.5 transition-all"
                  >
                    <FiX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editor Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeFile ? (
              <CodeEditor
                content={activeFile.content}
                filename={activeFile.name}
                isDark={isDark}
                onChange={updateFileContent}
                onSave={saveFile}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-6 p-8" style={{ background: "var(--bg-app)" }}>
                {/* Logo + title */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b22, #d9770622)",
                      border: "1px solid var(--border-dark)",
                    }}
                  >
                    <FiZap size={28} className="text-amber-500" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                      What do you want to build?
                    </p>
                    <p className="text-[11px] max-w-[340px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                      Describe your project and the AI agent will scaffold it — create files, install dependencies, and set everything up.
                    </p>
                  </div>
                </div>

                {/* Builder prompt input */}
                <div className="w-full max-w-lg">
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "var(--bg-panel)",
                      border: "1px solid var(--border-mid)",
                      boxShadow: "var(--shadow-md)",
                    }}
                  >
                    <textarea
                      value={buildPrompt}
                      onChange={e => setBuildPrompt(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          startBuild(buildPrompt)
                        }
                      }}
                      placeholder="e.g. Build a React todo app with TypeScript and Tailwind CSS..."
                      rows={3}
                      disabled={isBuilding}
                      className="w-full resize-none text-sm bg-transparent outline-none px-4 pt-4 pb-2 disabled:opacity-50"
                      style={{ color: "var(--text-primary)" }}
                    />
                    <div className="flex items-center justify-between px-4 pb-3">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.4 }}>
                        Press Enter to build
                      </span>
                      <button
                        onClick={() => startBuild(buildPrompt)}
                        disabled={!buildPrompt.trim() || isBuilding}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                        style={{
                          background: buildPrompt.trim() ? "linear-gradient(135deg, #f59e0b, #d97706)" : "var(--bg-panel-inset)",
                          color: buildPrompt.trim() ? "#fff" : "var(--text-muted)",
                        }}
                      >
                        {isBuilding ? (
                          <>
                            <FiZap size={12} className="animate-pulse" /> Building...
                          </>
                        ) : (
                          <>
                            <FiZap size={12} /> Build
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Quick templates */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 justify-center">
                    {[
                      "React + TypeScript app",
                      "Next.js landing page",
                      "Express REST API",
                      "Python Flask app",
                      "Static HTML site",
                    ].map(tpl => (
                      <button
                        key={tpl}
                        onClick={() => setBuildPrompt(`Build a ${tpl}`)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:brightness-110 active:scale-95"
                        style={{
                          background: "var(--bg-panel-inset)",
                          color: "var(--text-secondary)",
                          border: "1px solid var(--border-dark)",
                        }}
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider + open folder option */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-px w-16" style={{ background: "var(--border-dark)" }} />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)", opacity: 0.4 }}>or</span>
                  <div className="h-px w-16" style={{ background: "var(--border-dark)" }} />
                </div>
                <button
                  onClick={openFolder}
                  className="skeuo-btn px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <FiFolderPlus size={14} />
                  Open Existing Folder
                </button>
              </div>
            )}
          </div>

        </div>

        {/* AI Chat Panel */}
        {showAIChat && (
          <div className="flex shrink-0">
            {/* AI Chat resize handle */}
            <div
              className="w-1 cursor-col-resize hover:bg-amber-500/30 active:bg-amber-500/50 transition-colors"
              onMouseDown={aiChat.onMouseDown}
            />
            <div
              className="border-l overflow-hidden"
              style={{ width: aiChat.size, borderColor: "var(--border-dark)" }}
            >
              <CodeAIChat
                ref={aiChatRef}
                isDark={isDark}
                currentFile={activeFile ? { name: activeFile.name, content: activeFile.content } : undefined}
                projectPath={projectPath || undefined}
                onOpenFile={openFile}
                onProjectCreated={handleProjectCreated}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar ──────────────────────────────────────────── */}
      <div
        className="h-6 border-t flex items-center px-3 justify-between shrink-0"
        style={{
          borderColor: "var(--border-dark)",
          background: "var(--bg-panel)",
        }}
      >
        <div className="flex items-center gap-3">
          {activeFile && (
            <>
              <span className="text-[10px] font-mono" style={{ color: "var(--accent-primary)" }}>
                {detectLanguage(activeFile.name).toUpperCase()}
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {activeFile.name}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeFile?.isDirty && (
            <span className="text-[10px] text-amber-500 font-medium">Modified</span>
          )}
          <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
            <HiOutlineSparkles size={10} className="text-amber-500" />
            AI + Notes
          </span>
        </div>
      </div>
    </div>
  )
}
