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

type Subscriber = {
  id: string;
  phone_number: string;
  label: string;
  status: "pending" | "active" | "needs_join" | "failed";
  created_at: string;
  last_error: string | null;
};

type SandboxInfo = {
  sandbox_number: string;
  join_instruction: string;
};

const STATUS_BADGES: Record<Subscriber["status"], { label: string; cls: string }> = {
  active: { label: "✓ Conectado", cls: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10" },
  pending: { label: "Procesando…", cls: "border-amber-500/30 text-amber-300 bg-amber-500/10" },
  needs_join: { label: "Falta unirse", cls: "border-amber-500/40 text-amber-300 bg-amber-500/10" },
  failed: { label: "Error", cls: "border-red-500/40 text-red-300 bg-red-500/10" },
};

export function WhatsAppPanel({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("+57");
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [sandbox, setSandbox] = useState<SandboxInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSandboxHelp, setShowSandboxHelp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") {
        setSubscribers(data.subscribers ?? []);
        setSandbox(data.sandbox ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 8) {
      setError("Número inválido");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone,
          label: label.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        const sub = data.subscriber as Subscriber;
        if (sub.status === "needs_join") {
          setShowSandboxHelp(true);
        }
        setPhone("+57");
        setLabel("");
        await load();
      } else {
        setError(data.message ?? "Error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function retry(id: string) {
    await fetch(`/api/whatsapp/${id}/retry`, { method: "POST" });
    await load();
  }

  async function remove(sub: Subscriber) {
    if (!confirm(`¿Quitar ${sub.label} (${sub.phone_number})?`)) return;
    await fetch(`/api/whatsapp/${sub.id}`, { method: "DELETE" });
    await load();
  }

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-emerald-500/[0.02]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📱</span>
            <CardTitle className="font-heading text-lg italic">WhatsApp</CardTitle>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[9px]">
              Sandbox Twilio
            </Badge>
          </div>
          <p className="text-xs text-neutral-500">
            Pega tu número y Voicely te avisa por WhatsApp cuando hay leads Hot
            o citas agendadas.
          </p>
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

      <CardContent className="space-y-5">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">
                Número de WhatsApp (con código de país)
              </Label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+573001234567"
                required
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-emerald-400/50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Etiqueta (opcional)</Label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Mi celular"
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-emerald-400/50"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="bg-emerald-500 text-black hover:bg-emerald-400 font-medium"
          >
            {submitting ? "Conectando…" : "Conectar este número"}
          </Button>
        </form>

        {/* Subscribers list */}
        {loading ? (
          <p className="text-sm text-neutral-500">Cargando…</p>
        ) : subscribers.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">
              Números conectados ({subscribers.length})
            </p>
            {subscribers.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-white/[0.06] bg-black/20 p-3 flex items-center gap-3 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-neutral-100">
                      {s.phone_number}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${STATUS_BADGES[s.status].cls}`}
                    >
                      {STATUS_BADGES[s.status].label}
                    </Badge>
                  </div>
                  {s.label && s.label !== s.phone_number && (
                    <p className="text-[11px] text-neutral-500">{s.label}</p>
                  )}
                  {s.status === "needs_join" && (
                    <p className="text-[11px] text-amber-400 mt-1">
                      Para recibir mensajes, una sola vez:{" "}
                      <strong>envía "join &lt;código&gt;"</strong> al{" "}
                      <span className="font-mono">{sandbox?.sandbox_number}</span>{" "}
                      desde este número, luego dale "Reintentar".
                    </p>
                  )}
                  {s.last_error && s.status === "failed" && (
                    <p className="text-[10px] text-red-400/70 mt-1 truncate">
                      {s.last_error}
                    </p>
                  )}
                </div>
                {s.status !== "active" && (
                  <Button
                    size="sm"
                    onClick={() => retry(s.id)}
                    variant="outline"
                    className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-7 text-xs"
                  >
                    Reintentar
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => remove(s)}
                  variant="outline"
                  className="border-red-500/20 text-red-300 hover:bg-red-500/10 h-7 text-xs"
                >
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-neutral-500">Aún no hay números conectados.</p>
        )}

        {/* Sandbox help (collapsible, auto-opens on needs_join) */}
        <div>
          <button
            type="button"
            onClick={() => setShowSandboxHelp(!showSandboxHelp)}
            className="text-[11px] text-amber-400/80 hover:text-amber-300 flex items-center gap-1"
          >
            <span>{showSandboxHelp ? "▼" : "▶"}</span>
            ¿Por qué pide unirse al sandbox?
          </button>
          {showSandboxHelp && sandbox && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-3 space-y-2 text-xs">
              <p className="text-amber-200">
                <strong>Es una restricción de Twilio</strong>, no de Voicely. WhatsApp
                Sandbox solo permite enviar mensajes a números que primero hayan
                hecho "join" — una vez por número.
              </p>
              <ol className="space-y-1 text-neutral-300 ml-4 list-decimal">
                <li>
                  Abre WhatsApp en el celular del número que conectaste
                </li>
                <li>
                  Manda un mensaje al{" "}
                  <span className="font-mono text-amber-300">
                    {sandbox.sandbox_number}
                  </span>{" "}
                  con el texto que aparece en{" "}
                  <a
                    href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 underline"
                  >
                    Twilio Sandbox
                  </a>{" "}
                  (algo como{" "}
                  <code className="bg-black/30 px-1 rounded">join apple-banana</code>)
                </li>
                <li>Vuelve aquí y dale "Reintentar" en el número</li>
              </ol>
              <p className="text-[10px] text-neutral-500 pt-1 border-t border-white/[0.06]">
                Para producción sin "join", se requiere WhatsApp Business API
                aprobada por Meta (proceso aparte).
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
