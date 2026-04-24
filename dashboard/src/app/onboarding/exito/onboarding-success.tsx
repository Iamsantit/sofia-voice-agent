"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Session = {
  business_name?: string;
  industry?: string;
  owner_name?: string;
  owner_email?: string;
  agent_id?: string;
  llm_id?: string;
  agent_name?: string;
};

export function OnboardingSuccess() {
  const searchParams = useSearchParams();
  const agentIdFromUrl = searchParams.get("agent_id");
  const [session, setSession] = useState<Session>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sofia_session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  const agentId = agentIdFromUrl ?? session.agent_id ?? "";

  return (
    <div className="text-center space-y-8">
      {/* Success icon */}
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-500/10 border border-emerald-500/30">
        <span className="text-4xl">🎉</span>
      </div>

      <div className="space-y-3">
        <h1 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
          ¡{session.agent_name ?? "Tu agente"} está listo!
        </h1>
        <p className="text-neutral-400 max-w-xl mx-auto">
          {session.business_name ? (
            <>
              Configuré {session.agent_name ?? "tu agente"} para{" "}
              <span className="text-neutral-200">{session.business_name}</span>.
              Ya puedes probarlo o conectar un número de teléfono.
            </>
          ) : (
            <>Tu agente fue creado. Ya puedes probarlo desde el dashboard.</>
          )}
        </p>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 text-left max-w-md mx-auto">
        <p className="text-xs uppercase tracking-wider text-neutral-500 mb-4">
          Detalles
        </p>
        <div className="space-y-2 text-sm">
          {session.business_name && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Negocio</span>
              <span className="text-neutral-200">{session.business_name}</span>
            </div>
          )}
          {session.agent_name && (
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Agente</span>
              <span className="text-neutral-200">{session.agent_name}</span>
            </div>
          )}
          {agentId && (
            <div className="flex justify-between gap-2 pt-2 border-t border-white/[0.06] mt-3">
              <span className="text-neutral-500">ID</span>
              <code className="text-[10px] text-amber-400 truncate max-w-[200px]">
                {agentId}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Next steps */}
      <div className="space-y-4 max-w-xl mx-auto text-left">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          Próximos pasos
        </p>
        <div className="space-y-2">
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3">
            <span className="text-lg mt-0.5">1️⃣</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-200">Prueba tu agente</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Dispara una llamada de prueba desde el dashboard y oye a tu agente en acción.
              </p>
            </div>
            <Link href="/llamada-prueba">
              <Badge
                variant="outline"
                className="border-amber-500/30 text-amber-300 cursor-pointer hover:bg-amber-500/10"
              >
                Probar →
              </Badge>
            </Link>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3">
            <span className="text-lg mt-0.5">2️⃣</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-200">
                Personaliza el prompt
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Ajusta exactamente qué dice tu agente en Configuración.
              </p>
            </div>
            <Link href="/configuracion">
              <Badge
                variant="outline"
                className="border-neutral-600 text-neutral-400 cursor-pointer hover:bg-white/[0.04]"
              >
                Ir →
              </Badge>
            </Link>
          </div>
          <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 flex items-start gap-3">
            <span className="text-lg mt-0.5">3️⃣</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-200">
                Revisa el diagnóstico del sistema
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Confirma que todos los servicios externos están OK.
              </p>
            </div>
            <Link href="/diagnostics">
              <Badge
                variant="outline"
                className="border-neutral-600 text-neutral-400 cursor-pointer hover:bg-white/[0.04]"
              >
                Ver →
              </Badge>
            </Link>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <Link href="/dashboard">
          <Button className="bg-amber-400 text-black hover:bg-amber-300 font-medium px-8">
            Ir al dashboard →
          </Button>
        </Link>
      </div>
    </div>
  );
}
