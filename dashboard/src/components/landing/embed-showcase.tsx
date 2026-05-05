"use client";

import { useState } from "react";

const SNIPPET = `<script
  src="https://sofia-voice-agent.vercel.app/api/embed.js"
  data-agent-id="TU_AGENT_ID"
  data-position="bottom-right"
  data-label="Háblanos"
  defer
></script>`;

/**
 * Showcase section for the embeddable lead-capture widget. Shown on
 * the landing between Industries and Pricing. Demonstrates:
 *   - A live preview of the form (right column).
 *   - The 1-line install snippet (left column) with copy button.
 *   - "Funciona en CUALQUIER web" pitch.
 */
export function EmbedShowcase() {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function copy() {
    navigator.clipboard.writeText(SNIPPET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDemo(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || (!email.trim() && !phone.trim())) return;
    setSubmitting(true);
    try {
      await fetch("/api/public/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: "demo",
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          source_url: "landing-demo",
        }),
      }).catch(() => {});
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="embed"
      className="border-t border-white/[0.06] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.06),transparent_60%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 py-24 relative">
        <div className="text-center mb-12">
          <span className="inline-block rounded-full bg-purple-500/[0.1] border border-purple-500/30 px-3 py-1 text-[10px] uppercase tracking-wider text-purple-300 mb-3">
            ✨ Nuevo
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
            Captura leads desde{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              cualquier web.
            </span>
          </h2>
          <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
            Pega 1 línea de código en tu sitio. Tus visitantes llenan el
            formulario. Quantixa AI los llama automáticamente. Tú ves todo
            en tu dashboard.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left — code snippet */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.08] glass p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                  1. Copia este snippet
                </p>
                <button
                  onClick={copy}
                  className={`text-xs rounded-md px-3 py-1 transition ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.08]"
                  }`}
                >
                  {copied ? "✓ Copiado" : "📋 Copiar"}
                </button>
              </div>
              <pre className="bg-black/30 border border-white/[0.04] rounded-lg p-4 text-[11px] font-mono text-amber-100 leading-relaxed overflow-x-auto">
                <code>{SNIPPET}</code>
              </pre>
              <p className="text-[11px] text-neutral-500 mt-3">
                Reemplaza{" "}
                <code className="text-amber-400">TU_AGENT_ID</code> con el
                ID que aparece en tu dashboard cuando creas tu agente.
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] glass p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-3">
                2. Funciona en
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs text-neutral-300">
                <Logo title="WordPress" />
                <Logo title="Wix" />
                <Logo title="Shopify" />
                <Logo title="Webflow" />
                <Logo title="Squarespace" />
                <Logo title="HTML puro" />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">
                3. Recibes
              </p>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Notificación instantánea por WhatsApp</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Lead creado automáticamente en tu CRM</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Llamada automática del agente IA en &lt; 5 min</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Estadísticas en tiempo real en tu dashboard</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right — live demo */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/[0.08] glass p-6 md:p-8 shadow-[0_0_60px_-15px_rgba(251,191,36,0.2)]">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-3">
                Vista previa — así lo ven tus visitantes
              </p>
              {done ? (
                <div className="text-center py-12 space-y-4">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
                    ✓
                  </div>
                  <h3 className="font-heading text-2xl font-bold italic">
                    ¡Recibido!
                  </h3>
                  <p className="text-sm text-neutral-400">
                    En producción, tu agente IA llamaría a este lead en
                    menos de 5 minutos.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDemo} className="space-y-3">
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm outline-none focus:border-amber-400/50"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="text-xs text-neutral-400 mb-1 block">
                        Teléfono
                      </label>
                      <input
                        type="tel"
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
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm outline-none focus:border-amber-400/50"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-md bg-amber-400 hover:bg-amber-300 text-black font-semibold py-3 text-sm transition disabled:opacity-50"
                  >
                    {submitting ? "Enviando…" : "Probar formulario →"}
                  </button>
                </form>
              )}
            </div>
            <p className="text-[10px] text-neutral-600 text-center mt-3">
              Demo en vivo · sin compromiso
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Logo({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-center">
      {title}
    </div>
  );
}
