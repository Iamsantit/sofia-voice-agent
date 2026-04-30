"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Quote = {
  minutes: number;
  agents: number;
  numbers: number;
  whatsapp_agents: number;
  voice_clone: boolean;
  monthly_price_usd: number;
  annual_per_month_usd: number;
  annual_total_usd: number;
  annual_savings_usd: number;
  annual_discount_pct: number;
};

type Preset = {
  label: string;
  minutes: number;
  agents: number;
  numbers: number;
  whatsapp: number;
  voice_clone: boolean;
};

const PRESETS: Preset[] = [
  { label: "Pequeño negocio", minutes: 500, agents: 2, numbers: 1, whatsapp: 1, voice_clone: false },
  { label: "PyME en crecimiento", minutes: 1500, agents: 5, numbers: 3, whatsapp: 3, voice_clone: false },
  { label: "Operación seria", minutes: 4000, agents: 12, numbers: 6, whatsapp: 8, voice_clone: true },
  { label: "Escala enterprise", minutes: 10000, agents: 30, numbers: 20, whatsapp: 20, voice_clone: true },
];

export function CustomPlanBuilder() {
  const [minutes, setMinutes] = useState(1500);
  const [agents, setAgents] = useState(5);
  const [numbers, setNumbers] = useState(3);
  const [whatsapp, setWhatsapp] = useState(3);
  const [voiceClone, setVoiceClone] = useState(false);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [billingMode, setBillingMode] = useState<"annual" | "monthly">("annual");

  // Debounced quote refresh as the user moves sliders
  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/billing/quote-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes,
          agents,
          numbers,
          whatsapp_agents: whatsapp,
          voice_clone: voiceClone,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.status === "ok") setQuote(d as Quote);
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [minutes, agents, numbers, whatsapp, voiceClone]);

  function applyPreset(p: Preset) {
    setMinutes(p.minutes);
    setAgents(p.agents);
    setNumbers(p.numbers);
    setWhatsapp(p.whatsapp);
    setVoiceClone(p.voice_clone);
  }

  const displayPrice =
    billingMode === "annual"
      ? quote?.annual_per_month_usd ?? "—"
      : quote?.monthly_price_usd ?? "—";

  return (
    <section
      id="custom-plan"
      className="border-t border-white/[0.06] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.05),transparent_70%)] pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6 py-20 relative">
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-purple-500/[0.1] border border-purple-500/30 px-3 py-1 text-[10px] uppercase tracking-wider text-purple-300 mb-3">
            Plan a tu medida
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
            Arma tu propio plan{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              anual
            </span>
          </h2>
          <p className="mt-3 text-neutral-400 max-w-xl mx-auto">
            Mueve los sliders, paga lo que necesitas y nada más. El precio se
            ajusta en tiempo real.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          {/* Sliders panel */}
          <div className="rounded-2xl border border-white/[0.08] glass p-6 space-y-6">
            {/* Presets */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
                Presets rápidos
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className="text-[11px] rounded-full border border-white/[0.1] hover:border-amber-400/40 hover:bg-amber-400/[0.05] bg-white/[0.02] px-3 py-1.5 text-neutral-300 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <SliderRow
              label="Minutos por mes"
              value={minutes}
              min={200}
              max={10000}
              step={100}
              format={(v) => `${v.toLocaleString()} min`}
              hint={`~${Math.round(minutes / 60)} horas de llamadas`}
              onChange={setMinutes}
            />
            <SliderRow
              label="Agentes de voz"
              value={agents}
              min={1}
              max={30}
              step={1}
              format={(v) => `${v} ${v === 1 ? "agente" : "agentes"}`}
              hint="Cada agente tiene su propio prompt y voz"
              onChange={setAgents}
            />
            <SliderRow
              label="Números telefónicos"
              value={numbers}
              min={1}
              max={20}
              step={1}
              format={(v) => `${v} ${v === 1 ? "número" : "números"}`}
              hint="Diferentes ciudades / países / verticales"
              onChange={setNumbers}
            />
            <SliderRow
              label="Agentes de WhatsApp 💬"
              value={whatsapp}
              min={0}
              max={20}
              step={1}
              format={(v) => `${v} ${v === 1 ? "agente" : "agentes"}`}
              hint="Chatbot 24/7 en WhatsApp Business"
              onChange={setWhatsapp}
            />

            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] p-3">
              <input
                type="checkbox"
                checked={voiceClone}
                onChange={(e) => setVoiceClone(e.target.checked)}
                className="mt-0.5 accent-amber-400 h-4 w-4"
              />
              <div className="flex-1">
                <p className="text-sm text-neutral-100 flex items-center gap-2">
                  Clonación de voz personalizada
                  <span className="text-[10px] rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-amber-300">
                    +$20/mes
                  </span>
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Usa tu voz, la de un actor, o cualquier voz personalizada que
                  envíes
                </p>
              </div>
            </label>
          </div>

          {/* Quote panel */}
          <div className="rounded-2xl border border-amber-400/30 glass p-6 sticky top-24 self-start space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300">
                Tu plan custom
              </p>
              <div className="inline-flex rounded-full border border-white/[0.1] p-0.5 bg-white/[0.02]">
                <button
                  onClick={() => setBillingMode("annual")}
                  className={`px-3 py-1 rounded-full text-[10px] transition ${
                    billingMode === "annual"
                      ? "bg-amber-400 text-black font-medium"
                      : "text-neutral-400"
                  }`}
                >
                  Anual
                </button>
                <button
                  onClick={() => setBillingMode("monthly")}
                  className={`px-3 py-1 rounded-full text-[10px] transition ${
                    billingMode === "monthly"
                      ? "bg-amber-400 text-black font-medium"
                      : "text-neutral-400"
                  }`}
                >
                  Mensual
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-heading text-5xl font-bold italic tracking-tight">
                  ${displayPrice}
                </span>
                <span className="text-sm text-neutral-500">/ mes</span>
              </div>
              {billingMode === "annual" && quote && (
                <p className="text-xs text-emerald-400 mt-1">
                  Pagas ${quote.annual_total_usd.toLocaleString()} al año ·
                  ahorras ${quote.annual_savings_usd.toLocaleString()} ({quote.annual_discount_pct}% off)
                </p>
              )}
              {billingMode === "monthly" && (
                <p className="text-[11px] text-neutral-500 mt-1">
                  Cobro mensual recurrente, cancela cuando quieras
                </p>
              )}
            </div>

            <div className="rounded-lg bg-black/20 border border-white/[0.04] p-4 space-y-2 text-xs">
              <Row
                label="Minutos voz"
                value={`${quote?.minutes.toLocaleString() ?? minutes.toLocaleString()} / mes`}
              />
              <Row
                label="Agentes voz"
                value={String(quote?.agents ?? agents)}
              />
              <Row
                label="Números"
                value={String(quote?.numbers ?? numbers)}
              />
              <Row
                label="Agentes WhatsApp"
                value={String(quote?.whatsapp_agents ?? whatsapp)}
              />
              <Row
                label="Voz custom"
                value={voiceClone ? "Incluido" : "—"}
              />
              <Row label="Soporte" value="24/7 prioritario" />
              <Row label="Integraciones" value="Todas" />
              <Row label="Chat de equipo" value="Incluido" />
            </div>

            <Link
              href={`/registro?plan=custom&minutes=${minutes}&agents=${agents}&numbers=${numbers}&whatsapp=${whatsapp}&voice=${voiceClone ? 1 : 0}&billing=${billingMode}`}
              className="block w-full text-center rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-medium py-3 text-sm transition"
            >
              Empezar con este plan →
            </Link>
            <p className="text-[10px] text-neutral-500 text-center">
              Sin tarjeta para empezar · 14 días de trial gratis incluidos
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-neutral-200 font-medium">{label}</label>
        <span className="text-sm text-amber-300 font-mono font-medium">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-amber-400"
      />
      <div className="flex justify-between text-[10px] text-neutral-600 mt-1">
        <span>{format(min)}</span>
        {hint && <span className="text-neutral-500">{hint}</span>}
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-100 text-right">{value}</span>
    </div>
  );
}
