"use client";

import { useState } from "react";
import { CatalogTab } from "./catalog-tab";
import { CloneTab } from "./clone-tab";

type Tab = "catalogo" | "mi-voz";

export function VocesView() {
  const [tab, setTab] = useState<Tab>("catalogo");

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        <TabButton
          active={tab === "catalogo"}
          onClick={() => setTab("catalogo")}
          icon="🎧"
          label="Catálogo"
          desc="Voces predefinidas"
        />
        <TabButton
          active={tab === "mi-voz"}
          onClick={() => setTab("mi-voz")}
          icon="🎙️"
          label="Mi voz"
          desc="Clona tu voz"
        />
      </div>

      {tab === "catalogo" && <CatalogTab />}
      {tab === "mi-voz" && <CloneTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-3 text-sm transition relative ${
        active
          ? "text-white"
          : "text-neutral-500 hover:text-neutral-300"
      }`}
    >
      <span className="text-base">{icon}</span>
      <div className="text-left">
        <div className="font-medium">{label}</div>
        <div className="text-[10px] text-neutral-500">{desc}</div>
      </div>
      {active && (
        <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-gradient-to-r from-fuchsia-400 via-amber-400 to-cyan-400" />
      )}
    </button>
  );
}
