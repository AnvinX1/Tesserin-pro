"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import * as d3 from "d3"
import {
  FiZoomIn,
  FiZoomOut,
  FiMaximize,
  FiActivity,
  FiGitBranch,
  FiTarget,
} from "react-icons/fi"
import { useNotes, type GraphNode, type GraphLink } from "@/lib/notes-store"
import { TesserinLogo } from "../core/tesserin-logo"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Available graph layout modes.
 *
 * - `force`  -- D3 force-directed simulation (Zettelkasten style)
 * - `radial` -- D3 cluster arranged in a radial arc
 * - `mind`   -- D3 tree layout branching from the most-connected node
 */
type GraphMode = "force" | "radial" | "mind"

/** Internal node type used by D3 simulations */
interface SimNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  linkCount: number
}

/** Internal link type used by D3 simulations */
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
}

/* ------------------------------------------------------------------ */
/*  Mode metadata                                                       */
/* ------------------------------------------------------------------ */

const MODES: { id: GraphMode; label: string }[] = [
  { id: "force", label: "Force" },
  { id: "mind", label: "Mind Map" },
  { id: "radial", label: "Radial" },
]

/** Map mode → icon component */
const MODE_ICONS: Record<GraphMode, React.ReactNode> = {
  force: <FiActivity size={13} />,
  mind: <FiGitBranch size={13} />,
  radial: <FiTarget size={13} />,
}

/* ------------------------------------------------------------------ */
/*  Utility: build hierarchy for tree / radial layouts                  */
/* ------------------------------------------------------------------ */

interface HierarchyDatum {
  id: string
  title: string
  linkCount: number
  children: HierarchyDatum[]
}

/**
 * Build a pseudo-hierarchy from a flat graph. The root is the node with
 * the highest link count. BFS assigns parent-child relationships.
 */
function buildHierarchy(nodes: GraphNode[], links: GraphLink[]): HierarchyDatum {
  if (nodes.length === 0) {
    return { id: "empty", title: "No Notes", linkCount: 0, children: [] }
  }

  // Pick root = most connected node
  const sorted = [...nodes].sort((a, b) => b.linkCount - a.linkCount)
  const rootId = sorted[0].id

  // Adjacency list (undirected)
  const adj = new Map<string, Set<string>>()
  nodes.forEach((n) => adj.set(n.id, new Set()))
  links.forEach((l) => {
    adj.get(l.source)?.add(l.target)
    adj.get(l.target)?.add(l.source)
  })

  // BFS to build tree
  const visited = new Set<string>([rootId])
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  function buildNode(id: string): HierarchyDatum {
    const n = nodeMap.get(id)!
    const children: HierarchyDatum[] = []
    const neighbors = adj.get(id) ?? new Set()

    neighbors.forEach((nid) => {
      if (!visited.has(nid)) {
        visited.add(nid)
        children.push(buildNode(nid))
      }
    })

    return {
      id: n.id,
      title: n.title,
      linkCount: n.linkCount,
      children,
    }
  }

  const root = buildNode(rootId)

  // Add orphan nodes as children of root
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      root.children.push({
        id: n.id,
        title: n.title,
        linkCount: n.linkCount,
        children: [],
      })
    }
  })

  return root
}

/* ------------------------------------------------------------------ */
/*  SVG Defs — golden glow filters & ambient gradient                  */
/* ------------------------------------------------------------------ */

function createGoldenDefs(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
) {
  const defs = svg.append("defs")

  /* Subtle gold glow for every node */
  const glow = defs
    .append("filter")
    .attr("id", "gold-glow")
    .attr("x", "-80%")
    .attr("y", "-80%")
    .attr("width", "260%")
    .attr("height", "260%")
  glow
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", "3.5")
    .attr("result", "blur")
  glow
    .append("feFlood")
    .attr("flood-color", "#FACC15")
    .attr("flood-opacity", "0.35")
    .attr("result", "color")
  glow
    .append("feComposite")
    .attr("in", "color")
    .attr("in2", "blur")
    .attr("operator", "in")
    .attr("result", "shadow")
  const glowMerge = glow.append("feMerge")
  glowMerge.append("feMergeNode").attr("in", "shadow")
  glowMerge.append("feMergeNode").attr("in", "SourceGraphic")

  /* Intense gold glow for selected / hovered nodes */
  const activeGlow = defs
    .append("filter")
    .attr("id", "gold-glow-active")
    .attr("x", "-100%")
    .attr("y", "-100%")
    .attr("width", "300%")
    .attr("height", "300%")
  activeGlow
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", "7")
    .attr("result", "blur")
  activeGlow
    .append("feFlood")
    .attr("flood-color", "#FACC15")
    .attr("flood-opacity", "0.7")
    .attr("result", "color")
  activeGlow
    .append("feComposite")
    .attr("in", "color")
    .attr("in2", "blur")
    .attr("operator", "in")
    .attr("result", "shadow")
  const activeMerge = activeGlow.append("feMerge")
  activeMerge.append("feMergeNode").attr("in", "shadow")
  activeMerge.append("feMergeNode").attr("in", "SourceGraphic")

  /* Dark text-shadow so labels read over any background */
  const textGlow = defs
    .append("filter")
    .attr("id", "text-glow")
    .attr("x", "-20%")
    .attr("y", "-20%")
    .attr("width", "140%")
    .attr("height", "140%")
  textGlow
    .append("feGaussianBlur")
    .attr("in", "SourceGraphic")
    .attr("stdDeviation", "2")
    .attr("result", "blur")
  textGlow
    .append("feFlood")
    .attr("flood-color", "#000000")
    .attr("flood-opacity", "0.7")
    .attr("result", "color")
  textGlow
    .append("feComposite")
    .attr("in", "color")
    .attr("in2", "blur")
    .attr("operator", "in")
    .attr("result", "shadow")
  const textMerge = textGlow.append("feMerge")
  textMerge.append("feMergeNode").attr("in", "shadow")
  textMerge.append("feMergeNode").attr("in", "SourceGraphic")

}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * D3GraphView
 *
 * A D3.js-powered interactive knowledge graph visualisation that renders
 * note connections as an Obsidian-style Zettelkasten graph with a luxurious
 * golden-glow aesthetic. Supports three layout modes: Force-Directed,
 * Mind Map (tree) and Radial (cluster).
 *
 * Features:
 * - Pan and zoom via D3 zoom behaviour
 * - Node dragging (force mode)
 * - Click-to-navigate: clicking a node selects that note in the editor
 * - Always-visible note titles with smart truncation
 * - Golden glow effects via SVG filters
 * - Skeuomorphic mode selector and zoom controls
 * - Staggered entrance animations for nodes and links
 * - HUD showing node/link count and active mode
 */
export function D3GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<GraphMode>("force")
  const [, setHoveredNode] = useState<string | null>(null)
  const { graph, selectNote, selectedNoteId, notes } = useNotes()

  // Filter
  const [filterQuery, setFilterQuery] = useState("")

  // Tooltip
  const [tooltip, setTooltip] = useState<{
    title: string
    snippet: string
  } | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const notesContentRef = useRef<Map<string, string>>(new Map())
  const setTooltipRef = useRef(setTooltip)
  setTooltipRef.current = setTooltip

  // Keep note-content cache fresh
  useEffect(() => {
    notesContentRef.current = new Map(notes.map((n) => [n.id, n.content]))
  }, [notes])

  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  /** Persists the user's current zoom/pan across re-renders that don't change mode */
  const currentTransformRef = useRef<d3.ZoomTransform | null>(null)
  /** Tracks the previously rendered mode so we know when the layout is "fresh" */
  const prevModeRef = useRef<GraphMode | null>(null)

  /* ---- Main D3 render effect ---- */
  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    const container = containerRef.current

    // getBoundingClientRect is more reliable than clientWidth/Height inside flex
    const svgRect = svgRef.current.getBoundingClientRect()
    const width = svgRect.width > 0 ? Math.round(svgRect.width) : container.clientWidth
    const height = svgRect.height > 0 ? Math.round(svgRect.height) : container.clientHeight
    if (width === 0 || height === 0) return

    // Give the SVG element explicit dimensions so D3 internals always agree
    svg.attr("width", width).attr("height", height)

    // Determine if this is a layout-changing render (mode/first load) vs. a
    // lightweight re-render caused only by a selection change.
    const isFreshMode = prevModeRef.current !== mode
    prevModeRef.current = mode

    // Clean up previous
    svg.selectAll("*").remove()
    if (simulationRef.current) {
      simulationRef.current.stop()
      simulationRef.current = null
    }

    // Golden glow SVG filters & ambient gradient
    createGoldenDefs(svg)

    // Prepare data copies
    const simNodes: SimNode[] = graph.nodes.map((n) => ({
      ...n,
      x: undefined,
      y: undefined,
    }))
    const simLinks: SimLink[] = graph.links.map((l) => ({
      source: l.source,
      target: l.target,
    }))

    // Zoom layer
    const g = svg.append("g")

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform)
        // Persist so the next re-render can restore the user's position
        currentTransformRef.current = event.transform
      })

    svg.call(zoom)
    zoomRef.current = zoom

    // On a fresh layout (mode change / first load) reset to a centered view;
    // that view will be auto-fitted after the graph settles.
    // On a selection-only re-render, restore the saved transform so the
    // viewport does NOT jump.
    if (isFreshMode || !currentTransformRef.current) {
      svg.call(
        zoom.transform,
        d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85),
      )
    } else {
      svg.call(zoom.transform, currentTransformRef.current)
    }

    /** Fit all given graph-space positions into the viewport */
    const fitToPositions = (
      positions: { x: number; y: number }[],
      animated = true,
    ) => {
      if (!positions.length || !zoomRef.current) return
      const xs = positions.map((p) => p.x)
      const ys = positions.map((p) => p.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const pad = 80
      const scale = Math.min(
        width / (maxX - minX + pad * 2),
        height / (maxY - minY + pad * 2),
        1.5,
      )
      const tx = width / 2 - ((minX + maxX) / 2) * scale
      const ty = height / 2 - ((minY + maxY) / 2) * scale
      const t = d3.zoomIdentity.translate(tx, ty).scale(scale)
      if (animated) {
        svg.transition().duration(600).ease(d3.easeCubicOut).call(zoom.transform, t)
      } else {
        svg.call(zoom.transform, t)
      }
    }

    /* ---- Shared rendering helpers ---- */

    /** Truncate a title for display based on node importance */
    function truncTitle(title: string, linkCount: number): string {
      const maxLen = linkCount > 3 ? 26 : 18
      return title.length > maxLen ? title.slice(0, maxLen) + "\u2026" : title
    }

    function renderLinks(
      links: {
        sx: number
        sy: number
        tx: number
        ty: number
        sourceId: string
        targetId: string
      }[],
    ) {
      g.selectAll(".graph-link")
        .data(links)
        .enter()
        .append("line")
        .attr("class", "graph-link")
        .attr("x1", (d) => d.sx)
        .attr("y1", (d) => d.sy)
        .attr("x2", (d) => d.tx)
        .attr("y2", (d) => d.ty)
        .attr("stroke", "var(--accent-primary)")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0)
        .transition()
        .duration(800)
        .delay((_d, i) => i * 12)
        .attr("stroke-opacity", 0.18)
    }

    function renderNodes(
      positions: {
        id: string
        title: string
        linkCount: number
        x: number
        y: number
      }[],
      draggable: boolean,
    ) {
      const nodeGroup = g
        .selectAll(".graph-node")
        .data(positions, (d: any) => d.id)
        .enter()
        .append("g")
        .attr("class", "graph-node")
        .attr("transform", (d) => `translate(${d.x}, ${d.y})`)
        .style("cursor", "pointer")
        .style("opacity", 0)
        .on("click", (_event, d) => {
          selectNote(d.id)
        })
        .on("mouseenter", (_event, d) => {
          setHoveredNode(d.id)
        })
        .on("mouseleave", () => {
          setHoveredNode(null)
        })

      // Staggered entrance animation
      nodeGroup
        .transition()
        .duration(600)
        .delay((_d, i) => 80 + i * 25)
        .style("opacity", 1)

      // Node circle — golden glow on every node
      nodeGroup
        .append("circle")
        .attr("r", (d) => Math.max(6, Math.min(18, 6 + d.linkCount * 2.5)))
        .attr("fill", (d) =>
          d.id === selectedNoteId
            ? "var(--accent-primary)"
            : "var(--graph-node)",
        )
        .attr("stroke", (d) =>
          d.id === selectedNoteId
            ? "var(--accent-primary)"
            : "var(--border-mid)",
        )
        .attr("stroke-width", (d) => (d.id === selectedNoteId ? 2.5 : 1))
        .attr("filter", (d) =>
          d.id === selectedNoteId
            ? "url(#gold-glow-active)"
            : "url(#gold-glow)",
        )
        .style("transition", "fill 0.3s, stroke 0.3s, stroke-width 0.3s")

      // Label — ALWAYS visible with note name
      nodeGroup
        .append("text")
        .text((d) => truncTitle(d.title, d.linkCount))
        .attr(
          "y",
          (d) => -(Math.max(6, Math.min(18, 6 + d.linkCount * 2.5)) + 8),
        )
        .attr("text-anchor", "middle")
        .attr("fill", (d) =>
          d.id === selectedNoteId ? "#FACC15" : "var(--text-primary)",
        )
        .attr("font-size", (d) => (d.id === selectedNoteId ? 12 : 10))
        .attr("font-weight", (d) => (d.id === selectedNoteId ? 700 : 500))
        .attr("font-family", "var(--font-sans)")
        .style("pointer-events", "none")
        .style("filter", "url(#text-glow)")
        .style("opacity", (d) => (d.id === selectedNoteId ? 1 : 0.85))
        .style("transition", "opacity 0.25s, fill 0.25s, font-size 0.25s")

      // Hover: intensify glow + brighten label
      nodeGroup.on("mouseenter.glow", function () {
        const group = d3.select(this)
        group
          .select("circle")
          .attr("filter", "url(#gold-glow-active)")
          .attr("stroke", "var(--accent-primary)")
          .attr("stroke-width", 2.5)
        group
          .select("text")
          .style("opacity", 1)
          .attr("fill", "#FACC15")
          .attr("font-weight", "700")
      })
      nodeGroup.on("mouseleave.glow", function (_event, d: any) {
        if (d.id !== selectedNoteId) {
          const group = d3.select(this)
          group
            .select("circle")
            .attr("filter", "url(#gold-glow)")
            .attr("stroke", "rgba(250, 204, 21, 0.3)")
            .attr("stroke-width", 1)
          group
            .select("text")
            .style("opacity", 0.85)
            .attr("fill", "var(--text-primary)")
            .attr("font-weight", "500")
        }
      })

      if (draggable && simulationRef.current) {
        const sim = simulationRef.current
        nodeGroup.call(
          d3
            .drag<SVGGElement, any>()
            .on("start", (event, d) => {
              if (!event.active) sim.alphaTarget(0.3).restart()
              d.fx = d.x
              d.fy = d.y
            })
            .on("drag", (event, d) => {
              d.fx = event.x
              d.fy = event.y
            })
            .on("end", (event, d) => {
              if (!event.active) sim.alphaTarget(0)
              d.fx = null
              d.fy = null
            }),
        )
      }

      // Tooltip
      nodeGroup.on("mouseenter.tooltip", (_event, d: any) => {
        const raw = notesContentRef.current.get(d.id) ?? ""
        const snippet = raw
          .replace(/^#{1,6}\s+/gm, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 140)
        setTooltipRef.current({ title: d.title, snippet })
      })
      nodeGroup.on("mouseleave.tooltip", () => setTooltipRef.current(null))

      return nodeGroup
    }

    /* ---- FORCE MODE ---- */
    if (mode === "force") {
      const simulation = d3
        .forceSimulation<SimNode>(simNodes)
        .force(
          "link",
          d3
            .forceLink<SimNode, SimLink>(simLinks)
            .id((d) => d.id)
            .distance(140),
        )
        .force(
          "charge",
          d3.forceManyBody().strength(-350).distanceMax(500),
        )
        .force("center", d3.forceCenter(0, 0))
        .force("collision", d3.forceCollide().radius(30))
        .alphaDecay(0.018)

      simulationRef.current = simulation

      // Links — gold-tinted
      const linkSelection = g
        .selectAll(".graph-link")
        .data(simLinks)
        .enter()
        .append("line")
        .attr("class", "graph-link")
        .attr("stroke", "var(--accent-primary)")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.15)

      // Nodes
      const nodeGroup = g
        .selectAll(".graph-node")
        .data(simNodes, (d: any) => d.id)
        .enter()
        .append("g")
        .attr("class", "graph-node")
        .style("cursor", "pointer")
        .on("click", (_event, d) => selectNote(d.id))
        .on("mouseenter", (_event, d) => setHoveredNode(d.id))
        .on("mouseleave", () => setHoveredNode(null))

      // Circle with golden glow
      nodeGroup
        .append("circle")
        .attr("r", (d) => Math.max(6, Math.min(18, 6 + d.linkCount * 2.5)))
        .attr("fill", (d) =>
          d.id === selectedNoteId
            ? "var(--accent-primary)"
            : "var(--graph-node)",
        )
        .attr("stroke", (d) =>
          d.id === selectedNoteId
            ? "var(--accent-primary)"
            : "var(--border-mid)",
        )
        .attr("stroke-width", (d) => (d.id === selectedNoteId ? 2.5 : 1))
        .attr("filter", (d) =>
          d.id === selectedNoteId
            ? "url(#gold-glow-active)"
            : "url(#gold-glow)",
        )
        .style("transition", "fill 0.3s, stroke 0.3s")

      // Label — always visible
      nodeGroup
        .append("text")
        .text((d) => truncTitle(d.title, d.linkCount))
        .attr(
          "y",
          (d) => -(Math.max(6, Math.min(18, 6 + d.linkCount * 2.5)) + 8),
        )
        .attr("text-anchor", "middle")
        .attr("fill", (d) =>
          d.id === selectedNoteId ? "#FACC15" : "var(--text-primary)",
        )
        .attr("font-size", (d) => (d.id === selectedNoteId ? 12 : 10))
        .attr("font-weight", (d) => (d.id === selectedNoteId ? 700 : 500))
        .attr("font-family", "var(--font-sans)")
        .style("pointer-events", "none")
        .style("filter", "url(#text-glow)")
        .style("opacity", (d) => (d.id === selectedNoteId ? 1 : 0.85))

      // Hover effects
      nodeGroup.on("mouseenter.glow", function () {
        const group = d3.select(this)
        group
          .select("circle")
          .attr("filter", "url(#gold-glow-active)")
          .attr("stroke", "var(--accent-primary)")
          .attr("stroke-width", 2.5)
        group
          .select("text")
          .style("opacity", 1)
          .attr("fill", "#FACC15")
          .attr("font-weight", "700")
      })
      nodeGroup.on("mouseleave.glow", function (_event, d: any) {
        if (d.id !== selectedNoteId) {
          const group = d3.select(this)
          group
            .select("circle")
            .attr("filter", "url(#gold-glow)")
            .attr("stroke", "rgba(250, 204, 21, 0.3)")
            .attr("stroke-width", 1)
          group
            .select("text")
            .style("opacity", 0.85)
            .attr("fill", "var(--text-primary)")
            .attr("font-weight", "500")
        }
      })

      // Tooltip
      nodeGroup.on("mouseenter.tooltip", (_event, d) => {
        const raw = notesContentRef.current.get(d.id) ?? ""
        const snippet = raw
          .replace(/^#{1,6}\s+/gm, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 140)
        setTooltipRef.current({ title: d.title, snippet })
      })
      nodeGroup.on("mouseleave.tooltip", () => setTooltipRef.current(null))

      // Drag behaviour
      nodeGroup.call(
        d3
          .drag<SVGGElement, SimNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }),
      )

      // Tick handler
      simulation.on("tick", () => {
        linkSelection
          .attr("x1", (d) => (d.source as SimNode).x ?? 0)
          .attr("y1", (d) => (d.source as SimNode).y ?? 0)
          .attr("x2", (d) => (d.target as SimNode).x ?? 0)
          .attr("y2", (d) => (d.target as SimNode).y ?? 0)

        nodeGroup.attr(
          "transform",
          (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`,
        )
      })

      // Auto-fit once the simulation settles (only on fresh layouts)
      if (isFreshMode || !currentTransformRef.current) {
        simulation.on("end.fit", () => {
          fitToPositions(simNodes.map((n) => ({ x: n.x ?? 0, y: n.y ?? 0 })))
        })
      }
    }

    /* ---- MIND MAP (Tree) MODE ---- */
    if (mode === "mind") {
      const hierarchy = buildHierarchy(graph.nodes, graph.links)
      const root = d3.hierarchy(hierarchy)
      const treeLayout = d3
        .tree<HierarchyDatum>()
        .size([height * 0.8, width * 0.7])
        .separation((a, b) => (a.parent === b.parent ? 1.2 : 2))

      treeLayout(root)

      // Offset to center
      const offsetX = -(width * 0.35)
      const offsetY = -(height * 0.4)

      // Links as curved paths — gold-tinted with entrance animation
      g.selectAll(".graph-link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "graph-link")
        .attr("d", (d) => {
          const sx = (d.source as any).y + offsetX
          const sy = (d.source as any).x + offsetY
          const tx = (d.target as any).y + offsetX
          const ty = (d.target as any).x + offsetY
          return `M${sx},${sy} C${(sx + tx) / 2},${sy} ${(sx + tx) / 2},${ty} ${tx},${ty}`
        })
        .attr("fill", "none")
        .attr("stroke", "var(--accent-primary)")
        .attr("stroke-width", 1.2)
        .attr("stroke-opacity", 0)
        .transition()
        .duration(800)
        .delay((_d, i) => i * 18)
        .attr("stroke-opacity", 0.2)

      // Nodes
      const positions = root.descendants().map((d) => ({
        id: d.data.id,
        title: d.data.title,
        linkCount: d.data.linkCount,
        x: (d as any).y + offsetX,
        y: (d as any).x + offsetY,
      }))

      renderNodes(positions, false)
      // Auto-fit the tree layout into the viewport on fresh renders
      if (isFreshMode || !currentTransformRef.current) {
        fitToPositions(positions, false)
      }
    }

    /* ---- RADIAL MODE ---- */
    if (mode === "radial") {
      const hierarchy = buildHierarchy(graph.nodes, graph.links)
      const root = d3.hierarchy(hierarchy)
      const radius = Math.min(width, height) * 0.38

      const clusterLayout = d3
        .cluster<HierarchyDatum>()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent === b.parent ? 1 : 2))

      clusterLayout(root)

      // Radial link generator
      const radialLink = d3
        .linkRadial<
          d3.HierarchyPointLink<HierarchyDatum>,
          d3.HierarchyPointNode<HierarchyDatum>
        >()
        .angle((d) => (d as any).x)
        .radius((d) => (d as any).y)

      // Links — gold-tinted with entrance animation
      g.selectAll(".graph-link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "graph-link")
        .attr("d", radialLink as any)
        .attr("fill", "none")
        .attr("stroke", "var(--accent-primary)")
        .attr("stroke-width", 1.2)
        .attr("stroke-opacity", 0)
        .transition()
        .duration(800)
        .delay((_d, i) => i * 18)
        .attr("stroke-opacity", 0.2)

      // Nodes at radial positions
      const positions = root.descendants().map((d) => {
        const angle = (d as any).x - Math.PI / 2
        const r = (d as any).y
        return {
          id: d.data.id,
          title: d.data.title,
          linkCount: d.data.linkCount,
          x: r * Math.cos(angle),
          y: r * Math.sin(angle),
        }
      })

      renderNodes(positions, false)
      // Auto-fit the radial layout into the viewport on fresh renders
      if (isFreshMode || !currentTransformRef.current) {
        fitToPositions(positions, false)
      }
    }
  }, [graph, mode, selectNote, selectedNoteId])

  /* ---- Re-render when graph, mode, or selection changes ---- */
  useEffect(() => {
    renderGraph()
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [renderGraph])

  /* ---- Filter: dim non-matching nodes without full re-render ---- */
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    if (!filterQuery.trim()) {
      svg.selectAll(".graph-node").style("opacity", 1)
      return
    }
    const q = filterQuery.toLowerCase()
    svg
      .selectAll<SVGGElement, { title: string }>(".graph-node")
      .style("opacity", (d) =>
        d.title.toLowerCase().includes(q) ? 1 : 0.08,
      )
  }, [filterQuery])

  /* ---- Resize handler ---- */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let prevW = container.clientWidth, prevH = container.clientHeight
    const observer = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight
      // Only trigger a re-render when the size actually changed meaningfully
      if (Math.abs(w - prevW) < 4 && Math.abs(h - prevH) < 4) return
      prevW = w; prevH = h
      // Clear saved transform so resize triggers a fresh auto-fit
      currentTransformRef.current = null
      renderGraph()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [renderGraph])

  /* ---- Zoom controls ---- */
  const handleZoom = useCallback((factor: number) => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    svg.transition().duration(300).call(zoomRef.current.scaleBy, factor)
  }, [])

  const resetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return
    const svg = d3.select(svgRef.current)
    // Collect all visible node positions and refit to them
    const positions: { x: number; y: number }[] = []
    svg.selectAll<SVGGElement, { x?: number; y?: number }>(".graph-node").each(function () {
      const transform = (this as SVGGElement).getAttribute("transform") ?? ""
      const m = /translate\(([^,]+),([^)]+)\)/.exec(transform)
      if (m) positions.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) })
    })
    if (!positions.length || !containerRef.current) return
    const { width, height } = containerRef.current.getBoundingClientRect()
    const xs = positions.map((p) => p.x)
    const ys = positions.map((p) => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const pad = 80
    const scale = Math.min(
      width / (maxX - minX + pad * 2),
      height / (maxY - minY + pad * 2),
      1.5,
    )
    const tx = width / 2 - ((minX + maxX) / 2) * scale
    const ty = height / 2 - ((minY + maxY) / 2) * scale
    svg
      .transition()
      .duration(500)
      .ease(d3.easeCubicOut)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
  }, [])

  /* ---- Render ---- */
  return (
    <div className="flex flex-col h-full w-full">
      {/* ── Toolbar ── */}
      <div
        className="h-12 border-b flex items-center pl-[72px] pr-4 justify-between shrink-0"
        style={{
          borderColor: "var(--border-dark)",
          background: "var(--bg-panel)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Brand mark */}
          <TesserinLogo size={22} animated={false} />

          {/* Skeuomorphic mode selector — button group */}
          <div className="flex items-center gap-1.5">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`skeuo-btn px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all ${mode === m.id ? "active" : ""
                  }`}
                style={{ minWidth: "78px", justifyContent: "center" }}
                aria-label={`Switch to ${m.label} layout`}
              >
                {MODE_ICONS[m.id]}
                {m.label}
              </button>
            ))}
          </div>

          {/* Node filter */}
          <input
            type="search"
            placeholder="Filter nodes…"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="skeuo-inset px-3 py-1.5 text-[11px] rounded-xl focus:outline-none w-36"
            style={{
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-panel-inset)",
            }}
            aria-label="Filter graph nodes by name"
          />

          {/* Node count badge */}
          <span
            className="text-[10px] font-mono px-2.5 py-1 rounded-lg"
            style={{
              color: "var(--accent-primary)",
              background: "var(--bg-panel-inset)",
              border: "1px solid rgba(250, 204, 21, 0.1)",
              boxShadow: "var(--input-inner-shadow)",
            }}
          >
            {graph.nodes.length} nodes &middot; {graph.links.length} links
          </span>
        </div>
      </div>

      {/* ── Graph canvas ── */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        onMouseLeave={() => setTooltipRef.current(null)}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          role="application"
          aria-label={`Knowledge graph — ${mode} layout with ${graph.nodes.length} notes`}
        />

        {/* Hover tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 max-w-[200px] rounded-xl p-3"
            style={{
              left: Math.min(mousePos.x + 18, (containerRef.current?.clientWidth ?? 800) - 220),
              top: Math.max(mousePos.y - 72, 8),
              background: "var(--bg-panel)",
              border: "1px solid var(--border-mid)",
              boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
            }}
          >
            <div
              className="text-[11px] font-bold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {tooltip.title}
            </div>
            {tooltip.snippet && (
              <div
                className="text-[9px] mt-1 leading-relaxed line-clamp-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                {tooltip.snippet}
              </div>
            )}
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2">
          <button
            onClick={() => handleZoom(1.3)}
            className="skeuo-btn w-10 h-10 flex items-center justify-center rounded-lg"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Zoom in"
          >
            <FiZoomIn size={18} />
          </button>
          <button
            onClick={() => handleZoom(0.7)}
            className="skeuo-btn w-10 h-10 flex items-center justify-center rounded-lg"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Zoom out"
          >
            <FiZoomOut size={18} />
          </button>
          <button
            onClick={resetView}
            className="skeuo-btn w-10 h-10 flex items-center justify-center rounded-lg"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Reset view"
          >
            <FiMaximize size={18} />
          </button>
        </div>

        {/* Active mode HUD — shifted for Split button */}
        <div
          className="absolute top-4 left-20 skeuo-panel px-4 py-2 text-[10px] font-mono pointer-events-none select-none flex items-center gap-2"
          style={{
            color: "var(--accent-primary)",
            opacity: 0.6,
            letterSpacing: "0.05em",
          }}
        >
          <TesserinLogo size={16} animated={false} />
          MODE: {mode.toUpperCase()} | PHYSICS:{" "}
          {mode === "force" ? "ACTIVE" : "STATIC"}
        </div>
      </div>
    </div>
  )
}
