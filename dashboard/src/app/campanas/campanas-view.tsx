"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type Campaign = {
  id: string;
  name: string;
  agent_id: string;
  lead_count: number;
  scheduled_at: string | null;
  notes: string;
  status: "draft" | "scheduled" | "running" | "completed" | "failed";
  created_at: string;
  calls_made: number;
  calls_succeeded: number;
};

type Agent = { agent_id: string; name: string };

const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
  draft: {
    label: "Borrador",
    cls: "border-neutral-500/30 text-neutral-400 bg-neutral-500/10",
  },
  scheduled: {
    label: "Programada",
    cls: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  },
  running: {
    label: "En curso",
    cls: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  },
  completed: {
    label: "Completada",
    cls: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  },
  failed: {
    label: "Falló",
    cls: "border-red-500/40 text-red-300 bg-red-500/10",
  },
};

export function CampanasView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") setCampaigns(data.campaigns ?? []);
      else setError(data.message ?? "Error cargando campañas");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(c: Campaign) {
    if (!confirm(`¿Eliminar la campaña "${c.name}"?`)) return;
    await fetch(`/api/campaigns/${encodeURIComponent(c.id)}`, {
      method: "DELETE",
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-neutral-400">
          {loading
            ? "Cargando…"
            : `${campaigns.length} campaña${campaigns.length === 1 ? "" : "s"}`}
        </p>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
        >
          + Nueva campaña
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] h-24 animate-pulse"
            />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-12 text-center">
          <p className="text-5xl mb-4">📣</p>
          <h3 className="font-heading text-2xl font-bold italic mb-2">
            Aún no tienes campañas
          </h3>
          <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">
            Crea una campaña para que Sofia llame automáticamente a una lista de
            leads — perfecta para seguimientos, recordatorios o reactivación.
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
          >
            + Crear primera campaña
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const badge = STATUS_BADGES[c.status] || STATUS_BADGES.draft;
            const progress =
              c.lead_count > 0
                ? Math.round((c.calls_made / c.lead_count) * 100)
                : 0;
            return (
              <div
                key={c.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-base">
                      📣
                    </div>
                    <div>
                      <h3 className="font-medium text-neutral-100">{c.name}</h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {c.lead_count} lead{c.lead_count === 1 ? "" : "s"} ·
                        {c.scheduled_at
                          ? ` Programada para ${new Date(c.scheduled_at).toLocaleString("es-ES")}`
                          : " Sin programar"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${badge.cls}`}
                    >
                      {badge.label}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(c)}
                      className="border-red-500/20 text-red-300 hover:bg-red-500/10 h-7 text-xs"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
                {c.calls_made > 0 && (
                  <>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5">
                      <span>
                        {c.calls_made} de {c.lead_count} llamadas
                      </span>
                      <span>
                        {c.calls_succeeded} contestadas ({progress}%)
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </>
                )}
                {c.notes && (
                  <p className="text-[11px] text-neutral-500 mt-3 leading-relaxed">
                    {c.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateCampaignDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateCampaignDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [leadsCsv, setLeadsCsv] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "ok") {
          setAgents(d.agents ?? []);
          if (d.agents?.[0]) setAgentId(d.agents[0].agent_id);
        }
      })
      .catch(() => {});
  }, []);

  function parseLeads(): { phone: string; name?: string }[] {
    return leadsCsv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [phone, name] = line.split(/[,;\t]/).map((s) => s.trim());
        return name ? { phone, name } : { phone };
      });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const leads = parseLeads();
    if (!name.trim()) {
      setError("Pon un nombre a la campaña");
      return;
    }
    if (!agentId) {
      setError("Crea o selecciona un agente primero");
      return;
    }
    if (leads.length === 0) {
      setError("Agrega al menos un lead (un teléfono por línea)");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          agent_id: agentId,
          leads,
          scheduled_at: scheduledAt || null,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === "ok") onCreated();
      else setError(data.message ?? "Error creando campaña");
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
        className="w-full max-w-xl my-8 rounded-2xl border border-white/[0.08] bg-neutral-950"
      >
        <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
          <h2 className="font-heading text-2xl font-bold italic">
            Nueva campaña
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
            <Label className="text-xs text-neutral-400">Nombre *</Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seguimiento leads pendientes - Abril"
              required
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Agente *</Label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            >
              {agents.length === 0 && (
                <option value="" className="bg-neutral-900">
                  No hay agentes — crea uno primero en /agentes
                </option>
              )}
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id} className="bg-neutral-900">
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">
              Leads (un teléfono por línea, opcional &quot;teléfono, nombre&quot;) *
            </Label>
            <textarea
              value={leadsCsv}
              onChange={(e) => setLeadsCsv(e.target.value)}
              rows={6}
              placeholder={`+573001234567, Juan Pérez\n+573009876543, María López\n+573005554433`}
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
            />
            <p className="text-[10px] text-neutral-500">
              {parseLeads().length} lead{parseLeads().length === 1 ? "" : "s"} detectado
              {parseLeads().length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">
                Programar para (opcional)
              </Label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Notas</Label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contexto interno"
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
            </div>
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
              {submitting ? "Creando…" : "Crear campaña"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
