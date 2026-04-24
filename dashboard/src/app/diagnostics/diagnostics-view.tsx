"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CheckResult = {
  service: string;
  ok: boolean;
  latency_ms: number;
  detail?: Record<string, unknown> | null;
  error?: { type: string; message: string };
};

type DiagResponse = {
  total: number;
  passed: number;
  failed: number;
  results: CheckResult[];
};

const SERVICE_META: Record<string, { group: string; title: string; why: string }> = {
  "env.modal_secret": {
    group: "Backend",
    title: "Variables de entorno en Modal",
    why: "Confirma que el secret `sofia-credentials` tiene las 12 variables necesarias.",
  },
  notion: {
    group: "CRM",
    title: "Notion — query de Leads",
    why: "La app crea leads aquí. Si falla, el paso 02 de las llamadas falla.",
  },
  "retell.agents": {
    group: "Voz (Retell)",
    title: "Retell — listar agentes",
    why: "Verifica que el API key es válido y tus 2 agentes (Sofia inbound + outbound) existen.",
  },
  "retell.can_call": {
    group: "Voz (Retell)",
    title: "Retell — permiso para llamar",
    why: "El check crítico. Si falla con 402, la cuenta Retell no está verificada aún.",
  },
  "twilio.balance": {
    group: "Telefonía (Twilio)",
    title: "Twilio — saldo de cuenta",
    why: "Crédito disponible para llamadas. Colombia cuesta ~$0.13/min.",
  },
  "twilio.number": {
    group: "Telefonía (Twilio)",
    title: "Twilio — número activo",
    why: "Confirma que +17622142967 existe y tiene capacidades de voz/SMS.",
  },
  "twilio.geo_colombia": {
    group: "Telefonía (Twilio)",
    title: "Twilio — Colombia habilitada",
    why: "Sin esto, las llamadas a +57 se rechazan.",
  },
  anthropic: {
    group: "IA (Claude)",
    title: "Anthropic — API responde",
    why: "Para análisis post-llamada. Si falla con credit_low, agrega saldo en console.anthropic.com.",
  },
  calcom: {
    group: "Citas (Cal.com)",
    title: "Cal.com — event types",
    why: "Para agendar visitas. Al menos 1 event type debe existir.",
  },
};

export function DiagnosticsView() {
  const [data, setData] = useState<DiagResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostics", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  const groups: Record<string, CheckResult[]> = {};
  (data?.results ?? []).forEach((r) => {
    const group = SERVICE_META[r.service]?.group ?? "Otros";
    if (!groups[group]) groups[group] = [];
    groups[group].push(r);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          onClick={run}
          disabled={loading}
          className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
        >
          {loading ? "Corriendo..." : "Volver a correr"}
        </Button>

        {data && (
          <div className="flex gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
              {data.passed} OK
            </Badge>
            {data.failed > 0 && (
              <Badge variant="outline" className="border-red-500/40 text-red-300">
                {data.failed} fallos
              </Badge>
            )}
          </div>
        )}

        {error && <span className="text-red-400 text-xs">{error}</span>}
      </div>

      {loading && !data && (
        <p className="text-sm text-neutral-500">Corriendo 9 pruebas…</p>
      )}

      {Object.entries(groups).map(([group, results]) => (
        <Card key={group} className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="font-heading text-base italic text-neutral-200">
              {group}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((r) => {
              const meta = SERVICE_META[r.service];
              return (
                <div
                  key={r.service}
                  className={`rounded-md border p-3 ${
                    r.ok
                      ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                      : "border-red-500/30 bg-red-500/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl leading-none mt-0.5">
                      {r.ok ? "✅" : "❌"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-neutral-100">
                          {meta?.title ?? r.service}
                        </span>
                        <code className="text-[10px] text-neutral-600 font-mono">
                          {r.service}
                        </code>
                        <span className="text-[10px] text-neutral-600 ml-auto">
                          {r.latency_ms}ms
                        </span>
                      </div>
                      {meta?.why && (
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {meta.why}
                        </p>
                      )}
                      {r.ok && r.detail && (
                        <pre className="text-[10px] text-emerald-300/80 mt-2 font-mono">
                          {JSON.stringify(r.detail, null, 2)}
                        </pre>
                      )}
                      {!r.ok && r.error && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[11px] text-red-300 font-mono">
                            {r.error.type}
                          </p>
                          <pre className="text-[10px] text-red-200/80 bg-black/20 p-2 rounded whitespace-pre-wrap">
                            {r.error.message}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
