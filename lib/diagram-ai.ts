/**
 * Diagram AI — Prompt → Structured Diagram Spec
 *
 * Takes a text prompt + optional diagram type, calls the AI model,
 * parses the structured JSON response, and returns a diagram spec
 * ready for the canvas-elements builders.
 *
 * Works with:
 *  - Electron IPC (window.tesserin.ai.chat)
 *  - Direct Ollama HTTP as fallback
 */

import {
  type DiagramSpec,
  type MindMapSpec,
  type OrgChartSpec,
  type SequenceSpec,
  type FreeformElementSpec,
  buildFlowchartElements,
  buildMindMapElements,
  buildOrgChartElements,
  buildSequenceDiagramElements,
  buildFreeformElements,
} from "./canvas-elements"
import { getOllamaEndpoint } from "./ollama-config"

/* ── Types ───────────────────────────────────────────── */

export type DiagramType =
  | "flowchart"
  | "mindmap"
  | "orgchart"
  | "sequence"
  | "freeform"
  | "auto"

interface GenerateResult {
  elements: any[]
  diagramType: DiagramType
}

/* ── System Prompts ──────────────────────────────────── */

const SYSTEM_PROMPT = `You are a diagram generation assistant. Given a user prompt, output ONLY valid JSON (no markdown fences, no explanation) describing a diagram.

Based on the diagram type requested, output one of these JSON formats:

## flowchart
{"nodes":[{"id":"1","label":"Start","type":"ellipse"},{"id":"2","label":"Process","type":"rectangle"},{"id":"3","label":"Decision","type":"diamond"},{"id":"4","label":"End","type":"ellipse"}],"edges":[{"from":"1","to":"2"},{"from":"2","to":"3"},{"from":"3","to":"4","label":"yes"}]}

## mindmap
{"root":"Central Topic","children":[{"label":"Branch 1","children":[{"label":"Sub 1"},{"label":"Sub 2"}]},{"label":"Branch 2","children":[{"label":"Sub 3"}]}]}

## orgchart
{"root":{"label":"CEO","children":[{"label":"CTO","children":[{"label":"Dev Lead"},{"label":"QA Lead"}]},{"label":"CFO","children":[{"label":"Accountant"}]}]}}

## sequence
{"actors":["Client","Server","Database"],"messages":[{"from":"Client","to":"Server","label":"GET /api"},{"from":"Server","to":"Database","label":"SELECT query"},{"from":"Database","to":"Server","label":"Results"},{"from":"Server","to":"Client","label":"200 OK"}]}

## freeform
{"elements":[{"type":"rectangle","x":0,"y":0,"width":200,"height":80,"label":"Box 1"},{"type":"ellipse","x":300,"y":0,"width":150,"height":80,"label":"Circle"},{"type":"arrow","x":200,"y":40,"endX":300,"endY":40}]}

Rules:
- Output ONLY the JSON object, nothing else
- Use descriptive labels based on the user's prompt
- For "auto" type, choose the most appropriate diagram format
- Keep diagrams readable: 4-12 nodes for flowcharts, 3-8 branches for mind maps
- Node IDs must be unique strings`

function buildTypePrompt(type: DiagramType): string {
  if (type === "auto") {
    return "Choose the most appropriate diagram type from: flowchart, mindmap, orgchart, sequence, freeform. Output the diagram type on the first line, then the JSON on the next line."
  }
  return `Generate a ${type} diagram. Output ONLY the JSON.`
}

/* ── JSON extraction ─────────────────────────────────── */

function extractJSON(text: string): string {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Find the first { or [ and match to its closing counterpart
  const start = text.search(/[{[]/)
  if (start === -1) throw new Error("No JSON found in AI response")

  const openChar = text[start]
  const closeChar = openChar === "{" ? "}" : "]"
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++
    else if (text[i] === closeChar) depth--
    if (depth === 0) return text.slice(start, i + 1)
  }

  // Fallback: return everything from first brace
  return text.slice(start)
}

function detectTypeFromJSON(json: any): DiagramType {
  if (json.nodes && json.edges) return "flowchart"
  if (json.root && json.children) return "mindmap"
  if (json.root && json.root.children) return "orgchart"
  if (json.actors && json.messages) return "sequence"
  if (json.elements) return "freeform"
  return "flowchart" // fallback
}

/* ── AI call ─────────────────────────────────────────── */

async function callAI(
  messages: Array<{ role: string; content: string }>,
  model?: string,
): Promise<string> {
  // Try Electron IPC first
  if (typeof window !== "undefined" && window.tesserin?.ai) {
    const result = await window.tesserin.ai.chat(messages, model)
    return result.content
  }

  // Fallback: direct Ollama HTTP
  const endpoint = getOllamaEndpoint()
  const res = await fetch(`${endpoint}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model ?? "llama3.2",
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!res.ok) throw new Error(`Ollama request failed: ${res.status}`)
  const data = await res.json()
  return data.message?.content ?? ""
}

/* ── Public API ──────────────────────────────────────── */

/**
 * Generate diagram elements from a text prompt.
 *
 * @param prompt - User's natural language description
 * @param type - Diagram type or "auto" for AI to decide
 * @param position - Where to place the diagram on canvas
 * @param isDark - Whether to use dark theme colors
 * @param model - AI model name (optional)
 * @returns Array of Excalidraw elements
 */
export async function generateDiagram(
  prompt: string,
  type: DiagramType = "auto",
  position: { x: number; y: number } = { x: 0, y: 0 },
  isDark: boolean = true,
  model?: string,
): Promise<GenerateResult> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `${buildTypePrompt(type)}\n\nUser request: ${prompt}`,
    },
  ]

  let responseText = await callAI(messages, model)

  // Parse auto-detected type if applicable
  let resolvedType = type
  if (type === "auto") {
    // Check if first line contains a type hint
    const lines = responseText.trim().split("\n")
    const firstLine = lines[0].toLowerCase().trim()
    const typeHints: DiagramType[] = ["flowchart", "mindmap", "orgchart", "sequence", "freeform"]
    for (const t of typeHints) {
      if (firstLine.includes(t)) {
        resolvedType = t
        responseText = lines.slice(1).join("\n")
        break
      }
    }
  }

  // Extract and parse JSON
  let parsed: any
  try {
    const jsonStr = extractJSON(responseText)
    parsed = JSON.parse(jsonStr)
  } catch {
    // Retry once with a more explicit prompt
    const retryMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${buildTypePrompt(type)}\n\nUser request: ${prompt}`,
      },
      { role: "assistant", content: responseText },
      {
        role: "user",
        content: "That was not valid JSON. Please output ONLY the JSON object, with no surrounding text or markdown.",
      },
    ]
    const retryText = await callAI(retryMessages, model)
    const jsonStr = extractJSON(retryText)
    parsed = JSON.parse(jsonStr)
  }

  // Auto-detect if still "auto"
  if (resolvedType === "auto") {
    resolvedType = detectTypeFromJSON(parsed)
  }

  // Build elements using the appropriate builder
  let elements: any[]
  switch (resolvedType) {
    case "flowchart":
      elements = buildFlowchartElements(parsed as DiagramSpec, position.x, position.y, isDark)
      break
    case "mindmap":
      elements = buildMindMapElements(parsed as MindMapSpec, position.x, position.y, isDark)
      break
    case "orgchart":
      elements = buildOrgChartElements(parsed as OrgChartSpec, position.x, position.y, isDark)
      break
    case "sequence":
      elements = buildSequenceDiagramElements(parsed as SequenceSpec, position.x, position.y, isDark)
      break
    case "freeform":
      elements = buildFreeformElements(
        (parsed as { elements: FreeformElementSpec[] }).elements,
        position.x,
        position.y,
        isDark,
      )
      break
    default:
      elements = buildFlowchartElements(parsed as DiagramSpec, position.x, position.y, isDark)
      resolvedType = "flowchart"
  }

  return { elements, diagramType: resolvedType }
}
