"use client";

import { useEffect, useState } from "react";

/** Counts from 0 up to `value` over ~800ms when it first mounts. */
export function AnimatedNumber({ value, fallback }: { value: number; fallback?: string }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (typeof value !== "number" || isNaN(value)) return;
    const duration = 800;
    const steps = 30;
    const increment = value / steps;
    const intervalMs = duration / steps;
    let step = 0;
    const id = setInterval(() => {
      step++;
      const next = Math.round(increment * step);
      if (step >= steps) {
        setCurrent(value);
        clearInterval(id);
      } else {
        setCurrent(next);
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [value]);

  if (typeof value !== "number" || isNaN(value)) return <>{fallback ?? "—"}</>;
  return <>{current.toLocaleString("es-MX")}</>;
}
