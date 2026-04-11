#!/bin/bash
cat > components/tesserin/workspace/markdown-editor.tsx << 'INNER_EOF'
"use client"

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { FiPlus, FiTrash2, FiLink2, FiChevronDown, FiFileText, FiMenu } from "react-icons/fi"
import { useNotes, parseWikiLinks } from "@/lib/notes-store"

// Toast UI Editor
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/dark.css';
import { Editor } from '@toast-ui/react-editor';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

interface MarkdownEditorProps {
  noteId?: string | null
}

export function MarkdownEditor({ noteId: externalNoteId }: MarkdownEditorProps) {
  const { notes, selectedNoteId, searchNotes, selectNote, addNote, updateNote, deleteNote, createTag, addTagToNote, removeTagFromNote, navigateToWikiLink } = useNotes()

  const [showNoteList, setShowNoteList] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<Editor>(null)

  const activeId = externalNoteId !== undefined ? externalNoteId : selectedNoteId
  const selectedNote = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId])
  
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  useEffect(() => {
    // Detect if dark mode class is on document
    const isDark = document.documentElement.classList.contains("dark")
    setIsDarkTheme(isDark)

    const observer = new MutationObserver(() => {
      setIsDarkTheme(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (editorRef.current && selectedNote) {
      // Avoid overwriting if user is typing
      if (editorRef.current.getInstance().getMarkdown() !== selectedNote.content) {
        editorRef.current.getInstance().setMarkdown(selectedNote.content || "")
      }
    }
  }, [selectedNote?.id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNoteList(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleEditorChange = useCallback(() => {
    if (selectedNote && editorRef.current) {
        const content = editorRef.current.getInstance().getMarkdown()
        updateNote(selectedNote.id, { content })
    }
  }, [selectedNote, updateNote])

  const handleTitleChange = useCallback(
    (value: string) => {
      if (selectedNote) updateNote(selectedNote.id, { title: value })
    },
    [selectedNote, updateNote],
  )

  const handleCreateNote = () => {
    const id = addNote("Untitled Note", "")
    selectNote(id)
    setShowNoteList(false)
  }

  // Find wiki links for reference rendering
  const incomingLinks = useMemo(() => {
    if (!selectedNote) return []
    return notes.filter((n) => {
      if (n.id === selectedNote.id) return false
      const links = parseWikiLinks(n.content)
      return links.includes(selectedNote.title)
    })
  }, [notes, selectedNote])

  if (!selectedNote) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-4">
        <FiFileText className="w-16 h-16 mb-4 opacity-50" />
        <p className="mb-6 text-lg">No note selected</p>
        <button
          onClick={() => addNote("Untitled Note", "")}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          Create Note
        </button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col pt-[3.5rem] bg-white dark:bg-transparent">
      {/* Dynamic styles to override toast-ui's pure white if in light mode, but the user explicitly asked for white. We will let it be naturally white. */}
      <style>{`
        .toastui-editor-defaultUI { 
            border: none !important;
        }
        .toastui-editor-contents {
            font-size: 16px;
            font-family: var(--font-inter), system-ui, sans-serif;
            background: transparent !important;
        }
      `}</style>
      
      {/* Header Bar */}
      <div className="flex-none px-6 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-dark)' }}>
        <div className="flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowNoteList(!showNoteList)}
              className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/10 px-2 py-1.5 rounded-md transition-colors"
            >
              <FiMenu className="w-4 h-4 text-muted-foreground" />
              <FiChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {showNoteList && (
              <div className="absolute top-full left-0 mt-2 w-64 glass-panel rounded-xl shadow-2xl border z-50 overflow-hidden flex flex-col max-h-[60vh]">
                <div className="p-2 border-b flex justify-between items-center bg-black/5 dark:bg-white/5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-2">Your Notes</span>
                  <button onClick={handleCreateNote} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-md" title="New Note">
                    <FiPlus className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
                  {notes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No notes yet</div>
                  ) : (
                    notes.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          selectNote(n.id)
                          setShowNoteList(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 line-clamp-1 transition-colors ${
                          n.id === selectedNote.id ? "bg-primary text-primary-foreground font-medium" : "hover:bg-black/5 dark:hover:bg-white/10"
                        }`}
                      >
                        {n.title || "Untitled Note"}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <input
            type="text"
            value={selectedNote.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-xl font-semibold bg-transparent border-none focus:outline-none w-64 placeholder:text-muted-foreground/50"
            placeholder="Note Title"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDeleteId(selectedNote.id)}
            className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            title="Delete this note"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full flex flex-col min-h-0">
          <div className="flex-1 overflow-hidden">
            <Editor
                ref={editorRef}
                initialValue={selectedNote.content || ""}
                previewStyle="vertical"
                height="100%"
                initialEditType="wysiwyg"
                useCommandShortcut={true}
                theme={isDarkTheme ? "dark" : ""}
                onChange={handleEditorChange}
                autofocus={false}
                toolbarItems={[
                    ['heading', 'bold', 'italic', 'strike'],
                    ['hr', 'quote'],
                    ['ul', 'ol', 'task', 'indent', 'outdent'],
                    ['table', 'link'],
                    ['code', 'codeblock']
                ]}
            />
          </div>
        </div>
      </div>

      {/* Footer / Meta */}
      <div className="flex-none p-3 border-t text-[11px] text-muted-foreground flex justify-between items-center truncate" style={{ borderColor: 'var(--border-dark)' }}>
        <div className="flex items-center gap-3">
          <span>Updated {relativeTime(selectedNote.updatedAt)}</span>
          {incomingLinks.length > 0 && (
            <span className="flex items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md cursor-pointer hover:bg-black/10 dark:hover:bg-white/20 transition-colors" title={incomingLinks.map(n => n.title).join(", ")}>
              <FiLink2 className="w-3 h-3" />
              {incomingLinks.length} backlink(s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
            <span className="opacity-50 tracking-wide uppercase">WYSIWYG Mode Active</span>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteId) deleteNote(deleteId)
                setDeleteId(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
INNER_EOF
