/**
 * Tesserin Knowledge Base Export Layer
 *
 * Exports the vault's notes, graphs, tags, and relationships in formats
 * consumable by external AI agents and cloud models. This turns Tesserin
 * into a knowledge base that powers external AI without losing context.
 *
 * Formats:
 * - Full vault export (JSON with all entities and relationships)
 * - Knowledge graph export (nodes + edges with content)
 * - Contextual snippets (RAG-ready chunks for specific queries)
 * - Agent-scoped views (filtered by permissions)
 */

import * as db from "./database"

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface KnowledgeNode {
  id: string
  title: string
  content: string
  type: "note" | "task" | "folder"
  tags: string[]
  folderId?: string
  folderPath?: string
  linkCount: number
  outgoingLinks: string[]   // Note titles this links to
  incomingLinks: string[]   // Note titles that link to this
  createdAt: string
  updatedAt: string
}

export interface KnowledgeEdge {
  source: string   // Note ID
  target: string   // Note ID
  type: "wiki-link" | "tag-shared" | "folder-sibling"
  label?: string
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  metadata: {
    exportedAt: string
    noteCount: number
    edgeCount: number
    tagCount: number
    folderCount: number
  }
}

export interface VaultExport {
  version: "1.0"
  exportedAt: string
  vault: {
    notes: Array<{
      id: string
      title: string
      content: string
      folder: string | null
      tags: string[]
      isPinned: boolean
      isArchived: boolean
      createdAt: string
      updatedAt: string
    }>
    tags: Array<{ id: string; name: string; color: string }>
    folders: Array<{ id: string; name: string; parentId: string | null }>
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: number
      columnId: string
      dueDate: string | null
      noteId: string | null
    }>
  }
  graph: KnowledgeGraph
}

export interface ContextChunk {
  noteId: string
  noteTitle: string
  content: string
  relevance: number
  tags: string[]
  linkedNotes: string[]
}

/* ================================================================== */
/*  Wiki-link parser                                                   */
/* ================================================================== */

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g

function parseWikiLinks(content: string): string[] {
  const links: string[] = []
  let match: RegExpExecArray | null
  const regex = new RegExp(WIKI_LINK_REGEX.source, "g")
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1])
  }
  return [...new Set(links)]
}

/* ================================================================== */
/*  Folder path resolution                                             */
/* ================================================================== */

function buildFolderPaths(
  folders: Array<{ id: string; name: string; parent_id: string | null }>,
): Map<string, string> {
  const paths = new Map<string, string>()
  const folderMap = new Map(folders.map((f) => [f.id, f]))

  function resolve(id: string): string {
    if (paths.has(id)) return paths.get(id)!
    const folder = folderMap.get(id)
    if (!folder) return ""
    const parentPath = folder.parent_id ? resolve(folder.parent_id) : ""
    const fullPath = parentPath ? `${parentPath}/${folder.name}` : folder.name
    paths.set(id, fullPath)
    return fullPath
  }

  folders.forEach((f) => resolve(f.id))
  return paths
}

/* ================================================================== */
/*  Knowledge graph builder                                            */
/* ================================================================== */

/**
 * Build a complete knowledge graph from the vault.
 */
export function buildKnowledgeGraph(): KnowledgeGraph {
  const notes = db.listNotes() as Array<any>
  const tags = db.listTags() as Array<any>
  const folders = db.listFolders() as Array<any>

  const folderPaths = buildFolderPaths(folders)
  const noteByTitle = new Map<string, any>()
  const noteById = new Map<string, any>()

  for (const note of notes) {
    noteByTitle.set(note.title.toLowerCase(), note)
    noteById.set(note.id, note)
  }

  // Build tag lookup
  const tagMap = new Map(tags.map((t: any) => [t.id, t.name]))
  const noteTagsMap = new Map<string, string[]>()

  for (const note of notes) {
    const noteTags = db.getTagsForNote(note.id) as Array<any>
    noteTagsMap.set(note.id, noteTags.map((t: any) => t.name))
  }

  // Parse wiki-links and build edges
  const outgoingLinksMap = new Map<string, string[]>()
  const incomingLinksMap = new Map<string, string[]>()
  const edges: KnowledgeEdge[] = []

  for (const note of notes) {
    const wikiLinks = parseWikiLinks(note.content || "")
    const outgoing: string[] = []

    for (const linkTitle of wikiLinks) {
      const targetNote = noteByTitle.get(linkTitle.toLowerCase())
      if (targetNote && targetNote.id !== note.id) {
        outgoing.push(targetNote.title)

        edges.push({
          source: note.id,
          target: targetNote.id,
          type: "wiki-link",
          label: linkTitle,
        })

        // Track incoming
        const incoming = incomingLinksMap.get(targetNote.id) || []
        incoming.push(note.title)
        incomingLinksMap.set(targetNote.id, incoming)
      }
    }

    outgoingLinksMap.set(note.id, outgoing)
  }

  // Add tag-shared edges (notes sharing the same tag)
  const tagToNotes = new Map<string, string[]>()
  for (const [noteId, noteTags] of noteTagsMap) {
    for (const tagName of noteTags) {
      const list = tagToNotes.get(tagName) || []
      list.push(noteId)
      tagToNotes.set(tagName, list)
    }
  }

  for (const [tagName, noteIds] of tagToNotes) {
    // Create edges between notes sharing a tag (limit to avoid O(n²) explosion)
    for (let i = 0; i < Math.min(noteIds.length, 20); i++) {
      for (let j = i + 1; j < Math.min(noteIds.length, 20); j++) {
        edges.push({
          source: noteIds[i],
          target: noteIds[j],
          type: "tag-shared",
          label: tagName,
        })
      }
    }
  }

  // Build nodes
  const nodes: KnowledgeNode[] = notes.map((note: any) => {
    const outgoing = outgoingLinksMap.get(note.id) || []
    const incoming = incomingLinksMap.get(note.id) || []
    return {
      id: note.id,
      title: note.title,
      content: note.content || "",
      type: "note" as const,
      tags: noteTagsMap.get(note.id) || [],
      folderId: note.folder_id || undefined,
      folderPath: note.folder_id ? folderPaths.get(note.folder_id) : undefined,
      linkCount: outgoing.length + incoming.length,
      outgoingLinks: outgoing,
      incomingLinks: [...new Set(incoming)],
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    }
  })

  return {
    nodes,
    edges,
    metadata: {
      exportedAt: new Date().toISOString(),
      noteCount: notes.length,
      edgeCount: edges.length,
      tagCount: tags.length,
      folderCount: folders.length,
    },
  }
}

/* ================================================================== */
/*  Full vault export                                                  */
/* ================================================================== */

/**
 * Export the entire vault with all entities, relationships, and graph.
 */
export function exportVault(): VaultExport {
  const notes = db.listNotes() as Array<any>
  const tags = db.listTags() as Array<any>
  const folders = db.listFolders() as Array<any>
  const tasks = db.listTasks() as Array<any>

  const noteTagsMap = new Map<string, string[]>()
  for (const note of notes) {
    const noteTags = db.getTagsForNote(note.id) as Array<any>
    noteTagsMap.set(note.id, noteTags.map((t: any) => t.name))
  }

  const graph = buildKnowledgeGraph()

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    vault: {
      notes: notes.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content || "",
        folder: n.folder_id,
        tags: noteTagsMap.get(n.id) || [],
        isPinned: !!n.is_pinned,
        isArchived: !!n.is_archived,
        createdAt: n.created_at,
        updatedAt: n.updated_at,
      })),
      tags: tags.map((t: any) => ({
        id: t.id,
        name: t.name,
        color: t.color,
      })),
      folders: folders.map((f: any) => ({
        id: f.id,
        name: f.name,
        parentId: f.parent_id,
      })),
      tasks: tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        columnId: t.column_id,
        dueDate: t.due_date,
        noteId: t.note_id,
      })),
    },
    graph,
  }
}

/* ================================================================== */
/*  Contextual search for RAG                                          */
/* ================================================================== */

/**
 * Search the vault and return context chunks suitable for AI RAG.
 * Includes linked notes for context expansion.
 */
export function searchContextChunks(
  query: string,
  maxChunks: number = 10,
  maxCharsPerChunk: number = 1500,
): ContextChunk[] {
  const searchResults = db.searchNotes(query) as Array<any>
  const noteTagsMap = new Map<string, string[]>()

  const chunks: ContextChunk[] = []

  for (const note of searchResults.slice(0, maxChunks)) {
    // Get tags
    if (!noteTagsMap.has(note.id)) {
      const noteTags = db.getTagsForNote(note.id) as Array<any>
      noteTagsMap.set(note.id, noteTags.map((t: any) => t.name))
    }

    // Get linked notes
    const wikiLinks = parseWikiLinks(note.content || "")

    chunks.push({
      noteId: note.id,
      noteTitle: note.title,
      content: (note.content || "").slice(0, maxCharsPerChunk),
      relevance: 1.0 - chunks.length * 0.1, // Simple relevance decay
      tags: noteTagsMap.get(note.id) || [],
      linkedNotes: wikiLinks,
    })
  }

  return chunks
}

/* ================================================================== */
/*  Permission-scoped vault view                                       */
/* ================================================================== */

/**
 * Get a vault view filtered by agent permissions.
 */
export function getScopedVaultView(
  permissions: string[],
): Record<string, unknown> {
  const view: Record<string, unknown> = {}

  if (permissions.includes("notes:read") || permissions.includes("vault:full")) {
    const notes = db.listNotes() as Array<any>
    view.notes = notes.map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      updatedAt: n.updated_at,
    }))
    view.noteCount = notes.length
  }

  if (permissions.includes("tags:read") || permissions.includes("vault:full")) {
    view.tags = db.listTags()
  }

  if (permissions.includes("tasks:read") || permissions.includes("vault:full")) {
    view.tasks = db.listTasks()
  }

  if (permissions.includes("graph:read") || permissions.includes("vault:full")) {
    view.graph = buildKnowledgeGraph()
  }

  if (permissions.includes("canvases:read") || permissions.includes("vault:full")) {
    view.canvases = db.listCanvases()
  }

  return view
}

/* ================================================================== */
/*  Format for external AI context injection                           */
/* ================================================================== */

/**
 * Format vault context as a text block suitable for injecting into
 * an LLM system prompt. Used by cloud agents to get Tesserin KB context.
 */
export function formatVaultAsContext(
  maxNotes: number = 50,
  maxCharsPerNote: number = 800,
): string {
  const notes = db.listNotes() as Array<any>
  const graph = buildKnowledgeGraph()

  let context = `=== TESSERIN KNOWLEDGE BASE ===\n`
  context += `Total Notes: ${notes.length} | Total Connections: ${graph.edges.length}\n\n`

  // Include top notes by update time
  const topNotes = notes.slice(0, maxNotes)
  for (const note of topNotes) {
    const node = graph.nodes.find((n) => n.id === note.id)
    const tags = node?.tags.length ? ` [${node.tags.join(", ")}]` : ""
    const links = node?.outgoingLinks.length
      ? `\nLinks: ${node.outgoingLinks.map((l) => `[[${l}]]`).join(", ")}`
      : ""

    context += `--- ${note.title}${tags} ---\n`
    context += (note.content || "").slice(0, maxCharsPerNote)
    if ((note.content || "").length > maxCharsPerNote) context += "…"
    context += links
    context += "\n\n"
  }

  context += `=== END KNOWLEDGE BASE ===\n`
  return context
}
