"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Session = {
  business_name?: string;
  industry?: string;
  owner_name?: string;
  owner_email?: string;
  agent_id?: string;
  llm_id?: string;
  agent_name?: string;
};

type CreationStage = {
  label: string;
  icon: string;
  /** seconds to dwell before advancing */
  dwell: number;
};

const STAGES: CreationStage[] = [
  { label: "Verificando tus datos", icon: "🔍", dwell: 1.0 },
  { label: "Generando voz personalizada", icon: "🎙️", dwell: 1.4 },
  { label: "Conectando con Claude", icon: "🧠", dwell: 1.4 },
  { label: "Configurando integraciones", icon: "🔌", dwell: 1.4 },
  { label: "Casi listo", icon: "✨", dwell: 1.6 },
];

export function OnboardingSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreating = searchParams.get("creating") === "1";
  const agentIdFromUrl = searchParams.get("agent_id");

  const [session, setSession] = useState<Session>({});
  const [phase, setPhase] = useState<"creating" | "done" | "error">(
    isCreating ? "creating" : "done",
  );
  const [stageIndex, setStageIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(
    agentIdFromUrl,
  );
  const fired = useRef(false);

  // Initial session hydration
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sofia_session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  // Run the actual onboarding in the background while we show progress
  useEffect(() => {
    if (!isCreating || fired.current) return;
    fired.current = true;

    let payload: Record<string, unknown> | null = null;
    try {
      const raw = sessionStorage.getItem("sofia_pending_onboarding");
      if (raw) payload = JSON.parse(raw);
    } catch {}

    if (!payload) {
      // Nothing to create — likely a stale URL. Bounce to dashboard.
      router.replace("/dashboard");
      return;
    }

    // Quick-signin in parallel so the cookie is ready by the time we land
    fetch("/api/auth/quick-signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: String(payload.owner_email ?? "").trim().toLowerCase(),
      }),
    }).catch(() => {});

    fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.status === "ok") {
          // Persist agent_id + llm_id alongside the rest of the session
          try {
            const raw = localStorage.getItem("sofia_session");
            const prev = raw ? JSON.parse(raw) : {};
            localStorage.setItem(
              "sofia_session",
              JSON.stringify({
                ...prev,
                agent_id: result.agent_id,
                llm_id: result.llm_id,
                agent_name: result.agent_name ?? prev.agent_name,
              }),
            );
            sessionStorage.removeItem("sofia_pending_onboarding");
          } catch {}
          setCreatedAgentId(result.agent_id);
          setSession((s) => ({
            ...s,
            agent_id: result.agent_id,
            llm_id: result.llm_id,
            agent_name: result.agent_name ?? s.agent_name,
          }));
          setPhase("done");
        } else {
          setErrorMsg(result.message ?? "No se pudo crear el agente");
          setPhase("error");
        }
      })
      .catch((e) => {
        setErrorMsg(e instanceof Error ? e.message : "Error de red");
        setPhase("error");
      });
  }, [isCreating, router]);

  // Cycle through visual stages while we wait. Stops when phase changes.
  useEffect(() => {
    if (phase !== "creating") return;
    if (stageIndex >= STAGES.length - 1) return;
    const t = setTimeout(
      () => setStageIndex((i) => i + 1),
      STAGES[stageIndex].dwell * 1000,
    );
    return () => clearTimeout(t);
  }, [phase, stageIndex]);

  if (phase === "creating") return <CreatingView session={session} stageIndex={stageIndex} />;
  if (phase === "error")
    return <ErrorView errorMsg={errorMsg} onRetry={() => router.push("/registro")} />;

  return <SuccessView session={session} agentId={createdAgentId ?? session.agent_id ?? ""} />;
}

// ── Views ────────────────────────────────────────────────────────────────

function CreatingView({
  session,
  stageIndex,
}: {
  session: Session;
  stageIndex: number;
}) {
  const stage = STAGES[Math.min(stageIndex, STAGES.length - 1)];
  const totalDwell = STAGES.reduce((s, x) => s + x.dwell, 0);
  const elapsed = STAGES.slice(0, stageIndex + 1).reduce(
    (s, x) => s + x.dwell,
    0,
  );
  const pct = Math.min(100, Math.round((elapsed / totalDwell) * 100));

  return (
    <div className="text-center space-y-10 py-8">
      {/* Pulsing orb */}
      <div className="relative inline-flex h-32 w-32 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-transparent animate-pulse" />
        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-4xl shadow-[0_0_60px_-10px_rgba(251,191,36,0.6)]">
          <span className="animate-float inline-block">{stage.icon}</span>
        </div>
      </div>

      <div className="space-y-3">
        <h1 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
          Creando a{" "}
          <span className="text-aurora">
            {session.agent_name ?? "tu agente"}
          </span>
        </h1>
        <p className="text-neutral-400 max-w-xl mx-auto text-sm">
          Estamos configurando todo para{" "}
          <span className="text-neutral-200">
            {session.business_name ?? "tu negocio"}
          </span>
          . Esto solo toma unos segundos.
        </p>
      </div>

      {/* Stages list */}
      <div className="max-w-md mx-auto space-y-1.5 text-left">
        {STAGES.map((s, i) => {
          const done = i < stageIndex;
          const active = i === stageIndex;
          return (
            <div
              key={s.label}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
                active
                  ? "bg-amber-400/10 border border-amber-400/30"
                  : done
                    ? "opacity-50"
                    : "opacity-30"
              }`}
            >
              <span className="text-lg w-6 text-center">
                {done ? (
                  <span className="text-emerald-400">✓</span>
                ) : active ? (
                  <span className="inline-block animate-pulse">{s.icon}</span>
                ) : (
                  <span>{s.icon}</span>
                )}
              </span>
              <span
                className={`text-sm flex-1 ${
                  active ? "text-neutral-100" : "text-neutral-400"
                }`}
              >
                {s.label}
                {active && (
                  <span className="inline-block ml-1 animate-pulse">…</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto">
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-neutral-500 mt-2">
          {pct < 100 ? `${pct}% — no cierres esta ventana` : "Casi listo…"}
        </p>
      </div>
    </div>
  );
}

function ErrorView({
  errorMsg,
  onRetry,
}: {
  errorMsg: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="text-center space-y-6 py-8 max-w-xl mx-auto">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500/20 to-red-700/10 border border-red-500/30">
        <span className="text-4xl">⚠️</span>
      </div>
      <h1 className="font-heading text-3xl font-bold italic tracking-tight">
        No pudimos crear el agente
      </h1>
      <p className="text-sm text-neutral-400">
        {errorMsg ?? "Hubo un problema al conectarse con el servicio de voz."}
      </p>
      <div className="flex justify-center gap-3 pt-4">
        <Button
          onClick={onRetry}
          className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
        >
          Intentar de nuevo
        </Button>
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="border-white/[0.1] text-neutral-300"
          >
            Ir al dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

function SuccessView({
  session,
  agentId,
}: {
  session: Session;
  agentId: string;
}) {
  return (
    <div className="text-center space-y-8">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-500/10 border border-emerald-500/30">
        <span className="text-4xl">🎉</span>
      </div>

      <div className="space-y-3">
        <h1 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
          ¡{session.agent_name ?? "Tu agente"} está listo!
        </h1>
        <p className="text-neutral-400 max-w-xl mx-auto">
          {session.business_name ? (
            <>
              Configuré {session.agent_name ?? "tu agente"} para{" "}
              <span className="text-neutral-200">{session.business_name}</span>.
              Ya puedes probarlo o conectar un número de teléfono.
            </>
          ) : (
            <>Tu agente fue creado. Ya puedes probarlo desde el dashboard.</>
          )}
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 text-left max-w-md mx-auto">
        <p className="text-xs uppercase tracking-wider text-neutral-500 mb-4">
          Detalles
        </p>
        <div className="space-y-2 text-sm">
          {session.business_name && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Negocio</span>
              <span className="text-neutral-200">{session.business_name}</span>
            </div>
          )}
          {session.agent_name && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Agente</span>
              <span className="text-neutral-200">{session.agent_name}</span>
            </div>
          )}
          {agentId && (
            <div className="flex justify-between gap-2 pt-2 border-t border-white/[0.06] mt-3">
              <span className="text-neutral-500">ID</span>
              <code className="text-[10px] text-amber-400 truncate max-w-[200px]">
                {agentId}
              </code>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 max-w-xl mx-auto text-left">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          Próximos pasos
        </p>
        <div className="space-y-2">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3">
            <span className="text-lg mt-0.5">1️⃣</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-200">
                Prueba tu agente
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Dispara una llamada de prueba desde el dashboard.
              </p>
            </div>
            <Link href="/llamada-prueba">
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-300 cursor-pointer hover:bg-amber-500/10"
              >
                Probar →
              </Badge>
            </Link>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3">
            <span className="text-lg mt-0.5">2️⃣</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-200">
                Personaliza el prompt
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Ajusta exactamente qué dice tu agente en Configuración.
              </p>
            </div>
            <Link href="/configuracion">
              <Badge
                variant="outline"
                className="border-neutral-600 text-neutral-400 cursor-pointer hover:bg-white/[0.04]"
              >
                Ir →
              </Badge>
            </Link>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3">
            <span className="text-lg mt-0.5">3️⃣</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-200">
                Revisa el diagnóstico
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Confirma que todos los servicios están OK.
              </p>
            </div>
            <Link href="/diagnostics">
              <Badge
                variant="outline"
                className="border-neutral-600 text-neutral-400 cursor-pointer hover:bg-white/[0.04]"
              >
                Ver →
              </Badge>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <Link href="/dashboard">
          <Button className="bg-amber-400 text-black hover:bg-amber-300 font-medium px-8">
            Ir al dashboard →
          </Button>
        </Link>
      </div>
    </div>
  );
}
