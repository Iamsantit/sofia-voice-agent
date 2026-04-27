"use client";

import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "creating" | "done" | "error";

const PENDING_KEY = "sofia_pending_onboarding";
const SESSION_KEY = "sofia_session";

/**
 * Lives inside the dashboard. If sessionStorage has a pending onboarding
 * payload (left there by the registration wizard), this component fires
 * the actual /api/onboarding call in background and shows a slim banner
 * with progress. Auto-dismisses on success after 1.5s.
 *
 * The user is fully able to use the dashboard while this runs.
 */
export function PendingOnboardingBanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    let payload: Record<string, unknown> | null = null;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (raw) payload = JSON.parse(raw);
    } catch {}

    if (!payload) return;
    fired.current = true;
    setPhase("creating");

    fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((result) => {
        if (result.status === "ok") {
          try {
            const raw = localStorage.getItem(SESSION_KEY);
            const prev = raw ? JSON.parse(raw) : {};
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({
                ...prev,
                agent_id: result.agent_id,
                llm_id: result.llm_id,
                agent_name: result.agent_name ?? prev.agent_name,
              }),
            );
            sessionStorage.removeItem(PENDING_KEY);
            // Drop the cached agents list so the page refetches and
            // includes the brand-new agent on next visit.
            sessionStorage.removeItem("sofia_agents_cache");
          } catch {}
          setPhase("done");
          // Auto-dismiss the banner after a beat
          setTimeout(() => setPhase("idle"), 2500);
        } else {
          setError(result.message ?? "No se pudo crear el agente");
          setPhase("error");
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error de red");
        setPhase("error");
      });
  }, []);

  if (phase === "idle") return null;

  const isError = phase === "error";
  const isDone = phase === "done";
  const isCreating = phase === "creating";

  return (
    <div
      className={`mb-6 rounded-xl border p-4 flex items-center gap-3 transition-all ${
        isError
          ? "border-red-500/30 bg-red-500/[0.04]"
          : isDone
            ? "border-emerald-500/30 bg-emerald-500/[0.04]"
            : "border-amber-500/30 bg-amber-500/[0.04]"
      }`}
    >
      <div className="relative h-9 w-9 shrink-0">
        {isCreating && (
          <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
        )}
        <div
          className={`absolute inset-1 rounded-full flex items-center justify-center text-base ${
            isError
              ? "bg-red-500/20"
              : isDone
                ? "bg-emerald-500/20"
                : "bg-amber-500/20"
          }`}
        >
          {isError ? "⚠" : isDone ? "✓" : "🤖"}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${
            isError
              ? "text-red-200"
              : isDone
                ? "text-emerald-200"
                : "text-amber-100"
          }`}
        >
          {isError
            ? "No se pudo crear tu agente"
            : isDone
              ? "¡Tu agente está listo!"
              : "Creando tu agente en background"}
        </p>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          {isError
            ? error
            : isDone
              ? "Ya puedes verlo en la sección Agentes."
              : "Mientras tanto explora el dashboard. Esto toma ~10 segundos."}
        </p>
      </div>
      {isError && (
        <button
          onClick={() => {
            fired.current = false;
            setPhase("idle");
            setError(null);
            // Re-trigger by reloading
            window.location.reload();
          }}
          className="text-xs text-red-300 hover:text-red-200 underline"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
