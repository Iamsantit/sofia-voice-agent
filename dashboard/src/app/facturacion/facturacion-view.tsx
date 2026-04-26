"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Stats = {
  totalCalls: number;
  contestadas: number;
  avgDuration: number;
};

const PLAN = {
  name: "Business",
  monthly: 149,
  minutesIncluded: 5000,
  agentsIncluded: 10,
  numbersIncluded: 10,
  renewsAt: "2026-05-26",
};

export function FacturacionView() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setStats(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const minutesUsed = stats
    ? Math.round((stats.contestadas * stats.avgDuration) / 60)
    : 0;
  const minutesPct = Math.min(
    100,
    Math.round((minutesUsed / PLAN.minutesIncluded) * 100),
  );

  // Mock invoices (real Stripe integration would replace this)
  const invoices = [
    { id: "INV-2026-04", date: "2026-04-26", amount: PLAN.monthly, status: "paid" },
    { id: "INV-2026-03", date: "2026-03-26", amount: PLAN.monthly, status: "paid" },
    { id: "INV-2026-02", date: "2026-02-26", amount: PLAN.monthly, status: "paid" },
  ];

  return (
    <div className="space-y-8">
      {/* Plan actual */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Tu plan
        </h2>
        <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/[0.06] via-transparent to-transparent p-6">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-heading text-3xl font-bold italic">
                  Plan {PLAN.name}
                </h3>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-300 text-[10px]"
                >
                  Activo
                </Badge>
              </div>
              <p className="text-sm text-neutral-400">
                Renueva el{" "}
                {new Date(PLAN.renewsAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="font-heading text-4xl font-bold italic text-neutral-100">
                ${PLAN.monthly}
                <span className="text-sm text-neutral-500 ml-1">/mes</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <UsageBlock
              label="Minutos este mes"
              used={minutesUsed}
              total={PLAN.minutesIncluded}
              pct={minutesPct}
              suffix=" min"
            />
            <UsageBlock
              label="Agentes activos"
              used={1}
              total={PLAN.agentsIncluded}
              pct={Math.round((1 / PLAN.agentsIncluded) * 100)}
            />
            <UsageBlock
              label="Números conectados"
              used={1}
              total={PLAN.numbersIncluded}
              pct={Math.round((1 / PLAN.numbersIncluded) * 100)}
            />
          </div>

          <div className="flex gap-3 flex-wrap pt-4 border-t border-white/[0.06]">
            <Link
              href="/#planes"
              className="rounded-md bg-amber-400 text-black hover:bg-amber-300 px-4 py-2 text-sm font-medium transition"
            >
              Cambiar plan
            </Link>
            <button
              onClick={() =>
                alert(
                  "Próximamente: descarga tu CSV de consumo detallado por agente.",
                )
              }
              className="rounded-md border border-white/[0.1] text-neutral-300 hover:bg-white/[0.04] px-4 py-2 text-sm transition"
            >
              Descargar consumo
            </button>
            <button
              onClick={() => {
                if (
                  confirm(
                    "¿Cancelar suscripción? Mantendrás acceso hasta el final del periodo.",
                  )
                )
                  alert(
                    "Solicitud de cancelación enviada. El equipo de soporte te confirmará en 24h.",
                  );
              }}
              className="rounded-md border border-red-500/20 text-red-300 hover:bg-red-500/10 px-4 py-2 text-sm transition ml-auto"
            >
              Cancelar suscripción
            </button>
          </div>
        </div>
      </section>

      {/* Método de pago */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Método de pago
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex items-center gap-4 flex-wrap">
          <div className="h-12 w-16 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-bold text-white">
            VISA
          </div>
          <div className="flex-1">
            <p className="text-sm font-mono text-neutral-100">
              •••• •••• •••• 4242
            </p>
            <p className="text-[11px] text-neutral-500">Vence 12/2027</p>
          </div>
          <Button
            variant="outline"
            className="border-white/[0.1] text-neutral-300"
            onClick={() =>
              alert(
                "Próximamente: integración con Stripe para gestionar métodos de pago directamente.",
              )
            }
          >
            Cambiar
          </Button>
        </div>
      </section>

      {/* Facturas */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
          Historial de facturas
        </h2>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] border-b border-white/[0.06]">
              <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-5">Factura</th>
                <th className="py-3 px-5">Fecha</th>
                <th className="py-3 px-5">Monto</th>
                <th className="py-3 px-5">Estado</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-5 font-mono text-xs text-neutral-200">
                    {inv.id}
                  </td>
                  <td className="py-3 px-5 text-neutral-400">
                    {new Date(inv.date).toLocaleDateString("es-ES")}
                  </td>
                  <td className="py-3 px-5 text-neutral-100">
                    ${inv.amount}.00
                  </td>
                  <td className="py-3 px-5">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-300 text-[10px]"
                    >
                      ✓ Pagada
                    </Badge>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() =>
                        alert(`Descargando ${inv.id}.pdf… (mock)`)
                      }
                      className="text-[11px] text-amber-400 hover:text-amber-300"
                    >
                      ↓ PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  suffix = "",
}: {
  label: string;
  used: number;
  total: number;
  pct: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg bg-black/20 border border-white/[0.04] p-4">
      <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </p>
      <p className="text-sm font-mono text-neutral-100 mb-2">
        <span className="text-2xl font-heading font-bold italic mr-1">
          {used}
        </span>
        {suffix} <span className="text-neutral-500">/ {total}{suffix}</span>
      </p>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full ${pct > 80 ? "bg-red-400" : "bg-gradient-to-r from-amber-400 to-orange-400"}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}
