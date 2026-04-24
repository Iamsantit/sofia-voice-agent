"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type LogEntry = {
  ts: string;
  level: "info" | "warn" | "error";
  phase: string;
  event: string;
  call_id?: string;
  data?: Record<string, unknown>;
  error?: { type: string; message: string; traceback?: string };
};

const REFRESH_MS = 2500;

const LEVEL_STYLE: Record<LogEntry["level"], { row: string; badge: string; label: string }> = {
  info: {
    row: "border-white/[0.06] bg-white/[0.02]",
    badge: "border-neutral-600 text-neutral-300",
    label: "INFO",
  },
  warn: {
    row: "border-amber-500/20 bg-amber-500/[0.04]",
    badge: "border-amber-500/40 text-amber-300",
    label: "WARN",
  },
  error: {
    row: "border-red-500/30 bg-red-500/[0.05]",
    badge: "border-red-500/50 text-red-300",
    label: "ERROR",
  },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-MX", { hour12: false }) +
    "." + String(d.getMilliseconds()).padStart(3, "0");
}

export function LogsStream() {
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [levelFilter, setLevelFilter] = useState<"" | "info" | "warn" | "error">(
    () => {
      const v = searchParams.get("level");
      return v === "info" || v === "warn" || v === "error" ? v : "";
    }
  );
  const [callIdFilter, setCallIdFilter] = useState(() => searchParams.get("call_id") ?? "");
  const [phaseFilter, setPhaseFilter] = useState(() => searchParams.get("phase_prefix") ?? "");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const fetchLogs = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", "300");
      if (levelFilter) qs.set("level", levelFilter);
      if (callIdFilter.trim()) qs.set("call_id", callIdFilter.trim());
      if (phaseFilter.trim()) qs.set("phase_prefix", phaseFilter.trim());

      const res = await fetch(`/api/logs?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setFetching(false);
    }
  }, [levelFilter, callIdFilter, phaseFilter]);

  useEffect(() => {
    fetchLogs();
    if (!autoRefresh) return;
    const id = setInterval(fetchLogs, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchLogs, autoRefresh]);

  const counts = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        acc[e.level] = (acc[e.level] ?? 0) + 1;
        return acc;
      },
      { info: 0, warn: 0, error: 0 } as Record<string, number>
    );
  }, [entries]);

  async function handleClear() {
    if (!confirm("¿Borrar todos los logs del servidor?")) return;
    await fetch("/api/logs", { method: "DELETE" });
    fetchLogs();
  }

  function toggleExpand(i: number) {
    const next = new Set(expanded);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setExpanded(next);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-amber-400"
          />
          <span className="text-neutral-400">Auto-refresh ({REFRESH_MS / 1000}s)</span>
        </label>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as "" | "info" | "warn" | "error")}
          className="rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1 text-xs outline-none"
        >
          <option value="">Todos los niveles</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>

        <input
          type="text"
          value={phaseFilter}
          onChange={(e) => setPhaseFilter(e.target.value)}
          placeholder="Fase (ej. call. o svc.)"
          className="rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1 text-xs font-mono outline-none w-44"
        />

        <input
          type="text"
          value={callIdFilter}
          onChange={(e) => setCallIdFilter(e.target.value)}
          placeholder="call_id"
          className="rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1 text-xs font-mono outline-none w-56"
        />

        <Button
          size="sm"
          variant="outline"
          onClick={fetchLogs}
          disabled={fetching}
          className="border-white/10 text-xs h-7"
        >
          {fetching ? "…" : "Refrescar"}
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-2 text-[11px]">
          <Badge variant="outline" className="border-neutral-600 text-neutral-400">
            {counts.info ?? 0} info
          </Badge>
          <Badge variant="outline" className="border-amber-500/40 text-amber-300">
            {counts.warn ?? 0} warn
          </Badge>
          <Badge variant="outline" className="border-red-500/50 text-red-300">
            {counts.error ?? 0} error
          </Badge>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleClear}
          className="border-red-500/30 text-red-300 text-xs h-7 hover:bg-red-500/10"
        >
          Limpiar
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/[0.05] p-3 text-xs text-red-300">
          Error cargando logs: {error}
        </div>
      )}

      {/* Stream */}
      <div className="space-y-1">
        {entries.length === 0 && !fetching && (
          <p className="text-sm text-neutral-500 text-center py-12">
            Sin eventos todavía. Dispara una llamada de prueba para ver logs.
          </p>
        )}

        {entries.map((e, i) => {
          const style = LEVEL_STYLE[e.level] ?? LEVEL_STYLE.info;
          const isExpanded = expanded.has(i);
          const hasDetails = e.data || e.error || e.call_id;

          return (
            <div
              key={`${e.ts}-${i}`}
              className={`rounded-md border px-3 py-2 text-xs font-mono ${style.row} ${hasDetails ? "cursor-pointer hover:bg-white/[0.04]" : ""}`}
              onClick={() => hasDetails && toggleExpand(i)}
            >
              <div className="flex items-start gap-3">
                <span className="text-neutral-600 shrink-0">
                  {formatTime(e.ts)}
                </span>
                <Badge
                  variant="outline"
                  className={`${style.badge} text-[9px] shrink-0 py-0 h-4`}
                >
                  {style.label}
                </Badge>
                <span className="text-neutral-400 shrink-0 w-48 truncate">
                  {e.phase}
                </span>
                <span className="text-neutral-200 flex-1 truncate">
                  {e.event}
                </span>
                {e.call_id && (
                  <span className="text-amber-400/70 text-[10px] shrink-0">
                    {e.call_id.slice(0, 16)}…
                  </span>
                )}
                {hasDetails && (
                  <span className="text-neutral-600 shrink-0">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                )}
              </div>

              {isExpanded && (
                <div className="mt-2 space-y-2 pl-3 border-l border-white/10">
                  {e.call_id && (
                    <div className="text-[10px] text-neutral-500">
                      <span className="text-neutral-600">call_id:</span>{" "}
                      <span className="text-amber-400">{e.call_id}</span>
                    </div>
                  )}
                  {e.data && (
                    <div>
                      <div className="text-[10px] text-neutral-600 mb-1">data:</div>
                      <pre className="text-[10px] text-neutral-300 bg-black/30 p-2 rounded overflow-x-auto">
                        {JSON.stringify(e.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {e.error && (
                    <div>
                      <div className="text-[10px] text-red-400 mb-1">
                        {e.error.type}: {e.error.message}
                      </div>
                      {e.error.traceback && (
                        <pre className="text-[10px] text-red-200/70 bg-black/30 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {e.error.traceback}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
