"""Knowledge base: documents/snippets the agent can reference.

Stored in Modal Dict. Referenced by the agent's general_prompt via
template variables (future: Retell knowledge base API).
"""

from __future__ import annotations

import secrets
from datetime import datetime, timezone

import modal

from app.logger import Phase, log

_kb_dict = modal.Dict.from_name("sofia-knowledge", create_if_missing=True)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def list_documents() -> list[dict]:
    items: list[dict] = []
    try:
        for _, d in _kb_dict.items():
            if isinstance(d, dict):
                items.append(d)
    except Exception:
        return []
    items.sort(key=lambda d: d.get("updated_at", d.get("created_at", "")), reverse=True)
    return items


def create_document(
    title: str,
    content: str,
    tags: list[str] | None = None,
) -> dict:
    if not title.strip():
        raise ValueError("El título es obligatorio")
    if not content.strip():
        raise ValueError("El contenido no puede estar vacío")

    did = secrets.token_urlsafe(8)
    d = {
        "id": did,
        "title": title.strip(),
        "content": content.strip(),
        "tags": tags or [],
        "char_count": len(content),
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    _kb_dict[did] = d
    log.info(Phase.SYSTEM, "knowledge.created", data={"id": did, "title": title})
    return d


def update_document(doc_id: str, patch: dict) -> dict:
    d = _kb_dict.get(doc_id)
    if not d:
        raise ValueError(f"Documento no encontrado: {doc_id}")
    for k in ("title", "content", "tags"):
        if k in patch and patch[k] is not None:
            d[k] = patch[k]
    if "content" in patch:
        d["char_count"] = len(patch["content"] or "")
    d["updated_at"] = _now_iso()
    _kb_dict[doc_id] = d
    return d


def delete_document(doc_id: str) -> None:
    if doc_id in _kb_dict:
        del _kb_dict[doc_id]
        log.info(Phase.SYSTEM, "knowledge.deleted", data={"id": doc_id})
