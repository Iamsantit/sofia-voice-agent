"use client";

import Link from "next/link";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 h-16 border-b border-white/[0.06] bg-neutral-950/85 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto max-w-6xl px-8 h-full flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">
            🔍
          </span>
          <input
            type="search"
            placeholder="Buscar leads, llamadas..."
            className="w-full max-w-md rounded-full bg-white/[0.04] border border-white/[0.08] pl-9 pr-4 py-2 text-sm outline-none focus:border-amber-400/30 focus:bg-white/[0.06] transition"
          />
        </div>

        {/* Llamada de prueba */}
        <Link
          href="/llamada-prueba"
          className="flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/30 px-4 py-1.5 text-sm font-medium text-amber-300 hover:bg-amber-400/20 transition"
        >
          <span className="text-base leading-none">📞</span>
          <span>Llamada de prueba</span>
        </Link>

        {/* Notifications */}
        <button
          aria-label="Notificaciones"
          className="relative h-9 w-9 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] transition"
        >
          <span className="text-base">🔔</span>
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>

        {/* Help */}
        <Link
          href="/diagnostics"
          aria-label="Diagnóstico"
          className="h-9 w-9 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.06] transition"
        >
          <span className="text-sm text-neutral-400">?</span>
        </Link>
      </div>
    </header>
  );
}
