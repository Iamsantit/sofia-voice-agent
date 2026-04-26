"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WhatsAppPanel } from "./whatsapp-panel";
import { WebhookFlow } from "./webhook-flow";

type Integration = {
  key: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  status: "available" | "soon";
  setup_kind: "webhook" | "oauth" | "native";
  setup_url?: string;
  setup_steps?: string[];
  default_events?: string[];
};

export function IntegracionesView() {
  const [catalog, setCatalog] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [selected, setSelected] = useState<Integration | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") setCatalog(data.catalog ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleClick(i: Integration) {
    if (i.status === "soon") return;
    if (i.setup_kind === "native" || i.key === "whatsapp") {
      setShowWhatsApp(true);
      setShowWebhook(false);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
      return;
    }
    setSelected(i);
    setShowWebhook(true);
    setShowWhatsApp(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  }

  // Card destacada de Webhook saliente (siempre disponible, custom)
  const featured: Integration = {
    key: "custom-webhook",
    name: "Webhook saliente",
    icon: "🔗",
    category: "Custom",
    description: "Envía eventos de Sofia (llamadas, leads) a tu sistema vía HTTP POST.",
    status: "available",
    setup_kind: "webhook",
  };

  // Filtrar: separar la integración custom para no duplicar arriba
  const grid = catalog.filter((c) => c.key !== "custom-webhook");

  return (
    <div className="space-y-8">
      {/* Active panels */}
      {showWhatsApp && <WhatsAppPanel onClose={() => setShowWhatsApp(false)} />}
      {showWebhook && selected && (
        <WebhookFlow
          integration={selected}
          onClose={() => {
            setShowWebhook(false);
            setSelected(null);
          }}
          onSaved={() => {
            setShowWebhook(false);
            setSelected(null);
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-neutral-500 text-center py-12">Cargando…</p>
      ) : (
        <>
          {/* Featured: Webhook saliente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FeaturedCard
              integration={featured}
              onClick={() => {
                setSelected(featured);
                setShowWebhook(true);
                setShowWhatsApp(false);
                setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
              }}
            />
            {grid.slice(0, 2).map((i) => (
              <CatalogCard key={i.key} integration={i} onClick={() => handleClick(i)} />
            ))}
          </div>

          {/* Rest of the grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {grid.slice(2).map((i) => (
              <CatalogCard key={i.key} integration={i} onClick={() => handleClick(i)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FeaturedCard({
  integration,
  onClick,
}: {
  integration: Integration;
  onClick: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-lg">
          {integration.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-lg font-bold text-neutral-100">
            {integration.name}
          </h3>
          <p className="text-[11px] text-emerald-400 mt-0.5">Disponible</p>
        </div>
      </div>
      <p className="text-sm text-neutral-400 leading-relaxed mb-5 flex-1">
        {integration.description}
      </p>
      <Button
        onClick={onClick}
        className="w-full bg-amber-400 text-black hover:bg-amber-300 font-semibold"
      >
        Conectar
      </Button>
    </div>
  );
}

function CatalogCard({
  integration,
  onClick,
}: {
  integration: Integration;
  onClick: () => void;
}) {
  const isSoon = integration.status === "soon";
  return (
    <div
      onClick={isSoon ? undefined : onClick}
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 flex flex-col ${
        isSoon ? "opacity-70" : "hover:bg-white/[0.04] cursor-pointer transition"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-lg">
          {integration.icon}
        </div>
        {isSoon && (
          <Badge
            variant="outline"
            className="border-amber-500/30 text-amber-300 bg-amber-500/5 text-[9px] uppercase tracking-wider"
          >
            Próximamente
          </Badge>
        )}
      </div>
      <h3 className="font-heading text-lg font-bold text-neutral-100">
        {integration.name}
      </h3>
      <p
        className={`text-[11px] mt-0.5 ${
          isSoon ? "text-neutral-500" : "text-emerald-400"
        }`}
      >
        {isSoon ? "Disponible pronto" : "Disponible"}
      </p>
      <p className="text-sm text-neutral-400 leading-relaxed mt-3 mb-5 flex-1">
        {integration.description}
      </p>
      <button
        disabled={isSoon}
        onClick={isSoon ? undefined : onClick}
        className={`w-full rounded-md py-2 text-sm font-medium transition ${
          isSoon
            ? "bg-white/[0.04] text-neutral-500 cursor-not-allowed"
            : "bg-amber-400 text-black hover:bg-amber-300"
        }`}
      >
        {isSoon ? "En desarrollo" : "Conectar"}
      </button>
    </div>
  );
}
