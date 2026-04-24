"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Inicio", icon: "✨" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/llamadas", label: "Llamadas", icon: "📞" },
  { href: "/numeros", label: "Números", icon: "☎️" },
  { href: "/llamada-prueba", label: "Llamada Prueba", icon: "🎯" },
  { href: "/logs", label: "Logs", icon: "📝" },
  { href: "/diagnostics", label: "Diagnóstico", icon: "🩺" },
  { href: "/configuracion", label: "Configuración", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.06] bg-neutral-950">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6 border-b border-white/[0.06]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-amber-400 to-cyan-400 text-lg font-bold text-black shadow-lg shadow-fuchsia-500/20">
          S
        </div>
        <div>
          <p className="font-heading text-lg font-semibold italic tracking-tight bg-gradient-to-r from-fuchsia-300 via-amber-300 to-cyan-300 bg-clip-text text-transparent">
            Sofía
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            Command Center
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-6 py-4">
        <p className="text-[11px] text-neutral-600">
          Inmobiliaria Horizontes
        </p>
        <p className="text-[10px] text-neutral-700 mt-0.5">
          Powered by Horizontes IA
        </p>
      </div>
    </aside>
  );
}
