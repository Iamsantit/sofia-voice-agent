"use client";

import { useState } from "react";
import { QuantixaMark } from "@/components/quantixa-logo";

export function EmbedForm({
  agentId,
  source,
}: {
  agentId: string;
  source: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Escribe tu nombre completo");
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError("Necesitamos al menos teléfono o email para contactarte");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          message: message.trim(),
          source_url: source,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setDone(true);
      } else {
        setError(data.message ?? "No se pudo enviar el formulario");
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-8 text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
          ✓
        </div>
        <h2 className="font-heading text-2xl font-bold italic">
          ¡Mensaje recibido!
        </h2>
        <p className="text-sm text-neutral-300 leading-relaxed">
          Te vamos a contactar muy pronto. Mientras tanto, mantén tu teléfono
          a la mano.
        </p>
        <p className="text-[10px] text-neutral-600 pt-3 border-t border-white/[0.06]">
          Powered by{" "}
          <a
            href="https://quantixa.ai"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:underline"
          >
            Quantixa AI
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-neutral-900/80 backdrop-blur-md p-6 md:p-8 space-y-5">
      <div className="flex items-center gap-3">
        <QuantixaMark size={36} />
        <div>
          <h2 className="font-heading text-xl font-bold italic leading-tight">
            Háblanos
          </h2>
          <p className="text-[11px] text-neutral-500">
            Te llamamos en menos de 5 minutos
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-neutral-400 mb-1 block">
            Nombre *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Pérez"
            required
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm outline-none focus:border-amber-400/50"
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Teléfono *
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+57 300 123 4567"
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm font-mono outline-none focus:border-amber-400/50"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Correo
            </label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@ejemplo.com"
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-neutral-400 mb-1 block">
            ¿En qué podemos ayudarte?
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Cuéntanos brevemente lo que necesitas"
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm outline-none focus:border-amber-400/50 leading-relaxed resize-none"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-amber-400 hover:bg-amber-300 text-black font-semibold py-3 text-sm transition disabled:opacity-50"
        >
          {submitting ? "Enviando…" : "Quiero que me contacten →"}
        </button>

        <p className="text-[10px] text-neutral-600 text-center pt-2 border-t border-white/[0.06]">
          Al enviar aceptas que te contactemos. Powered by{" "}
          <a
            href="https://quantixa.ai"
            target="_blank"
            rel="noreferrer"
            className="text-amber-400 hover:underline"
          >
            Quantixa AI
          </a>
        </p>
      </form>
    </div>
  );
}
