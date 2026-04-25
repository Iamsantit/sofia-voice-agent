"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ⬇️ Cambia aquí el nombre del producto cuando quieras ⬇️
const PRODUCT_NAME = "Voicely";
const PRODUCT_INITIAL = "V"; // primera letra para el logo
const PRODUCT_TAGLINE = "AI Voice Platform";
// ⬆️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ⬆️

type NavItem = {
  href: string;
  label: string;
  icon: string;
  section?: string;
  soon?: boolean;
};

const nav: NavItem[] = [
  // Operación
  { section: "Operación", href: "/dashboard", label: "Inicio", icon: "✨" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/llamadas", label: "Llamadas", icon: "📞" },
  { href: "/llamada-prueba", label: "Llamada Prueba", icon: "🎯" },

  // Configuración
  { section: "Mi agente", href: "/voces", label: "Voces", icon: "🎙️" },
  { href: "/numeros", label: "Números", icon: "☎️" },
  { href: "/configuracion", label: "Personalidad", icon: "💬" },

  // Avanzado
  { section: "Avanzado", href: "/equipo", label: "Equipo", icon: "👨‍👩‍👧" },
  { href: "/plantillas", label: "Plantillas", icon: "📚" },
  { href: "/integraciones", label: "Integraciones", icon: "🔌" },
  { href: "/logs", label: "Logs", icon: "📝" },
  { href: "/diagnostics", label: "Diagnóstico", icon: "🩺" },
];

type Profile = {
  owner_name?: string;
  owner_email?: string;
  business_name?: string;
  avatar_data_url?: string;
};

function initialsOf(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("sofia_session");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}

    // Sincronizar entre pestañas / actualizaciones del perfil
    function onStorage(e: StorageEvent) {
      if (e.key === "sofia_session") {
        try {
          setProfile(e.newValue ? JSON.parse(e.newValue) : {});
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const displayName = profile.owner_name || "Mi cuenta";
  const displayEmail = profile.owner_email || "Sin sesión";

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.06] bg-neutral-950">
      {/* Logo */}
      <Link href="/dashboard" className="flex h-20 items-center gap-3 px-6 border-b border-white/[0.06] hover:bg-white/[0.02] transition">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-amber-400 to-cyan-400 text-lg font-bold text-black shadow-lg shadow-fuchsia-500/20">
          {PRODUCT_INITIAL}
        </div>
        <div>
          <p className="font-heading text-lg font-semibold italic tracking-tight bg-gradient-to-r from-fuchsia-300 via-amber-300 to-cyan-300 bg-clip-text text-transparent">
            {PRODUCT_NAME}
          </p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
            {PRODUCT_TAGLINE}
          </p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {nav.map((item, i) => {
          const active = pathname === item.href;
          const showSection = !!item.section;
          return (
            <div key={item.href}>
              {showSection && (
                <p className={cn(
                  "px-3 text-[10px] uppercase tracking-[0.2em] text-neutral-600 mb-1.5",
                  i > 0 && "mt-4"
                )}>
                  {item.section}
                </p>
              )}
              <Link
                href={item.soon ? "#" : item.href}
                onClick={(e) => item.soon && e.preventDefault()}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-white/[0.08] text-white"
                    : item.soon
                      ? "text-neutral-600 cursor-not-allowed"
                      : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.soon && (
                  <span className="text-[9px] uppercase tracking-wider text-amber-500/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Próx
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User Profile (footer) */}
      {mounted && (
        <Link
          href="/perfil"
          className={cn(
            "flex items-center gap-3 px-4 py-3 border-t border-white/[0.06] hover:bg-white/[0.04] transition group",
            pathname === "/perfil" && "bg-white/[0.04]"
          )}
        >
          {/* Avatar */}
          {profile.avatar_data_url ? (
            <img
              src={profile.avatar_data_url}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-white/[0.1]"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-fuchsia-500/40 to-amber-500/40 ring-1 ring-white/[0.1] flex items-center justify-center text-xs font-semibold text-white">
              {initialsOf(profile.owner_name)}
            </div>
          )}

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-100 truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-neutral-500 truncate">
              {displayEmail}
            </p>
          </div>

          {/* Chevron */}
          <span className="text-neutral-600 group-hover:text-neutral-300 transition">
            ⚙
          </span>
        </Link>
      )}
    </aside>
  );
}
