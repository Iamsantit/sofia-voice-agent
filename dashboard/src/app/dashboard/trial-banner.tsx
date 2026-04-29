"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Trial = {
  is_trial: boolean;
  expired: boolean;
  days_remaining?: number;
  expires_at?: string;
};

const DISMISS_KEY = "sofia_trial_banner_dismissed";

/**
 * Top-of-dashboard banner that warns the user when their trial is
 * about to expire (≤3 days) or already expired. Hidden if:
 *  - user is on a paid plan (no trial)
 *  - trial has more than 3 days left
 *  - user has dismissed the banner this session (sessionStorage)
 *
 * The banner survives navigation but resets each browser tab,
 * so a logged-in user sees it again every fresh session until they
 * actually upgrade.
 */
export function TrialBanner() {
  const [trial, setTrial] = useState<Trial | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {}
    fetch("/api/billing/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "ok" && d.trial) setTrial(d.trial);
      })
      .catch(() => {});
  }, []);

  if (!trial?.is_trial) return null;
  if (!trial.expired && (trial.days_remaining ?? 14) > 3) return null;
  if (dismissed && !trial.expired) return null;
  // Expired trial cannot be dismissed — too important

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  if (trial.expired) {
    return (
      <div className="mb-6 rounded-xl border border-red-500/40 bg-gradient-to-r from-red-500/[0.08] via-red-500/[0.04] to-transparent p-4 flex items-center gap-3 flex-wrap">
        <span className="text-2xl shrink-0">⛔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-100">
            Tu trial gratis venció
          </p>
          <p className="text-[11px] text-red-300/80 mt-0.5">
            No puedes crear más agentes ni hacer llamadas hasta que subas a
            Pro o Plus. Tu data sigue intacta.
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

  // ≤3 days warning
  const days = trial.days_remaining ?? 0;
  return (
    <div className="mb-6 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.04] to-transparent p-4 flex items-center gap-3 flex-wrap">
      <span className="text-2xl shrink-0">⏱</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-100">
          Te queda{days === 1 ? "" : "n"}{" "}
          <span className="font-bold text-amber-300">
            {days} {days === 1 ? "día" : "días"}
          </span>{" "}
          de trial gratis
        </p>
        <p className="text-[11px] text-amber-300/80 mt-0.5">
          Sube ahora a Pro o Plus para no perder acceso cuando termine.
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
