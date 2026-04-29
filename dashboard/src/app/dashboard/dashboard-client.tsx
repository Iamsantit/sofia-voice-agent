"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IndustryWelcome } from "./industry-welcome";
import { AnimatedNumber } from "./animated-number";
import { LiveClock } from "./live-clock";
import { HealthPulse } from "./health-pulse";
import { PendingOnboardingBanner } from "./pending-onboarding-banner";
import { TrialBanner } from "./trial-banner";

type Stats = {
  totalLeads: number;
  totalCalls: number;
  contestadas: number;
  citasAgendadas: number;
  avgDuration: number;
  temperatura: { hot: number; warm: number; cold: number };
  statusCounts: Record<string, number>;
  tasaExito: number;
};

type Call = {
  id: string;
  titulo: string;
  tipo: string;
  resultado: string;
  duracion: number;
  resumen: string;
  sentimiento: string;
  citaAgendada: boolean;
  fecha: string;
};

const EMPTY_STATS: Stats = {
  totalLeads: 0,
  totalCalls: 0,
  contestadas: 0,
  citasAgendadas: 0,
  avgDuration: 0,
  temperatura: { hot: 0, warm: 0, cold: 0 },
  statusCounts: {},
  tasaExito: 0,
};

const SESSION_STATS_KEY = "sofia_dashboard_stats";
const SESSION_CALLS_KEY = "sofia_dashboard_calls";

export function DashboardClient() {
  // Hydrate from sessionStorage on first paint so a returning user sees
  // their previous numbers immediately while we refresh in background.
  const [stats, setStats] = useState<Stats>(() => {
    if (typeof window === "undefined") return EMPTY_STATS;
    try {
      const cached = sessionStorage.getItem(SESSION_STATS_KEY);
      return cached ? (JSON.parse(cached) as Stats) : EMPTY_STATS;
    } catch {
      return EMPTY_STATS;
    }
  });
  const [calls, setCalls] = useState<Call[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const cached = sessionStorage.getItem(SESSION_CALLS_KEY);
      return cached ? (JSON.parse(cached) as Call[]) : [];
    } catch {
      return [];
    }
  });
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.allSettled([
      fetch("/api/stats", { cache: "no-store", signal: ctrl.signal }).then(
        (r) => r.json(),
      ),
      fetch("/api/calls", { cache: "no-store", signal: ctrl.signal }).then(
        (r) => r.json(),
      ),
    ]).then(([statsRes, callsRes]) => {
      if (statsRes.status === "fulfilled" && statsRes.value) {
        setStats(statsRes.value);
        try {
          sessionStorage.setItem(
            SESSION_STATS_KEY,
            JSON.stringify(statsRes.value),
          );
        } catch {}
      }
      if (callsRes.status === "fulfilled" && Array.isArray(callsRes.value)) {
        setCalls(callsRes.value);
        try {
          sessionStorage.setItem(
            SESSION_CALLS_KEY,
            JSON.stringify(callsRes.value),
          );
        } catch {}
      }
      setRefreshing(false);
    });
    return () => ctrl.abort();
  }, []);

  const recentCalls = calls.slice(0, 6);
  const totalConv =
    stats.temperatura.hot + stats.temperatura.warm + stats.temperatura.cold;
  const hotPct = totalConv
    ? Math.round((stats.temperatura.hot / totalConv) * 100)
    : 0;

  return (
    <>
      <TrialBanner />
      <PendingOnboardingBanner />
      <IndustryWelcome />

      {/* Hero */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-fuchsia-500/[0.08] via-amber-500/[0.04] to-cyan-500/[0.06] p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(34,211,238,0.08),transparent_45%)]" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HealthPulse />
              <span className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">
                Command Center
              </span>
              {refreshing && (
                <span className="text-[10px] text-amber-400/80 ml-2">
                  Sincronizando…
                </span>
              )}
            </div>
            <h1 className="font-heading text-5xl md:text-6xl font-bold italic tracking-tight leading-tight">
              Panel de{" "}
              <span className="bg-gradient-to-r from-fuchsia-400 via-amber-400 to-cyan-400 bg-clip-text text-transparent">
                Sofía
              </span>
            </h1>
            <p className="mt-2 text-sm text-neutral-400 max-w-lg">
              Tu recepcionista IA en tiempo real — cada llamada, cada lead, cada
              insight.
            </p>
          </div>
          <div className="text-right space-y-1">
            <LiveClock />
            <p className="text-[11px] text-neutral-500">
              Zona horaria del negocio
            </p>
          </div>
        </div>
      </div>

      {/* KPI Hero */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiHero
          label="Total Leads"
          value={stats.totalLeads}
          icon="👥"
          gradient="from-fuchsia-500/30 to-pink-500/10"
          iconBg="bg-fuchsia-500/20"
        />
        <KpiHero
          label="Llamadas"
          value={stats.totalCalls}
          icon="📞"
          gradient="from-cyan-500/30 to-blue-500/10"
          iconBg="bg-cyan-500/20"
        />
        <KpiHero
          label="Citas Agendadas"
          value={stats.citasAgendadas}
          icon="📅"
          gradient="from-amber-500/30 to-orange-500/10"
          iconBg="bg-amber-500/20"
          accent
        />
        <KpiHero
          label="Tasa de Éxito"
          value={`${stats.tasaExito}%`}
          icon="🎯"
          gradient="from-emerald-500/30 to-green-500/10"
          iconBg="bg-emerald-500/20"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <QuickAction
          href="/llamada-prueba"
          icon="🎯"
          title="Llamar ahora"
          desc="Dispara una llamada de prueba"
          accent="amber"
        />
        <QuickAction
          href="/numeros"
          icon="☎️"
          title="Comprar número"
          desc="Agrega un teléfono a tu agente"
          accent="cyan"
        />
        <QuickAction
          href="/configuracion"
          icon="🎙️"
          title="Cambiar voz"
          desc="Personaliza cómo suena Sofía"
          accent="fuchsia"
        />
        <QuickAction
          href="/diagnostics"
          icon="🩺"
          title="Diagnóstico"
          desc="Verifica todos los servicios"
          accent="emerald"
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Duración Promedio"
          value={formatDuration(stats.avgDuration)}
          sub="por llamada"
          glow="fuchsia"
        />
        <StatCard
          label="Contestadas"
          value={String(stats.contestadas)}
          sub="de tus llamadas outbound"
          glow="cyan"
        />
        <Card className="border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden">
          <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-amber-500/20 blur-2xl" />
          <CardHeader className="pb-2 relative">
            <CardTitle className="text-[10px] font-normal uppercase tracking-[0.2em] text-neutral-500">
              Temperatura de Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-3 relative">
            <TempBadge
              label="Hot"
              count={stats.temperatura.hot}
              color="bg-red-500/20 text-red-300 border-red-500/40"
            />
            <TempBadge
              label="Warm"
              count={stats.temperatura.warm}
              color="bg-orange-500/20 text-orange-300 border-orange-500/40"
            />
            <TempBadge
              label="Cold"
              count={stats.temperatura.cold}
              color="bg-blue-500/20 text-blue-300 border-blue-500/40"
            />
            {totalConv > 0 && (
              <div className="ml-auto text-right">
                <p className="text-2xl font-heading font-bold italic text-amber-400">
                  {hotPct}%
                </p>
                <p className="text-[9px] text-neutral-500 uppercase tracking-wider">
                  leads hot
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Funnel */}
      <div className="mb-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold italic tracking-tight">
            Funnel de Leads
          </h2>
          <Link
            href="/leads"
            className="text-xs text-neutral-500 hover:text-amber-400 transition"
          >
            Ver todos →
          </Link>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(stats.statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 hover:bg-white/[0.04] transition"
            >
              <StatusDot status={status} />
              <span className="text-sm text-neutral-300">{status}</span>
              <span className="text-sm font-bold text-white font-heading italic">
                {count as number}
              </span>
            </div>
          ))}
          {Object.keys(stats.statusCounts).length === 0 && refreshing && (
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-10 w-32 rounded-lg bg-white/[0.04] animate-pulse"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Calls */}
      <div className="mb-8">
        <div className="flex items-end justify-between mb-4">
          <h2 className="font-heading text-2xl font-bold italic tracking-tight">
            Últimas Llamadas
          </h2>
          <Link
            href="/llamadas"
            className="text-xs text-neutral-500 hover:text-amber-400 transition"
          >
            Ver todas →
          </Link>
        </div>
        <div className="space-y-2">
          {recentCalls.map((call) => (
            <Card
              key={call.id}
              className="border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-500/20 transition-all group"
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-base ${
                    call.tipo === "Inbound"
                      ? "bg-cyan-500/20 ring-1 ring-cyan-500/30"
                      : "bg-fuchsia-500/20 ring-1 ring-fuchsia-500/30"
                  }`}
                >
                  {call.tipo === "Inbound" ? "📥" : "📤"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {call.titulo || "Llamada"}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        call.resultado === "Contestada"
                          ? "border-emerald-500/30 text-emerald-300 text-[10px]"
                          : "border-neutral-700 text-neutral-500 text-[10px]"
                      }
                    >
                      {call.resultado}
                    </Badge>
                    {call.citaAgendada && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                        🗓️ Cita
                      </Badge>
                    )}
                    <SentimentBadge sentiment={call.sentimiento} />
                  </div>
                  {call.resumen && (
                    <p className="mt-1 text-xs text-neutral-500 truncate max-w-2xl">
                      {call.resumen}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono text-neutral-300">
                    {call.duracion ? formatDuration(call.duracion) : "--:--"}
                  </p>
                  <p className="text-[10px] text-neutral-600 mt-0.5">
                    {call.fecha
                      ? new Date(call.fecha).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })
                      : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {recentCalls.length === 0 && refreshing && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-white/[0.03] border border-white/[0.06] animate-pulse"
                />
              ))}
            </div>
          )}
          {recentCalls.length === 0 && !refreshing && (
            <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
              <p className="text-4xl mb-2">📞</p>
              <p className="text-sm text-neutral-500">Aún no hay llamadas</p>
              <Link
                href="/llamada-prueba"
                className="inline-block mt-4 text-xs text-amber-400 hover:underline"
              >
                Disparar una llamada de prueba →
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function KpiHero({
  label,
  value,
  icon,
  gradient,
  iconBg,
  accent,
}: {
  label: string;
  value: string | number;
  icon: string;
  gradient: string;
  iconBg: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={`border-white/[0.08] bg-gradient-to-br ${gradient} relative overflow-hidden group hover:border-white/[0.16] transition-all`}
    >
      <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/[0.04] blur-xl group-hover:bg-white/[0.08] transition" />
      <CardContent className="pt-6 relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-normal uppercase tracking-[0.2em] text-neutral-400">
            {label}
          </span>
          <div
            className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center text-base`}
          >
            {icon}
          </div>
        </div>
        <p
          className={`text-4xl font-heading font-bold italic tracking-tight ${
            accent
              ? "bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent"
              : "text-white"
          }`}
        >
          <AnimatedNumber
            value={typeof value === "number" ? value : 0}
            fallback={String(value)}
          />
        </p>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon,
  title,
  desc,
  accent,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
  accent: "amber" | "cyan" | "fuchsia" | "emerald";
}) {
  const accents: Record<string, string> = {
    amber: "hover:border-amber-500/30 hover:bg-amber-500/[0.04]",
    cyan: "hover:border-cyan-500/30 hover:bg-cyan-500/[0.04]",
    fuchsia: "hover:border-fuchsia-500/30 hover:bg-fuchsia-500/[0.04]",
    emerald: "hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]",
  };
  return (
    <Link href={href}>
      <div
        className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 ${accents[accent]} transition cursor-pointer h-full`}
      >
        <div className="text-2xl mb-2">{icon}</div>
        <p className="text-sm font-medium text-neutral-100">{title}</p>
        <p className="text-[11px] text-neutral-500 mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
  glow,
}: {
  label: string;
  value: string;
  sub: string;
  glow: "fuchsia" | "cyan" | "amber" | "emerald";
}) {
  const glows: Record<string, string> = {
    fuchsia: "bg-fuchsia-500/20",
    cyan: "bg-cyan-500/20",
    amber: "bg-amber-500/20",
    emerald: "bg-emerald-500/20",
  };
  return (
    <Card className="border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden">
      <div
        className={`absolute -top-8 -right-8 h-24 w-24 rounded-full ${glows[glow]} blur-2xl`}
      />
      <CardHeader className="pb-1 relative">
        <CardTitle className="text-[10px] font-normal uppercase tracking-[0.2em] text-neutral-500">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-3xl font-heading font-bold italic tracking-tight text-white">
          {value}
        </p>
        <p className="text-[10px] text-neutral-600 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function TempBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 ${color}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-wider">
        {label}
      </span>
      <span className="text-lg font-bold font-heading italic">{count}</span>
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (!sentiment) return null;
  const cls: Record<string, string> = {
    Positivo: "text-emerald-400",
    Neutral: "text-neutral-500",
    Negativo: "text-red-400",
  };
  const icon: Record<string, string> = {
    Positivo: "↑",
    Neutral: "→",
    Negativo: "↓",
  };
  return (
    <span className={`text-[10px] ${cls[sentiment] || "text-neutral-600"}`}>
      {icon[sentiment]} {sentiment}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    "Pendiente de llamar": "bg-yellow-400",
    "En proceso": "bg-blue-400",
    "Cita agendada": "bg-purple-400",
    "No contestado": "bg-orange-400",
    "Sin interés": "bg-red-400",
    Cerrado: "bg-emerald-400",
  };
  return (
    <div
      className={`h-2 w-2 rounded-full ${colors[status] || "bg-neutral-500"} shadow-[0_0_8px_currentColor]`}
    />
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
