"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Integration = {
  key: string;
  name: string;
  icon: string;
  description: string;
  default_events?: string[];
  setup_hint?: string;
};

const ALL_EVENTS = [
  { key: "call.started", label: "Llamada iniciada" },
  { key: "call.ended", label: "Llamada finalizada" },
  { key: "call.analyzed", label: "Llamada analizada" },
  { key: "lead.created", label: "Lead creado" },
  { key: "lead.hot", label: "Lead Hot" },
  { key: "appointment.scheduled", label: "Cita agendada" },
];

export function WebhookFlow({
  integration,
  onClose,
  onSaved,
}: {
  integration: Integration;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(`${integration.name} webhook`);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(
    integration.default_events && integration.default_events.length > 0
      ? integration.default_events
      : ["call.ended", "lead.hot"],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(ev: string) {
    setEvents((cur) => (cur.includes(ev) ? cur.filter((e) => e !== ev) : [...cur, ev]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.startsWith("http")) {
      setError("La URL debe empezar con http:// o https://");
      return;
    }
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
          integration: integration.key,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        onSaved();
      } else {
        setError(data.message ?? "Error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-amber-500/[0.02]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{integration.icon}</span>
            <CardTitle className="font-heading text-lg italic">
              Conectar {integration.name}
            </CardTitle>
          </div>
          <p className="text-xs text-neutral-500">{integration.description}</p>
        </div>
        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
          className="border-white/[0.1] text-neutral-400 h-7"
        >
          Cerrar
        </Button>
      </CardHeader>
      <CardContent>
        {integration.setup_hint && (
          <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs text-amber-200">
            <strong className="text-amber-300">Cómo conectarlo:</strong>{" "}
            {integration.setup_hint}
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
              placeholder="https://tu-app.com/webhook"
              required
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-neutral-400">Eventos a enviar</Label>
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
              onClick={onClose}
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
  );
}
