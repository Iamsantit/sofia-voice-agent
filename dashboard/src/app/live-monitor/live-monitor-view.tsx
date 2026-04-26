"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

type CallState = {
  call_id: string;
  agent_id?: string;
  phone_to?: string;
  phone_from?: string;
  history?: Array<{ ts: string; phase: string; event: string }>;
  result?: { status: string; message: string };
};

const REFRESH_MS = 4000;

export function LiveMonitorView() {
  const [states, setStates] = useState<CallState[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/call-states?limit=50", { cache: "no-store" });
      const data = await res.json();
      setStates(data.states ?? []);
      setLastUpdate(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    }
  }, []);

  useEffect(() => {
    load();
    if (paused) return;
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load, paused]);

  const active = states.filter((s) => !s.result);
  const ended = states.filter((s) => s.result);

  return (
    <div className="space-y-8">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                paused ? "bg-neutral-500" : "bg-emerald-400 animate-pulse"
              }`}
            />
            <span className="text-sm text-neutral-300">
              {paused ? "Pausado" : "En vivo"}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-[11px] text-neutral-500">
              Actualizado {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="text-xs rounded-md border border-white/[0.1] px-3 py-1.5 text-neutral-300 hover:bg-white/[0.04]"
          >
            {paused ? "▶ Reanudar" : "⏸ Pausar"}
          </button>
          <button
            onClick={load}
            className="text-xs rounded-md border border-white/[0.1] px-3 py-1.5 text-neutral-300 hover:bg-white/[0.04]"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Active calls */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          En curso ({active.length})
        </h2>
        {active.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
            <p className="text-3xl mb-2">📞</p>
            <p className="text-sm text-neutral-400">
              No hay llamadas activas en este momento.
            </p>
            <p className="text-[11px] text-neutral-600 mt-1">
              Las llamadas aparecen aquí en cuanto Sofia las contesta.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((s) => (
              <CallRow key={s.call_id} state={s} live />
            ))}
          </div>
        )}
      </section>

      {/* Recent ended */}
      {ended.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
            Recientes ({ended.length})
          </h2>
          <div className="space-y-2">
            {ended.slice(0, 20).map((s) => (
              <CallRow key={s.call_id} state={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CallRow({ state, live = false }: { state: CallState; live?: boolean }) {
  const lastEvent = state.history?.[state.history.length - 1];
  const status = state.result?.status;
  const statusColor =
    status === "ok" || status === "success"
      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
      : status
        ? "border-red-500/40 text-red-300 bg-red-500/10"
        : "border-amber-500/40 text-amber-300 bg-amber-500/10";

  return (
    <div
      className={`rounded-lg border p-4 flex items-center gap-4 ${
        live
          ? "border-emerald-500/30 bg-emerald-500/[0.03]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <div className="h-10 w-10 rounded-full bg-white/[0.04] flex items-center justify-center text-base">
        {live ? "🟢" : status === "ok" ? "✓" : "📞"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-mono text-neutral-100">
            {state.phone_to || state.phone_from || state.call_id.slice(0, 12)}
          </span>
          <Badge variant="outline" className={`text-[10px] ${statusColor}`}>
            {status ? `Terminada · ${status}` : "En curso"}
          </Badge>
        </div>
        {lastEvent && (
          <p className="text-[11px] text-neutral-500 mt-1 font-mono truncate">
            {lastEvent.phase} · {lastEvent.event}
          </p>
        )}
        {state.result?.message && (
          <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
            {state.result.message}
          </p>
        )}
      </div>
      <span className="text-[10px] text-neutral-600 font-mono shrink-0">
        {state.call_id.slice(-8)}
      </span>
    </div>
  );
}
