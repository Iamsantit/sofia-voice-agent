"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Session = {
  business_name?: string;
  industry?: string;
  owner_name?: string;
  agent_name?: string;
};

type QuickAction = {
  icon: string;
  label: string;
  desc: string;
  href?: string;
  soon?: boolean;
};

const INDUSTRY_MAP: Record<
  string,
  { label: string; icon: string; actions: QuickAction[] }
> = {
  inmobiliaria: {
    label: "Inmobiliaria",
    icon: "🏠",
    actions: [
      { icon: "🏘️", label: "Propiedades", desc: "Cargar inventario al CRM", href: "/leads", soon: true },
      { icon: "👥", label: "Leads", desc: "Prospectos calificados por Sofía", href: "/leads" },
      { icon: "📅", label: "Visitas agendadas", desc: "Citas con clientes", href: "/llamadas" },
      { icon: "🎯", label: "Llamar prospectos", desc: "Disparar outbound con IA", href: "/llamada-prueba" },
    ],
  },
  dental: {
    label: "Clínica Dental",
    icon: "🦷",
    actions: [
      { icon: "📅", label: "Citas de hoy", desc: "Agenda del día", href: "/llamadas" },
      { icon: "👥", label: "Pacientes", desc: "Base de datos", href: "/leads" },
      { icon: "💉", label: "Tratamientos", desc: "Catálogo de servicios", soon: true },
      { icon: "🚨", label: "Urgencias", desc: "Citas prioritarias del día", soon: true },
    ],
  },
  gimnasio: {
    label: "Gimnasio / Fitness",
    icon: "💪",
    actions: [
      { icon: "🎟️", label: "Pruebas gratis", desc: "Leads convertibles", href: "/leads" },
      { icon: "📊", label: "Conversión", desc: "Prueba → membresía", href: "/dashboard" },
      { icon: "📋", label: "Planes vendidos", desc: "Membresías activas", soon: true },
      { icon: "🎯", label: "Llamar leads", desc: "Seguimiento con Sofía", href: "/llamada-prueba" },
    ],
  },
  restaurante: {
    label: "Restaurante",
    icon: "🍽️",
    actions: [
      { icon: "📅", label: "Reservas hoy", desc: "Mesas confirmadas", href: "/llamadas" },
      { icon: "🎉", label: "Eventos especiales", desc: "Cumpleaños, aniversarios", soon: true },
      { icon: "📋", label: "Menú", desc: "Especialidades del día", soon: true },
      { icon: "👥", label: "Clientes frecuentes", desc: "Base de datos", href: "/leads" },
    ],
  },
  clinica: {
    label: "Clínica Médica",
    icon: "🏥",
    actions: [
      { icon: "📅", label: "Agenda médica", desc: "Citas por especialidad", href: "/llamadas" },
      { icon: "👨‍⚕️", label: "Especialidades", desc: "Doctores y áreas", soon: true },
      { icon: "👥", label: "Pacientes", desc: "Registros activos", href: "/leads" },
      { icon: "🚨", label: "Urgencias", desc: "Canalizar derivaciones", soon: true },
    ],
  },
  abogados: {
    label: "Bufete de Abogados",
    icon: "⚖️",
    actions: [
      { icon: "📋", label: "Consultas pendientes", desc: "Casos por asignar", href: "/leads" },
      { icon: "⚖️", label: "Áreas de práctica", desc: "Civil, penal, familiar…", soon: true },
      { icon: "📅", label: "Asesorías agendadas", desc: "Citas iniciales", href: "/llamadas" },
      { icon: "📁", label: "Casos activos", desc: "En seguimiento", soon: true },
    ],
  },
  "salon-belleza": {
    label: "Salón de Belleza",
    icon: "💇",
    actions: [
      { icon: "📅", label: "Citas de hoy", desc: "Agenda del día", href: "/llamadas" },
      { icon: "✂️", label: "Servicios", desc: "Corte, color, uñas…", soon: true },
      { icon: "👩‍🎨", label: "Estilistas", desc: "Disponibilidad", soon: true },
      { icon: "👥", label: "Clientas frecuentes", desc: "Base de datos", href: "/leads" },
    ],
  },
  veterinaria: {
    label: "Veterinaria",
    icon: "🐾",
    actions: [
      { icon: "📅", label: "Citas de hoy", desc: "Consultas agendadas", href: "/llamadas" },
      { icon: "🐕", label: "Mascotas activas", desc: "Pacientes registrados", href: "/leads" },
      { icon: "💉", label: "Recordatorios de vacunas", desc: "Seguimiento preventivo", soon: true },
      { icon: "🚨", label: "Urgencias", desc: "Casos prioritarios", soon: true },
    ],
  },
  custom: {
    label: "Tu negocio",
    icon: "✨",
    actions: [
      { icon: "👥", label: "Leads", desc: "Contactos generados", href: "/leads" },
      { icon: "📞", label: "Llamadas", desc: "Historial completo", href: "/llamadas" },
      { icon: "🎯", label: "Disparar llamada", desc: "Probar tu agente", href: "/llamada-prueba" },
      { icon: "⚙️", label: "Personalizar", desc: "Editar prompt", href: "/configuracion" },
    ],
  },
};

export function IndustryWelcome() {
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem("sofia_session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  if (!mounted) return null;

  const industry = session?.industry ?? "";
  const config = INDUSTRY_MAP[industry];

  if (!config || !session) return null;

  return (
    <div className="mb-8 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-amber-500/[0.04] via-transparent to-transparent p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{config.icon}</span>
            <span className="text-xs uppercase tracking-wider text-amber-300/80">
              {config.label}
            </span>
          </div>
          <h2 className="font-heading text-2xl md:text-3xl italic font-bold text-neutral-100">
            {session.owner_name
              ? `Bienvenido, ${session.owner_name.split(" ")[0]}`
              : `Bienvenido`}
          </h2>
          {session.business_name && (
            <p className="text-sm text-neutral-400 mt-1">
              Panel de <span className="text-neutral-200">{session.business_name}</span>
              {session.agent_name && (
                <>
                  {" "}— tu agente{" "}
                  <span className="text-amber-400">{session.agent_name}</span> está listo
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {config.actions.map((action) => {
          const content = (
            <div className="h-full rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.05] hover:border-white/[0.12] transition cursor-pointer group">
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{action.icon}</span>
                {action.soon && (
                  <span className="text-[9px] uppercase tracking-wider text-amber-400/70 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    próx.
                  </span>
                )}
              </div>
              <p className="font-medium text-sm text-neutral-100 group-hover:text-amber-300 transition">
                {action.label}
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">{action.desc}</p>
            </div>
          );

          if (action.href && !action.soon) {
            return (
              <Link key={action.label} href={action.href}>
                {content}
              </Link>
            );
          }
          return <div key={action.label}>{content}</div>;
        })}
      </div>
    </div>
  );
}
