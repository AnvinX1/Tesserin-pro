"use client"

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react"
import * as storage from "./storage-client"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
  tags: NoteTag[]
  folderId: string | null
}

export interface NoteTag {
  id: string
  name: string
  color: string
}

export interface NoteFolder {
  id: string
  name: string
  parentId: string | null
}

export interface GraphNode {
  id: string
  title: string
  linkCount: number
}

export interface GraphLink {
  source: string
  target: string
}

export interface NoteGraph {
  nodes: GraphNode[]
  links: GraphLink[]
}

/* ------------------------------------------------------------------ */
/*  Wiki-link parser                                                    */
/* ------------------------------------------------------------------ */

export function parseWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]]+)\]\]/g
  const matches: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    const title = match[1].trim()
    if (title && !matches.includes(title)) {
      matches.push(title)
    }
  }

  return matches
}

export function computeGraph(notes: Note[]): NoteGraph {
  const titleToId = new Map<string, string>()
  notes.forEach((n) => titleToId.set(n.title.toLowerCase(), n.id))

  const linkCountMap = new Map<string, number>()
  notes.forEach((n) => linkCountMap.set(n.id, 0))

  const links: GraphLink[] = []
  const linkSet = new Set<string>()

  notes.forEach((note) => {
    const refs = parseWikiLinks(note.content)
    refs.forEach((refTitle) => {
      const targetId = titleToId.get(refTitle.toLowerCase())
      if (targetId && targetId !== note.id) {
        const key = `${note.id}->${targetId}`
        if (!linkSet.has(key)) {
          linkSet.add(key)
          links.push({ source: note.id, target: targetId })
          linkCountMap.set(note.id, (linkCountMap.get(note.id) ?? 0) + 1)
          linkCountMap.set(targetId, (linkCountMap.get(targetId) ?? 0) + 1)
        }
      }
    })
  })

  const nodes: GraphNode[] = notes.map((n) => ({
    id: n.id,
    title: n.title,
    linkCount: linkCountMap.get(n.id) ?? 0,
  }))

  return { nodes, links }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

interface NotesContextValue {
  notes: Note[]
  graph: NoteGraph
  tags: NoteTag[]
  folders: NoteFolder[]
  selectedNoteId: string | null
  selectNote: (id: string | null) => void
  addNote: (title?: string, content?: string, folderId?: string, autoSelect?: boolean) => string
  updateNote: (id: string, updates: Partial<Pick<Note, "title" | "content">>) => void
  deleteNote: (id: string) => void
  getNoteByTitle: (title: string) => Note | undefined
  navigateToWikiLink: (title: string) => void
  searchNotes: (query: string) => Promise<Note[]>
  moveNoteToFolder: (noteId: string, folderId: string | null) => void
  addTagToNote: (noteId: string, tag: NoteTag) => void
  removeTagFromNote: (noteId: string, tagId: string) => void
  createTag: (name: string, color?: string) => Promise<NoteTag>
  deleteTag: (id: string) => void
  createFolder: (name: string, parentId?: string) => Promise<NoteFolder>
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  isLoading: boolean
}

const NotesContext = createContext<NotesContextValue | null>(null)

export function useNotes(): NotesContextValue {
  const ctx = useContext(NotesContext)
  if (!ctx) throw new Error("useNotes must be used within a NotesProvider")
  return ctx
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

let _counter = 0
function uid(): string {
  _counter++
  return `note-${_counter}-${Date.now().toString(36)}`
}

const now = new Date().toISOString()

const SEED_NOTES: Note[] = []

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

interface NotesProviderProps {
  children: React.ReactNode
}

/**
 * NotesProvider
 *
 * Holds all notes in state, auto-loads from SQLite when in Electron,
 * and falls back to seed data when in browser dev mode.
 * Computes the knowledge graph reactively and exposes CRUD helpers.
 */
export function NotesProvider({ children }: NotesProviderProps) {
  const [notes, setNotes] = useState<Note[]>(SEED_NOTES)
  const [tags, setTags] = useState<NoteTag[]>([])
  const [folders, setFolders] = useState<NoteFolder[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load notes, tags, folders from SQLite on mount (Electron only)
  useEffect(() => {
    async function loadFromDB() {
      try {
        // Load tags and folders in parallel
        const [dbNotes, dbTags, dbFolders] = await Promise.all([
          storage.listNotes(),
          storage.listTags(),
          storage.listFolders(),
        ])

        if (dbTags && dbTags.length > 0) {
          setTags(dbTags.map((t: any) => ({ id: t.id, name: t.name, color: t.color })))
        }

        if (dbFolders && dbFolders.length > 0) {
          setFolders(dbFolders.map((f: any) => ({ id: f.id, name: f.name, parentId: f.parent_id || null })))
        }

        if (dbNotes && dbNotes.length > 0) {
          // Load tags for each note
          const noteTagsMap = new Map<string, NoteTag[]>()
          await Promise.all(
            dbNotes.map(async (n: any) => {
              try {
                const noteTags = await storage.getTagsForNote(n.id)
                if (noteTags && noteTags.length > 0) {
                  noteTagsMap.set(n.id, noteTags.map((t: any) => ({ id: t.id, name: t.name, color: t.color })))
                }
              } catch { /* ignore */ }
            })
          )

          const mapped: Note[] = dbNotes.map((n: any) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            createdAt: n.created_at,
            updatedAt: n.updated_at,
            tags: noteTagsMap.get(n.id) || [],
            folderId: n.folder_id || null,
          }))
          setNotes(mapped)
        }
      } catch {
        // Not in Electron or DB error — keep seed data
      }
      setIsLoading(false)
    }
    loadFromDB()
  }, [])

  const graph = useMemo(() => computeGraph(notes), [notes])

  const selectNote = useCallback((id: string | null) => {
    setSelectedNoteId(id)
  }, [])

  const addNote = useCallback((title?: string, content?: string, folderId?: string, autoSelect = true): string => {
    const id = uid()
    const timestamp = new Date().toISOString()
    const noteTitle = title || "Untitled Note"
    const noteContent = content || `# ${noteTitle}\n\n`
    const newNote: Note = {
      id,
      title: noteTitle,
      content: noteContent,
      createdAt: timestamp,
      updatedAt: timestamp,
      tags: [],
      folderId: folderId || null,
    }
    setNotes((prev) => [newNote, ...prev])
    if (autoSelect) setSelectedNoteId(id)

    // Persist to SQLite — pass the already-generated id so DB never assigns a different one
    storage.createNote({ id, title: noteTitle, content: noteContent, folderId: folderId || undefined }).then((dbNote) => {
      if (dbNote?.id && dbNote.id !== id) {
        // Fallback: DB assigned a different id anyway — keep in sync
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? { ...n, id: dbNote.id, createdAt: dbNote.created_at || n.createdAt, updatedAt: dbNote.updated_at || n.updatedAt }
              : n
          )
        )
        setSelectedNoteId((prev) => (prev === id ? dbNote.id : prev))
      }
    }).catch(() => { })

    return id
  }, [])

  const updateNote = useCallback(
    (id: string, updates: Partial<Pick<Note, "title" | "content">>) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, ...updates, updatedAt: new Date().toISOString() }
            : n,
        ),
      )

      // Persist to SQLite
      storage.updateNote(id, updates).catch(() => { })
    },
    [],
  )

  const deleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (selectedNoteId === id) setSelectedNoteId(null)

      // Persist to SQLite
      storage.deleteNote(id).catch(() => { })
    },
    [selectedNoteId],
  )

  const getNoteByTitle = useCallback(
    (title: string): Note | undefined => {
      return notes.find((n) => n.title.toLowerCase() === title.toLowerCase())
    },
    [notes],
  )

  const navigateToWikiLink = useCallback(
    (title: string) => {
      const existing = notes.find(
        (n) => n.title.toLowerCase() === title.toLowerCase(),
      )
      if (existing) {
        setSelectedNoteId(existing.id)
      } else {
        const id = uid()
        const timestamp = new Date().toISOString()
        const content = `# ${title}\n\n`
        const newNote: Note = {
          id,
          title,
          content,
          createdAt: timestamp,
          updatedAt: timestamp,
          tags: [],
          folderId: null,
        }
        setNotes((prev) => [newNote, ...prev])
        setSelectedNoteId(id)

        storage.createNote({ title, content }).then((dbNote) => {
          if (dbNote?.id && dbNote.id !== id) {
            setNotes((prev) =>
              prev.map((n) =>
                n.id === id
                  ? { ...n, id: dbNote.id, createdAt: dbNote.created_at || n.createdAt, updatedAt: dbNote.updated_at || n.updatedAt }
                  : n
              )
            )
            setSelectedNoteId((prev) => (prev === id ? dbNote.id : prev))
          }
        }).catch(() => { })
      }
    },
    [notes],
  )

  const searchNotesHandler = useCallback(
    async (query: string): Promise<Note[]> => {
      // Try SQLite FTS first
      try {
        const results = await storage.searchNotes(query)
        if (results && results.length > 0) {
          return results.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            createdAt: n.created_at,
            updatedAt: n.updated_at,
            tags: notes.find(existing => existing.id === n.id)?.tags || [],
            folderId: (n as any).folder_id || null,
          }))
        }
      } catch {
        // Fall back to in-memory search
      }

      // In-memory fallback
      const q = query.toLowerCase()
      return notes.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      )
    },
    [notes],
  )

  /* ── Tag & folder management ────────────────────────────── */

  const moveNoteToFolder = useCallback(
    (noteId: string, folderId: string | null) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, folderId, updatedAt: new Date().toISOString() }
            : n,
        ),
      )
      storage.updateNote(noteId, { folderId: folderId || undefined }).catch(() => { })
    },
    [],
  )

  const addTagToNoteHandler = useCallback(
    (noteId: string, tag: NoteTag) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId && !n.tags.some((t) => t.id === tag.id)
            ? { ...n, tags: [...n.tags, tag] }
            : n,
        ),
      )
      storage.addTagToNote(noteId, tag.id).catch(() => { })
    },
    [],
  )

  const removeTagFromNoteHandler = useCallback(
    (noteId: string, tagId: string) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === noteId
            ? { ...n, tags: n.tags.filter((t) => t.id !== tagId) }
            : n,
        ),
      )
      storage.removeTagFromNote(noteId, tagId).catch(() => { })
    },
    [],
  )

  const createTagHandler = useCallback(
    async (name: string, color?: string): Promise<NoteTag> => {
      const dbTag = await storage.createTag(name, color)
      const tag: NoteTag = { id: dbTag.id, name: dbTag.name, color: dbTag.color }
      setTags((prev) => [...prev, tag])
      return tag
    },
    [],
  )

  const deleteTagHandler = useCallback(
    (id: string) => {
      setTags((prev) => prev.filter((t) => t.id !== id))
      // Remove tag from all notes
      setNotes((prev) =>
        prev.map((n) => ({
          ...n,
          tags: n.tags.filter((t) => t.id !== id),
        })),
      )
      storage.deleteTag(id).catch(() => { })
    },
    [],
  )

  const createFolderHandler = useCallback(
    async (name: string, parentId?: string): Promise<NoteFolder> => {
      const dbFolder = await storage.createFolder(name, parentId)
      const folder: NoteFolder = { id: dbFolder.id, name: dbFolder.name, parentId: dbFolder.parent_id || null }
      setFolders((prev) => [...prev, folder])
      return folder
    },
    [],
  )

  const renameFolderHandler = useCallback(
    (id: string, name: string) => {
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, name } : f)),
      )
      storage.renameFolder(id, name).catch(() => { })
    },
    [],
  )

  const deleteFolderHandler = useCallback(
    (id: string) => {
      // Find all descendant folder IDs recursively
      const getAllDescendantFolderIds = (folderId: string): string[] => {
        const children = folders.filter((f) => f.parentId === folderId)
        return [folderId, ...children.flatMap((c) => getAllDescendantFolderIds(c.id))]
      }

      const allFolderIds = getAllDescendantFolderIds(id)

      // Find all notes in these folders
      const notesToDelete = notes.filter((n) => n.folderId && allFolderIds.includes(n.folderId))
      
      // Delete notes from storage
      notesToDelete.forEach((n) => storage.deleteNote(n.id).catch(() => { }))
      
      // Delete folders from storage
      allFolderIds.forEach((folderId) => {
        storage.deleteFolder(folderId).catch(() => { })
      })

      // Update state
      setNotes((prev) => prev.filter((n) => !n.folderId || !allFolderIds.includes(n.folderId)))
      setFolders((prev) => prev.filter((f) => !allFolderIds.includes(f.id)))
    },
    [notes, folders],
  )

  const value = useMemo<NotesContextValue>(
    () => ({
      notes,
      graph,
      tags,
      folders,
      selectedNoteId,
      selectNote,
      addNote,
      updateNote,
      deleteNote,
      getNoteByTitle,
      navigateToWikiLink,
      searchNotes: searchNotesHandler,
      moveNoteToFolder,
      addTagToNote: addTagToNoteHandler,
      removeTagFromNote: removeTagFromNoteHandler,
      createTag: createTagHandler,
      deleteTag: deleteTagHandler,
      createFolder: createFolderHandler,
      renameFolder: renameFolderHandler,
      deleteFolder: deleteFolderHandler,
      isLoading,
    }),
    [notes, graph, tags, folders, selectedNoteId, selectNote, addNote, updateNote, deleteNote, getNoteByTitle, navigateToWikiLink, searchNotesHandler, moveNoteToFolder, addTagToNoteHandler, removeTagFromNoteHandler, createTagHandler, deleteTagHandler, createFolderHandler, renameFolderHandler, deleteFolderHandler, isLoading],
  )

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}
