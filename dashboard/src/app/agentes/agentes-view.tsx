"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateAgentDialog } from "./create-agent-dialog";

type Agent = {
  agent_id: string;
  name: string;
  voice_id: string;
  language: string;
  llm_id: string;
  webhook_url: string | null;
  last_modification: number;
};

const LANG_LABELS: Record<string, string> = {
  "es-419": "Español (latam)",
  "es-ES": "Español (España)",
  "en-US": "Inglés (US)",
  "pt-BR": "Portugués",
  "fr-FR": "Francés",
  "it-IT": "Italiano",
};

export function AgentesView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") {
        setAgents(data.agents ?? []);
      } else {
        setError(data.message ?? "No se pudieron cargar los agentes");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(agent: Agent) {
    if (
      !confirm(
        `¿Eliminar el agente "${agent.name}"?\n\nEsto no se puede deshacer.`,
      )
    )
      return;
    setDeletingId(agent.agent_id);
    try {
      const res = await fetch(
        `/api/agents/${encodeURIComponent(agent.agent_id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.status === "ok") {
        await load();
      } else {
        alert(data.message ?? "No se pudo eliminar");
      }
    } finally {
      setDeletingId(null);
    }
  }

  function timeAgo(ts: number) {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours} h`;
    const days = Math.floor(hours / 24);
    return `hace ${days} d`;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-sm text-neutral-400">
            {loading
              ? "Cargando…"
              : `${agents.length} ${agents.length === 1 ? "agente" : "agentes"}`}
          </p>
          {!loading && (
            <button
              onClick={load}
              className="text-[11px] text-neutral-500 hover:text-neutral-300"
            >
              ↻ Actualizar
            </button>
          )}
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
        >
          + Crear agente
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 h-44 animate-pulse"
            />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <div
              key={a.agent_id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col hover:bg-white/[0.04] transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-lg">
                  🤖
                </div>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-300 text-[10px]"
                >
                  Activo
                </Badge>
              </div>
              <h3 className="font-heading text-lg font-bold text-neutral-100 truncate">
                {a.name || "Sin nombre"}
              </h3>
              <div className="space-y-1 text-[11px] text-neutral-500 mt-2 mb-4 flex-1">
                <p>
                  <span className="text-neutral-600">Voz:</span>{" "}
                  <span className="font-mono text-neutral-300">{a.voice_id}</span>
                </p>
                <p>
                  <span className="text-neutral-600">Idioma:</span>{" "}
                  {LANG_LABELS[a.language] || a.language}
                </p>
                <p className="font-mono text-[10px] text-neutral-600 truncate">
                  {a.agent_id}
                </p>
                <p className="text-[10px] text-neutral-600">
                  Editado {timeAgo(a.last_modification)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-white/[0.1] text-neutral-300 h-8 text-xs"
                  onClick={() =>
                    alert(
                      `Edición de agente próximamente.\nID: ${a.agent_id}`,
                    )
                  }
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={deletingId === a.agent_id}
                  onClick={() => handleDelete(a)}
                  className="border-red-500/20 text-red-300 hover:bg-red-500/10 h-8 text-xs"
                >
                  {deletingId === a.agent_id ? "…" : "Eliminar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAgentDialog
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-12 text-center">
      <div className="text-5xl mb-4">🤖</div>
      <h3 className="font-heading text-2xl font-bold italic text-neutral-100 mb-2">
        Aún no tienes agentes
      </h3>
      <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">
        Crea tu primer agente de voz en menos de 2 minutos. Eliges la voz, el
        idioma y le das una personalidad — Sofia hace el resto.
      </p>
      <Button
        onClick={onCreate}
        className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
      >
        + Crear mi primer agente
      </Button>
    </div>
  );
}
