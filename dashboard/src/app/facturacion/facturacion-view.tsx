"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PlanInfo = {
  key: "basic" | "pro" | "plus";
  name: string;
  monthly_price_usd: number;
  annual_price_usd: number;
  minutes_included: number | null;
  is_unlimited: boolean;
  max_agents: number;
  max_phone_numbers: number;
  integrations: string[];
  can_clone_voice: boolean;
  has_priority_support: boolean;
};

type Me = {
  status: string;
  email?: string;
  plan?: PlanInfo;
  usage?: {
    minutes_used: number;
    minutes_pct: number;
    period_started_at: string;
    period_days: number;
  };
  trial?: {
    is_trial: boolean;
    expired: boolean;
    days_remaining?: number;
    expires_at?: string;
    trial_days?: number;
  };
};

const PLAN_BLURBS: Record<string, string> = {
  basic: "Para probar y validar tu agente.",
  pro: "Negocios en crecimiento.",
  plus: "Operaciones a gran escala — minutos ilimitados.",
};

export function FacturacionView() {
  const [me, setMe] = useState<Me | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, plansRes] = await Promise.all([
        fetch("/api/billing/me", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/billing/plans", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (meRes.status === "ok") setMe(meRes);
      if (plansRes.status === "ok") setPlans(plansRes.plans ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changePlan(key: string) {
    if (!confirm(`¿Cambiar al plan ${key.toUpperCase()}?`)) return;
    setChanging(key);
    setError(null);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: key }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        await load();
      } else {
        setError(data.message ?? "No se pudo cambiar el plan");
      }
    } finally {
      setChanging(null);
    }
  }

  const currentPlanKey = me?.plan?.key ?? "basic";

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Current plan + usage */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Tu plan actual
        </h2>
        {loading || !me?.plan || !me.usage ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] h-48 animate-pulse" />
        ) : (
          <div
            className={`rounded-2xl border p-6 ${
              me.trial?.expired
                ? "border-red-500/40 bg-gradient-to-br from-red-500/[0.06] via-transparent to-transparent"
                : me.trial?.is_trial && (me.trial.days_remaining ?? 0) <= 3
                  ? "border-amber-500/50 bg-gradient-to-br from-amber-500/[0.08] via-transparent to-transparent"
                  : "border-amber-400/30 bg-gradient-to-br from-amber-400/[0.06] via-transparent to-transparent"
            }`}
          >
            {me.trial?.is_trial && me.trial.expired && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/[0.08] p-3 mb-4 flex items-start gap-2">
                <span className="text-lg">⛔</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-200">
                    Tu trial gratis venció
                  </p>
                  <p className="text-[11px] text-red-300/80 mt-0.5">
                    Sube de plan para seguir creando agentes y haciendo
                    llamadas. Mientras tanto el dashboard sigue accesible
                    en modo solo lectura.
                  </p>
                </div>
              </div>
            )}
            {me.trial?.is_trial && !me.trial.expired && (
              <div
                className={`rounded-lg border p-3 mb-4 flex items-start gap-2 ${
                  (me.trial.days_remaining ?? 14) <= 3
                    ? "border-amber-500/40 bg-amber-500/[0.08]"
                    : "border-emerald-500/30 bg-emerald-500/[0.05]"
                }`}
              >
                <span className="text-lg">⏱</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-100">
                    Te quedan{" "}
                    <span
                      className={
                        (me.trial.days_remaining ?? 14) <= 3
                          ? "text-amber-300 font-bold"
                          : "text-emerald-300 font-bold"
                      }
                    >
                      {me.trial.days_remaining}{" "}
                      {me.trial.days_remaining === 1 ? "día" : "días"}
                    </span>{" "}
                    de trial gratis
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Vence el{" "}
                    {me.trial.expires_at &&
                      new Date(me.trial.expires_at).toLocaleDateString(
                        "es-ES",
                        { day: "numeric", month: "long", year: "numeric" },
                      )}
                    . Sube a Pro o Plus para no perder acceso.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-heading text-3xl font-bold italic">
                    Plan {me.plan.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={
                      me.trial?.expired
                        ? "border-red-500/40 text-red-300 text-[10px]"
                        : "border-emerald-500/40 text-emerald-300 text-[10px]"
                    }
                  >
                    {me.trial?.expired
                      ? "Trial vencido"
                      : me.trial?.is_trial
                        ? "Trial"
                        : "Activo"}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-400">
                  {PLAN_BLURBS[me.plan.key]}
                </p>
              </div>
              <div className="text-right">
                {me.plan.monthly_price_usd === 0 ? (
                  <p className="font-heading text-4xl font-bold italic text-neutral-100">
                    Gratis
                  </p>
                ) : (
                  <p className="font-heading text-4xl font-bold italic text-neutral-100">
                    ${me.plan.monthly_price_usd}
                    <span className="text-sm text-neutral-500 ml-1">/mes</span>
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <UsageBlock
                label="Minutos este periodo"
                used={me.usage.minutes_used}
                total={me.plan.minutes_included}
                pct={me.usage.minutes_pct}
                unit=" min"
                unlimited={me.plan.is_unlimited}
              />
              <UsageBlock
                label="Agentes permitidos"
                used={null}
                total={me.plan.max_agents}
                pct={0}
                unit=""
                hideBar
              />
              <UsageBlock
                label="Números permitidos"
                used={null}
                total={me.plan.max_phone_numbers}
                pct={0}
                unit=""
                hideBar
              />
            </div>

            <p className="text-[11px] text-neutral-500 mt-4">
              Periodo de {me.usage.period_days} días — comenzó el{" "}
              {new Date(me.usage.period_started_at).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </section>

      {/* Plan selector */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-wider text-neutral-500">
            Cambiar de plan
          </h2>
          <p className="text-[11px] text-neutral-500">
            El cambio aplica al instante
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const active = p.key === currentPlanKey;
            const featured = p.key === "pro";
            return (
              <div
                key={p.key}
                className={`rounded-2xl border p-5 flex flex-col ${
                  active
                    ? "border-amber-400/60 bg-amber-400/[0.06]"
                    : featured
                      ? "border-amber-400/30 bg-gradient-to-b from-amber-400/[0.04] to-transparent"
                      : "border-white/[0.08] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-heading text-xl font-bold italic">
                    {p.name}
                  </p>
                  {active && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-300 text-[10px]"
                    >
                      Tu plan
                    </Badge>
                  )}
                  {!active && featured && (
                    <Badge
                      variant="outline"
                      className="border-amber-400/40 text-amber-300 text-[10px]"
                    >
                      Recomendado
                    </Badge>
                  )}
                </div>

                <div className="mb-4">
                  {p.monthly_price_usd === 0 ? (
                    <p className="font-heading text-3xl font-bold italic">
                      Gratis
                    </p>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="font-heading text-3xl font-bold italic">
                        ${p.monthly_price_usd}
                      </span>
                      <span className="text-xs text-neutral-500">/mes</span>
                    </div>
                  )}
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {PLAN_BLURBS[p.key]}
                  </p>
                </div>

                <ul className="space-y-1.5 mb-5 flex-1 text-xs text-neutral-300">
                  <Feat>
                    {p.is_unlimited
                      ? "Minutos ilimitados"
                      : `${p.minutes_included} minutos / mes`}
                  </Feat>
                  <Feat>
                    {p.max_agents} agente{p.max_agents === 1 ? "" : "s"}
                  </Feat>
                  <Feat>
                    {p.max_phone_numbers} número
                    {p.max_phone_numbers === 1 ? "" : "s"} telefónico
                    {p.max_phone_numbers === 1 ? "" : "s"}
                  </Feat>
                  <Feat>
                    {p.integrations.length} integraciones
                  </Feat>
                  {p.can_clone_voice && <Feat>Clonación de voz</Feat>}
                  {p.has_priority_support && <Feat>Soporte prioritario</Feat>}
                </ul>

                <Button
                  onClick={() => changePlan(p.key)}
                  disabled={active || changing === p.key}
                  className={`w-full ${
                    active
                      ? "bg-white/[0.04] text-neutral-400 cursor-default"
                      : "bg-amber-400 text-black hover:bg-amber-300 font-medium"
                  }`}
                >
                  {active
                    ? "Plan actual"
                    : changing === p.key
                      ? "Cambiando…"
                      : `Cambiar a ${p.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mock invoices (placeholder until Stripe is wired) */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Historial de facturas
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-neutral-400">
            Aún no hay facturas. Cuando integremos Stripe, tus pagos aparecerán
            aquí.
          </p>
        </div>
      </section>
    </div>
  );
}

function UsageBlock({
  label,
  used,
  total,
  pct,
  unit,
  unlimited,
  hideBar,
}: {
  label: string;
  used: number | null;
  total: number | null;
  pct: number;
  unit: string;
  unlimited?: boolean;
  hideBar?: boolean;
}) {
  return (
    <div className="rounded-lg bg-black/20 border border-white/[0.04] p-4">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </p>
      <p className="text-sm font-mono text-neutral-100 mb-2">
        {unlimited ? (
          <span className="text-2xl font-heading font-bold italic">∞</span>
        ) : used !== null ? (
          <>
            <span className="text-2xl font-heading font-bold italic mr-1">
              {Math.round(used)}
            </span>
            {unit}{" "}
            <span className="text-neutral-500">
              / {total}
              {unit}
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-heading font-bold italic">
              {total}
            </span>
            <span className="text-xs text-neutral-500 ml-1">disponibles</span>
          </>
        )}
      </p>
      {!hideBar && !unlimited && (
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full ${
              pct > 80
                ? "bg-red-400"
                : "bg-gradient-to-r from-amber-400 to-orange-400"
            }`}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Feat({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-amber-400 leading-5 mt-px">✓</span>
      <span>{children}</span>
    </li>
  );
}
