"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Diag = {
  retell?: { ok: boolean; details?: string };
  twilio?: { ok: boolean; details?: string };
  notion?: { ok: boolean; details?: string };
  calcom?: { ok: boolean; details?: string };
  anthropic?: { ok: boolean; details?: string };
  resend?: { ok: boolean; details?: string };
  [k: string]: { ok: boolean; details?: string } | undefined;
};

type Stats = {
  totalLeads: number;
  totalCalls: number;
  contestadas: number;
  citasAgendadas: number;
};

export function PanelAdminView() {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [agentsCount, setAgentsCount] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  async function runDiag() {
    setRunning(true);
    try {
      const res = await fetch("/api/diagnostics", { cache: "no-store" });
      const data = await res.json();
      setDiag(data);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    runDiag();
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
    fetch("/api/agents", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "ok") setAgentsCount((d.agents ?? []).length);
      })
      .catch(() => {});
  }, []);

  const diagEntries = diag
    ? Object.entries(diag).filter(([, v]) => v && typeof v === "object")
    : [];
  const allOk = diagEntries.length > 0 && diagEntries.every(([, v]) => v?.ok);

  return (
    <div className="space-y-8">
      {/* System status */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-wider text-neutral-500">
            Estado del sistema
          </h2>
          <button
            onClick={runDiag}
            disabled={running}
            className="text-[11px] text-amber-400 hover:text-amber-300"
          >
            {running ? "Ejecutando…" : "↻ Re-ejecutar diagnóstico"}
          </button>
        </div>

        <div
          className={`rounded-xl border p-5 mb-4 flex items-center gap-4 ${
            allOk
              ? "border-emerald-500/30 bg-emerald-500/[0.04]"
              : diag
                ? "border-amber-500/30 bg-amber-500/[0.04]"
                : "border-white/[0.06] bg-white/[0.02]"
          }`}
        >
          <div className="text-3xl">
            {allOk ? "✓" : diag ? "⚠" : "…"}
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-100">
              {allOk
                ? "Todos los servicios operativos"
                : diag
                  ? "Hay servicios con problemas"
                  : "Verificando servicios…"}
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Conexiones a Retell, Twilio, Notion, Cal.com, Anthropic y Resend
            </p>
          </div>
        </div>

        {diag && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {diagEntries.map(([service, info]) => {
              if (!info || typeof info !== "object") return null;
              return (
                <div
                  key={service}
                  className={`rounded-lg border p-4 ${
                    info.ok
                      ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                      : "border-red-500/20 bg-red-500/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium capitalize text-neutral-100">
                      {service}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        info.ok
                          ? "border-emerald-500/40 text-emerald-300"
                          : "border-red-500/40 text-red-300"
                      }`}
                    >
                      {info.ok ? "OK" : "FAIL"}
                    </Badge>
                  </div>
                  {info.details && (
                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      {info.details}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Métricas */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Métricas globales
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Agentes"
            value={agentsCount ?? "—"}
            icon="🤖"
            href="/agentes"
          />
          <MetricCard
            label="Llamadas"
            value={stats?.totalCalls ?? "—"}
            icon="📞"
            href="/llamadas"
          />
          <MetricCard
            label="Leads"
            value={stats?.totalLeads ?? "—"}
            icon="👥"
            href="/leads"
          />
          <MetricCard
            label="Citas"
            value={stats?.citasAgendadas ?? "—"}
            icon="📅"
            href="/calendario"
          />
        </div>
      </section>

      {/* Herramientas */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Herramientas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToolCard
            title="Logs en tiempo real"
            desc="Ver eventos, errores y warnings del backend"
            href="/logs"
            icon="📋"
          />
          <ToolCard
            title="Diagnóstico completo"
            desc="Ejecutar checks E2E contra cada servicio externo"
            href="/diagnostics"
            icon="🩺"
          />
          <ToolCard
            title="Llamada de prueba"
            desc="Probar el flujo de llamadas sin tocar producción"
            href="/llamada-prueba"
            icon="🧪"
          />
          <ToolCard
            title="Gestión de equipo"
            desc="Roles, permisos y miembros con acceso al dashboard"
            href="/equipo"
            icon="👥"
          />
        </div>
      </section>

      {/* Build info */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Información del sistema
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <InfoBlock label="Backend" value="Modal" />
          <InfoBlock label="Modelo IA" value="Claude 4.5" />
          <InfoBlock label="Stack voz" value="Retell + Twilio" />
          <InfoBlock label="Versión" value="v0.4.0" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: number | string;
  icon: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-amber-400/20 transition block"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-[10px] text-neutral-500">↗</span>
      </div>
      <p className="font-heading text-3xl font-bold italic text-neutral-100">
        {value}
      </p>
      <p className="text-[11px] text-neutral-500 mt-0.5">{label}</p>
    </Link>
  );
}

function ToolCard({
  title,
  desc,
  href,
  icon,
}: {
  title: string;
  desc: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-amber-400/20 transition block group"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-100 group-hover:text-amber-300 transition">
            {title}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
            {desc}
          </p>
        </div>
      </div>
    </Link>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
        {label}
      </p>
      <p className="text-sm font-mono text-neutral-200">{value}</p>
    </div>
  );
}
