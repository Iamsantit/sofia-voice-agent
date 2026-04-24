"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Result =
  | { ok: true; call_id: string; lead_id: string; call_status: string }
  | { ok: false; message: string; stage?: string };

type CallStateEntry = { ts: string; phase: string; note?: string };
type CallState = {
  call_id: string;
  current_phase: string;
  history: CallStateEntry[];
  meta?: Record<string, unknown>;
  result?: { status: string; message: string } | null;
};

const PHASE_SEQUENCE = [
  { key: "call.01_validate", label: "Validando datos", icon: "📋" },
  { key: "call.02_notion_lead", label: "Creando lead en Notion", icon: "📝" },
  { key: "call.03_retell_dial", label: "Pidiendo a Retell que marque", icon: "📞" },
  { key: "call.04_twilio_route", label: "Twilio enrutando la llamada", icon: "🌐" },
  { key: "call.05_ringing", label: "Sonando", icon: "🔔" },
  { key: "call.06_answered", label: "Contestó", icon: "🗣️" },
  { key: "call.07_in_progress", label: "Conversación en curso", icon: "💬" },
  { key: "call.08_ended", label: "Llamada terminada", icon: "☎️" },
  { key: "call.09_analyzed", label: "Analizada por Claude", icon: "🧠" },
];

function phaseIndex(phase: string) {
  return PHASE_SEQUENCE.findIndex((p) => p.key === phase);
}

export function TestCallForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+57");
  const [interest, setInterest] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Live call state
  const [callState, setCallState] = useState<CallState | null>(null);
  const [currentLocalPhase, setCurrentLocalPhase] = useState<string>("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  function startPolling(callId: string) {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/call-state/${encodeURIComponent(callId)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.status === "ok" && data.state) {
          setCallState(data.state);
          // Stop polling when terminal phase reached
          const terminal = ["call.09_analyzed", "call.xx_failed", "call.08_ended"];
          if (terminal.includes(data.state.current_phase) && data.state.result) {
            stopPolling();
          }
        }
      } catch {
        // network error — keep polling
      }
    }, 1500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setCallState(null);
    setCurrentLocalPhase("call.01_validate");

    try {
      // Local phase hints while we wait for the server
      setTimeout(() => setCurrentLocalPhase("call.02_notion_lead"), 300);
      setTimeout(() => setCurrentLocalPhase("call.03_retell_dial"), 800);

      const res = await fetch("/api/test-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, interest }),
      });
      const data = await res.json();

      if (data.status === "ok") {
        setResult({
          ok: true,
          call_id: data.call_id,
          lead_id: data.lead_id,
          call_status: data.call_status,
        });
        setCurrentLocalPhase("call.04_twilio_route");
        startPolling(data.call_id);
      } else {
        setResult({
          ok: false,
          message: data.message ?? "Error desconocido",
          stage: data.stage,
        });
        setCurrentLocalPhase("call.xx_failed");
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Error de red",
      });
      setCurrentLocalPhase("call.xx_failed");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = name.trim().length > 0 && phone.trim().length >= 8 && !loading;

  const effectivePhase = callState?.current_phase ?? currentLocalPhase;
  const activeIdx = phaseIndex(effectivePhase);
  const showProgress = !!effectivePhase && effectivePhase !== "";

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="font-heading text-lg italic">
            Datos del contacto
          </CardTitle>
          <p className="text-xs text-neutral-500">
            Sofía llamará a este número usando el agente outbound
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-neutral-300">
                Nombre de la persona
              </Label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Juan Pérez"
                required
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm text-neutral-300">
                Número telefónico (formato E.164, ej. +573001234567)
              </Label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+573001234567"
                required
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest" className="text-sm text-neutral-300">
                ¿En qué está interesado?
              </Label>
              <Textarea
                id="interest"
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                rows={4}
                placeholder="Departamento de 2 recámaras en Polanco, presupuesto hasta 5M pesos, renta."
                className="bg-white/[0.04] border-white/[0.08] text-sm resize-none"
              />
              <p className="text-[11px] text-neutral-500">
                Este texto se pasa al agente como contexto (variable{" "}
                <code className="text-neutral-400">notas</code>)
              </p>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="bg-amber-400 text-black hover:bg-amber-300 font-medium px-8 disabled:opacity-50"
              >
                {loading ? "Llamando…" : "Llamar con Sofía (Retell)"}
              </Button>
              <span className="text-[11px] text-neutral-500">
                Crea lead en Notion + dispara llamada con IA
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Twilio bypass — works even when Retell is blocked */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="font-heading text-lg italic text-neutral-300">
            Plan B — Llamada sin IA (solo Twilio)
          </CardTitle>
          <p className="text-xs text-neutral-500">
            Marca el mismo número usando solo Twilio (TTS básico, sin Sofía).
            Sirve como prueba de que la telefonía funciona cuando Retell está bloqueado.
          </p>
        </CardHeader>
        <CardContent>
          <TwilioDirectCallButton phone={phone} interest={interest} />
        </CardContent>
      </Card>

      {/* Phase progress */}
      {showProgress && (
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="font-heading text-lg italic">
              Estado de la llamada
            </CardTitle>
            {callState?.call_id && (
              <p className="text-[10px] font-mono text-neutral-500">
                call_id: {callState.call_id}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {PHASE_SEQUENCE.map((p, i) => {
                const isFailed = effectivePhase === "call.xx_failed";
                let state: "done" | "active" | "pending" | "failed" = "pending";
                if (isFailed && i <= activeIdx) state = "failed";
                else if (i < activeIdx) state = "done";
                else if (i === activeIdx) state = "active";

                const color =
                  state === "done"
                    ? "text-emerald-400"
                    : state === "active"
                      ? "text-amber-400"
                      : state === "failed"
                        ? "text-red-400"
                        : "text-neutral-600";

                const indicator =
                  state === "done"
                    ? "✓"
                    : state === "active"
                      ? "●"
                      : state === "failed"
                        ? "✕"
                        : "○";

                return (
                  <div key={p.key} className="flex items-center gap-3 text-sm">
                    <span className={`w-4 text-center ${color} ${state === "active" ? "animate-pulse" : ""}`}>
                      {indicator}
                    </span>
                    <span className="w-6 text-center">{p.icon}</span>
                    <span className={color}>{p.label}</span>
                    {state === "active" && (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px] h-4 py-0">
                        en curso
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            {callState?.result && (
              <div className="mt-4 pt-3 border-t border-white/[0.06]">
                <Badge
                  variant="outline"
                  className={
                    callState.result.status === "ok"
                      ? "border-emerald-500/30 text-emerald-400"
                      : "border-red-500/40 text-red-300"
                  }
                >
                  {callState.result.status === "ok" ? "Completada" : "Falló"}
                </Badge>
                {callState.result.message && (
                  <p className="text-xs text-neutral-400 mt-2">
                    {callState.result.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && result.ok && (
        <Card className="border-emerald-500/20 bg-emerald-500/[0.03]">
          <CardHeader>
            <CardTitle className="font-heading text-lg italic text-emerald-300">
              Llamada disparada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 text-[10px]"
              >
                {result.call_status}
              </Badge>
              <span className="text-neutral-400">El teléfono debería sonar en segundos.</span>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-neutral-500">
              <p>
                <span className="text-neutral-600">call_id:</span> {result.call_id}
              </p>
              <p>
                <span className="text-neutral-600">lead_id:</span> {result.lead_id}
              </p>
            </div>
            <div className="flex gap-3 text-xs">
              <a
                href={`/logs?call_id=${encodeURIComponent(result.call_id)}`}
                className="text-amber-400 hover:underline"
              >
                Ver logs de esta llamada →
              </a>
              <a
                href={`https://dashboard.retellai.com/calls/${result.call_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline"
              >
                Ver en Retell →
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {result && !result.ok && (
        <Card className="border-red-500/20 bg-red-500/[0.03]">
          <CardHeader>
            <CardTitle className="font-heading text-lg italic text-red-300">
              No se pudo llamar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {result.stage && (
              <Badge
                variant="outline"
                className="border-red-500/30 text-red-300 text-[10px]"
              >
                Falla en: {result.stage}
              </Badge>
            )}
            <pre className="whitespace-pre-wrap text-[11px] text-red-200/80 bg-black/20 p-3 rounded border border-red-500/10">
              {result.message}
            </pre>
            <div className="flex gap-3 text-xs pt-1">
              <a
                href="/logs?level=error"
                className="text-amber-400 hover:underline"
              >
                Ver errores en logs →
              </a>
              <a
                href="/diagnostics"
                className="text-amber-400 hover:underline"
              >
                Correr diagnóstico →
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ── Plan B: direct Twilio call ──────────────────────────────────────────────

function TwilioDirectCallButton({ phone, interest }: { phone: string; interest: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; call_sid: string; call_status: string; to: string; from: string }
    | { ok: false; message: string }
    | null
  >(null);
  const [status, setStatus] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    setStatus(null);
    setDuration(null);

    const message =
      "Hola. Esta es una llamada de prueba de Sofia, tu asistente virtual. " +
      "Esta llamada fue disparada directamente por Twilio, sin inteligencia artificial. " +
      "Si estas escuchando esto, la infraestructura telefonica funciona correctamente. " +
      (interest ? `Me comentaron que estas interesado en: ${interest}. ` : "") +
      "Gracias por tu tiempo. Hasta pronto.";

    try {
      const res = await fetch("/api/twilio-direct-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });
      const data = await res.json();

      if (data.status === "ok") {
        setResult({
          ok: true,
          call_sid: data.call_sid,
          call_status: data.call_status,
          to: data.to,
          from: data.from,
        });
        pollStatus(data.call_sid);
      } else {
        setResult({ ok: false, message: data.message ?? "Error desconocido" });
      }
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : "Error de red" });
    } finally {
      setLoading(false);
    }
  }

  async function pollStatus(sid: string) {
    let tries = 0;
    const interval = setInterval(async () => {
      tries++;
      try {
        const res = await fetch(`/api/twilio-call-status/${encodeURIComponent(sid)}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status === "ok") {
          setStatus(data.call_status);
          if (data.duration) setDuration(`${data.duration}s`);
          const terminal = ["completed", "failed", "busy", "no-answer", "canceled"];
          if (terminal.includes(data.call_status)) {
            clearInterval(interval);
          }
        }
      } catch {
        // ignore
      }
      if (tries >= 40) clearInterval(interval);
    }, 2000);
  }

  const canCall = phone.trim().length >= 8 && !loading;

  return (
    <div className="space-y-3">
      <Button
        onClick={handleClick}
        disabled={!canCall}
        variant="outline"
        className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
      >
        {loading ? "Disparando…" : "Llamar solo con Twilio"}
      </Button>

      {result && result.ok && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/[0.04] p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-[10px]">
              {status ?? result.call_status}
            </Badge>
            {duration && (
              <span className="text-xs text-neutral-400">Duración: {duration}</span>
            )}
          </div>
          <p className="text-xs text-neutral-400">
            Llamando a <code className="text-emerald-300">{result.to}</code> desde <code className="text-emerald-300">{result.from}</code>
          </p>
          <p className="text-[10px] font-mono text-neutral-600">{result.call_sid}</p>
        </div>
      )}

      {result && !result.ok && (
        <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3">
          <pre className="text-[11px] text-red-200/80 whitespace-pre-wrap">{result.message}</pre>
        </div>
      )}
    </div>
  );
}
