import React, { useState, useRef, useEffect } from "react"
import { FiLoader, FiX } from "react-icons/fi"
import { AnimatedIcon } from "../core/animated-icon"
import { ScribbledZap } from "../core/scribbled-icons"
import type { DiagramType } from "@/lib/diagram-ai"

interface CanvasAIDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (prompt: string, type: DiagramType) => Promise<void>
  isGenerating: boolean
}

const DIAGRAM_TYPES: Array<{ value: DiagramType; label: string; icon: string; desc: string }> = [
  { value: "auto", label: "Auto", icon: "✨", desc: "Let AI choose" },
  { value: "flowchart", label: "Flow", icon: "🔀", desc: "Process flows" },
  { value: "mindmap", label: "Mind", icon: "🧠", desc: "Idea branches" },
  { value: "orgchart", label: "Org", icon: "🏢", desc: "Hierarchy" },
  { value: "sequence", label: "Seq", icon: "↔️", desc: "Interactions" },
  { value: "freeform", label: "Free", icon: "✏️", desc: "Custom shapes" },
]

export function CanvasAIDialog({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}: CanvasAIDialogProps) {
  const [prompt, setPrompt] = useState("")
  const [selectedType, setSelectedType] = useState<DiagramType>("auto")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isOpen, onClose])

  const handleSubmit = async () => {
    if (!prompt.trim() || isGenerating) return
    await onGenerate(prompt.trim(), selectedType)
    setPrompt("")
    setSelectedType("auto")
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop with depth blur */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      />

      {/* Dialog — heavy neumorphic panel */}
      <div
        className="skeuo-panel relative z-10 w-[440px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — embossed bar */}
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{
            borderBottom: "1px solid var(--border-light)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                background: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 10px rgba(250,204,21,0.35), inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              <AnimatedIcon animation="morph" size={14}>
                <ScribbledZap size={14} style={{ color: "var(--text-on-accent)" }} />
              </AnimatedIcon>
            </div>
            <div>
              <span
                className="text-sm font-bold block"
                style={{ color: "var(--text-primary)" }}
              >
                AI Diagram Generator
              </span>
              <span
                className="text-[10px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                Describe what you want to create
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="skeuo-btn flex items-center justify-center transition-all"
            style={{
              width: 26,
              height: 26,
              color: "var(--text-secondary)",
              borderRadius: 8,
            }}
          >
            <FiX size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Prompt — inset textarea */}
          <div>
            <label
              className="text-[11px] font-semibold uppercase tracking-wider mb-1.5 block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Prompt
            </label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              rows={3}
              className="skeuo-inset w-full px-3.5 py-2.5 text-sm resize-none focus:outline-none"
              style={{
                color: "var(--text-primary)",
              }}
              placeholder="e.g. 'User authentication flow with login, 2FA, and password reset'"
              disabled={isGenerating}
            />
          </div>

          {/* Diagram Type — embossed selector grid */}
          <div>
            <label
              className="text-[11px] font-semibold uppercase tracking-wider mb-2 block"
              style={{ color: "var(--text-tertiary)" }}
            >
              Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DIAGRAM_TYPES.map((t) => {
                const isSelected = selectedType === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => setSelectedType(t.value)}
                    className={isSelected ? "skeuo-inset" : "skeuo-btn"}
                    style={{
                      padding: "8px 6px",
                      textAlign: "center",
                      borderRadius: "var(--radius-inset)",
                      ...(isSelected ? {
                        background: "var(--accent-primary)",
                        color: "var(--text-on-accent)",
                        boxShadow: "var(--input-inner-shadow), 0 0 12px rgba(250,204,21,0.2)",
                        border: "1px solid transparent",
                      } : {}),
                    }}
                    disabled={isGenerating}
                  >
                    <span className="text-base block">{t.icon}</span>
                    <span className="text-[11px] font-bold block mt-0.5">
                      {t.label}
                    </span>
                    <span
                      className="text-[9px] block mt-0.5"
                      style={{
                        opacity: 0.6,
                        color: isSelected ? "var(--text-on-accent)" : "var(--text-tertiary)",
                      }}
                    >
                      {t.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer — embossed bar */}
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{
            borderTop: "1px solid var(--border-light)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <span
            className="text-[10px] font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter
          </span>
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || isGenerating}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold transition-all"
            style={{
              background:
                !prompt.trim() || isGenerating
                  ? "var(--bg-panel-inset)"
                  : "var(--accent-primary)",
              color:
                !prompt.trim() || isGenerating
                  ? "var(--text-tertiary)"
                  : "var(--text-on-accent)",
              cursor:
                !prompt.trim() || isGenerating ? "not-allowed" : "pointer",
              borderRadius: "var(--radius-btn)",
              boxShadow:
                !prompt.trim() || isGenerating
                  ? "var(--input-inner-shadow)"
                  : "var(--btn-shadow), 0 0 12px rgba(250,204,21,0.25)",
              border: "1px solid var(--border-light)",
            }}
          >
            {isGenerating ? (
              <>
                <FiLoader size={12} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ScribbledZap size={12} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
