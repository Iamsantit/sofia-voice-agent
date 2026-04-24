"use client";

import { useEffect, useState } from "react";

type Health = "ok" | "degraded" | "down" | "checking";

export function HealthPulse() {
  const [status, setStatus] = useState<Health>("checking");

  async function check() {
    try {
      const res = await fetch("/api/diagnostics", { cache: "no-store" });
      if (!res.ok) return setStatus("down");
      const data = await res.json();
      if (data.failed === 0) return setStatus("ok");
      if (data.passed > 0) return setStatus("degraded");
      setStatus("down");
    } catch {
      setStatus("down");
    }
  }

  useEffect(() => {
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  const color =
    status === "ok"
      ? "bg-emerald-400"
      : status === "degraded"
        ? "bg-amber-400"
        : status === "down"
          ? "bg-red-400"
          : "bg-neutral-500";

  const label =
    status === "ok"
      ? "Todos los servicios OK"
      : status === "degraded"
        ? "Algunos servicios fallan"
        : status === "down"
          ? "Servicios caídos"
          : "Verificando…";

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex h-2.5 w-2.5">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
        />
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
      </div>
      <span className="text-[10px] text-neutral-400">{label}</span>
    </div>
  );
}
