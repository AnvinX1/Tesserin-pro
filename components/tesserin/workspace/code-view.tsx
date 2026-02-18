"use client"
import React, { useState, useEffect, useCallback, useRef } from "react"
import mermaid from "mermaid"
import {
  FiPlay, FiCpu, FiLayout, FiDownload, FiMaximize, FiCode, FiRefreshCw, FiCheck, FiCommand,
  FiActivity, FiClock, FiDatabase, FiMap, FiPieChart, FiGitCommit, FiUsers, FiList, FiGrid, FiTrendingUp, FiImage
} from "react-icons/fi"
import { HiOutlineSparkles } from "react-icons/hi2"
import { useTesserinTheme } from "../core/theme-provider"

/**
 * CodeView (Agentic Workflow Generator)
 *
 * A tool to generate and visualize agentic workflows using Mermaid.js.
 * Users can describe a process, and AI will generate the corresponding flowchart/graph.
 */

type DiagramType = "Flowchart" | "Sequence" | "Mindmap" | "Timeline" | "Gantt" | "Class" | "State" | "ER" | "Journey" | "Pie" | "Quadrant" | "Requirement";

interface DiagramDefinition {
  id: DiagramType
  label: string
  icon: React.ElementType
  sample: string
  placeholder: string
  description: string
}

const DIAGRAM_TYPES: DiagramDefinition[] = [
  {
    id: "Flowchart",
    label: "Flowchart",
    icon: FiActivity,
    description: "Process flows & decision trees",
    placeholder: "E.g. A user logs in, checks permissions, if admin go to dashboard, else go to home...",
    sample: `graph TD
    A[Start] --> B{Is Valid?}
    B -->|Yes| C[Process Data]
    B -->|No| D[Log Error]
    C --> E[Save Result]
    D --> E
    E --> F[End]`
  },
  {
    id: "Sequence",
    label: "Sequence",
    icon: FiList,
    description: "Interaction between systems",
    placeholder: "E.g. User sends request to API, API queries DB, DB returns data, API responds to User...",
    sample: `sequenceDiagram
    participant U as User
    participant A as API
    participant D as Database
    U->>A: Request Data
    activate A
    A->>D: Query
    activate D
    D-->>A: Results
    deactivate D
    A-->>U: Response
    deactivate A`
  },
  {
    id: "Mindmap",
    label: "Mindmap",
    icon: FiMap,
    description: "Brainstorming & hierarchy",
    placeholder: "E.g. Project core ideas, marketing strategy branches, technical requirements...",
    sample: `mindmap
  root((Project))
    Marketing
      Social Media
      Email
    Development
      Frontend
      Backend
    Design
      UI
      UX`
  },
  {
    id: "Timeline",
    label: "Timeline",
    icon: FiClock,
    description: "Events over time",
    placeholder: "E.g. Q1 planning, Q2 development, Q3 testing, Q4 launch...",
    sample: `timeline
    title Project Timeline
    2023 Q1 : Planning
            : Design
    2023 Q2 : Development
            : MVP
    2023 Q3 : Testing
    2023 Q4 : Launch`
  },
  {
    id: "Gantt",
    label: "Gantt",
    icon: FiGrid,
    description: "Project schedules",
    placeholder: "E.g. Task A from 2023-01-01 to 2023-01-10, Task B follows A...",
    sample: `gantt
    title Project Schedule
    dateFormat  YYYY-MM-DD
    section Design
    Wireframes :a1, 2023-01-01, 10d
    section Dev
    Backend    :after a1, 20d
    Frontend   :after a1, 15d`
  },
  {
    id: "Class",
    label: "Class",
    icon: FiCpu,
    description: "Object structure (OOP)",
    placeholder: "E.g. User class has name, email. Post class belongs to User...",
    sample: `classDiagram
    class User {
        +String name
        +login()
    }
    class Post {
        +String title
        +publish()
    }
    User "1" --> "*" Post : creates`
  },
  {
    id: "State",
    label: "State",
    icon: FiRefreshCw,
    description: "State machine diagrams",
    placeholder: "E.g. Order starts as New, moves to Processing, then Shipped or Cancelled...",
    sample: `stateDiagram-v2
    [*] --> New
    New --> Processing
    Processing --> Shipped
    Processing --> Cancelled
    Shipped --> [*]`
  },
  {
    id: "ER",
    label: "ER Diagram",
    icon: FiDatabase,
    description: "Entity relationships",
    placeholder: "E.g. Users have many Posts, Posts have many Comments...",
    sample: `erDiagram
    USER ||--o{ POST : places
    USER {
        string name
        string email
    }
    POST {
        string title
        string body
    }`
  },
  {
    id: "Journey",
    label: "User Journey",
    icon: FiUsers,
    description: "User experience flow",
    placeholder: "E.g. User opens app, searches item, adds to cart, pays...",
    sample: `journey
    title My working day
    section Go to work
      Wake up: 5: Me, Cat
      Prepare: 3: Me
    section Work
      Start work: 5: Me`
  },
  {
    id: "Pie",
    label: "Pie Chart",
    icon: FiPieChart,
    description: "Percentage distribution",
    placeholder: "E.g. Revenue breakdown: Product A 40%, Product B 30%, Services 30%...",
    sample: `pie title Revenue
    "Product A" : 40
    "Product B" : 30
    "Services" : 30`
  },
  {
    id: "Quadrant",
    label: "Quadrant",
    icon: FiLayout,
    description: "2x2 Matrix",
    placeholder: "E.g. Impact vs Effort matrix. High Impact/Low Effort...",
    sample: `quadrantChart
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Quick Wins
    quadrant-2 Major Projects
    quadrant-3 Fill-ins
    quadrant-4 Thankless Tasks
    Item A: [0.3, 0.6]
    Item B: [0.45, 0.23]`
  },
  {
    id: "Requirement",
    label: "Requirement",
    icon: FiCheck,
    description: "SysML Requirements",
    placeholder: "E.g. Requirement 1: System must be fast. Risk: High...",
    sample: `requirementDiagram
    requirement test_req {
    id: 1
    text: the test requirement
    risk: high
    verifymethod: test
    }`
  }
]

export function CodeView() {
  const [selectedType, setSelectedType] = useState<DiagramType>("Flowchart")
  const [input, setInput] = useState("")
  const [code, setCode] = useState(DIAGRAM_TYPES[0].sample)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Current definition
  const activeDef = DIAGRAM_TYPES.find(d => d.id === selectedType) || DIAGRAM_TYPES[0]

  const { isDark } = useTesserinTheme()

  // Initialize mermaid or update theme
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#eab308', // accent-primary (yellow)
        primaryTextColor: isDark ? '#ededed' : '#1a1c20',
        primaryBorderColor: '#ca8a04',
        lineColor: isDark ? '#888888' : '#94a3b8',
        secondaryColor: '#f59e0b',
        tertiaryColor: isDark ? '#111111' : '#fff',
        mainBkg: isDark ? '#050505' : '#ffffff', // Match --bg-app (Obsidian)
        nodeBorder: '#eab308',
      },
      securityLevel: 'loose',
      fontFamily: 'inherit'
    })

    // Force re-render when theme changes
    setCode(prev => prev + " ")
    setTimeout(() => setCode(prev => prev.trim()), 10)
  }, [isDark])

  // Render diagram
  useEffect(() => {
    const render = async () => {
      if (!containerRef.current) return
      try {
        // Check connectivity / validity implies re-rendering
        // We use a unique ID each time to force full re-render
        containerRef.current.innerHTML = ''
        const id = `mermaid-${Date.now()}`

        try {
          const { svg } = await mermaid.render(id, code)
          containerRef.current.innerHTML = svg
          setError(null)
        } catch (renderError) {
          console.error("Mermaid Render Error", renderError)
          // If parsing fails, mermaid often leaves garbage or throws
          // We attempt to catch it, but mermaid API behaviors vary
          setError("Graphic syntax error: " + (renderError instanceof Error ? renderError.message : String(renderError)))
        }
      } catch (err) {
        console.error("Mermaid system error:", err)
      }
    }

    const timeout = setTimeout(render, 600) // Debounce
    return () => clearTimeout(timeout)
  }, [code])

  // Switch diagram type
  const handleTypeSelect = (type: DiagramType) => {
    setSelectedType(type)
    const def = DIAGRAM_TYPES.find(d => d.id === type)
    if (def) {
      setCode(def.sample)
      // Optional: Keep input or clear it? Let's keep it to allow "switch type" on same prompt, 
      // though prompts are usually specific.
    }
  }

  const generateWorkflow = async () => {
    if (!input.trim() || isGenerating) return

    setIsGenerating(true)
    setError(null)

    try {
      const endpoint = "http://localhost:11434/api/generate"
      const prompt = `Convert the following description into a Mermaid.js ${activeDef.label} (${activeDef.id}) diagram. 
            Return ONLY the mermaid code block. No markdown, no explanation.
            
            Key: Use valid ${activeDef.id} syntax.
            Description: ${input}`

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2", // Default model
          prompt: prompt,
          stream: false
        })
      })

      if (!res.ok) throw new Error("Ollama not reachable")

      const data = await res.json()
      const generated = data.response.replace(/```mermaid/g, "").replace(/```/g, "").trim()
      setCode(generated)
    } catch (err) {
      console.warn("AI generation failed, using mock", err)
      // Mock based on type
      setCode(activeDef.sample + "\n%% AI generation failed, showing sample")
      setError(err instanceof Error ? err.message + " (using sample)" : "AI unavailable (using sample)")
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadSVG = () => {
    if (!containerRef.current) return
    const svg = containerRef.current.querySelector("svg")
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = `${activeDef.id.toLowerCase()}-${Date.now()}.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadPNG = () => {
    if (!containerRef.current) return
    const svg = containerRef.current.querySelector("svg")
    if (!svg) {
      alert("No diagram to export")
      return
    }

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    // Get dimensions from SVG or container
    const viewBox = svg.getAttribute("viewBox")?.split(" ").map(Number)
    const svgWidth = viewBox ? viewBox[2] : parseInt(svg.getAttribute("width") || "800")
    const svgHeight = viewBox ? viewBox[3] : parseInt(svg.getAttribute("height") || "600")

    // High res export
    const scale = 2
    canvas.width = svgWidth * scale
    canvas.height = svgHeight * scale

    img.onload = () => {
      if (ctx) {
        // Match theme background
        ctx.fillStyle = isDark ? "#050505" : "#ffffff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const pngUrl = canvas.toDataURL("image/png")

        const link = document.createElement("a")
        link.href = pngUrl
        link.download = `${activeDef.id.toLowerCase()}-${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    }

    // Handle unicode
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-app)]">
      {/* Toolbar */}
      <div
        className="h-14 border-b flex items-center px-4 justify-between shrink-0"
        style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center skeuo-btn">
            <FiCpu size={18} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Agentic Flow Generator</h2>
            <div className="text-[10px] opacity-60">Powered by Mermaid.js & AI</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadSVG}
            className="skeuo-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            title="Download SVG"
            style={{ color: "var(--text-secondary)" }}
          >
            <FiCode /> SVG
          </button>
          <button
            onClick={downloadPNG}
            className="skeuo-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
            title="Download PNG"
            style={{ color: "var(--text-secondary)" }}
          >
            <FiImage /> PNG
          </button>

          <div className="w-px h-6 bg-[var(--border-dark)] mx-2" />

          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
          >-</button>
          <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
            className="skeuo-btn w-8 h-8 flex items-center justify-center rounded-lg"
          >+</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane (Left) */}
        <div className="w-[400px] border-r flex flex-col" style={{ borderColor: "var(--border-dark)", background: "var(--bg-panel)" }}>
          <div className="p-4 flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">

            {/* Diagram Type Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <FiGrid />
                Diagram Type
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DIAGRAM_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 ${selectedType === type.id ? 'active' : ''}`}
                    style={{
                      backgroundColor: selectedType === type.id ? "var(--accent-primary)" : "var(--bg-panel-inset)",
                      color: selectedType === type.id ? "var(--text-on-accent)" : "var(--text-secondary)",
                      boxShadow: selectedType === type.id ? "inset 0 1px 3px rgba(0,0,0,0.2)" : "var(--shadow-sm)",
                      border: selectedType === type.id ? "1px solid rgba(0,0,0,0.1)" : "1px solid transparent"
                    }}
                    title={type.description}
                  >
                    <type.icon size={16} />
                    <span className="text-[9px] font-medium truncate w-full text-center">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <HiOutlineSparkles className="text-amber-500" />
                Description
              </label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={activeDef.placeholder}
                className="w-full h-24 skeuo-inset p-3 text-sm rounded-xl resize-none focus:outline-none transition-all focus:ring-1 focus:ring-amber-500/50"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={generateWorkflow}
                disabled={isGenerating || !input.trim()}
                className="w-full skeuo-btn py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: isGenerating
                    ? "var(--bg-panel-inset)"
                    : "linear-gradient(135deg, #f59e0b, #d97706)", // Yellow/Amber gradient
                  opacity: isGenerating ? 0.7 : 1,
                  textShadow: "0 1px 1px rgba(0,0,0,0.2)"
                }}
              >
                {isGenerating ? <FiRefreshCw className="animate-spin" /> : <FiPlay />}
                {isGenerating ? "Generating..." : `Generate ${activeDef.label}`}
              </button>
            </div>

            {/* Code Editor */}
            <div className="flex-1 flex flex-col gap-2 min-h-[200px]">
              <label className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                <FiCode />
                Source
              </label>
              <textarea
                value={code}
                onChange={e => setCode(e.target.value)}
                className="flex-1 w-full skeuo-inset p-3 text-xs font-mono leading-relaxed rounded-xl resize-none focus:outline-none"
                style={{ color: "var(--text-primary)", whiteSpace: "pre" }}
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Preview Pane (Right) */}
        <div className="flex-1 bg-[var(--bg-app)] relative overflow-hidden flex items-center justify-center">
          <div
            className="w-full h-full overflow-auto flex items-center justify-center p-8 custom-scrollbar"
            style={{
              backgroundImage: "radial-gradient(var(--border-dark) 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }}
          >
            <div
              ref={containerRef}
              className="transition-transform duration-200 origin-center"
              style={{ transform: `scale(${scale})` }}
            />
          </div>

          {error && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium backdrop-blur-md flex items-center gap-3 shadow-lg animate-in slide-in-from-bottom-2">
              <FiLayout size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
