"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";

type Lead = {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  estatus: string;
  temperatura: string;
  siguienteAccion: string;
  fechaRegistro: string;
};

const TEMP_COLORS: Record<string, string> = {
  Hot: "border-red-500/40 text-red-300 bg-red-500/10",
  Warm: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  Cold: "border-blue-500/40 text-blue-300 bg-blue-500/10",
};

export function CalendarioView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "month">("list");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/leads", { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : (data.leads ?? []);
        setLeads(list);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error cargando datos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const appointments = useMemo(() => {
    return leads
      .filter((l) => l.estatus === "Cita agendada")
      .sort(
        (a, b) =>
          new Date(b.fechaRegistro).getTime() -
          new Date(a.fechaRegistro).getTime(),
      );
  }, [leads]);

  const grouped = useMemo(() => {
    const out: Record<string, Lead[]> = {};
    for (const a of appointments) {
      const date = new Date(a.fechaRegistro);
      const key = date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      out[key] = out[key] || [];
      out[key].push(a);
    }
    return out;
  }, [appointments]);

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inWeek = new Date(today);
  inWeek.setDate(inWeek.getDate() + 7);

  const todayCount = appointments.filter((a) => {
    const d = new Date(a.fechaRegistro);
    return d >= today && d < tomorrow;
  }).length;
  const weekCount = appointments.filter((a) => {
    const d = new Date(a.fechaRegistro);
    return d >= today && d < inWeek;
  }).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Citas totales" value={appointments.length} />
        <StatCard label="Hoy" value={todayCount} highlight={todayCount > 0} />
        <StatCard label="Esta semana" value={weekCount} />
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-neutral-400">
          {loading
            ? "Cargando…"
            : `${appointments.length} cita${appointments.length === 1 ? "" : "s"}`}
        </p>
        <div className="inline-flex rounded-md border border-white/[0.08] p-0.5 bg-white/[0.02]">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1 text-xs rounded ${
              view === "list"
                ? "bg-amber-400/20 text-amber-300"
                : "text-neutral-400"
            }`}
          >
            Lista
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1 text-xs rounded ${
              view === "month"
                ? "bg-amber-400/20 text-amber-300"
                : "text-neutral-400"
            }`}
          >
            Por día
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] h-16 animate-pulse"
            />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-12 text-center">
          <p className="text-5xl mb-4">📅</p>
          <h3 className="font-heading text-2xl font-bold italic mb-2">
            Sin citas agendadas todavía
          </h3>
          <p className="text-sm text-neutral-400 max-w-md mx-auto">
            Cuando Sofia agende una visita o cita, aparecerá aquí en orden
            cronológico. Conecta Google Calendar en /integraciones para
            sincronización automática.
          </p>
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {appointments.map((a) => (
            <AppointmentRow key={a.id} appt={a} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([day, items]) => (
            <div key={day}>
              <p className="text-xs uppercase tracking-wider text-amber-400 mb-3">
                {day}
              </p>
              <div className="space-y-2">
                {items.map((a) => (
                  <AppointmentRow key={a.id} appt={a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-amber-400/30 bg-amber-400/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="font-heading text-3xl font-bold italic mt-1 text-neutral-100">
        {value}
      </p>
    </div>
  );
}

function AppointmentRow({ appt }: { appt: Lead }) {
  const date = new Date(appt.fechaRegistro);
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-4 hover:bg-white/[0.04] transition">
      <div className="h-10 w-10 rounded-lg bg-amber-400/10 border border-amber-400/30 flex flex-col items-center justify-center text-[10px] leading-none text-amber-300 shrink-0">
        <span className="font-bold text-base">{date.getDate()}</span>
        <span className="uppercase tracking-wider mt-0.5">
          {date.toLocaleDateString("es-ES", { month: "short" }).slice(0, 3)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-neutral-100 truncate">
            {appt.nombre || "Sin nombre"}
          </p>
          {appt.temperatura && (
            <Badge
              variant="outline"
              className={`text-[10px] ${TEMP_COLORS[appt.temperatura] || ""}`}
            >
              {appt.temperatura}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-neutral-500 truncate">
          {appt.telefono} · {appt.siguienteAccion || "Sin detalles"}
        </p>
      </div>
      <span className="text-[11px] text-neutral-500 font-mono shrink-0">
        {date.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}
