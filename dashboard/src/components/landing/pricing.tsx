"use client";

import Link from "next/link";
import { useState } from "react";

type BillingMode = "monthly" | "annual";

const ANNUAL_DISCOUNT_PCT = 15; // 15% off annual on all paid plans

const STRIPE_LINKS = {
  starter: "https://buy.stripe.com/9B63cx5BS4ncfkl6P5f7i07",
  pro: "https://buy.stripe.com/fZueVf0hy9Hw1tv5L1f7i08",
  max: "https://buy.stripe.com/8x2eVfaWcg5U5JLehxf7i06",
};

export function Pricing() {
  const [billing, setBilling] = useState<BillingMode>("annual");

  function scrollToBuilder() {
    const el = document.getElementById("custom-plan");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section
      id="planes"
      className="border-t border-white/[0.06] relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.04),transparent_70%)] pointer-events-none" />
      <div className="max-w-5xl mx-auto px-6 py-24 relative">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
            Planes simples,
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              sin sorpresas.
            </span>
          </h2>
          <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
            Empieza con 14 días de trial gratis. Crece sin migrar de plataforma.
            Cancela cuando quieras.
          </p>
        </div>

        {/* Top toggle controls all 3 cards */}
        <div className="flex justify-center mb-8">
          <BillingToggle billing={billing} onChange={setBilling} />
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {/* ── Starter card ── */}
          <PlanCard
            icon={<IconStarter />}
            name="Starter"
            tagline="Para empezar a probar"
            priceLine={
              billing === "annual" ? (
                <PriceLine amount={17} sub="facturado anualmente" />
              ) : (
                <PriceLine amount={20} sub="facturado mensualmente" />
              )
            }
            cta={{
              label: "Empezar Starter",
              href: STRIPE_LINKS.starter,
              external: true,
            }}
            ctaSubtitle="14 días gratis · Sin tarjeta para empezar"
            featuresHeading="Incluye:"
            features={[
              "100 minutos de voz al mes",
              "1 agente de voz",
              "1 número telefónico",
              "Voces básicas en español latam",
              "Calificación automática de leads",
              "Análisis con Claude 4.5",
              "Soporte por email",
            ]}
          />

          {/* ── Pro card (highlighted) ── */}
          <PlanCard
            icon={<IconPro />}
            name="Pro"
            tagline="Para negocios que ya facturan"
            priceLine={
              billing === "annual" ? (
                <PriceLine amount={85} sub="facturado anualmente" />
              ) : (
                <PriceLine amount={100} sub="facturado mensualmente" />
              )
            }
            cta={{
              label: "Cambiar a Pro",
              href: STRIPE_LINKS.pro,
              external: true,
            }}
            ctaSubtitle="Sin compromiso · Cancela cuando quieras"
            featuresHeading="Todo lo de Starter, más:"
            features={[
              "2,000 minutos de voz al mes (~33 horas)",
              "3 agentes de voz",
              "2 agentes de WhatsApp 💬",
              "2 números telefónicos",
              "Voces premium (ElevenLabs) en 10+ acentos",
              "WhatsApp + Calendar + Zapier + Make",
              "Análisis de sentimiento + transcripciones",
              "Soporte prioritario",
            ]}
            highlight
          />

          {/* ── Max card ── */}
          <PlanCard
            icon={<IconMax />}
            name="Max"
            tagline="Reemplaza a un equipo completo"
            priceLine={
              billing === "annual" ? (
                <PriceLine amount={170} sub="facturado anualmente" />
              ) : (
                <PriceLine amount={200} sub="facturado mensualmente" />
              )
            }
            cta={{
              label: "Cambiar a Max",
              href: STRIPE_LINKS.max,
              external: true,
            }}
            ctaSubtitle="Sin compromiso · Cancela cuando quieras"
            featuresHeading="Todo lo de Pro, más:"
            features={[
              "Minutos ilimitados ✨",
              "15 agentes de voz",
              "10 agentes de WhatsApp 💬",
              "5 números telefónicos",
              "Clonación de voz personalizada",
              "Todas las integraciones (HubSpot, Pipedrive, Salesforce, Zoho)",
              "Chat de equipo interno tipo WhatsApp",
              "Equipo ilimitado con roles",
              "Soporte 24/7 con SLA <1h",
            ]}
          />
        </div>

        {/* Custom builder CTA */}
        <div className="text-center mt-6">
          <button
            onClick={scrollToBuilder}
            className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            ¿Necesitas algo intermedio? Arma tu plan custom abajo →
          </button>
        </div>

        {/* Enterprise nudge below */}
        <div className="text-center mt-10">
          <p className="text-xs text-neutral-500">
            ¿Necesitas más volumen, multi-cuenta o compliance HIPAA / SOC 2?{" "}
            <a
              href="mailto:ventas@sofia.ai?subject=Plan%20Enterprise"
              className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
            >
              Hablemos de Enterprise →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PlanCard({
  icon,
  name,
  tagline,
  priceLine,
  topRight,
  cta,
  ctaSubtitle,
  featuresHeading,
  features,
  highlight,
}: {
  icon: React.ReactNode;
  name: string;
  tagline: string;
  priceLine: React.ReactNode;
  topRight?: React.ReactNode;
  cta: {
    label: string;
    href?: string;
    onClick?: () => void;
    external?: boolean;
  };
  ctaSubtitle?: string;
  featuresHeading: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-6 md:p-8 flex flex-col ${
        highlight
          ? "gradient-border bg-gradient-to-b from-amber-400/[0.05] to-transparent shadow-[0_0_60px_-15px_rgba(251,191,36,0.3)]"
          : "border border-white/[0.08] glass"
      }`}
    >
      {/* Header row: icon + optional toggle */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
          {icon}
        </div>
        {topRight}
      </div>

      {/* Name + tagline */}
      <div className="mb-5">
        <h3 className="font-heading text-3xl font-bold italic text-neutral-100">
          {name}
        </h3>
        <p className="text-sm text-neutral-400 mt-1">{tagline}</p>
      </div>

      {/* Price */}
      <div className="mb-6">{priceLine}</div>

      {/* CTA */}
      {cta.href ? (
        cta.external ? (
          <a
            href={cta.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full text-center rounded-xl py-3 text-sm font-semibold transition block ${
              highlight
                ? "bg-amber-400 text-black hover:bg-amber-300"
                : "bg-neutral-100 text-black hover:bg-white"
            }`}
          >
            {cta.label}
          </a>
        ) : (
          <Link
            href={cta.href}
            className={`w-full text-center rounded-xl py-3 text-sm font-semibold transition block ${
              highlight
                ? "bg-amber-400 text-black hover:bg-amber-300"
                : "bg-neutral-100 text-black hover:bg-white"
            }`}
          >
            {cta.label}
          </Link>
        )
      ) : (
        <button
          onClick={cta.onClick}
          className={`w-full text-center rounded-xl py-3 text-sm font-semibold transition ${
            highlight
              ? "bg-amber-400 text-black hover:bg-amber-300"
              : "bg-neutral-100 text-black hover:bg-white"
          }`}
        >
          {cta.label}
        </button>
      )}
      {ctaSubtitle && (
        <p className="text-[11px] text-neutral-500 text-center mt-2">
          {ctaSubtitle}
        </p>
      )}

      {/* Divider */}
      <div className="h-px bg-white/[0.06] my-6" />

      {/* Features */}
      <p className="text-sm text-neutral-200 mb-3">{featuresHeading}</p>
      <ul className="space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-neutral-300">
            <span className="text-amber-400 leading-5 mt-px shrink-0">✓</span>
            <span className="leading-relaxed">{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PriceLine({
  amount,
  prefix,
  sub,
}: {
  amount: number;
  prefix?: string;
  sub: string;
}) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <p className="font-heading">
        {prefix && (
          <span className="text-2xl font-bold italic text-neutral-100 mr-1">
            {prefix}
          </span>
        )}
        <span className="text-5xl font-bold italic text-neutral-100">
          ${amount}
        </span>
      </p>
      <p className="text-xs text-neutral-400 leading-snug">
        USD / mes
        <br />
        {sub}
      </p>
    </div>
  );
}

function BillingToggle({
  billing,
  onChange,
}: {
  billing: BillingMode;
  onChange: (b: BillingMode) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5 text-[11px]">
      <button
        onClick={() => onChange("monthly")}
        className={`px-3 py-1 rounded-full transition ${
          billing === "monthly"
            ? "bg-white/[0.08] text-neutral-100"
            : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        Mensual
      </button>
      <button
        onClick={() => onChange("annual")}
        className={`px-3 py-1 rounded-full transition flex items-center gap-1.5 ${
          billing === "annual"
            ? "bg-white/[0.08] text-neutral-100"
            : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        Anual
        <span className="text-[9px] text-emerald-400 font-medium">
          · Ahorra {ANNUAL_DISCOUNT_PCT}%
        </span>
      </button>
    </div>
  );
}

function IconStarter() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 text-amber-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="3" />
      <path d="M12 11v8" />
      <circle cx="12" cy="20" r="1.5" />
    </svg>
  );
}

function IconPro() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="6" r="2" />
      <path d="M12 8v6" />
      <path d="M12 14l-4 4" />
      <path d="M12 14l4 4" />
      <circle cx="8" cy="18" r="1.5" />
      <circle cx="16" cy="18" r="1.5" />
    </svg>
  );
}

function IconMax() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v3" />
      <path d="M12 10l-3 3" />
      <path d="M12 10l3 3" />
      <path d="M9 13l-3 3" />
      <path d="M9 13l3 3" />
      <path d="M15 13l-3 3" />
      <path d="M15 13l3 3" />
      <circle cx="6" cy="16" r="1.5" />
      <circle cx="12" cy="16" r="1.5" />
      <circle cx="18" cy="16" r="1.5" />
    </svg>
  );
}
