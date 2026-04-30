"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AgentesView } from "./agentes-view";
import { WhatsappAgentsView } from "./whatsapp-agents-view";

type Tab = "voz" | "whatsapp";

export function AgentesTabs() {
  const [tab, setTab] = useState<Tab>("voz");
  const [planLimits, setPlanLimits] = useState<{
    max_agents: number;
    max_whatsapp_agents: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/billing/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "ok" && d.plan) {
          setPlanLimits({
            max_agents: d.plan.max_agents,
            max_whatsapp_agents: d.plan.max_whatsapp_agents ?? 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-white/[0.08] -mx-2 px-2">
        <TabButton
          active={tab === "voz"}
          onClick={() => setTab("voz")}
          label="Voz"
          icon="🎙️"
          counter={planLimits?.max_agents}
        />
        <TabButton
          active={tab === "whatsapp"}
          onClick={() => setTab("whatsapp")}
          label="WhatsApp"
          icon="💬"
          counter={planLimits?.max_whatsapp_agents}
          highlight={tab !== "whatsapp"}
        />

        <div className="ml-auto pb-2">
          <Link
            href="/facturacion"
            className="text-[11px] text-neutral-500 hover:text-amber-400 transition"
          >
            Necesitas más slots? Subir de plan →
          </Link>
        </div>
      </div>

      {tab === "voz" && <AgentesView />}
      {tab === "whatsapp" && <WhatsappAgentsView />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
  counter,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  counter?: number;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition flex items-center gap-2 ${
        active
          ? "text-amber-300"
          : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {counter !== undefined && (
        <span
          className={`text-[10px] rounded-full px-1.5 py-0.5 ${
            active
              ? "bg-amber-400/20 text-amber-300"
              : "bg-white/[0.06] text-neutral-500"
          }`}
        >
          hasta {counter}
        </span>
      )}
      {highlight && (
        <span className="absolute -top-0.5 right-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
      )}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
      )}
    </button>
  );
}
