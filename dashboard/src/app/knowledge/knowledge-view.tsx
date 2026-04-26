"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type Doc = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  char_count: number;
  created_at: string;
  updated_at: string;
};

export function KnowledgeView() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") setDocs(data.documents ?? []);
      else setError(data.message ?? "Error cargando documentos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(d: Doc) {
    if (!confirm(`¿Eliminar "${d.title}"?`)) return;
    await fetch(`/api/knowledge/${encodeURIComponent(d.id)}`, {
      method: "DELETE",
    });
    await load();
  }

  const filtered = docs.filter(
    (d) =>
      !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Buscar en knowledge…"
            className="flex-1 max-w-md rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
          />
          <p className="text-sm text-neutral-400 whitespace-nowrap">
            {loading ? "…" : `${filtered.length} doc${filtered.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
        >
          + Nuevo documento
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] h-40 animate-pulse"
            />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-12 text-center">
          <p className="text-5xl mb-4">📚</p>
          <h3 className="font-heading text-2xl font-bold italic mb-2">
            Aún no hay documentos
          </h3>
          <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">
            Sube guías de productos, FAQ, scripts de objeciones o cualquier
            texto que Sofia deba consultar para responder con precisión.
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
          >
            + Crear primer documento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <div
              key={d.id}
              onClick={() => setEditing(d)}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-amber-400/20 transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-neutral-100 truncate flex-1">
                  {d.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(d);
                  }}
                  className="text-[11px] text-red-400/80 hover:text-red-300 ml-2"
                >
                  Eliminar
                </button>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                {d.content}
              </p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {d.tags.map((t) => (
                  <Badge
                    key={t}
                    variant="outline"
                    className="border-amber-400/30 text-amber-300 text-[10px]"
                  >
                    {t}
                  </Badge>
                ))}
                <span className="text-[10px] text-neutral-600 ml-auto">
                  {d.char_count} chars
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreate || editing) && (
        <DocumentDialog
          doc={editing}
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowCreate(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function DocumentDialog({
  doc,
  onClose,
  onSaved,
}: {
  doc: Doc | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(doc?.title ?? "");
  const [content, setContent] = useState(doc?.content ?? "");
  const [tagsInput, setTagsInput] = useState((doc?.tags ?? []).join(", "));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Título y contenido son obligatorios");
      return;
    }
    setSubmitting(true);
    setError(null);
    const tags = tagsInput
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const body = JSON.stringify({ title, content, tags });
    const url = doc ? `/api/knowledge/${encodeURIComponent(doc.id)}` : "/api/knowledge";
    const method = doc ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = await res.json();
      if (data.status === "ok") onSaved();
      else setError(data.message ?? "Error guardando");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl my-8 rounded-2xl border border-white/[0.08] bg-neutral-950"
      >
        <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
          <h2 className="font-heading text-2xl font-bold italic">
            {doc ? "Editar documento" : "Nuevo documento"}
          </h2>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-white/[0.1] text-neutral-400 h-7"
          >
            ✕
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Título *</Label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Política de cancelación"
              required
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">
              Contenido * <span className="text-neutral-600">({content.length} chars)</span>
            </Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="Cancelaciones gratis hasta 24h antes. Después se cobra el 50%..."
              required
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50 leading-relaxed"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">
              Tags (separados por coma)
            </Label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="políticas, faq, refunds"
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06] -mx-6 px-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/[0.1] text-neutral-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
            >
              {submitting ? "Guardando…" : doc ? "Guardar" : "Crear documento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
