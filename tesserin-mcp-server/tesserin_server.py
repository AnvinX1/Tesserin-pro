#!/usr/bin/env python3
"""
Tesserin MCP Server
Bridges AI agents to the Tesserin REST API via MCP.
Security hardening: fail-fast token check, _safe_id, _safe_text,
HTTPStatusError handling with exc_info=True, lifespan hook, hex-color
validation, max_notes forwarded, priority range validation.
"""

import contextlib
import json
import logging
import os
import re
import sys
from typing import AsyncGenerator

import httpx
from mcp.server.fastmcp import FastMCP

# ─── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("tesserin-mcp")

# ─── Config ────────────────────────────────────────────────────────────────────
TESSERIN_API_TOKEN: str = os.environ.get("TESSERIN_API_TOKEN", "")
TESSERIN_API_URL:   str = os.environ.get("TESSERIN_API_URL",   "http://127.0.0.1:9960")
TESSERIN_TIMEOUT:   int = int(os.environ.get("TESSERIN_TIMEOUT", "20"))

if not TESSERIN_API_TOKEN:
    logger.error(
        "TESSERIN_API_TOKEN is not set. "
        "Export it before starting: export TESSERIN_API_TOKEN=tsk_..."
    )
    sys.exit(1)

# ─── Security helpers ──────────────────────────────────────────────────────────
MAX_CONTENT_BYTES: int = 512 * 1024
_SAFE_ID_RE      = re.compile(r"^[A-Za-z0-9_\-]{1,128}$")
_HEX_COLOUR_RE   = re.compile(r"^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$")


def _safe_id(value: str, param: str = "id") -> str | None:
    v = value.strip()
    if not v:
        return None
    if not _SAFE_ID_RE.match(v):
        logger.warning("_safe_id rejected %s=%r", param, v)
        return None
    return v


def _safe_text(value: str, param: str = "text") -> str | None:
    if len(value.encode("utf-8")) > MAX_CONTENT_BYTES:
        logger.warning("_safe_text: %s exceeds %d bytes", param, MAX_CONTENT_BYTES)
        return None
    return value


# ─── HTTP client singleton ─────────────────────────────────────────────────────
_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=TESSERIN_API_URL,
            headers={"Authorization": f"Bearer {TESSERIN_API_TOKEN}"},
            timeout=TESSERIN_TIMEOUT,
        )
    return _client


def _http_error(e: httpx.HTTPStatusError) -> str:
    code = e.response.status_code
    try:
        detail = e.response.json().get("error", e.response.text)
    except Exception:
        detail = e.response.text
    return f"HTTP {code}: {detail}"


# ─── FastMCP lifespan ──────────────────────────────────────────────────────────
@contextlib.asynccontextmanager
async def _lifespan(_server: FastMCP) -> AsyncGenerator[None, None]:
    logger.info("Tesserin MCP server starting (API: %s)", TESSERIN_API_URL)
    yield
    if _client and not _client.is_closed:
        await _client.aclose()
        logger.info("HTTP client closed.")


mcp = FastMCP("tesserin", lifespan=_lifespan)

# ─── API helpers ───────────────────────────────────────────────────────────────
async def api_get(path: str, params: dict | None = None) -> dict:
    r = await _get_client().get(path, params=params)
    r.raise_for_status()
    return r.json()


async def api_post(path: str, body: dict) -> dict:
    r = await _get_client().post(path, json=body)
    r.raise_for_status()
    return r.json()


async def api_patch(path: str, body: dict) -> dict:
    r = await _get_client().patch(path, json=body)
    r.raise_for_status()
    return r.json()


async def api_delete(path: str) -> dict:
    r = await _get_client().delete(path)
    r.raise_for_status()
    return r.json()


# ══════════════════════════════════════════════════════════════════════════════
# NOTES
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def list_notes(folder_id: str = "", tag: str = "", limit: str = "20") -> str:
    """List notes in the Tesserin vault, optionally filtered by folder or tag."""
    logger.info("list_notes folder=%r tag=%r limit=%r", folder_id, tag, limit)
    params: dict = {}
    if folder_id.strip():
        fid = _safe_id(folder_id, "folder_id")
        if not fid:
            return "Error: folder_id contains invalid characters."
        params["folderId"] = fid
    if tag.strip():
        params["tag"] = tag.strip()[:200]
    try:
        n = max(1, min(int(limit.strip() or "20"), 200))
    except ValueError:
        n = 20
    params["limit"] = n
    try:
        data  = await api_get("/api/notes", params)
        notes = data.get("notes", [])
        if not notes:
            return "No notes found."
        lines = [
            f"- {nt.get('title', '(untitled)')} (id: {nt.get('id', '?')})"
            for nt in notes
        ]
        return f"{len(notes)} note(s):\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("list_notes HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("list_notes failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def get_note(note_id: str = "") -> str:
    """Retrieve the full content and metadata of a single note by its ID."""
    logger.info("get_note id=%r", note_id)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    try:
        data    = await api_get(f"/api/notes/{sid}")
        note    = data.get("note", {})
        title   = note.get("title", "(untitled)")
        content = note.get("content", "")
        tags    = ", ".join(note.get("tags", []))
        folder  = note.get("folderName", "root")
        return (
            f"Title: {title}\n"
            f"ID: {sid}\n"
            f"Folder: {folder}\n"
            f"Tags: {tags or 'none'}\n\n"
            f"---\n\n{content}"
        )
    except httpx.HTTPStatusError as e:
        logger.error("get_note HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("get_note failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def search_notes(query: str = "", limit: str = "10") -> str:
    """Full-text search across all notes in the vault."""
    logger.info("search_notes query=%r", query)
    q = query.strip()
    if not q:
        return "Error: query is required."
    if _safe_text(q, "query") is None:
        return f"Error: query is too long (max {MAX_CONTENT_BYTES // 1024} KB)."
    try:
        n = max(1, min(int(limit.strip() or "10"), 100))
    except ValueError:
        n = 10
    try:
        data  = await api_get("/api/notes/search", {"q": q, "limit": n})
        notes = data.get("notes", [])
        if not notes:
            return f"No notes found for: {query!r}"
        lines = [
            f"- {nt.get('title', '(untitled)')} (id: {nt.get('id', '?')})"
            for nt in notes
        ]
        return f"{len(notes)} result(s) for {query!r}:\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("search_notes HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("search_notes failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def create_note(
    title: str = "",
    content: str = "",
    folder_id: str = "",
    tags: str = "",
) -> str:
    """Create a new note in the Tesserin vault."""
    logger.info("create_note title=%r", title)
    t = title.strip()
    if not t:
        return "Error: title is required."
    if _safe_text(content, "content") is None:
        return f"Error: content exceeds {MAX_CONTENT_BYTES // 1024} KB limit."
    body: dict = {"title": t, "content": content}
    if tags.strip():
        body["tags"] = [tg.strip() for tg in tags.split(",") if tg.strip()]
    if folder_id.strip():
        fid = _safe_id(folder_id, "folder_id")
        if not fid:
            return "Error: folder_id contains invalid characters."
        body["folderId"] = fid
    try:
        data = await api_post("/api/notes", body)
        note = data.get("note", {})
        return f"Note created! Title: {t} | ID: {note.get('id', '?')}"
    except httpx.HTTPStatusError as e:
        logger.error("create_note HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("create_note failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def update_note(
    note_id: str = "",
    title: str = "",
    content: str = "",
    tags: str = "",
) -> str:
    """Update the title, content, or tags of an existing note."""
    logger.info("update_note id=%r", note_id)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    body: dict = {}
    if title.strip():
        body["title"] = title.strip()
    if content:
        if _safe_text(content, "content") is None:
            return f"Error: content exceeds {MAX_CONTENT_BYTES // 1024} KB limit."
        body["content"] = content
    if tags.strip():
        body["tags"] = [tg.strip() for tg in tags.split(",") if tg.strip()]
    if not body:
        return "Error: provide at least one field to update (title, content, or tags)."
    try:
        await api_patch(f"/api/notes/{sid}", body)
        return f"Note updated (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("update_note HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("update_note failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def delete_note(note_id: str = "") -> str:
    """Permanently delete a note from the vault by its ID. Cannot be undone."""
    logger.info("delete_note id=%r", note_id)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    try:
        await api_delete(f"/api/notes/{sid}")
        return f"Note deleted (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("delete_note HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("delete_note failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def append_to_note(note_id: str = "", content: str = "") -> str:
    """Append text to the end of an existing note without overwriting it."""
    logger.info("append_to_note id=%r", note_id)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    if not content.strip():
        return "Error: content is required."
    if _safe_text(content, "content") is None:
        return f"Error: content exceeds {MAX_CONTENT_BYTES // 1024} KB limit."
    try:
        data    = await api_get(f"/api/notes/{sid}")
        current = data.get("note", {}).get("content", "")
        updated = current + "\n\n" + content
        await api_patch(f"/api/notes/{sid}", {"content": updated})
        return f"Content appended to note (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("append_to_note HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("append_to_note failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def pin_note(note_id: str = "", pinned: str = "true") -> str:
    """Pin or unpin a note (pinned='true' or 'false')."""
    logger.info("pin_note id=%r pinned=%r", note_id, pinned)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    flag = pinned.strip().lower() != "false"
    try:
        await api_patch(f"/api/notes/{sid}", {"pinned": flag})
        return f"{'Pinned' if flag else 'Unpinned'} note (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("pin_note HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("pin_note failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def archive_note(note_id: str = "", archived: str = "true") -> str:
    """Archive or unarchive a note (archived='true' or 'false')."""
    logger.info("archive_note id=%r archived=%r", note_id, archived)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    flag = archived.strip().lower() != "false"
    try:
        await api_patch(f"/api/notes/{sid}", {"archived": flag})
        return f"{'Archived' if flag else 'Unarchived'} note (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("archive_note HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("archive_note failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def get_recent_notes(limit: str = "10") -> str:
    """Get the most recently modified notes."""
    logger.info("get_recent_notes limit=%r", limit)
    try:
        n = max(1, min(int(limit.strip() or "10"), 50))
    except ValueError:
        n = 10
    try:
        data  = await api_get("/api/notes", {"limit": n, "sort": "updatedAt", "order": "desc"})
        notes = data.get("notes", [])
        if not notes:
            return "No recent notes found."
        lines = [
            f"- {nt.get('title', '(untitled)')} (id: {nt.get('id', '?')})"
            for nt in notes
        ]
        return f"{len(notes)} recent note(s):\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("get_recent_notes HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("get_recent_notes failed", exc_info=True)
        return f"Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# TAGS
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def list_tags() -> str:
    """List all tags in the Tesserin vault."""
    logger.info("list_tags")
    try:
        data = await api_get("/api/tags")
        tags = data.get("tags", [])
        if not tags:
            return "No tags found."
        lines = [
            f"- {t.get('name', '?')} (id: {t.get('id', '?')}, color: {t.get('color', '#6366f1')})"
            for t in tags
        ]
        return f"{len(tags)} tag(s):\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("list_tags HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("list_tags failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def create_tag(name: str = "", color: str = "#6366f1") -> str:
    """Create a new tag. color must be a valid hex colour (#RGB or #RRGGBB)."""
    logger.info("create_tag name=%r color=%r", name, color)
    n = name.strip()
    if not n:
        return "Error: name is required."
    c = color.strip()
    if not _HEX_COLOUR_RE.match(c):
        return "Error: color must be a valid hex colour (#RGB or #RRGGBB)."
    try:
        data = await api_post("/api/tags", {"name": n, "color": c})
        tag  = data.get("tag", {})
        return f"Tag created: {n} (id: {tag.get('id', '?')}, color: {c})"
    except httpx.HTTPStatusError as e:
        logger.error("create_tag HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("create_tag failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def delete_tag(tag_id: str = "") -> str:
    """Permanently delete a tag from the vault by its ID."""
    logger.info("delete_tag id=%r", tag_id)
    sid = _safe_id(tag_id, "tag_id")
    if not sid:
        return "Error: tag_id is required and must be alphanumeric (max 128 chars)."
    try:
        await api_delete(f"/api/tags/{sid}")
        return f"Tag deleted (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("delete_tag HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("delete_tag failed", exc_info=True)
        return f"Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# TASKS
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def list_tasks(status: str = "", priority: str = "") -> str:
    """List kanban tasks, optionally filtered by status or priority."""
    logger.info("list_tasks status=%r priority=%r", status, priority)
    params: dict = {}
    if status.strip():
        params["status"] = status.strip()
    if priority.strip():
        params["priority"] = priority.strip()
    try:
        data  = await api_get("/api/tasks", params)
        tasks = data.get("tasks", [])
        if not tasks:
            return "No tasks found."
        lines = [
            f"- {tk.get('title', '(untitled)')} (id: {tk.get('id', '?')}, status: {tk.get('status', '?')})"
            for tk in tasks
        ]
        return f"{len(tasks)} task(s):\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("list_tasks HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("list_tasks failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def create_task(
    title: str = "",
    description: str = "",
    priority: str = "1",
    due_date: str = "",
) -> str:
    """Create a new kanban task. priority: 0=none 1=low 2=medium 3=high."""
    logger.info("create_task title=%r", title)
    t = title.strip()
    if not t:
        return "Error: title is required."
    try:
        pri = int(priority.strip() or "1")
        if pri not in (0, 1, 2, 3):
            return "Error: priority must be 0-3 (0=none, 1=low, 2=medium, 3=high)."
    except ValueError:
        return f"Error: invalid priority {priority!r}."
    body: dict = {"title": t, "priority": pri}
    if description.strip():
        body["description"] = description.strip()
    if due_date.strip():
        body["dueDate"] = due_date.strip()
    try:
        data = await api_post("/api/tasks", body)
        task = data.get("task", {})
        return f"Task created: {t} (id: {task.get('id', '?')})"
    except httpx.HTTPStatusError as e:
        logger.error("create_task HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("create_task failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def update_task(
    task_id: str = "",
    title: str = "",
    status: str = "",
    priority: str = "",
    due_date: str = "",
) -> str:
    """Update an existing kanban task. status: todo|in-progress|done."""
    logger.info("update_task id=%r", task_id)
    sid = _safe_id(task_id, "task_id")
    if not sid:
        return "Error: task_id is required and must be alphanumeric (max 128 chars)."
    body: dict = {}
    if title.strip():
        body["title"] = title.strip()
    if status.strip():
        body["status"] = status.strip()
    if priority.strip():
        try:
            pri = int(priority)
            if pri not in (0, 1, 2, 3):
                return "Error: priority must be 0-3."
            body["priority"] = pri
        except ValueError:
            return f"Error: invalid priority {priority!r}."
    if due_date.strip():
        body["dueDate"] = due_date.strip()
    if not body:
        return "Error: provide at least one field to update."
    try:
        await api_patch(f"/api/tasks/{sid}", body)
        return f"Task updated (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("update_task HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("update_task failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def delete_task(task_id: str = "") -> str:
    """Permanently delete a kanban task by its ID. Cannot be undone."""
    logger.info("delete_task id=%r", task_id)
    sid = _safe_id(task_id, "task_id")
    if not sid:
        return "Error: task_id is required and must be alphanumeric (max 128 chars)."
    try:
        await api_delete(f"/api/tasks/{sid}")
        return f"Task deleted (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("delete_task HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("delete_task failed", exc_info=True)
        return f"Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# FOLDERS
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def list_folders() -> str:
    """List all folders in the Tesserin vault."""
    logger.info("list_folders")
    try:
        data    = await api_get("/api/folders")
        folders = data.get("folders", [])
        if not folders:
            return "No folders found."
        lines = [
            f"- {fd.get('name', '?')} (id: {fd.get('id', '?')})"
            for fd in folders
        ]
        return f"{len(folders)} folder(s):\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("list_folders HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("list_folders failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def create_folder(name: str = "", parent_id: str = "") -> str:
    """Create a new folder, optionally nested inside another folder."""
    logger.info("create_folder name=%r parent=%r", name, parent_id)
    n = name.strip()
    if not n:
        return "Error: name is required."
    body: dict = {"name": n}
    if parent_id.strip():
        pid = _safe_id(parent_id, "parent_id")
        if not pid:
            return "Error: parent_id contains invalid characters."
        body["parentId"] = pid
    try:
        data   = await api_post("/api/folders", body)
        folder = data.get("folder", {})
        return f"Folder created: {n} (id: {folder.get('id', '?')})"
    except httpx.HTTPStatusError as e:
        logger.error("create_folder HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("create_folder failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def delete_folder(folder_id: str = "") -> str:
    """Delete a folder by its ID. Notes inside may be moved to root."""
    logger.info("delete_folder id=%r", folder_id)
    sid = _safe_id(folder_id, "folder_id")
    if not sid:
        return "Error: folder_id is required and must be alphanumeric (max 128 chars)."
    try:
        await api_delete(f"/api/folders/{sid}")
        return f"Folder deleted (id: {sid})"
    except httpx.HTTPStatusError as e:
        logger.error("delete_folder HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("delete_folder failed", exc_info=True)
        return f"Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE GRAPH & VAULT
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def get_knowledge_graph() -> str:
    """Retrieve the full knowledge graph (nodes and edges) for the vault."""
    logger.info("get_knowledge_graph")
    try:
        data  = await api_get("/api/knowledge/graph")
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        lines = [
            f"- {nd.get('label', '?')} (id: {nd.get('id', '?')}, type: {nd.get('type', '?')})"
            for nd in nodes[:50]
        ]
        return (
            f"Knowledge Graph\n\n"
            f"Nodes: {len(nodes)}\n"
            f"Edges: {len(edges)}\n\n"
            + "\n".join(lines)
        )
    except httpx.HTTPStatusError as e:
        logger.error("get_knowledge_graph HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("get_knowledge_graph failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def search_vault_context(query: str = "", max_chunks: str = "10") -> str:
    """Search the vault and return context-rich RAG chunks for AI use."""
    logger.info("search_vault_context query=%r", query)
    q = query.strip()
    if not q:
        return "Error: query is required."
    if _safe_text(q, "query") is None:
        return f"Error: query is too long (max {MAX_CONTENT_BYTES // 1024} KB)."
    try:
        mc = max(1, min(int(max_chunks.strip() or "10"), 50))
    except ValueError:
        mc = 10
    try:
        data   = await api_post("/api/knowledge/search", {"query": q, "maxChunks": mc})
        chunks = data.get("chunks", [])
        if not chunks:
            return f"No vault context found for: {query!r}"
        out = f"{len(chunks)} context chunk(s) for {query!r}:\n\n"
        for i, c in enumerate(chunks, 1):
            out += f"--- Chunk {i} ({c.get('noteTitle', '?')}) ---\n{c.get('text', '')}\n\n"
        return out.strip()
    except httpx.HTTPStatusError as e:
        logger.error("search_vault_context HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("search_vault_context failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def get_vault_context(topic: str = "", max_notes: str = "5") -> str:
    """Get rich context from the vault about a topic (for AI reasoning)."""
    logger.info("get_vault_context topic=%r max_notes=%r", topic, max_notes)
    tp = topic.strip()
    if not tp:
        return "Error: topic is required."
    if _safe_text(tp, "topic") is None:
        return f"Error: topic is too long (max {MAX_CONTENT_BYTES // 1024} KB)."
    try:
        n = max(1, min(int(max_notes.strip() or "5"), 20))
    except ValueError:
        n = 5
    try:
        data    = await api_get("/api/knowledge/context", {"topic": tp, "maxNotes": n})
        context = data.get("context", "")
        if not context:
            return f"No context found for topic: {topic!r}"
        return f"Vault context for {topic!r}:\n\n{context}"
    except httpx.HTTPStatusError as e:
        logger.error("get_vault_context HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("get_vault_context failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def export_vault(format: str = "json") -> str:
    """Export all vault data as JSON or Markdown."""
    logger.info("export_vault format=%r", format)
    fmt = format.strip().lower()
    if fmt not in ("json", "markdown", "md"):
        return "Error: format must be 'json' or 'markdown'."
    try:
        data = await api_get("/api/vault/export", {"format": fmt})
        return f"Vault export ({fmt}):\n\n{json.dumps(data, indent=2)}"
    except httpx.HTTPStatusError as e:
        logger.error("export_vault HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("export_vault failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def get_note_with_connections(note_id: str = "") -> str:
    """Get a note along with all its backlinks and outgoing wiki-links."""
    logger.info("get_note_with_connections id=%r", note_id)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    try:
        data      = await api_get(f"/api/notes/{sid}/connections")
        note      = data.get("note", {})
        backlinks = data.get("backlinks", [])
        outgoing  = data.get("outgoing", [])
        title     = note.get("title", "(untitled)")
        content   = note.get("content", "")
        bl_lines  = [f"  <- {lk.get('title', '?')} (id: {lk.get('id', '?')})" for lk in backlinks]
        out_lines = [f"  -> {lk.get('title', '?')} (id: {lk.get('id', '?')})" for lk in outgoing]
        return (
            f"{title} (id: {sid})\n\n"
            f"Backlinks ({len(backlinks)}):\n" + ("\n".join(bl_lines) or "  none") + "\n\n"
            f"Outgoing ({len(outgoing)}):\n"   + ("\n".join(out_lines) or "  none") + "\n\n"
            f"---\n\n{content}"
        )
    except httpx.HTTPStatusError as e:
        logger.error("get_note_with_connections HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("get_note_with_connections failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def get_vault_summary() -> str:
    """Get a high-level summary of vault stats (notes, tags, tasks, folders)."""
    logger.info("get_vault_summary")
    try:
        data = await api_get("/api/vault/summary")
        return (
            f"Vault Summary\n\n"
            f"Notes:   {data.get('noteCount', '?')}\n"
            f"Tags:    {data.get('tagCount', '?')}\n"
            f"Tasks:   {data.get('taskCount', '?')}\n"
            f"Folders: {data.get('folderCount', '?')}\n"
            f"Links:   {data.get('linkCount', '?')}\n"
        )
    except httpx.HTTPStatusError as e:
        logger.error("get_vault_summary HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("get_vault_summary failed", exc_info=True)
        return f"Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# AI
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def ai_chat(message: str = "", model: str = "") -> str:
    """Send a message to Tesserin AI and get a response."""
    logger.info("ai_chat message_len=%d", len(message))
    msg = message.strip()
    if not msg:
        return "Error: message is required."
    if _safe_text(msg, "message") is None:
        return f"Error: message exceeds {MAX_CONTENT_BYTES // 1024} KB limit."
    body: dict = {"message": msg}
    if model.strip():
        body["model"] = model.strip()
    try:
        data  = await api_post("/api/ai/chat", body)
        reply = data.get("response", data.get("message", ""))
        return f"AI Response:\n\n{reply}"
    except httpx.HTTPStatusError as e:
        logger.error("ai_chat HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("ai_chat failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def ai_summarize(note_id: str = "") -> str:
    """Ask Tesserin AI to summarise a note by its ID."""
    logger.info("ai_summarize id=%r", note_id)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    try:
        data    = await api_post(f"/api/ai/summarize/{sid}", {})
        summary = data.get("summary", "")
        return f"Summary:\n\n{summary}"
    except httpx.HTTPStatusError as e:
        logger.error("ai_summarize HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("ai_summarize failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def ai_generate_tags(note_id: str = "") -> str:
    """Ask Tesserin AI to suggest tags for a note."""
    logger.info("ai_generate_tags id=%r", note_id)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    try:
        data = await api_post(f"/api/ai/tags/{sid}", {})
        tags = data.get("tags", [])
        if not tags:
            return "No tag suggestions generated."
        return "Suggested tags:\n\n" + "\n".join(f"- {tg}" for tg in tags)
    except httpx.HTTPStatusError as e:
        logger.error("ai_generate_tags HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("ai_generate_tags failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def ai_suggest_links(note_id: str = "") -> str:
    """Ask Tesserin AI to suggest related notes that could be wiki-linked."""
    logger.info("ai_suggest_links id=%r", note_id)
    sid = _safe_id(note_id, "note_id")
    if not sid:
        return "Error: note_id is required and must be alphanumeric (max 128 chars)."
    try:
        data        = await api_post(f"/api/ai/links/{sid}", {})
        suggestions = data.get("suggestions", [])
        if not suggestions:
            return "No link suggestions found."
        lines = [
            f"- {sg.get('title', '?')} (id: {sg.get('id', '?')}, relevance: {sg.get('relevance', '?')})"
            for sg in suggestions
        ]
        return f"Link suggestions for note {sid}:\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("ai_suggest_links HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("ai_suggest_links failed", exc_info=True)
        return f"Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# TEMPLATES
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def list_templates() -> str:
    """List all note templates available in the vault."""
    logger.info("list_templates")
    try:
        data      = await api_get("/api/templates")
        templates = data.get("templates", [])
        if not templates:
            return "No templates found."
        lines = [
            f"- {tp.get('name', '?')} (id: {tp.get('id', '?')})"
            for tp in templates
        ]
        return f"{len(templates)} template(s):\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("list_templates HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("list_templates failed", exc_info=True)
        return f"Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# CANVAS DIAGRAM GENERATION
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def create_diagram(
    description: str = "",
    diagram_type: str = "auto",
    canvas_name: str = "",
    mermaid_code: str = "",
) -> str:
    """Generate a Mermaid diagram on the Tesserin canvas.

    Creates a new canvas with an AI-generated diagram, immediately visible in
    the Tesserin Canvas tab.  Supports flowchart, sequence diagram, and mindmap.

    Args:
        description:  Natural-language description of what the diagram should show.
                      Example: "OAuth2 authorization code flow with PKCE"
        diagram_type: One of 'flowchart', 'sequence', 'mindmap', or 'auto'.
                      'auto' lets the AI pick the best type.
        canvas_name:  Optional name for the canvas tab (auto-generated if blank).
        mermaid_code: Optional raw Mermaid code to render directly, bypassing
                      AI generation.  When provided, 'description' is ignored.

    Returns:
        A summary with the canvas ID, name, element count, diagram type,
        and the raw Mermaid code that was used.
    """
    logger.info(
        "create_diagram type=%r name=%r has_code=%s",
        diagram_type, canvas_name, bool(mermaid_code),
    )

    if not description.strip() and not mermaid_code.strip():
        return "Error: either 'description' or 'mermaid_code' is required."

    desc_safe = _safe_text(description, "description")
    code_safe = _safe_text(mermaid_code, "mermaid_code") if mermaid_code else None

    allowed_types = {"auto", "flowchart", "sequence", "mindmap"}
    dtype = diagram_type.strip().lower() if diagram_type.strip().lower() in allowed_types else "auto"

    payload: dict = {"type": dtype}
    if desc_safe:
        payload["prompt"] = desc_safe
    if code_safe:
        payload["mermaid_code"] = code_safe
    if canvas_name.strip():
        n = _safe_text(canvas_name.strip(), "canvas_name")
        if n:
            payload["canvas_name"] = n[:120]

    try:
        data = await api_post("/api/canvas/diagram", payload)

        canvas_id    = data.get("canvas_id", "?")
        canvas_n     = data.get("canvas_name", "?")
        elem_count   = data.get("element_count", 0)
        dtype_out    = data.get("diagram_type", "?")
        mermaid_out  = data.get("mermaid_code", "")

        lines = [
            f"✅ Diagram created successfully!",
            f"",
            f"Canvas ID   : {canvas_id}",
            f"Canvas Name : {canvas_n}",
            f"Type        : {dtype_out}",
            f"Elements    : {elem_count}",
            f"",
            f"Open the Canvas tab in Tesserin to view it.",
            f"",
            f"--- Mermaid Code ---",
            mermaid_out,
        ]
        return "\n".join(lines)

    except httpx.HTTPStatusError as e:
        logger.error("create_diagram HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("create_diagram failed", exc_info=True)
        return f"Error: {e}"


@mcp.tool()
async def list_canvases() -> str:
    """List all canvases in the Tesserin vault."""
    logger.info("list_canvases")
    try:
        data     = await api_get("/api/canvas/list")
        canvases = data.get("canvases", [])
        if not canvases:
            return "No canvases found. Use create_diagram to generate one."
        lines = [
            f"- {c.get('name', '?')} (id: {c.get('id', '?')}, updated: {c.get('updated_at', '?')[:10]})"
            for c in canvases
        ]
        return f"{len(canvases)} canvas(es):\n\n" + "\n".join(lines)
    except httpx.HTTPStatusError as e:
        logger.error("list_canvases HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("list_canvases failed", exc_info=True)
        return f"Error: {e}"


# ══════════════════════════════════════════════════════════════════════════════
# HEALTH
# ══════════════════════════════════════════════════════════════════════════════

@mcp.tool()
async def check_health() -> str:
    """Check that the Tesserin API server is reachable and healthy."""
    logger.info("check_health")
    try:
        data   = await api_get("/api/health")
        status = data.get("status", "unknown")
        ver    = data.get("version", "?")
        return f"Tesserin API healthy\n\nStatus: {status}\nVersion: {ver}\nURL: {TESSERIN_API_URL}"
    except httpx.HTTPStatusError as e:
        logger.error("check_health HTTP error", exc_info=True)
        return _http_error(e)
    except Exception as e:
        logger.error("check_health failed", exc_info=True)
        return f"Tesserin API unreachable: {e}\nURL: {TESSERIN_API_URL}"


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    mcp.run(transport="stdio")
