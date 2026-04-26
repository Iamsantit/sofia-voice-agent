"use client";

import { useEffect, useRef, useState } from "react";

type Stat = {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  decimals?: number;
};

const STATS: Stat[] = [
  { value: 24, suffix: "/7", label: "Disponible siempre, sin guardias" },
  { value: 1.2, suffix: "s", label: "Latencia promedio de respuesta", decimals: 1 },
  { value: 87, suffix: "%", label: "Conversión a lead calificado" },
  { value: 3, suffix: "min", label: "Setup completo del agente" },
];

export function Stats() {
  return (
    <section className="border-t border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <Counter key={s.label} stat={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Counter({ stat }: { stat: Stat }) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!ref.current || started) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            setStarted(true);
          }
        });
      },
      { threshold: 0.4 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const duration = 1400;
    const steps = 30;
    const stepMs = duration / steps;
    let current = 0;
    const id = setInterval(() => {
      current += 1;
      const t = current / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(stat.value * eased);
      if (current >= steps) {
        setShown(stat.value);
        clearInterval(id);
      }
    }, stepMs);
    return () => clearInterval(id);
  }, [started, stat.value]);

  const display = stat.decimals
    ? shown.toFixed(stat.decimals)
    : Math.round(shown).toString();

  return (
    <div ref={ref} className="text-center">
      <p className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight bg-gradient-to-br from-amber-300 to-orange-400 bg-clip-text text-transparent">
        {stat.prefix}
        {display}
        {stat.suffix}
      </p>
      <p className="mt-2 text-xs md:text-sm text-neutral-400">{stat.label}</p>
    </div>
  );
}
