"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// ⬇️ Cambia aquí el nombre del producto cuando quieras ⬇️
const PRODUCT_NAME = "SofiaAI";
const PRODUCT_INITIAL = "S";
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
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/agentes", label: "Agentes", icon: "🤖" },
  { href: "/voces", label: "Voz", icon: "🎙️" },
  { href: "/numeros", label: "Números", icon: "#" },
  { href: "/llamadas", label: "Llamadas", icon: "📞" },
  { href: "/live-monitor", label: "Live monitor", icon: "🟢" },
  { href: "/leads", label: "Leads", icon: "👥" },
  { href: "/calendario", label: "Calendario", icon: "📅" },
  { href: "/campanas", label: "Campañas", icon: "📣" },
  { href: "/knowledge", label: "Knowledge", icon: "📚" },
  { href: "/integraciones", label: "Integraciones", icon: "🔌" },
  { href: "/equipo", label: "Equipo", icon: "👨‍👩‍👧" },

  // Cuenta
  { section: "Cuenta", href: "/facturacion", label: "Facturación", icon: "💳" },
  { href: "/configuracion", label: "Configuración", icon: "⚙️" },

  // Administración
  { section: "Administración", href: "/panel-admin", label: "Panel admin", icon: "🛡️" },
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
  const orgName = profile.business_name || "Mi negocio";

  // Mock plan (later: fetch from backend)
  const planMinutesUsed = 17;
  const planMinutesTotal = 5000;
  const planPct = Math.round((planMinutesUsed / planMinutesTotal) * 100);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.06] glass-strong">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.06] hover:bg-white/[0.04] transition"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-base font-bold text-black">
          {PRODUCT_INITIAL}
        </div>
        <p className="font-heading text-xl font-bold italic tracking-tight">
          {PRODUCT_NAME.replace("AI", "")}
          <span className="text-amber-400">AI</span>
        </p>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-3 overflow-y-auto">
        {nav.map((item, i) => {
          const active = pathname === item.href;
          return (
            <div key={item.href}>
              {item.section && (
                <p
                  className={cn(
                    "px-3 text-[10px] uppercase tracking-[0.18em] text-neutral-600 mb-1.5",
                    i > 0 && "mt-4"
                  )}
                >
                  {item.section}
                </p>
              )}
              <Link
                href={item.soon ? "#" : item.href}
                onClick={(e) => item.soon && e.preventDefault()}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-amber-400/10 text-amber-300"
                    : item.soon
                      ? "text-neutral-600 cursor-not-allowed"
                      : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
                )}
              >
                <span className="w-4 text-center text-[15px] leading-none">
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.soon && (
                  <span className="text-[8.5px] uppercase tracking-wider text-amber-500/70">
                    Próx
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Plan widget */}
      <div className="px-4 pt-3 pb-2 border-t border-white/[0.06]">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">
              Plan Business
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              {planPct}%
            </span>
          </div>
          <p className="text-sm font-mono text-neutral-100 mb-1.5">
            {planMinutesUsed}{" "}
            <span className="text-neutral-500">/ {planMinutesTotal} min</span>
          </p>
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-400"
              style={{ width: `${Math.max(planPct, 2)}%` }}
            />
          </div>
        </div>
      </div>

      {/* User Profile */}
      {mounted && (
        <Link
          href="/perfil"
          className={cn(
            "flex items-center gap-3 px-4 py-3 border-t border-white/[0.06] hover:bg-white/[0.04] transition group",
            pathname === "/perfil" && "bg-white/[0.04]"
          )}
        >
          {profile.avatar_data_url ? (
            <img
              src={profile.avatar_data_url}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-white/[0.1]"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-neutral-800 ring-1 ring-white/[0.1] flex items-center justify-center text-xs font-semibold text-neutral-200">
              {initialsOf(profile.owner_name)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-100 truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-neutral-500 truncate">{orgName}</p>
          </div>
          <span className="text-neutral-600 group-hover:text-neutral-300 text-[11px]">
            ↗
          </span>
        </Link>
      )}
    </aside>
  );
}
