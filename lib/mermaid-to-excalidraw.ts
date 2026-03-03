/**
 * Mermaid → Excalidraw Element Builder  (renderer-side)
 *
 * Parses Mermaid diagram syntax and converts to Excalidraw-compatible elements.
 * Supports: flowchart (TD / LR), sequenceDiagram, mindmap
 *
 * Mirrors electron/mermaid-parser.ts but lives in lib/ for renderer use.
 */

import { excalidrawId } from "./canvas-elements"

/* ── Theme ─────────────────────────────────────────────── */

const DARK = {
  stroke:   "#e2e2e2",
  text:     "#f4f4f4",
  edge:     "#888888",
  accent:   "#facc15",
  accentBg: "#1a1800",
  dimBg:    "transparent",
}
const LIGHT = {
  stroke:   "#374151",
  text:     "#111827",
  edge:     "#6B7280",
  accent:   "#d97706",
  accentBg: "#fffbeb",
  dimBg:    "transparent",
}
type C = typeof DARK

function rnd() { return Math.floor(Math.random() * 1_000_000) }

/* ── Base element factory ──────────────────────────────── */

function box(type: string, x: number, y: number, w: number, h: number, c: C, extras: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: excalidrawId(), type, x, y, width: w, height: h,
    strokeColor: c.stroke, backgroundColor: c.dimBg,
    fillStyle: "solid", strokeWidth: 2, roughness: 0, opacity: 100, angle: 0,
    strokeStyle: "solid",
    roundness: ["rectangle","diamond","ellipse"].includes(type) ? { type: 3, value: 10 } : null,
    seed: rnd(), version: 1, versionNonce: rnd(),
    isDeleted: false, groupIds: [], boundElements: null,
    updated: Date.now(), link: null, locked: false, frameId: null,
    ...extras,
  }
}

function texel(x: number, y: number, text: string, fs: number, c: C, w?: number, containerId?: string): Record<string, unknown> {
  const tw = w ?? Math.max(text.length * (fs * 0.55), 40)
  return {
    id: excalidrawId(), type: "text", x, y, width: tw, height: fs + 6,
    text, fontSize: fs, fontFamily: 3,
    textAlign: "center", verticalAlign: "middle",
    strokeColor: c.text, backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 1, roughness: 0, opacity: 100, angle: 0,
    strokeStyle: "solid", roundness: null,
    seed: rnd(), version: 1, versionNonce: rnd(),
    isDeleted: false, groupIds: [], boundElements: null,
    updated: Date.now(), link: null, locked: false, frameId: null,
    containerId: containerId ?? null, originalText: text,
    autoResize: true, lineHeight: 1.25,
  }
}

function arrowEl(x1: number, y1: number, x2: number, y2: number, c: C, dashed = false): Record<string, unknown> {
  return {
    id: excalidrawId(), type: "arrow",
    x: x1, y: y1, width: Math.abs(x2 - x1) || 2, height: Math.abs(y2 - y1) || 2,
    points: [[0, 0], [x2 - x1, y2 - y1]],
    strokeColor: c.edge, backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 2, roughness: 0, opacity: 100, angle: 0,
    strokeStyle: dashed ? "dashed" : "solid",
    roundness: { type: 2 },
    seed: rnd(), version: 1, versionNonce: rnd(),
    isDeleted: false, groupIds: [], boundElements: null,
    updated: Date.now(), link: null, locked: false, frameId: null,
    startBinding: null, endBinding: null,
    lastCommittedPoint: null, startArrowhead: null, endArrowhead: "arrow",
  }
}

/* ══════════════════════════════════════════════════════════
   Flowchart Parser
   ══════════════════════════════════════════════════════════ */

type Shape = "rect" | "round" | "diamond" | "ellipse" | "hexagon"
interface FNode { id: string; label: string; shape: Shape }
interface FEdge { from: string; to: string; label: string; dashed: boolean }

function parseNodeRef(raw: string): FNode | null {
  raw = raw.trim()
  if (!raw) return null
  let m: RegExpMatchArray | null
  if ((m = raw.match(/^([A-Za-z0-9_]+)\(\(([^)]*)\)\)$/))) return { id: m[1], label: m[2] || m[1], shape: "ellipse" }
  if ((m = raw.match(/^([A-Za-z0-9_]+)\(([^)]*)\)$/))) return { id: m[1], label: m[2] || m[1], shape: "round" }
  if ((m = raw.match(/^([A-Za-z0-9_]+)\{([^}]*)\}$/))) return { id: m[1], label: m[2] || m[1], shape: "diamond" }
  if ((m = raw.match(/^([A-Za-z0-9_]+)\[([^\]]*)\]$/))) return { id: m[1], label: m[2] || m[1], shape: "rect" }
  if ((m = raw.match(/^([A-Za-z0-9_]+)$/))) return { id: m[1], label: m[1], shape: "rect" }
  return null
}

function parseFlowLine(line: string): { from: FNode; to: FNode; label: string; dashed: boolean } | null {
  line = line.trim()
  if (!line || line.startsWith("%%") || /^(classDef|class |click |style |linkStyle)/i.test(line)) return null
  if (!(/-+>|==>|->/.test(line))) return null

  const splitRe = /(--+>|==>|-\.+->)/
  const split = line.split(splitRe)
  if (split.length < 3) return null

  const leftPart = split[0].trim()
  const edgeToken = split[1]
  let rightFull = split.slice(2).join("").trim()
  const dashed = edgeToken.includes(".")

  let edgeLabel = ""
  const pipeLabel = rightFull.match(/^\|([^|]+)\|(.*)/)
  if (pipeLabel) { edgeLabel = pipeLabel[1].trim(); rightFull = pipeLabel[2].trim() }
  const dashLabel = edgeToken.match(/--\s+(.+?)\s+--/)
  if (dashLabel) edgeLabel = dashLabel[1]

  const from = parseNodeRef(leftPart.split(/\|/)[0].trim())
  const to = parseNodeRef(rightFull.replace(/\|[^|]+\|/, "").trim())
  if (!from || !to) return null
  return { from, to, label: edgeLabel, dashed }
}

function layerNodes(nodeIds: string[], edges: FEdge[]): string[][] {
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()
  for (const id of nodeIds) { inDegree.set(id, 0); adj.set(id, []) }
  for (const e of edges) {
    adj.get(e.from)?.push(e.to)
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1)
  }
  const layers: string[][] = []
  let current = nodeIds.filter(id => (inDegree.get(id) ?? 0) === 0)
  const visited = new Set<string>()
  while (current.length > 0) {
    layers.push(current)
    current.forEach(id => visited.add(id))
    const next: string[] = []
    for (const id of current) {
      for (const nb of (adj.get(id) ?? [])) {
        if (!visited.has(nb) && !next.includes(nb)) next.push(nb)
      }
    }
    current = next
  }
  const missed = nodeIds.filter(id => !visited.has(id))
  if (missed.length > 0) layers.push(missed)
  return layers
}

function buildFlowchart(code: string, isDark: boolean): unknown[] {
  const c = isDark ? DARK : LIGHT
  const lines = code.split("\n")
  const firstLine = lines[0].toLowerCase()
  const isLR = /\blr\b|\brl\b/i.test(firstLine)
  const nodes = new Map<string, FNode>()
  const edges: FEdge[] = []

  for (const line of lines.slice(1)) {
    const parsed = parseFlowLine(line)
    if (parsed) {
      if (!nodes.has(parsed.from.id)) nodes.set(parsed.from.id, parsed.from)
      else if (parsed.from.label !== parsed.from.id) Object.assign(nodes.get(parsed.from.id)!, parsed.from)
      if (!nodes.has(parsed.to.id)) nodes.set(parsed.to.id, parsed.to)
      else if (parsed.to.label !== parsed.to.id) Object.assign(nodes.get(parsed.to.id)!, parsed.to)
      edges.push({ from: parsed.from.id, to: parsed.to.id, label: parsed.label, dashed: parsed.dashed })
    } else {
      const ref = parseNodeRef(line.trim().split("-->")[0].trim())
      if (ref && !nodes.has(ref.id)) nodes.set(ref.id, ref)
    }
  }

  if (nodes.size === 0) return []
  const NODE_W = 160, NODE_H = 50, H_GAP = 70, V_GAP = 80
  const layers = layerNodes(Array.from(nodes.keys()), edges)
  const posMap = new Map<string, { x: number; y: number }>()

  layers.forEach((layer, li) => {
    if (isLR) {
      const x = li * (NODE_W + H_GAP)
      layer.forEach((id, ri) => {
        const totalH = layer.length * (NODE_H + V_GAP) - V_GAP
        posMap.set(id, { x, y: ri * (NODE_H + V_GAP) - totalH / 2 })
      })
    } else {
      const y = li * (NODE_H + V_GAP)
      layer.forEach((id, ri) => {
        const totalW = layer.length * (NODE_W + H_GAP) - H_GAP
        posMap.set(id, { x: ri * (NODE_W + H_GAP) - totalW / 2, y })
      })
    }
  })

  const elements: unknown[] = []
  for (const [id, node] of nodes) {
    const pos = posMap.get(id) ?? { x: 0, y: 0 }
    const shapeType = node.shape === "diamond" ? "diamond" : node.shape === "ellipse" ? "ellipse" : "rectangle"
    const el = box(shapeType, pos.x, pos.y, NODE_W, NODE_H, c,
      node.shape === "diamond" ? { strokeColor: c.accent, backgroundColor: c.accentBg } : {}
    ) as Record<string, unknown>
    const tw = Math.min(node.label.length * 7.5, NODE_W - 12)
    const te = texel(pos.x + (NODE_W - tw) / 2, pos.y + (NODE_H - 20) / 2, node.label, 13, c, tw, el.id as string)
    ;(el as any).boundElements = [{ type: "text", id: (te as any).id }]
    elements.push(el, te)
  }
  for (const edge of edges) {
    const fp = posMap.get(edge.from), tp = posMap.get(edge.to)
    if (!fp || !tp) continue
    const x1 = fp.x + NODE_W / 2, y1 = fp.y + NODE_H / 2
    const x2 = tp.x + NODE_W / 2, y2 = tp.y + NODE_H / 2
    elements.push(arrowEl(x1, y1, x2, y2, c, edge.dashed))
    if (edge.label) elements.push(texel((x1 + x2) / 2 - 30, (y1 + y2) / 2 - 12, edge.label, 11, c, 80))
  }
  return elements
}

/* ══════════════════════════════════════════════════════════
   Sequence Parser
   ══════════════════════════════════════════════════════════ */

function buildSequence(code: string, isDark: boolean): unknown[] {
  const c = isDark ? DARK : LIGHT
  const lines = code.split("\n").map(l => l.trim()).filter(Boolean)
  const actors: Array<{ id: string; label: string }> = []
  const messages: Array<{ from: string; to: string; label: string; dashed: boolean }> = []

  for (const line of lines.slice(1)) {
    if (!line || line.startsWith("%%")) continue
    const partM = line.match(/^(?:participant|actor)\s+([A-Za-z0-9_]+)(?:\s+as\s+(.+))?$/i)
    if (partM) { const id = partM[1]; if (!actors.find(a => a.id === id)) actors.push({ id, label: partM[2]?.trim() || id }); continue }
    const msgM = line.match(/^([A-Za-z0-9_]+)\s*(-?-?>>?|-->>?|-x|->)\s*([A-Za-z0-9_]+)\s*:\s*(.*)$/)
    if (msgM) {
      const fromId = msgM[1], edge = msgM[2], toId = msgM[3], label = msgM[4].trim()
      if (!actors.find(a => a.id === fromId)) actors.push({ id: fromId, label: fromId })
      if (!actors.find(a => a.id === toId)) actors.push({ id: toId, label: toId })
      messages.push({ from: fromId, to: toId, label, dashed: edge.includes("-") && edge.length > 2 })
    }
  }

  if (actors.length === 0) return []
  const ACTOR_W = 120, ACTOR_H = 40, H_GAP = 100
  const MSG_H = 55
  const totalHeight = messages.length * MSG_H + 40
  const elements: unknown[] = []
  const actorX = new Map<string, number>()
  actors.forEach((a, i) => actorX.set(a.id, i * (ACTOR_W + H_GAP)))

  for (const actor of actors) {
    const ax = actorX.get(actor.id)!
    const topBox = box("rectangle", ax, 0, ACTOR_W, ACTOR_H, c) as Record<string, unknown>
    const topTxt = texel(ax + 8, ACTOR_H / 2 - 8, actor.label, 13, c, ACTOR_W - 16, topBox.id as string)
    ;(topBox as any).boundElements = [{ type: "text", id: (topTxt as any).id }]
    const botY = totalHeight + ACTOR_H + 10
    const botBox = box("rectangle", ax, botY, ACTOR_W, ACTOR_H, c) as Record<string, unknown>
    const botTxt = texel(ax + 8, botY + ACTOR_H / 2 - 8, actor.label, 13, c, ACTOR_W - 16, botBox.id as string)
    ;(botBox as any).boundElements = [{ type: "text", id: (botTxt as any).id }]
    elements.push(topBox, topTxt, botBox, botTxt)
    const lx = ax + ACTOR_W / 2
    elements.push(arrowEl(lx, ACTOR_H, lx, botY, { ...c, edge: c.stroke }, true))
  }

  messages.forEach((msg, i) => {
    const fy = ACTOR_H + 20 + i * MSG_H
    const fx = (actorX.get(msg.from) ?? 0) + ACTOR_W / 2
    const tx = (actorX.get(msg.to) ?? 0) + ACTOR_W / 2
    if (msg.from === msg.to) {
      elements.push(arrowEl(fx, fy, fx + 60, fy + 20, c, msg.dashed))
      elements.push(arrowEl(fx + 60, fy + 20, fx, fy + 30, c, msg.dashed))
    } else {
      elements.push(arrowEl(fx, fy, tx, fy, c, msg.dashed))
    }
    if (msg.label) {
      const lx = msg.from === msg.to ? fx + 30 : Math.min(fx, tx) + Math.abs(tx - fx) / 2 - 40
      elements.push(texel(lx, fy - 16, msg.label, 11, c, Math.abs(tx - fx) || 80))
    }
  })
  return elements
}

/* ══════════════════════════════════════════════════════════
   Mindmap Parser
   ══════════════════════════════════════════════════════════ */

interface MmNode { label: string; children: MmNode[] }

function buildMindmap(code: string, isDark: boolean): unknown[] {
  const c = isDark ? DARK : LIGHT
  const lines = code.split("\n").filter(l => l.trim() && !l.trim().startsWith("%%"))

  const getIndent = (l: string) => l.match(/^(\s*)/)?.[1].length ?? 0
  const stripLabel = (l: string) => l.trim()
    .replace(/^\(\((.+?)\)\)$/, "$1").replace(/^\[(.+?)\]$/, "$1")
    .replace(/^\((.+?)\)$/, "$1").replace(/^"(.+?)"$/, "$1")

  const stack: Array<{ node: MmNode; indent: number }> = []
  let root: MmNode | null = null

  for (const line of lines.slice(1)) {
    const indent = getIndent(line), label = stripLabel(line)
    if (!label) continue
    const node: MmNode = { label, children: [] }
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
    if (stack.length === 0) { if (!root) { root = node; stack.push({ node, indent }) } }
    else { stack[stack.length - 1].node.children.push(node); stack.push({ node, indent }) }
  }

  if (!root) return []
  const elements: unknown[] = []
  const NODE_W = 140, NODE_H = 40, H_GAP = 60, V_GAP = 60

  function subtreeSize(n: MmNode): number {
    return n.children.length === 0 ? 1 : n.children.reduce((s, ch) => s + subtreeSize(ch), 0)
  }

  function placeNode(n: MmNode, cx: number, cy: number, parentPos?: { x: number; y: number }) {
    const el = box("rectangle", cx - NODE_W / 2, cy - NODE_H / 2, NODE_W, NODE_H, c,
      parentPos ? {} : { strokeColor: c.accent, strokeWidth: 3 }
    ) as Record<string, unknown>
    const te = texel(cx - NODE_W / 2 + 8, cy - 10, n.label, 13, c, NODE_W - 16, el.id as string)
    ;(el as any).boundElements = [{ type: "text", id: (te as any).id }]
    elements.push(el, te)
    if (parentPos) elements.push(arrowEl(parentPos.x, parentPos.y, cx, cy, { ...c, edge: c.stroke }))
    let childY = cy - (subtreeSize(n) - 1) * (NODE_H + V_GAP) / 2
    for (const child of n.children) {
      const childSize = subtreeSize(child)
      const childCY = childY + (childSize - 1) * (NODE_H + V_GAP) / 2
      placeNode(child, cx + NODE_W + H_GAP, childCY, { x: cx + NODE_W / 2, y: cy })
      childY += childSize * (NODE_H + V_GAP)
    }
  }

  placeNode(root, 0, 0)
  return elements
}

/* ══════════════════════════════════════════════════════════
   Public API
   ══════════════════════════════════════════════════════════ */

export interface MermaidParseResult {
  elements: unknown[]
  diagramType: "flowchart" | "sequence" | "mindmap" | "unknown"
  error?: string
}

/**
 * Parse Mermaid diagram code and return Excalidraw-compatible elements.
 */
export function parseMermaid(
  code: string,
  isDark = true,
  offsetX = 0,
  offsetY = 0,
): MermaidParseResult {
  try {
    const trimmed = code.trim()
    let elements: unknown[]
    let diagramType: MermaidParseResult["diagramType"]

    if (/^(flowchart|graph)\s/i.test(trimmed)) {
      elements = buildFlowchart(trimmed, isDark)
      diagramType = "flowchart"
    } else if (/^sequenceDiagram/i.test(trimmed)) {
      elements = buildSequence(trimmed, isDark)
      diagramType = "sequence"
    } else if (/^mindmap/i.test(trimmed)) {
      elements = buildMindmap(trimmed, isDark)
      diagramType = "mindmap"
    } else {
      elements = buildFlowchart("flowchart TD\n" + trimmed, isDark)
      diagramType = "flowchart"
    }

    if (offsetX !== 0 || offsetY !== 0) {
      elements = (elements as any[]).map((el: any) => ({ ...el, x: (el.x ?? 0) + offsetX, y: (el.y ?? 0) + offsetY }))
    }

    return { elements, diagramType }
  } catch (err) {
    return { elements: [], diagramType: "unknown", error: err instanceof Error ? err.message : String(err) }
  }
}

/** Mermaid system prompt for AI code generation */
export const MERMAID_SYSTEM_PROMPT = `You are a Mermaid diagram expert. Given a description, output ONLY valid Mermaid diagram code — no markdown fences, no explanation.

Supported types:

## flowchart TD (top-down)
flowchart TD
  A[Start] --> B{Decision?}
  B -- Yes --> C[Process]
  B -- No --> D[Skip]
  C --> E([End])
  D --> E

## flowchart LR (left-right)
flowchart LR
  A[Input] --> B[Validate] --> C[Store] --> D[Return]

## sequenceDiagram
sequenceDiagram
  participant C as Client
  participant S as Server
  C->>S: POST /login
  S-->>C: 200 OK + JWT

## mindmap
mindmap
  root((Main Topic))
    Branch1
      Sub1a
      Sub1b
    Branch2
      Sub2a

Rules:
- Output ONLY the Mermaid code starting with the diagram type keyword
- No markdown code fences (no \`\`\`)
- Keep diagrams to 4-14 nodes for readability
- Use the most appropriate diagram type`
