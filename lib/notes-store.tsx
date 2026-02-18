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
  selectedNoteId: string | null
  selectNote: (id: string | null) => void
  addNote: (title?: string) => string
  updateNote: (id: string, updates: Partial<Pick<Note, "title" | "content">>) => void
  deleteNote: (id: string) => void
  getNoteByTitle: (title: string) => Note | undefined
  navigateToWikiLink: (title: string) => void
  searchNotes: (query: string) => Promise<Note[]>
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
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load notes from SQLite on mount (Electron only)
  useEffect(() => {
    async function loadFromDB() {
      try {
        const dbNotes = await storage.listNotes()
        if (dbNotes && dbNotes.length > 0) {
          const mapped: Note[] = dbNotes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            createdAt: n.created_at,
            updatedAt: n.updated_at,
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

  const addNote = useCallback((title?: string): string => {
    const id = uid()
    const timestamp = new Date().toISOString()
    const noteTitle = title || "Untitled Note"
    const content = `# ${noteTitle}\n\n`
    const newNote: Note = {
      id,
      title: noteTitle,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    setNotes((prev) => [newNote, ...prev])
    setSelectedNoteId(id)

    // Persist to SQLite — let the DB create the row, then update local ID if needed
    storage.createNote({ title: noteTitle, content }).then((dbNote) => {
      if (dbNote?.id && dbNote.id !== id) {
        // Replace the temp ID with the real DB-assigned ID
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

  const value = useMemo<NotesContextValue>(
    () => ({
      notes,
      graph,
      selectedNoteId,
      selectNote,
      addNote,
      updateNote,
      deleteNote,
      getNoteByTitle,
      navigateToWikiLink,
      searchNotes: searchNotesHandler,
      isLoading,
    }),
    [notes, graph, selectedNoteId, selectNote, addNote, updateNote, deleteNote, getNoteByTitle, navigateToWikiLink, searchNotesHandler, isLoading],
  )

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
}
