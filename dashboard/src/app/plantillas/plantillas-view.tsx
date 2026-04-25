"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Template = {
  id: string;
  name: string;
  category: string;
  description: string;
  begin_message: string;
  general_prompt: string;
  created_at: string;
  updated_at: string;
  times_used: number;
};

type Agent = { agent_id: string; name: string };

const EMPTY: Partial<Template> = {
  name: "",
  category: "Ventas",
  description: "",
  begin_message: "",
  general_prompt: "",
};

const CATEGORY_COLORS: Record<string, string> = {
  Ventas: "border-emerald-500/30 text-emerald-300 bg-emerald-500/5",
  Soporte: "border-cyan-500/30 text-cyan-300 bg-cyan-500/5",
  Citas: "border-amber-500/30 text-amber-300 bg-amber-500/5",
  Otros: "border-neutral-600 text-neutral-400 bg-white/[0.02]",
};

export function PlantillasView() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState<Partial<Template>>(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [applyAgentId, setApplyAgentId] = useState("");
  const [applyResult, setApplyResult] = useState<{ id: string; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, a] = await Promise.all([
        fetch("/api/templates", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/agents", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setTemplates(t.templates ?? []);
      setAgents(a.agents ?? []);
      if (a.agents?.[0]) setApplyAgentId(a.agents[0].agent_id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startNew() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
    setError(null);
  }

  function startEdit(t: Template) {
    setEditing(t);
    setForm(t);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const url = editing ? `/api/templates/${editing.id}` : "/api/templates";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setShowForm(false);
        setEditing(null);
        setForm(EMPTY);
        await load();
      } else {
        setError(data.message ?? "Error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(t: Template) {
    if (!confirm(`¿Eliminar la plantilla "${t.name}"? Esta acción no se puede deshacer.`)) return;
    await fetch(`/api/templates/${t.id}`, { method: "DELETE" });
    await load();
  }

  async function handleApply(t: Template) {
    if (!applyAgentId) {
      setApplyResult({ id: t.id, msg: "Selecciona un agente" });
      return;
    }
    setApplyResult({ id: t.id, msg: "Aplicando…" });
    const res = await fetch(`/api/templates/${t.id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent_id: applyAgentId }),
    });
    const data = await res.json();
    if (data.status === "ok") {
      setApplyResult({ id: t.id, msg: `✓ Aplicada al agente` });
      setTimeout(() => setApplyResult(null), 3000);
      await load();
    } else {
      setApplyResult({ id: t.id, msg: `❌ ${data.message ?? "Error"}` });
    }
    setApplyingTo(null);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-white/[0.06] bg-gradient-to-br from-fuchsia-500/[0.04] via-transparent to-amber-500/[0.04]">
        <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
              Tu biblioteca
            </p>
            <p className="font-heading text-3xl italic font-bold">
              {loading ? "—" : templates.length}{" "}
              <span className="text-base text-neutral-500">
                plantilla{templates.length === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <Button
            onClick={startNew}
            className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
          >
            + Nueva plantilla
          </Button>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <Card className="border-amber-500/20 bg-amber-500/[0.02]">
          <CardHeader>
            <CardTitle className="font-heading text-lg italic">
              {editing ? "Editar plantilla" : "Nueva plantilla"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">Nombre</Label>
                  <input
                    type="text"
                    value={form.name || ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Cierre agresivo"
                    className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">Categoría</Label>
                  <select
                    value={form.category || "Ventas"}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none"
                  >
                    <option>Ventas</option>
                    <option>Soporte</option>
                    <option>Citas</option>
                    <option>Otros</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Descripción corta</Label>
                <input
                  type="text"
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Para llamadas frías a leads cold"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Saludo inicial</Label>
                <Textarea
                  value={form.begin_message || ""}
                  onChange={(e) => setForm({ ...form, begin_message: e.target.value })}
                  rows={2}
                  placeholder="Hola, gracias por llamar a {{business_name}}…"
                  className="bg-white/[0.04] border-white/[0.08] text-sm resize-none"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Prompt completo</Label>
                <Textarea
                  value={form.general_prompt || ""}
                  onChange={(e) => setForm({ ...form, general_prompt: e.target.value })}
                  rows={10}
                  required
                  placeholder="## Personalidad..."
                  className="bg-white/[0.04] border-white/[0.08] text-xs font-mono resize-none"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="border-white/[0.1] text-neutral-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
                >
                  {submitting ? "Guardando…" : editing ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-neutral-500 text-center py-6">Cargando…</p>
      ) : templates.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed border-white/[0.1] p-12 text-center">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm text-neutral-400 mb-3">
            Aún no tienes plantillas guardadas
          </p>
          <Button
            onClick={startNew}
            variant="outline"
            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
          >
            Crear la primera
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <Card
              key={t.id}
              className="border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition flex flex-col"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-heading text-base italic flex-1">
                    {t.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${CATEGORY_COLORS[t.category] || CATEGORY_COLORS.Otros}`}
                  >
                    {t.category}
                  </Badge>
                </div>
                {t.description && (
                  <p className="text-[11px] text-neutral-500 mt-1">{t.description}</p>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <pre className="text-[10px] text-neutral-400 font-mono bg-black/20 p-2 rounded line-clamp-4 whitespace-pre-wrap">
                  {t.general_prompt.slice(0, 280)}
                  {t.general_prompt.length > 280 && "…"}
                </pre>

                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-white/[0.06]">
                  <p className="text-[10px] text-neutral-500">
                    Usada {t.times_used} {t.times_used === 1 ? "vez" : "veces"}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(t)}
                      className="text-[11px] text-neutral-300 hover:bg-white/[0.05] px-2 py-1 rounded"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setApplyingTo(applyingTo === t.id ? null : t.id)}
                      className="text-[11px] text-amber-300 hover:bg-amber-500/10 px-2 py-1 rounded"
                    >
                      Aplicar
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="text-[11px] text-red-300 hover:bg-red-500/10 px-2 py-1 rounded"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                {applyingTo === t.id && (
                  <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-2">
                    <select
                      value={applyAgentId}
                      onChange={(e) => setApplyAgentId(e.target.value)}
                      className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1.5 text-xs outline-none"
                    >
                      {agents.map((a) => (
                        <option key={a.agent_id} value={a.agent_id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApply(t)}
                        className="bg-amber-400 text-black hover:bg-amber-300 text-[11px] flex-1"
                      >
                        Aplicar al agente
                      </Button>
                    </div>
                  </div>
                )}

                {applyResult && applyResult.id === t.id && (
                  <p className="text-[10px] text-neutral-300 mt-2">{applyResult.msg}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
