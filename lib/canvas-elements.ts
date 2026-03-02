/**
 * Canvas Element Builders
 *
 * Utility functions for programmatically creating Excalidraw elements.
 * Used by:
 *  - AI diagram generation (MCP tools, inline canvas AI)
 *  - Note-card insertion (createNoteCardElements)
 *
 * Each builder takes a structured specification (nodes, edges, etc.)
 * and returns ExcalidrawElement[] ready for `api.updateScene()`.
 */

/* ── ID / seed helpers ────────────────────────────────── */

const ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

/** Generate a 21-char random alphanumeric ID (matches Excalidraw format). */
export function excalidrawId(): string {
  let id = ""
  for (let i = 0; i < 21; i++) id += ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]
  return id
}

function seed(): number {
  return Math.floor(Math.random() * 1_000_000)
}

/* ── Base element factory ─────────────────────────────── */

interface BaseProps {
  x: number
  y: number
  width: number
  height: number
  strokeColor?: string
  backgroundColor?: string
  groupIds?: string[]
}

function baseElement(type: string, p: BaseProps) {
  return {
    id: excalidrawId(),
    type,
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    strokeColor: p.strokeColor ?? "#ededed",
    backgroundColor: p.backgroundColor ?? "transparent",
    fillStyle: "solid" as const,
    strokeWidth: 2,
    roughness: 0,
    opacity: 100,
    angle: 0,
    strokeStyle: "solid" as const,
    roundness: type === "rectangle" || type === "diamond" || type === "ellipse"
      ? { type: 3, value: 12 }
      : null,
    seed: seed(),
    version: 1,
    versionNonce: seed(),
    isDeleted: false,
    groupIds: p.groupIds ?? [],
    boundElements: null as any,
    updated: Date.now(),
    link: null,
    locked: false,
    frameId: null,
  }
}

function textElement(opts: {
  x: number
  y: number
  text: string
  fontSize?: number
  strokeColor?: string
  textAlign?: "left" | "center" | "right"
  width?: number
  groupIds?: string[]
}) {
  const fontSize = opts.fontSize ?? 16
  const lines = opts.text.split("\n")
  const width = opts.width ?? Math.max(50, Math.max(...lines.map((l) => l.length)) * fontSize * 0.6)
  const height = lines.length * fontSize * 1.35
  return {
    ...baseElement("text", {
      x: opts.x,
      y: opts.y,
      width,
      height,
      strokeColor: opts.strokeColor ?? "#ededed",
      groupIds: opts.groupIds,
    }),
    text: opts.text,
    fontSize,
    fontFamily: 1,
    textAlign: opts.textAlign ?? "center",
    verticalAlign: "middle" as const,
    containerId: null as string | null,
    originalText: opts.text,
    autoResize: true,
    lineHeight: 1.25,
    roundness: null,
  }
}

function arrowElement(opts: {
  startX: number
  startY: number
  endX: number
  endY: number
  strokeColor?: string
  groupIds?: string[]
  startId?: string
  endId?: string
  label?: string
}) {
  const dx = opts.endX - opts.startX
  const dy = opts.endY - opts.startY
  const el: any = {
    ...baseElement("arrow", {
      x: opts.startX,
      y: opts.startY,
      width: Math.abs(dx),
      height: Math.abs(dy),
      strokeColor: opts.strokeColor ?? "#ededed",
      groupIds: opts.groupIds,
    }),
    points: [
      [0, 0],
      [dx, dy],
    ],
    startBinding: opts.startId
      ? { elementId: opts.startId, focus: 0, gap: 4, fixedPoint: null }
      : null,
    endBinding: opts.endId
      ? { elementId: opts.endId, focus: 0, gap: 4, fixedPoint: null }
      : null,
    startArrowhead: null,
    endArrowhead: "arrow",
    roundness: { type: 2 },
    elbowed: false,
  }
  return el
}

/* ── Diagram spec types ──────────────────────────────── */

export interface DiagramNode {
  id: string
  label: string
  type?: "rectangle" | "diamond" | "ellipse" | "rounded"
}

export interface DiagramEdge {
  from: string
  to: string
  label?: string
}

export interface DiagramSpec {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

export interface MindMapSpec {
  root: string
  children: Array<{ label: string; children?: Array<{ label: string }> }>
}

export interface OrgChartSpec {
  root: { label: string; children: OrgChartNode[] }
}

export interface OrgChartNode {
  label: string
  children?: OrgChartNode[]
}

export interface SequenceSpec {
  actors: string[]
  messages: Array<{ from: string; to: string; label: string }>
}

/* ── Flowchart builder ────────────────────────────────── */

const NODE_W = 180
const NODE_H = 60
const GAP_X = 80
const GAP_Y = 100

export function buildFlowchartElements(
  spec: DiagramSpec,
  startX: number = 0,
  startY: number = 0,
  isDark: boolean = true,
): any[] {
  const accentColor = isDark ? "#FACC15" : "#CA8A04"
  const textColor = isDark ? "#ededed" : "#2d2a26"
  const bgColor = isDark ? "#1a1a1a" : "#fdfbf7"
  const groupId = excalidrawId()

  // Layout nodes in a grid (auto-layout using topological order or just sequential rows)
  const nodePositions = new Map<string, { x: number; y: number }>()
  const nodeElements: any[] = []
  const cols = Math.ceil(Math.sqrt(spec.nodes.length))

  spec.nodes.forEach((node, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = startX + col * (NODE_W + GAP_X)
    const y = startY + row * (NODE_H + GAP_Y)
    nodePositions.set(node.id, { x, y })

    const shape = node.type === "diamond" ? "diamond"
      : node.type === "ellipse" ? "ellipse"
      : "rectangle"

    const rect = {
      ...baseElement(shape, {
        x,
        y,
        width: NODE_W,
        height: NODE_H,
        strokeColor: accentColor,
        backgroundColor: bgColor,
        groupIds: [groupId],
      }),
      fillStyle: "solid" as const,
    }

    const label = textElement({
      x: x + NODE_W / 2 - (node.label.length * 8) / 2,
      y: y + NODE_H / 2 - 10,
      text: node.label,
      fontSize: 16,
      strokeColor: textColor,
      textAlign: "center",
      width: NODE_W - 20,
      groupIds: [groupId],
    })

    // Register rectangle as having a bound text element
    rect.boundElements = [{ id: label.id, type: "text" }]
    label.containerId = rect.id

    nodeElements.push(rect, label)
  })

  // Build edges (arrows)
  const edgeElements: any[] = []
  for (const edge of spec.edges) {
    const fromPos = nodePositions.get(edge.from)
    const toPos = nodePositions.get(edge.to)
    if (!fromPos || !toPos) continue

    // Find the created rectangle elements for binding
    const fromRect = nodeElements.find(
      (el) => el.type !== "text" && Math.abs(el.x - fromPos.x) < 1 && Math.abs(el.y - fromPos.y) < 1,
    )
    const toRect = nodeElements.find(
      (el) => el.type !== "text" && Math.abs(el.x - toPos.x) < 1 && Math.abs(el.y - toPos.y) < 1,
    )

    const arrow = arrowElement({
      startX: fromPos.x + NODE_W / 2,
      startY: fromPos.y + NODE_H,
      endX: toPos.x + NODE_W / 2,
      endY: toPos.y,
      strokeColor: accentColor,
      groupIds: [groupId],
      startId: fromRect?.id,
      endId: toRect?.id,
    })

    // Register arrows as bound elements on rectangles
    if (fromRect) {
      fromRect.boundElements = [
        ...(fromRect.boundElements || []),
        { id: arrow.id, type: "arrow" },
      ]
    }
    if (toRect) {
      toRect.boundElements = [
        ...(toRect.boundElements || []),
        { id: arrow.id, type: "arrow" },
      ]
    }

    edgeElements.push(arrow)
  }

  return [...nodeElements, ...edgeElements]
}

/* ── Mind Map builder ─────────────────────────────────── */

export function buildMindMapElements(
  spec: MindMapSpec,
  startX: number = 0,
  startY: number = 0,
  isDark: boolean = true,
): any[] {
  const accentColor = isDark ? "#FACC15" : "#CA8A04"
  const textColor = isDark ? "#ededed" : "#2d2a26"
  const bgColor = isDark ? "#1a1a1a" : "#fdfbf7"
  const groupId = excalidrawId()
  const elements: any[] = []

  // Central root node (ellipse)
  const rootW = Math.max(160, spec.root.length * 12 + 40)
  const rootH = 60
  const rootX = startX
  const rootY = startY

  const rootEl = {
    ...baseElement("ellipse", {
      x: rootX - rootW / 2,
      y: rootY - rootH / 2,
      width: rootW,
      height: rootH,
      strokeColor: accentColor,
      backgroundColor: isDark ? "#2a2000" : "#fdf6d8",
      groupIds: [groupId],
    }),
    fillStyle: "solid" as const,
  }
  elements.push(rootEl)

  const rootLabel = textElement({
    x: rootX - rootW / 2 + 10,
    y: rootY - 10,
    text: spec.root,
    fontSize: 18,
    strokeColor: textColor,
    textAlign: "center",
    width: rootW - 20,
    groupIds: [groupId],
  })
  rootLabel.containerId = rootEl.id
  rootEl.boundElements = [{ id: rootLabel.id, type: "text" }]
  elements.push(rootLabel)

  // Arrange children in a circle around root
  const childCount = spec.children.length
  const radius = 250
  const angleStep = (2 * Math.PI) / Math.max(childCount, 1)
  const startAngle = -Math.PI / 2

  spec.children.forEach((child, i) => {
    const angle = startAngle + i * angleStep
    const cx = rootX + radius * Math.cos(angle)
    const cy = rootY + radius * Math.sin(angle)
    const cw = Math.max(140, child.label.length * 10 + 30)
    const ch = 44

    const childEl = {
      ...baseElement("rectangle", {
        x: cx - cw / 2,
        y: cy - ch / 2,
        width: cw,
        height: ch,
        strokeColor: accentColor,
        backgroundColor: bgColor,
        groupIds: [groupId],
      }),
      fillStyle: "solid" as const,
    }

    const childLabel = textElement({
      x: cx - cw / 2 + 8,
      y: cy - 8,
      text: child.label,
      fontSize: 14,
      strokeColor: textColor,
      textAlign: "center",
      width: cw - 16,
      groupIds: [groupId],
    })
    childLabel.containerId = childEl.id
    childEl.boundElements = [{ id: childLabel.id, type: "text" }]

    // Arrow from root to child
    const arrow = arrowElement({
      startX: rootX,
      startY: rootY,
      endX: cx,
      endY: cy,
      strokeColor: isDark ? "#555" : "#ccc",
      groupIds: [groupId],
      startId: rootEl.id,
      endId: childEl.id,
    })
    rootEl.boundElements.push({ id: arrow.id, type: "arrow" })
    childEl.boundElements.push({ id: arrow.id, type: "arrow" })

    elements.push(childEl, childLabel, arrow)

    // Sub-children
    if (child.children && child.children.length > 0) {
      const subRadius = 140
      const subAngleSpread = Math.PI / 3
      const subStep = subAngleSpread / Math.max(child.children.length - 1, 1)
      const subStart = angle - subAngleSpread / 2

      child.children.forEach((sub, j) => {
        const subAngle = child.children!.length === 1 ? angle : subStart + j * subStep
        const sx = cx + subRadius * Math.cos(subAngle)
        const sy = cy + subRadius * Math.sin(subAngle)
        const sw = Math.max(120, sub.label.length * 9 + 24)
        const sh = 36

        const subEl = {
          ...baseElement("rectangle", {
            x: sx - sw / 2,
            y: sy - sh / 2,
            width: sw,
            height: sh,
            strokeColor: isDark ? "#888" : "#999",
            backgroundColor: bgColor,
            groupIds: [groupId],
          }),
          fillStyle: "solid" as const,
        }

        const subLabel = textElement({
          x: sx - sw / 2 + 6,
          y: sy - 7,
          text: sub.label,
          fontSize: 12,
          strokeColor: textColor,
          textAlign: "center",
          width: sw - 12,
          groupIds: [groupId],
        })
        subLabel.containerId = subEl.id
        subEl.boundElements = [{ id: subLabel.id, type: "text" }]

        const subArrow = arrowElement({
          startX: cx,
          startY: cy,
          endX: sx,
          endY: sy,
          strokeColor: isDark ? "#444" : "#ddd",
          groupIds: [groupId],
          startId: childEl.id,
          endId: subEl.id,
        })
        childEl.boundElements.push({ id: subArrow.id, type: "arrow" })
        subEl.boundElements.push({ id: subArrow.id, type: "arrow" })

        elements.push(subEl, subLabel, subArrow)
      })
    }
  })

  return elements
}

/* ── Org Chart builder ────────────────────────────────── */

export function buildOrgChartElements(
  spec: OrgChartSpec,
  startX: number = 0,
  startY: number = 0,
  isDark: boolean = true,
): any[] {
  const accentColor = isDark ? "#FACC15" : "#CA8A04"
  const textColor = isDark ? "#ededed" : "#2d2a26"
  const bgColor = isDark ? "#1a1a1a" : "#fdfbf7"
  const groupId = excalidrawId()
  const elements: any[] = []
  const BOX_W = 160
  const BOX_H = 50
  const H_GAP = 40
  const V_GAP = 80

  // BFS-style level-by-level layout
  interface LevelItem {
    node: OrgChartNode
    parentId?: string
    parentX?: number
    parentY?: number
  }

  const queue: LevelItem[] = [{ node: spec.root }]
  let level = 0
  let processedByLevel: Array<Array<{ id: string; x: number; y: number }>> = []

  while (queue.length > 0) {
    const levelSize = queue.length
    const levelItems: Array<{ id: string; x: number; y: number }> = []
    const currentLevelNodes: LevelItem[] = []

    for (let i = 0; i < levelSize; i++) {
      currentLevelNodes.push(queue.shift()!)
    }

    const totalWidth = currentLevelNodes.length * BOX_W + (currentLevelNodes.length - 1) * H_GAP
    const levelStartX = startX - totalWidth / 2

    currentLevelNodes.forEach((item, i) => {
      const x = levelStartX + i * (BOX_W + H_GAP)
      const y = startY + level * (BOX_H + V_GAP)

      const box = {
        ...baseElement("rectangle", {
          x,
          y,
          width: BOX_W,
          height: BOX_H,
          strokeColor: level === 0 ? accentColor : isDark ? "#888" : "#999",
          backgroundColor: level === 0 ? (isDark ? "#2a2000" : "#fdf6d8") : bgColor,
          groupIds: [groupId],
        }),
        fillStyle: "solid" as const,
      }

      const label = textElement({
        x: x + 8,
        y: y + BOX_H / 2 - 8,
        text: item.node.label,
        fontSize: level === 0 ? 16 : 14,
        strokeColor: textColor,
        textAlign: "center",
        width: BOX_W - 16,
        groupIds: [groupId],
      })
      label.containerId = box.id
      box.boundElements = [{ id: label.id, type: "text" }]

      elements.push(box, label)
      levelItems.push({ id: box.id, x, y })

      // Arrow from parent
      if (item.parentId && item.parentX !== undefined && item.parentY !== undefined) {
        const arrow = arrowElement({
          startX: item.parentX + BOX_W / 2,
          startY: item.parentY + BOX_H,
          endX: x + BOX_W / 2,
          endY: y,
          strokeColor: isDark ? "#555" : "#ccc",
          groupIds: [groupId],
          startId: item.parentId,
          endId: box.id,
        })

        // Add arrow binding to parent box
        const parentBox = elements.find((el: any) => el.id === item.parentId)
        if (parentBox) {
          parentBox.boundElements = [
            ...(parentBox.boundElements || []),
            { id: arrow.id, type: "arrow" },
          ]
        }
        box.boundElements.push({ id: arrow.id, type: "arrow" })
        elements.push(arrow)
      }

      // Queue children
      if (item.node.children) {
        for (const child of item.node.children) {
          queue.push({ node: child, parentId: box.id, parentX: x, parentY: y })
        }
      }
    })

    processedByLevel.push(levelItems)
    level++
  }

  return elements
}

/* ── Sequence Diagram builder ─────────────────────────── */

export function buildSequenceDiagramElements(
  spec: SequenceSpec,
  startX: number = 0,
  startY: number = 0,
  isDark: boolean = true,
): any[] {
  const accentColor = isDark ? "#FACC15" : "#CA8A04"
  const textColor = isDark ? "#ededed" : "#2d2a26"
  const bgColor = isDark ? "#1a1a1a" : "#fdfbf7"
  const groupId = excalidrawId()
  const elements: any[] = []

  const ACTOR_W = 120
  const ACTOR_H = 40
  const ACTOR_GAP = 180
  const MSG_GAP = 60
  const totalHeight = ACTOR_H + 40 + spec.messages.length * MSG_GAP + 40

  // Actor positions
  const actorPositions = new Map<string, number>()
  spec.actors.forEach((actor, i) => {
    const x = startX + i * ACTOR_GAP
    actorPositions.set(actor, x)

    // Actor box (top)
    const box = {
      ...baseElement("rectangle", {
        x: x - ACTOR_W / 2,
        y: startY,
        width: ACTOR_W,
        height: ACTOR_H,
        strokeColor: accentColor,
        backgroundColor: bgColor,
        groupIds: [groupId],
      }),
      fillStyle: "solid" as const,
    }

    const label = textElement({
      x: x - ACTOR_W / 2 + 8,
      y: startY + ACTOR_H / 2 - 8,
      text: actor,
      fontSize: 14,
      strokeColor: textColor,
      textAlign: "center",
      width: ACTOR_W - 16,
      groupIds: [groupId],
    })
    label.containerId = box.id
    box.boundElements = [{ id: label.id, type: "text" }]

    elements.push(box, label)

    // Lifeline (dashed vertical line represented as an arrow with no heads)
    const lifeline: any = {
      ...baseElement("arrow", {
        x,
        y: startY + ACTOR_H,
        width: 0,
        height: totalHeight - ACTOR_H,
        strokeColor: isDark ? "#444" : "#ccc",
        groupIds: [groupId],
      }),
      points: [
        [0, 0],
        [0, totalHeight - ACTOR_H],
      ],
      strokeStyle: "dashed" as const,
      startArrowhead: null,
      endArrowhead: null,
      startBinding: null,
      endBinding: null,
      roundness: null,
      elbowed: false,
      strokeWidth: 1,
    }
    elements.push(lifeline)
  })

  // Messages
  spec.messages.forEach((msg, i) => {
    const fromX = actorPositions.get(msg.from)
    const toX = actorPositions.get(msg.to)
    if (fromX === undefined || toX === undefined) return

    const y = startY + ACTOR_H + 40 + i * MSG_GAP

    const arrow = arrowElement({
      startX: fromX,
      startY: y,
      endX: toX,
      endY: y,
      strokeColor: accentColor,
      groupIds: [groupId],
    })
    elements.push(arrow)

    // Message label
    const labelX = Math.min(fromX, toX) + Math.abs(toX - fromX) / 2
    const msgLabel = textElement({
      x: labelX - (msg.label.length * 6),
      y: y - 20,
      text: msg.label,
      fontSize: 12,
      strokeColor: textColor,
      textAlign: "center",
      width: Math.max(80, msg.label.length * 8),
      groupIds: [groupId],
    })
    elements.push(msgLabel)
  })

  return elements
}

/* ── Free-form builder (structured element specs) ─────── */

export interface FreeformElementSpec {
  type: "rectangle" | "ellipse" | "diamond" | "text" | "arrow"
  x: number
  y: number
  width?: number
  height?: number
  label?: string
  strokeColor?: string
  backgroundColor?: string
  endX?: number
  endY?: number
}

export function buildFreeformElements(
  specs: FreeformElementSpec[],
  offsetX: number = 0,
  offsetY: number = 0,
  isDark: boolean = true,
): any[] {
  const textColor = isDark ? "#ededed" : "#2d2a26"
  const groupId = excalidrawId()
  const elements: any[] = []

  for (const s of specs) {
    if (s.type === "arrow") {
      elements.push(
        arrowElement({
          startX: s.x + offsetX,
          startY: s.y + offsetY,
          endX: (s.endX ?? s.x + 100) + offsetX,
          endY: (s.endY ?? s.y) + offsetY,
          strokeColor: s.strokeColor ?? (isDark ? "#FACC15" : "#CA8A04"),
          groupIds: [groupId],
        }),
      )
    } else if (s.type === "text") {
      elements.push(
        textElement({
          x: s.x + offsetX,
          y: s.y + offsetY,
          text: s.label ?? "",
          fontSize: 16,
          strokeColor: s.strokeColor ?? textColor,
          textAlign: "center",
          groupIds: [groupId],
        }),
      )
    } else {
      const w = s.width ?? 160
      const h = s.height ?? 60
      const shape = baseElement(s.type, {
        x: s.x + offsetX,
        y: s.y + offsetY,
        width: w,
        height: h,
        strokeColor: s.strokeColor ?? (isDark ? "#FACC15" : "#CA8A04"),
        backgroundColor: s.backgroundColor ?? (isDark ? "#1a1a1a" : "#fdfbf7"),
        groupIds: [groupId],
      })
      elements.push(shape)

      if (s.label) {
        const label = textElement({
          x: s.x + offsetX + 8,
          y: s.y + offsetY + h / 2 - 8,
          text: s.label,
          fontSize: 14,
          strokeColor: textColor,
          textAlign: "center",
          width: w - 16,
          groupIds: [groupId],
        })
        label.containerId = shape.id
        ;(shape as any).boundElements = [{ id: label.id, type: "text" }]
        elements.push(label)
      }
    }
  }

  return elements
}
