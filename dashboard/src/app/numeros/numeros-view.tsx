"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { KycDialog } from "./kyc-dialog";

type TwilioNumber = {
  sid: string;
  phone_number: string;
  friendly_name: string;
  voice: boolean;
  sms: boolean;
  imported_in_retell: boolean;
};
type RetellNumber = {
  phone_number: string;
  nickname: string;
  inbound_agent_id: string;
  outbound_agent_id: string;
  termination_uri: string;
};
type Trunk = { sid: string; friendly_name: string; domain_name: string };
type Balance = { balance: string; currency: string };
type Agent = { agent_id: string; name: string };
type Available = {
  phone_number: string;
  locality: string;
  region: string;
  capabilities: Record<string, boolean>;
};

export function NumerosView() {
  const [loading, setLoading] = useState(true);
  const [twilio, setTwilio] = useState<TwilioNumber[]>([]);
  const [retell, setRetell] = useState<RetellNumber[]>([]);
  const [trunks, setTrunks] = useState<Trunk[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Buy flow
  const [showBuy, setShowBuy] = useState(false);
  const [country, setCountry] = useState("US");
  const [areaCode, setAreaCode] = useState("");
  const [contains, setContains] = useState("");
  const [searching, setSearching] = useState(false);
  const [available, setAvailable] = useState<Available[]>([]);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyMsg, setBuyMsg] = useState<string | null>(null);

  // KYC flow
  const [showKyc, setShowKyc] = useState(false);
  const [pendingBuyPhone, setPendingBuyPhone] = useState<string | null>(null);

  // Import flow
  const [importingFor, setImportingFor] = useState<string | null>(null);
  const [inboundAgent, setInboundAgent] = useState("");
  const [outboundAgent, setOutboundAgent] = useState("");
  const [trunkUri, setTrunkUri] = useState("");
  const [nickname, setNickname] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nums, ag] = await Promise.all([
        fetch("/api/phone-numbers", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/agents", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (nums.status === "ok") {
        setTwilio(nums.twilio_numbers ?? []);
        setRetell(nums.retell_numbers ?? []);
        setTrunks(nums.twilio_trunks ?? []);
        setBalance(nums.twilio_balance ?? null);
        if (nums.twilio_trunks?.[0]?.domain_name) {
          setTrunkUri(nums.twilio_trunks[0].domain_name);
        }
      } else {
        setError(nums.message ?? "Error cargando números");
      }
      if (ag.status === "ok") setAgents(ag.agents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleSearch() {
    setSearching(true);
    setAvailable([]);
    setBuyMsg(null);
    try {
      const qs = new URLSearchParams({ country });
      if (areaCode) qs.set("area_code", areaCode);
      if (contains) qs.set("contains", contains);
      const res = await fetch(`/api/phone-numbers/available?${qs}`, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") {
        setAvailable(data.available ?? []);
      } else {
        setBuyMsg(data.message ?? "Error buscando");
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleBuy(phone: string) {
    setBuying(phone);
    setBuyMsg(null);
    try {
      const res = await fetch("/api/phone-numbers/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: phone,
          friendly_name: "Sofia",
          trunk_sid: trunks[0]?.sid,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setBuyMsg(`✅ Comprado: ${data.phone_number}`);
        setAvailable([]);
        await loadAll();
      } else if (data.code === "kyc_required") {
        // Trigger KYC flow first, then come back and finish the buy
        setBuyMsg(null);
        setPendingBuyPhone(phone);
        setShowKyc(true);
      } else {
        setBuyMsg(`❌ ${data.message ?? "Error"}`);
      }
    } finally {
      setBuying(null);
    }
  }

  async function handleRelease(sid: string, phone: string) {
    if (!confirm(`¿Liberar el número ${phone}? Esta acción no se puede deshacer.`)) return;
    try {
      await fetch(`/api/phone-numbers/twilio/${sid}`, { method: "DELETE" });
      await loadAll();
    } catch {}
  }

  function openImport(phone: string) {
    setImportingFor(phone);
    setImportStatus(null);
    setNickname(`Sofia ${phone.slice(-4)}`);
    // Pre-select first agents if available
    if (agents[0]) {
      setInboundAgent(agents[0].agent_id);
      setOutboundAgent(agents[0].agent_id);
    }
  }

  async function handleImport() {
    if (!importingFor || !trunkUri) return;
    setImportStatus("Importando…");
    try {
      const res = await fetch("/api/phone-numbers/retell/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: importingFor,
          termination_uri: trunkUri,
          inbound_agent_id: inboundAgent || undefined,
          outbound_agent_id: outboundAgent || undefined,
          nickname,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setImportStatus("✅ Importado en Retell");
        setImportingFor(null);
        await loadAll();
      } else {
        setImportStatus(`❌ ${data.message ?? "Error"}`);
      }
    } catch {
      setImportStatus("❌ Error de red");
    }
  }

  async function handleRemoveFromRetell(phone: string) {
    if (!confirm(`¿Quitar ${phone} de Retell? El número seguirá en Twilio.`)) return;
    await fetch(`/api/phone-numbers/retell/${encodeURIComponent(phone)}`, { method: "DELETE" });
    await loadAll();
  }

  return (
    <div className="space-y-6">
      {/* Balance header */}
      {balance && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-500">Crédito Twilio</p>
            <p className="text-xl font-mono font-bold text-amber-400">
              ${parseFloat(balance.balance).toFixed(2)} {balance.currency}
            </p>
          </div>
          <p className="text-[11px] text-neutral-500 text-right">
            Número US: ~$1.15/mes<br />
            Llamadas a Colombia: ~$0.13/min
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Mis números */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="font-heading text-lg italic">Mis números</CardTitle>
            <p className="text-xs text-neutral-500 mt-0.5">
              Números de Twilio que ya compraste
            </p>
          </div>
          <Button
            onClick={() => setShowBuy(!showBuy)}
            className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
          >
            {showBuy ? "Cerrar" : "+ Comprar número"}
          </Button>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-neutral-500">Cargando…</p>}

          {!loading && twilio.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-6">
              Aún no tienes números. Click en <span className="text-amber-400">+ Comprar número</span> arriba.
            </p>
          )}

          <div className="space-y-3">
            {twilio.map((n) => {
              const retellInfo = retell.find((r) => r.phone_number === n.phone_number);
              return (
                <div
                  key={n.sid}
                  className="rounded-lg border border-white/[0.06] bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-mono text-lg text-neutral-100">
                        {n.phone_number}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {n.voice && (
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-300 text-[10px]">
                            Voz
                          </Badge>
                        )}
                        {n.sms && (
                          <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-[10px]">
                            SMS
                          </Badge>
                        )}
                        {n.imported_in_retell ? (
                          <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                            🤖 Conectado a Sofía
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-neutral-600 text-neutral-400 text-[10px]">
                            Sin agente
                          </Badge>
                        )}
                      </div>
                      {retellInfo && (
                        <p className="text-[11px] text-neutral-500 mt-1.5">
                          Nickname: {retellInfo.nickname}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!n.imported_in_retell ? (
                        <Button
                          size="sm"
                          onClick={() => openImport(n.phone_number)}
                          variant="outline"
                          className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                        >
                          Conectar a agente
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleRemoveFromRetell(n.phone_number)}
                          variant="outline"
                          className="border-white/10 text-neutral-400 hover:bg-white/5"
                        >
                          Desconectar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleRelease(n.sid, n.phone_number)}
                        variant="outline"
                        className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                      >
                        Liberar
                      </Button>
                    </div>
                  </div>

                  {/* Inline import form */}
                  {importingFor === n.phone_number && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-neutral-400">Agente inbound</Label>
                          <select
                            value={inboundAgent}
                            onChange={(e) => setInboundAgent(e.target.value)}
                            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-2 text-sm outline-none"
                          >
                            <option value="">— Ninguno —</option>
                            {agents.map((a) => (
                              <option key={a.agent_id} value={a.agent_id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-neutral-400">Agente outbound</Label>
                          <select
                            value={outboundAgent}
                            onChange={(e) => setOutboundAgent(e.target.value)}
                            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-2 text-sm outline-none"
                          >
                            <option value="">— Ninguno —</option>
                            {agents.map((a) => (
                              <option key={a.agent_id} value={a.agent_id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-neutral-400">Nickname</Label>
                        <input
                          value={nickname}
                          onChange={(e) => setNickname(e.target.value)}
                          className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-2 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-neutral-400">SIP trunk (autodetectado)</Label>
                        <input
                          value={trunkUri}
                          onChange={(e) => setTrunkUri(e.target.value)}
                          className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-2 text-xs font-mono outline-none"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => setImportingFor(null)}
                          variant="outline"
                          className="border-white/10 text-neutral-400"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleImport}
                          className="bg-amber-400 text-black hover:bg-amber-300"
                        >
                          Conectar
                        </Button>
                      </div>
                      {importStatus && (
                        <p className="text-xs text-neutral-400">{importStatus}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Buy flow */}
      {showBuy && (
        <Card className="border-amber-500/20 bg-amber-500/[0.02]">
          <CardHeader>
            <CardTitle className="font-heading text-lg italic">
              Buscar números disponibles
            </CardTitle>
            <p className="text-xs text-neutral-500 mt-0.5">
              Twilio trial: 1 número a la vez. Costo ~$1.15/mes descontado de tu crédito.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">País</Label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-2 text-sm outline-none"
                >
                  <option value="US">Estados Unidos 🇺🇸</option>
                  <option value="CA">Canadá 🇨🇦</option>
                  <option value="MX">México 🇲🇽</option>
                  <option value="CO">Colombia 🇨🇴</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Area code (opt)</Label>
                <input
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="305"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-2 text-sm outline-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Contiene (opt)</Label>
                <input
                  value={contains}
                  onChange={(e) => setContains(e.target.value)}
                  placeholder="SOFIA"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-2 text-sm outline-none"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={searching}
                  className="w-full bg-amber-400 text-black hover:bg-amber-300 font-medium"
                >
                  {searching ? "Buscando…" : "Buscar"}
                </Button>
              </div>
            </div>

            {buyMsg && (
              <div className="text-sm text-neutral-300">{buyMsg}</div>
            )}

            {available.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-500 uppercase tracking-wider">
                  {available.length} opciones disponibles
                </p>
                {available.map((n) => (
                  <div
                    key={n.phone_number}
                    className="rounded-lg border border-white/[0.06] bg-black/20 px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-mono text-neutral-100">{n.phone_number}</p>
                      <p className="text-[11px] text-neutral-500">
                        {n.locality}, {n.region}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleBuy(n.phone_number)}
                      disabled={buying === n.phone_number}
                      className="bg-emerald-500 text-black hover:bg-emerald-400 font-medium"
                    >
                      {buying === n.phone_number ? "Comprando…" : "Comprar"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showKyc && (
        <KycDialog
          onClose={() => {
            setShowKyc(false);
            setPendingBuyPhone(null);
          }}
          onApproved={() => {
            setShowKyc(false);
            // Resume the purchase that was blocked
            if (pendingBuyPhone) {
              const p = pendingBuyPhone;
              setPendingBuyPhone(null);
              handleBuy(p);
            }
          }}
        />
      )}
    </div>
  );
}
