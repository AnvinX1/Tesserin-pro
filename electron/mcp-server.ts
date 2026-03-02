/**
 * Tesserin MCP Server
 *
 * Exposes the Tesserin vault (notes, tags, tasks, search, knowledge graph)
 * as MCP tools so that external AI agents can read and manipulate your workspace.
 *
 * Enhanced for Docker MCP Toolkit integration — external agents (Claude Code,
 * Gemini CLI, Codex, OpenCode) connect via Docker MCP and gain full vault
 * access with permission-scoped tools.
 *
 * Runs in the Electron main process. Communicates over stdio or SSE
 * transport depending on how it's started.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { z } from "zod"
import * as db from "./database"
import * as kb from "./knowledge-base"

/* ================================================================== */
/*  Server instance                                                    */
/* ================================================================== */

let mcpServer: McpServer | null = null

/**
 * Create and configure the Tesserin MCP server.
 * Registers all vault tools and resources.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "Tesserin",
    version: "1.0.0",
  })

  /* ── Tools ─────────────────────────────────────────────────────── */

  // List all notes
  server.tool(
    "list_notes",
    "List all notes in the Tesserin vault. Returns id, title, and timestamps.",
    {},
    async () => {
      const notes = db.listNotes()
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              notes.map((n: any) => ({
                id: n.id,
                title: n.title,
                created_at: n.created_at,
                updated_at: n.updated_at,
              })),
              null,
              2
            ),
          },
        ],
      }
    }
  )

  // Get a specific note
  server.tool(
    "get_note",
    "Get the full content of a note by its ID.",
    { noteId: z.string().describe("The ID of the note to retrieve") },
    async ({ noteId }) => {
      const note = db.getNote(noteId)
      if (!note) {
        return {
          content: [{ type: "text" as const, text: `Note not found: ${noteId}` }],
          isError: true,
        }
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(note, null, 2) }],
      }
    }
  )

  // Search notes
  server.tool(
    "search_notes",
    "Search notes by title or content. Returns matching notes with snippets.",
    { query: z.string().describe("Search query to match against note titles and content") },
    async ({ query }) => {
      const results = db.searchNotes(query)
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              results.map((n: any) => ({
                id: n.id,
                title: n.title,
                snippet: n.content?.substring(0, 200) + (n.content?.length > 200 ? "…" : ""),
              })),
              null,
              2
            ),
          },
        ],
      }
    }
  )

  // Create a note
  server.tool(
    "create_note",
    "Create a new note in the Tesserin vault.",
    {
      title: z.string().describe("Title of the new note"),
      content: z.string().optional().describe("Markdown content of the note"),
      folderId: z.string().optional().describe("Folder ID to place the note in"),
    },
    async ({ title, content, folderId }) => {
      const note = db.createNote({ title, content: content || "", folderId }) as { id: string; title: string }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id: note.id, title: note.title, message: "Note created successfully" }, null, 2),
          },
        ],
      }
    }
  )

  // Update a note
  server.tool(
    "update_note",
    "Update an existing note's title or content.",
    {
      noteId: z.string().describe("The ID of the note to update"),
      title: z.string().optional().describe("New title for the note"),
      content: z.string().optional().describe("New markdown content for the note"),
    },
    async ({ noteId, title, content }) => {
      const existing = db.getNote(noteId)
      if (!existing) {
        return {
          content: [{ type: "text" as const, text: `Note not found: ${noteId}` }],
          isError: true,
        }
      }
      const updates: Record<string, string> = {}
      if (title !== undefined) updates.title = title
      if (content !== undefined) updates.content = content
      db.updateNote(noteId, updates)
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ noteId, message: "Note updated successfully" }),
          },
        ],
      }
    }
  )

  // Delete a note
  server.tool(
    "delete_note",
    "Delete a note from the vault by its ID.",
    { noteId: z.string().describe("The ID of the note to delete") },
    async ({ noteId }) => {
      const existing = db.getNote(noteId)
      if (!existing) {
        return {
          content: [{ type: "text" as const, text: `Note not found: ${noteId}` }],
          isError: true,
        }
      }
      db.deleteNote(noteId)
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ noteId, message: "Note deleted successfully" }),
          },
        ],
      }
    }
  )

  // Get note by title (for wiki-links)
  server.tool(
    "get_note_by_title",
    "Find a note by its exact title. Useful for resolving [[wiki-links]].",
    { title: z.string().describe("Exact title of the note to find") },
    async ({ title }) => {
      const note = db.getNoteByTitle(title)
      if (!note) {
        return {
          content: [{ type: "text" as const, text: `No note found with title: "${title}"` }],
          isError: true,
        }
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(note, null, 2) }],
      }
    }
  )

  // List tags
  server.tool(
    "list_tags",
    "List all tags in the vault.",
    {},
    async () => {
      const tags = db.listTags()
      return {
        content: [{ type: "text" as const, text: JSON.stringify(tags, null, 2) }],
      }
    }
  )

  // List tasks
  server.tool(
    "list_tasks",
    "List all tasks (kanban items) in the vault.",
    {},
    async () => {
      const tasks = db.listTasks()
      return {
        content: [{ type: "text" as const, text: JSON.stringify(tasks, null, 2) }],
      }
    }
  )

  // Create a task
  server.tool(
    "create_task",
    "Create a new task/kanban item.",
    {
      title: z.string().describe("Task title"),
      noteId: z.string().optional().describe("Associated note ID"),
      columnId: z.string().optional().describe("Kanban column ID"),
      priority: z.number().optional().describe("Priority: 0=none, 1=low, 2=medium, 3=high"),
      dueDate: z.string().optional().describe("Due date in ISO format"),
    },
    async ({ title, noteId, columnId, priority, dueDate }) => {
      const task = db.createTask({ title, noteId, columnId, priority, dueDate }) as { id: string; title: string }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id: task.id, title: task.title, message: "Task created" }, null, 2),
          },
        ],
      }
    }
  )

  // List folders
  server.tool(
    "list_folders",
    "List all folders in the vault hierarchy.",
    {},
    async () => {
      const folders = db.listFolders()
      return {
        content: [{ type: "text" as const, text: JSON.stringify(folders, null, 2) }],
      }
    }
  )

  /* ── Knowledge Graph Tools ─────────────────────────────────────── */

  // Get the full knowledge graph (nodes + edges)
  server.tool(
    "get_knowledge_graph",
    "Get the complete knowledge graph of the vault including all notes as nodes, wiki-link edges, and tag-shared edges. Returns nodes with content, tags, link counts and edges with types.",
    {},
    async () => {
      const graph = kb.buildKnowledgeGraph()
      return {
        content: [{ type: "text" as const, text: JSON.stringify(graph, null, 2) }],
      }
    }
  )

  // Search vault with context (RAG-ready)
  server.tool(
    "search_vault_context",
    "Search the vault and return context-rich chunks suitable for RAG. Includes note content, tags, and linked notes for each result.",
    {
      query: z.string().describe("Search query to match against notes"),
      maxChunks: z.number().optional().describe("Maximum number of context chunks to return (default: 10)"),
    },
    async ({ query, maxChunks }) => {
      const chunks = kb.searchContextChunks(query, maxChunks || 10)
      return {
        content: [{ type: "text" as const, text: JSON.stringify(chunks, null, 2) }],
      }
    }
  )

  // Get vault as formatted context for AI injection
  server.tool(
    "get_vault_context",
    "Get the vault formatted as a text block suitable for injecting into an LLM system prompt. Includes note content, tags, and wiki-links in a structured format.",
    {
      maxNotes: z.number().optional().describe("Maximum number of notes to include (default: 50)"),
    },
    async ({ maxNotes }) => {
      const context = kb.formatVaultAsContext(maxNotes || 50)
      return {
        content: [{ type: "text" as const, text: context }],
      }
    }
  )

  // Export full vault (all entities + graph)
  server.tool(
    "export_vault",
    "Export the complete vault with all notes, tags, folders, tasks, and the full knowledge graph. Returns a comprehensive JSON structure.",
    {},
    async () => {
      const exported = kb.exportVault()
      return {
        content: [{ type: "text" as const, text: JSON.stringify(exported, null, 2) }],
      }
    }
  )

  // Get note with connections
  server.tool(
    "get_note_with_connections",
    "Get a note by ID along with its knowledge graph connections — outgoing links, incoming links (backlinks), shared tags, and related notes.",
    {
      noteId: z.string().describe("The ID of the note to retrieve with connections"),
    },
    async ({ noteId }) => {
      const note = db.getNote(noteId) as any
      if (!note) {
        return {
          content: [{ type: "text" as const, text: `Note not found: ${noteId}` }],
          isError: true,
        }
      }

      const graph = kb.buildKnowledgeGraph()
      const node = graph.nodes.find((n) => n.id === noteId)
      const tags = db.getTagsForNote(noteId) as any[]

      // Find connected edges
      const relatedEdges = graph.edges.filter(
        (e) => e.source === noteId || e.target === noteId
      )

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                note: {
                  id: note.id,
                  title: note.title,
                  content: note.content,
                  createdAt: note.created_at,
                  updatedAt: note.updated_at,
                },
                tags: tags.map((t: any) => t.name),
                connections: {
                  outgoingLinks: node?.outgoingLinks || [],
                  incomingLinks: node?.incomingLinks || [],
                  linkCount: node?.linkCount || 0,
                  relatedEdges: relatedEdges.map((e) => ({
                    type: e.type,
                    label: e.label,
                    direction: e.source === noteId ? "outgoing" : "incoming",
                    connectedNoteId: e.source === noteId ? e.target : e.source,
                  })),
                },
              },
              null,
              2
            ),
          },
        ],
      }
    }
  )

  // Batch create notes (for agents that need to create many notes)
  server.tool(
    "batch_create_notes",
    "Create multiple notes at once. Useful for agents importing or generating content. Returns all created note IDs.",
    {
      notes: z.array(z.object({
        title: z.string().describe("Note title"),
        content: z.string().optional().describe("Markdown content"),
        folderId: z.string().optional().describe("Folder ID"),
      })).describe("Array of notes to create"),
    },
    async ({ notes: notesToCreate }) => {
      const created: Array<{ id: string; title: string }> = []
      for (const noteData of notesToCreate) {
        const note = db.createNote({
          title: noteData.title,
          content: noteData.content || "",
          folderId: noteData.folderId,
        }) as any
        created.push({ id: note.id, title: note.title })
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ created, count: created.length }, null, 2),
          },
        ],
      }
    }
  )

  // Add tag to note
  server.tool(
    "add_tag_to_note",
    "Add an existing tag to a note by their IDs.",
    {
      noteId: z.string().describe("The note ID"),
      tagId: z.string().describe("The tag ID to add"),
    },
    async ({ noteId, tagId }) => {
      db.addTagToNote(noteId, tagId)
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Tag added to note", noteId, tagId }),
          },
        ],
      }
    }
  )

  // Create tag
  server.tool(
    "create_tag",
    "Create a new tag in the vault.",
    {
      name: z.string().describe("Tag name"),
      color: z.string().optional().describe("Tag color hex code (default: #6366f1)"),
    },
    async ({ name, color }) => {
      const tag = db.createTag(name, color) as any
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id: tag.id, name: tag.name, color: tag.color }, null, 2),
          },
        ],
      }
    }
  )

  // Update task
  server.tool(
    "update_task",
    "Update an existing task's properties.",
    {
      taskId: z.string().describe("The task ID to update"),
      title: z.string().optional().describe("New task title"),
      status: z.string().optional().describe("New status"),
      columnId: z.string().optional().describe("New kanban column ID"),
      priority: z.number().optional().describe("Priority: 0=none, 1=low, 2=medium, 3=high"),
      dueDate: z.string().optional().describe("Due date in ISO format"),
    },
    async ({ taskId, title, status, columnId, priority, dueDate }) => {
      const updates: Record<string, unknown> = {}
      if (title !== undefined) updates.title = title
      if (status !== undefined) updates.status = status
      if (columnId !== undefined) updates.columnId = columnId
      if (priority !== undefined) updates.priority = priority
      if (dueDate !== undefined) updates.dueDate = dueDate

      const task = db.updateTask(taskId, updates)
      if (!task) {
        return {
          content: [{ type: "text" as const, text: `Task not found: ${taskId}` }],
          isError: true,
        }
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ message: "Task updated", task }, null, 2),
          },
        ],
      }
    }
  )

  // Create folder
  server.tool(
    "create_folder",
    "Create a new folder in the vault hierarchy.",
    {
      name: z.string().describe("Folder name"),
      parentId: z.string().optional().describe("Parent folder ID for nesting"),
    },
    async ({ name, parentId }) => {
      const folder = db.createFolder(name, parentId) as any
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id: folder.id, name: folder.name, message: "Folder created" }, null, 2),
          },
        ],
      }
    }
  )

  /* ── Canvas Tools ───────────────────────────────────────────────── */

  // List all canvases
  server.tool(
    "list_canvases",
    "List all canvases/boards in the Tesserin workspace. Returns id, name, and timestamps.",
    {},
    async () => {
      const canvases = db.listCanvases()
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              canvases.map((c: any) => ({
                id: c.id,
                name: c.name,
                created_at: c.created_at,
                updated_at: c.updated_at,
              })),
              null,
              2
            ),
          },
        ],
      }
    }
  )

  // Get a specific canvas
  server.tool(
    "get_canvas",
    "Get the full data of a canvas by its ID, including all elements and app state.",
    { canvasId: z.string().describe("The ID of the canvas to retrieve") },
    async ({ canvasId }) => {
      const canvas = db.getCanvas(canvasId)
      if (!canvas) {
        return {
          content: [{ type: "text" as const, text: `Canvas not found: ${canvasId}` }],
          isError: true,
        }
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(canvas, null, 2) }],
      }
    }
  )

  // Create a canvas
  server.tool(
    "create_canvas",
    "Create a new canvas/board in the Tesserin workspace.",
    {
      name: z.string().describe("Name of the new canvas"),
      elements: z.string().optional().describe("JSON string of Excalidraw elements to pre-populate"),
    },
    async ({ name, elements }) => {
      const canvas = db.createCanvas({
        name,
        elements: elements || "[]",
      }) as { id: string; name: string }
      // Notify renderer about the new canvas
      try {
        const { BrowserWindow } = await import("electron")
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send("canvas:updated", canvas.id)
        })
      } catch {}
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ id: canvas.id, name: canvas.name, message: "Canvas created successfully" }, null, 2),
          },
        ],
      }
    }
  )

  // Update canvas name
  server.tool(
    "update_canvas_name",
    "Rename a canvas/board.",
    {
      canvasId: z.string().describe("The ID of the canvas to rename"),
      name: z.string().describe("The new name for the canvas"),
    },
    async ({ canvasId, name }) => {
      const existing = db.getCanvas(canvasId)
      if (!existing) {
        return {
          content: [{ type: "text" as const, text: `Canvas not found: ${canvasId}` }],
          isError: true,
        }
      }
      db.updateCanvas(canvasId, { name })
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ canvasId, message: "Canvas renamed successfully" }),
          },
        ],
      }
    }
  )

  // Delete a canvas
  server.tool(
    "delete_canvas",
    "Delete a canvas/board from the workspace by its ID.",
    { canvasId: z.string().describe("The ID of the canvas to delete") },
    async ({ canvasId }) => {
      const existing = db.getCanvas(canvasId)
      if (!existing) {
        return {
          content: [{ type: "text" as const, text: `Canvas not found: ${canvasId}` }],
          isError: true,
        }
      }
      db.deleteCanvas(canvasId)
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ canvasId, message: "Canvas deleted successfully" }),
          },
        ],
      }
    }
  )

  // Add elements to a canvas
  server.tool(
    "add_canvas_elements",
    "Add Excalidraw elements to an existing canvas. Elements are appended to the existing scene.",
    {
      canvasId: z.string().describe("The ID of the canvas to modify"),
      elements: z.string().describe("JSON string of Excalidraw elements to add to the canvas"),
    },
    async ({ canvasId, elements }) => {
      const canvas = db.getCanvas(canvasId) as any
      if (!canvas) {
        return {
          content: [{ type: "text" as const, text: `Canvas not found: ${canvasId}` }],
          isError: true,
        }
      }
      let existing: any[] = []
      try { existing = JSON.parse(canvas.elements || "[]") } catch {}
      let newElements: any[] = []
      try { newElements = JSON.parse(elements) } catch {
        return {
          content: [{ type: "text" as const, text: "Invalid JSON elements" }],
          isError: true,
        }
      }
      const merged = [...existing, ...newElements]
      db.updateCanvas(canvasId, { elements: JSON.stringify(merged) })
      // Notify renderer
      try {
        const { BrowserWindow } = await import("electron")
        BrowserWindow.getAllWindows().forEach((win) => {
          win.webContents.send("canvas:updated", canvasId)
        })
      } catch {}
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              canvasId,
              elementsAdded: newElements.length,
              totalElements: merged.length,
              message: "Elements added to canvas successfully",
            }, null, 2),
          },
        ],
      }
    }
  )

  /* ── Resources ─────────────────────────────────────────────────── */

  // Expose the full vault as a resource
  server.resource(
    "vault_summary",
    "tesserin://vault/summary",
    async (uri) => {
      const notes = db.listNotes()
      const tags = db.listTags()
      const tasks = db.listTasks()
      const folders = db.listFolders()

      const summary = {
        noteCount: notes.length,
        tagCount: tags.length,
        taskCount: tasks.length,
        folderCount: folders.length,
        recentNotes: notes.slice(0, 10).map((n: any) => ({
          id: n.id,
          title: n.title,
          updated_at: n.updated_at,
        })),
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      }
    }
  )

  // Expose knowledge graph as a resource
  server.resource(
    "knowledge_graph",
    "tesserin://vault/graph",
    async (uri) => {
      const graph = kb.buildKnowledgeGraph()
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(graph, null, 2),
          },
        ],
      }
    }
  )

  // Expose vault context (for AI prompt injection) as a resource
  server.resource(
    "vault_context",
    "tesserin://vault/context",
    async (uri) => {
      const context = kb.formatVaultAsContext()
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/plain",
            text: context,
          },
        ],
      }
    }
  )

  return server
}

/* ================================================================== */
/*  Lifecycle                                                          */
/* ================================================================== */

/**
 * Start the MCP server on stdio transport.
 * Called when Tesserin is launched with `--mcp` flag.
 */
export async function startMcpServerStdio(): Promise<void> {
  mcpServer = createMcpServer()
  const transport = new StdioServerTransport()
  await mcpServer.connect(transport)
  console.log("[MCP] Tesserin MCP server started on stdio")
}

/**
 * Get the current MCP server instance (for in-process connections).
 */
export function getMcpServer(): McpServer | null {
  return mcpServer
}

/**
 * Create a fresh MCP server for in-memory transport usage (e.g. SAM bridge).
 */
export function createInProcessServer(): McpServer {
  return createMcpServer()
}
