/**
 * Canvas Store
 *
 * Central state management for multi-canvas / multi-board Tesseradraw.
 * Uses useSyncExternalStore for React integration (same pattern as notes-store).
 *
 * Persists via storage-client (SQLite in Electron, localStorage fallback).
 */

import { useSyncExternalStore, useCallback } from "react"
import * as storage from "./storage-client"
import type { StorageCanvas } from "./storage-client"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface CanvasInfo {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

interface CanvasState {
  canvases: CanvasInfo[]
  activeCanvasId: string | null
  isLoading: boolean
}

/* ------------------------------------------------------------------ */
/*  Store                                                               */
/* ------------------------------------------------------------------ */

let state: CanvasState = {
  canvases: [],
  activeCanvasId: null,
  isLoading: true,
}

const listeners = new Set<() => void>()

function emit() {
  for (const fn of listeners) fn()
}

function setState(patch: Partial<CanvasState>) {
  state = { ...state, ...patch }
  emit()
}

function toInfo(c: StorageCanvas): CanvasInfo {
  return {
    id: c.id,
    name: c.name,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }
}

/* ── Actions ─────────────────────────────────────────── */

/** Load all canvases from storage and populate the list. */
async function loadCanvases(): Promise<void> {
  setState({ isLoading: true })
  try {
    const list = await storage.listCanvases()
    const canvases = list.map(toInfo).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    setState({ canvases, isLoading: false })
  } catch (err) {
    console.warn("[CanvasStore] Failed to load canvases:", err)
    setState({ isLoading: false })
  }
}

/** Create a new canvas and set it as active. Returns the new canvas ID. */
async function createCanvas(name: string): Promise<string> {
  const id = crypto.randomUUID()
  const canvas = await storage.createCanvas({ id, name })
  const info = toInfo(canvas)
  setState({
    canvases: [info, ...state.canvases],
    activeCanvasId: id,
  })
  return id
}

/** Delete a canvas. If it was active, switch to the most recent remaining. */
async function deleteCanvas(id: string): Promise<void> {
  await storage.deleteCanvas(id)
  const remaining = state.canvases.filter((c) => c.id !== id)
  const newActive =
    state.activeCanvasId === id
      ? remaining.length > 0
        ? remaining[0].id
        : null
      : state.activeCanvasId
  setState({ canvases: remaining, activeCanvasId: newActive })
}

/** Rename a canvas. */
async function renameCanvas(id: string, name: string): Promise<void> {
  await storage.updateCanvas(id, { name })
  setState({
    canvases: state.canvases.map((c) =>
      c.id === id ? { ...c, name, updatedAt: new Date().toISOString() } : c,
    ),
  })
}

/** Duplicate a canvas under a new name. */
async function duplicateCanvas(id: string): Promise<string> {
  const original = await storage.getCanvas(id)
  if (!original) throw new Error("Canvas not found")
  const newId = crypto.randomUUID()
  const newName = `${original.name} (copy)`
  const canvas = await storage.createCanvas({
    id: newId,
    name: newName,
    elements: original.elements,
    appState: original.app_state,
    files: original.files,
  })
  const info = toInfo(canvas)
  setState({
    canvases: [info, ...state.canvases],
    activeCanvasId: newId,
  })
  return newId
}

/** Set the active canvas (caller is responsible for flushing current canvas first). */
function setActiveCanvas(id: string | null): void {
  setState({ activeCanvasId: id })
}

/** Mark a canvas as recently updated (bumps it in sort order). */
function touchCanvas(id: string): void {
  const now = new Date().toISOString()
  setState({
    canvases: state.canvases.map((c) =>
      c.id === id ? { ...c, updatedAt: now } : c,
    ),
  })
}

/** Refresh the list from storage (e.g. after MCP updates). */
async function refreshCanvases(): Promise<void> {
  await loadCanvases()
  // Preserve activeCanvasId if it still exists
  if (state.activeCanvasId && !state.canvases.find((c) => c.id === state.activeCanvasId)) {
    setState({
      activeCanvasId: state.canvases.length > 0 ? state.canvases[0].id : null,
    })
  }
}

/* ── React Hook ──────────────────────────────────────── */

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

function getSnapshot(): CanvasState {
  return state
}

export function useCanvasStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)

  return {
    ...snap,
    loadCanvases,
    createCanvas,
    deleteCanvas,
    renameCanvas,
    duplicateCanvas,
    setActiveCanvas,
    touchCanvas,
    refreshCanvases,
  }
}

/* ── Non-React access (for IPC listeners, etc.) ──────── */
export const canvasActions = {
  loadCanvases,
  createCanvas,
  deleteCanvas,
  renameCanvas,
  duplicateCanvas,
  setActiveCanvas,
  touchCanvas,
  refreshCanvases,
  getState: () => state,
}
