"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { WhatsAppPanel } from "./whatsapp-panel";

type Integration = {
  key: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  status: "available" | "soon";
  setup_kind: "webhook" | "oauth" | "native";
  setup_url?: string;
  setup_steps?: string[];
  default_events?: string[];
};

type Webhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  integration: string;
  enabled: boolean;
  secret: string;
  created_at: string;
  last_fired_at: string | null;
  last_status: number | null;
  fire_count: number;
};

const ALL_EVENTS = [
  { key: "call.started", label: "Llamada iniciada" },
  { key: "call.ended", label: "Llamada finalizada" },
  { key: "call.analyzed", label: "Llamada analizada" },
  { key: "lead.created", label: "Lead creado" },
  { key: "lead.hot", label: "Lead calificado Hot" },
  { key: "appointment.scheduled", label: "Cita agendada" },
];

export function IntegracionesView() {
  const [catalog, setCatalog] = useState<Integration[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [presetIntegration, setPresetIntegration] = useState("custom");
  const [presetSetupSteps, setPresetSetupSteps] = useState<string[] | undefined>();
  const [presetSetupUrl, setPresetSetupUrl] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["call.ended", "lead.hot"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") {
        setCatalog(data.catalog ?? []);
        setWebhooks(data.webhooks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startConnect(integration: Integration) {
    if (integration.status === "soon") {
      alert(`${integration.name} estará disponible próximamente.`);
      return;
    }
    // WhatsApp uses a dedicated native panel (not the generic webhook form)
    if (integration.key === "whatsapp" || integration.setup_kind === "native") {
      setShowWhatsApp(true);
      setShowForm(false);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
      return;
    }
    setPresetIntegration(integration.key);
    setPresetSetupSteps(integration.setup_steps);
    setPresetSetupUrl(integration.setup_url);
    setName(`${integration.name} webhook`);
    setUrl("");
    setEvents(integration.default_events ?? ["call.ended", "lead.hot"]);
    setShowForm(true);
    setError(null);
    // Scroll to top so user sees the form
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  }

  function startCustom() {
    setPresetIntegration("custom");
    setPresetSetupSteps(undefined);
    setPresetSetupUrl(undefined);
    setName("Webhook personalizado");
    setUrl("");
    setEvents(["call.ended"]);
    setShowForm(true);
    setError(null);
  }

  function toggleEvent(ev: string) {
    setEvents((cur) =>
      cur.includes(ev) ? cur.filter((e) => e !== ev) : [...cur, ev]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (events.length === 0) {
      setError("Selecciona al menos un evento");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url,
          events,
          integration: presetIntegration,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setShowForm(false);
        await load();
      } else {
        setError(data.message ?? "Error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(w: Webhook) {
    await fetch(`/api/webhooks/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !w.enabled }),
    });
    await load();
  }

  async function handleDelete(w: Webhook) {
    if (!confirm(`¿Eliminar webhook "${w.name}"?`)) return;
    await fetch(`/api/webhooks/${w.id}`, { method: "DELETE" });
    await load();
  }

  async function handleTest(w: Webhook) {
    setTestResults((r) => ({ ...r, [w.id]: "Probando…" }));
    const res = await fetch(`/api/webhooks/${w.id}/test`, { method: "POST" });
    const data = await res.json();
    if (data.status === "ok" && data.result.ok) {
      setTestResults((r) => ({
        ...r,
        [w.id]: `✓ HTTP ${data.result.status_code} (${data.result.elapsed_ms}ms)`,
      }));
    } else {
      const r = data.result || {};
      setTestResults((rs) => ({
        ...rs,
        [w.id]: `❌ ${r.error || `HTTP ${r.status_code}`}`,
      }));
    }
    await load();
  }

  // Group catalog by category
  const byCategory: Record<string, Integration[]> = {};
  catalog.forEach((i) => {
    if (!byCategory[i.category]) byCategory[i.category] = [];
    byCategory[i.category].push(i);
  });

  return (
    <div className="space-y-6">
      {/* WhatsApp dedicated panel */}
      {showWhatsApp && <WhatsAppPanel onClose={() => setShowWhatsApp(false)} />}

      {/* Webhook form (shown when adding new) */}
      {showForm && (
        <Card className="border-amber-500/20 bg-amber-500/[0.02]">
          <CardHeader>
            <CardTitle className="font-heading text-lg italic">
              Conectar webhook
            </CardTitle>
            <p className="text-xs text-neutral-500">
              {presetIntegration !== "custom"
                ? `Pega la URL del webhook desde ${presetIntegration} y elige qué eventos enviar.`
                : "Configura una URL custom para recibir eventos de Voicely."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Setup steps específicos por integración */}
            {presetSetupSteps && presetSetupSteps.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold">
                    📖 Cómo conectar {presetIntegration}
                  </p>
                  {presetSetupUrl && (
                    <a
                      href={presetSetupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-amber-300 hover:underline"
                    >
                      Docs oficiales →
                    </a>
                  )}
                </div>
                <ol className="space-y-1.5 text-xs text-neutral-300">
                  {presetSetupSteps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-amber-400 font-medium shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Nombre</Label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">URL del webhook</Label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  required
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Eventos</Label>
                <div className="grid md:grid-cols-2 gap-2">
                  {ALL_EVENTS.map((ev) => {
                    const checked = events.includes(ev.key);
                    return (
                      <label
                        key={ev.key}
                        className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer transition ${
                          checked
                            ? "border-amber-400/40 bg-amber-400/[0.06]"
                            : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEvent(ev.key)}
                          className="accent-amber-400"
                        />
                        <div className="text-xs">
                          <p className="text-neutral-200">{ev.label}</p>
                          <p className="text-[10px] text-neutral-500 font-mono">{ev.key}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="border-white/[0.1] text-neutral-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
                >
                  {submitting ? "Conectando…" : "Conectar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Active webhooks */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-heading text-lg italic">Mis conexiones</CardTitle>
            <p className="text-xs text-neutral-500 mt-0.5">
              {webhooks.length} webhook{webhooks.length === 1 ? "" : "s"} activos
            </p>
          </div>
          <Button
            onClick={startCustom}
            variant="outline"
            className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
          >
            + Webhook custom
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-neutral-500 text-center py-6">Cargando…</p>
          ) : webhooks.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">
              Aún no hay webhooks conectados. Elige una integración del catálogo de abajo.
            </p>
          ) : (
            <div className="space-y-2">
              {webhooks.map((w) => (
                <div
                  key={w.id}
                  className={`rounded-lg border p-4 ${
                    w.enabled
                      ? "border-white/[0.08] bg-black/20"
                      : "border-white/[0.04] bg-black/40 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-neutral-100">{w.name}</p>
                        <Badge
                          variant="outline"
                          className={
                            w.enabled
                              ? "border-emerald-500/30 text-emerald-300 text-[9px]"
                              : "border-neutral-700 text-neutral-500 text-[9px]"
                          }
                        >
                          {w.enabled ? "Activo" : "Pausado"}
                        </Badge>
                        <Badge variant="outline" className="border-neutral-700 text-neutral-400 text-[9px]">
                          {w.integration}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-mono text-neutral-500 truncate mt-1">
                        {w.url}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {w.events.map((ev) => (
                          <span
                            key={ev}
                            className="text-[10px] text-neutral-400 bg-white/[0.04] px-1.5 py-0.5 rounded"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                      {(w.fire_count > 0 || testResults[w.id]) && (
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-500">
                          {w.fire_count > 0 && (
                            <span>
                              Disparado {w.fire_count}× · último HTTP {w.last_status ?? "?"}
                            </span>
                          )}
                          {testResults[w.id] && (
                            <span className="text-amber-300">{testResults[w.id]}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleTest(w)}
                        variant="outline"
                        className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 text-xs h-7"
                      >
                        🧪 Probar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => toggleEnabled(w)}
                        variant="outline"
                        className="border-white/[0.1] text-neutral-300 text-xs h-7"
                      >
                        {w.enabled ? "Pausar" : "Activar"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDelete(w)}
                        variant="outline"
                        className="border-red-500/20 text-red-300 hover:bg-red-500/10 text-xs h-7"
                      >
                        Quitar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catalog */}
      <div>
        <h2 className="font-heading text-2xl font-bold italic tracking-tight mb-4">
          Catálogo
        </h2>
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat} className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">
              {cat}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {items.map((i) => (
                <Card
                  key={i.key}
                  className={`border-white/[0.06] transition cursor-pointer ${
                    i.status === "soon"
                      ? "bg-white/[0.01] opacity-60"
                      : "bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-500/20"
                  }`}
                  onClick={() => startConnect(i)}
                >
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-3xl">{i.icon}</span>
                      {i.status === "soon" ? (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[9px]">
                          Próx.
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-[9px]">
                          Listo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-neutral-100">{i.name}</p>
                    <p className="text-[11px] text-neutral-500 mt-1">{i.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
