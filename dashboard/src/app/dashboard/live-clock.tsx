"use client";

import { useEffect, useState } from "react";

export function LiveClock() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return null;

  const time = now.toLocaleTimeString("es-MX", { hour12: false });
  const date = now.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <p className="font-heading text-2xl md:text-3xl italic font-bold bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">
        {time}
      </p>
      <p className="text-[11px] text-neutral-500 capitalize">{date}</p>
    </div>
  );
}
