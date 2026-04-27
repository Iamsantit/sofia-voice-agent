"use client";

import Link from "next/link";
import { useState } from "react";

type Plan = {
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  features: string[];
  highlight?: boolean;
  cta: string;
  ctaHref: string;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "Para probar y validar",
    monthly: 0,
    annual: 0,
    features: [
      "50 minutos/mes incluidos",
      "1 agente de voz",
      "1 número telefónico",
      "Calificación automática de leads",
      "Soporte por email",
    ],
    cta: "Empezar gratis",
    ctaHref: "/registro?plan=starter",
  },
  {
    name: "Pro",
    tagline: "Negocios en crecimiento",
    monthly: 49,
    annual: 39,
    features: [
      "1,000 minutos/mes",
      "3 agentes de voz",
      "3 números telefónicos",
      "WhatsApp + Google Calendar",
      "Llamadas outbound automáticas",
      "Análisis con Claude 4.5",
      "Soporte prioritario",
    ],
    cta: "Probar Pro 14 días",
    ctaHref: "/registro?plan=pro",
  },
  {
    name: "Business",
    tagline: "El más elegido",
    monthly: 149,
    annual: 119,
    highlight: true,
    features: [
      "5,000 minutos/mes",
      "10 agentes de voz",
      "10 números telefónicos",
      "Todas las integraciones (HubSpot, Pipedrive, Salesforce, Zapier, Make…)",
      "Equipo multi-usuario con roles",
      "Plantillas personalizadas",
      "Webhooks ilimitados",
      "Soporte 24/7 con SLA",
    ],
    cta: "Empezar Business",
    ctaHref: "/registro?plan=business",
  },
  {
    name: "Enterprise",
    tagline: "Operaciones a gran escala",
    monthly: -1,
    annual: -1,
    features: [
      "Minutos ilimitados",
      "Agentes ilimitados",
      "Voces personalizadas (clonación)",
      "Onboarding dedicado",
      "Integraciones custom",
      "Compliance HIPAA / SOC 2",
      "Account manager dedicado",
    ],
    cta: "Hablar con ventas",
    ctaHref: "mailto:ventas@sofia.ai?subject=Plan%20Enterprise",
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section
      id="planes"
      className="border-t border-white/[0.06] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.04),transparent_70%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 py-24 relative">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
            Planes simples,
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              sin sorpresas.
            </span>
          </h2>
          <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
            Empieza gratis. Crece sin migrar de plataforma. Cancela cuando quieras.
          </p>

          {/* Toggle mensual/anual */}
          <div className="inline-flex items-center gap-3 mt-8 rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm transition ${
                !annual
                  ? "bg-amber-400 text-black font-medium"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm transition flex items-center gap-2 ${
                annual
                  ? "bg-amber-400 text-black font-medium"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Anual
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  annual
                    ? "bg-black/20 text-black"
                    : "bg-emerald-500/20 text-emerald-300"
                }`}
              >
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {PLANS.map((p) => (
            <PlanCard key={p.name} plan={p} annual={annual} />
          ))}
        </div>

        <p className="text-center text-xs text-neutral-500 mt-10">
          Todos los precios en USD. Pagos seguros vía Stripe. Cambia o cancela
          desde el dashboard cuando quieras.
        </p>
      </div>
    </section>
  );
}

function PlanCard({ plan, annual }: { plan: Plan; annual: boolean }) {
  const price = annual ? plan.annual : plan.monthly;
  const isEnterprise = price < 0;
  const isFree = price === 0;

  return (
    <div
      className={`lift relative rounded-2xl p-6 flex flex-col ${
        plan.highlight
          ? "gradient-border bg-gradient-to-b from-amber-400/[0.08] to-transparent shadow-[0_0_60px_-15px_rgba(251,191,36,0.4)]"
          : "border border-white/[0.08] glass hover:border-amber-400/20 transition"
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-400 text-[10px] uppercase tracking-wider font-bold text-black">
          Más popular
        </div>
      )}
      <div className="mb-4">
        <h3 className="font-heading text-2xl font-bold text-neutral-100">
          {plan.name}
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">{plan.tagline}</p>
      </div>

      <div className="mb-6">
        {isEnterprise ? (
          <p className="text-3xl font-heading font-bold text-neutral-100">
            Custom
          </p>
        ) : isFree ? (
          <p className="text-4xl font-heading font-bold text-neutral-100">
            Gratis
          </p>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-heading font-bold text-neutral-100">
              ${price}
            </span>
            <span className="text-sm text-neutral-500">/ mes</span>
          </div>
        )}
        {!isEnterprise && !isFree && annual && (
          <p className="text-[11px] text-emerald-400 mt-1">
            Ahorras ${(plan.monthly - plan.annual) * 12}/año
          </p>
        )}
      </div>

      <ul className="space-y-2.5 mb-8 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-neutral-300">
            <span className="text-amber-400 leading-5 mt-px">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.ctaHref}
        className={`w-full text-center rounded-lg px-4 py-3 text-sm font-medium transition ${
          plan.highlight
            ? "bg-amber-400 text-black hover:bg-amber-300"
            : "border border-white/[0.1] text-neutral-200 hover:bg-white/[0.04]"
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}
