"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Me = {
  status?: string;
  plan?: {
    name?: string;
    is_unlimited?: boolean;
    minutes_included?: number | null;
  };
  usage?: {
    minutes_used?: number;
    minutes_pct?: number;
    period_started_at?: string;
    period_days?: number;
  };
  trial?: {
    is_trial?: boolean;
    expired?: boolean;
  };
};

const DISMISS_KEY = "sofia_minutes_banner_dismissed";
const WARN_PCT = 80;       // show warning at ≥80%
const BLOCK_PCT = 100;     // show blocking banner at 100%

/**
 * Top-of-dashboard banner for monthly-minute exhaustion. Hidden if:
 *  - plan is unlimited
 *  - trial is expired (TrialBanner already covers that case)
 *  - user is below WARN_PCT
 *  - user dismissed the warning this session (warning only — exhaustion
 *    cannot be dismissed)
 *
 * Pulls a fresh snapshot from /api/billing/me on mount + every 60s
 * so it catches the moment they cross the threshold without a refresh.
 */
export function MinutesBanner() {
  const [me, setMe] = useState<Me | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {}

    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/billing/me", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setMe(data);
      } catch {}
    }
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!me?.plan || !me.usage) return null;
  if (me.plan.is_unlimited) return null;
  if (me.trial?.expired) return null; // TrialBanner handles it
  const pct = me.usage.minutes_pct ?? 0;
  if (pct < WARN_PCT) return null;
  const blocked = pct >= BLOCK_PCT;
  if (!blocked && dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  // Compute days remaining in the current period so we can tell the
  // user when their minutes refresh.
  let daysToRenew: number | null = null;
  if (me.usage.period_started_at && me.usage.period_days) {
    const started = new Date(me.usage.period_started_at).getTime();
    const expires = started + me.usage.period_days * 86400 * 1000;
    daysToRenew = Math.max(0, Math.ceil((expires - Date.now()) / 86400000));
  }

  if (blocked) {
    return (
      <div className="mb-6 rounded-xl border border-red-500/40 bg-gradient-to-r from-red-500/[0.08] via-red-500/[0.04] to-transparent p-4 flex items-center gap-3 flex-wrap">
        <span className="text-2xl shrink-0">📞</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-100">
            Te quedaste sin minutos del plan {me.plan.name}
          </p>
          <p className="text-[11px] text-red-300/80 mt-0.5">
            Usaste los {me.plan.minutes_included} minutos incluidos este
            mes.{" "}
            {daysToRenew && daysToRenew > 0
              ? `Se renuevan en ${daysToRenew} ${daysToRenew === 1 ? "día" : "días"}`
              : "Se renuevan al inicio del próximo periodo"}
            . Para seguir llamando ya, sube de plan.
          </p>
        </div>
        <Link
          href="/facturacion"
          className="rounded-lg bg-red-500 hover:bg-red-400 text-white px-4 py-2 text-sm font-medium transition shrink-0"
        >
          Subir de plan →
        </Link>
      </div>
    );
  }

  // Warning state (80–99%)
  return (
    <div className="mb-6 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent p-4 flex items-center gap-3 flex-wrap">
      <span className="text-2xl shrink-0">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-100">
          Te queda{" "}
          <span className="font-bold text-amber-300">{100 - pct}%</span> de
          minutos este mes
        </p>
        <p className="text-[11px] text-amber-300/80 mt-0.5">
          Usaste {Math.round(me.usage.minutes_used ?? 0)} de{" "}
          {me.plan.minutes_included} min. Sube de plan antes de quedarte
          sin minutos.
        </p>
      </div>
      <Link
        href="/facturacion"
        className="rounded-lg bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 text-sm font-medium transition shrink-0"
      >
        Ver planes →
      </Link>
      <button
        onClick={dismiss}
        className="text-amber-300/60 hover:text-amber-300 text-xs px-2 shrink-0"
        title="Ocultar hasta la próxima sesión"
      >
        ✕
      </button>
    </div>
  );
}
