"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Industry = {
  key: string;
  label: string;
  icon: string;
  description: string;
  default_agent_name: string;
};

type FormData = {
  // Step 1: Negocio
  industry: string;
  business_name: string;
  city: string;
  // Step 2: Dueño
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  // Step 3: Agente
  agent_name: string;
  temperature: number;
  // Extra (solo para industry === "otro")
  description: string;
  generated_prompt: string;
  generated_greeting: string;
};

const INITIAL: FormData = {
  industry: "",
  business_name: "",
  city: "",
  owner_name: "",
  owner_email: "",
  owner_phone: "",
  agent_name: "",
  temperature: 0.4,
  description: "",
  generated_prompt: "",
  generated_greeting: "",
};

const STEPS = [
  { key: 1, label: "Tu negocio", icon: "🏢" },
  { key: 2, label: "Sobre ti", icon: "👤" },
  { key: 3, label: "Tu agente", icon: "🤖" },
];

export function RegistroWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/industries", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setIndustries(d.industries ?? []))
      .catch(() => setError("No se pudieron cargar las industrias"));
  }, []);

  const selectedIndustry = industries.find((i) => i.key === data.industry);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function selectIndustry(key: string) {
    const ind = industries.find((i) => i.key === key);
    update("industry", key);
    // Pre-fill agent name if user hasn't typed one yet
    if (ind && !data.agent_name) {
      update("agent_name", ind.default_agent_name);
    }
  }

  const canNext1 = data.industry && data.business_name.trim().length >= 2 && data.city.trim().length >= 2;
  const canNext2 = data.owner_name.trim().length >= 2 && data.owner_email.includes("@");
  const needsGenPrompt = data.industry === "custom";
  const canSubmit =
    data.agent_name.trim().length >= 2 &&
    !loading &&
    (!needsGenPrompt || data.generated_prompt.trim().length > 50);

  // OTP state
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSandboxNotice, setOtpSandboxNotice] = useState<string | null>(null);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const id = setInterval(() => setOtpResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [otpResendCooldown]);

  async function requestOtp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.owner_email.trim().toLowerCase() }),
      });
      const result = await res.json();
      if (result.status === "ok") {
        setOtpRequested(true);
        setOtpResendCooldown(45);
        if (result.sandbox_redirect && result.sent_to) {
          setOtpSandboxNotice(
            `Modo sandbox: el código fue enviado a ${result.sent_to}.`
          );
        } else {
          setOtpSandboxNotice(null);
        }
        setTimeout(() => otpInputs.current[0]?.focus(), 100);
      } else {
        setError(result.message ?? "No se pudo enviar el código");
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    const joined = otp.join("");
    if (joined.length !== 6) return;
    setOtpVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.owner_email.trim().toLowerCase(),
          code: joined,
        }),
      });
      const result = await res.json();
      if (result.status === "ok") {
        setStep(4); // Move to agent setup
      } else {
        setError(result.message ?? "Código inválido");
        setOtp(["", "", "", "", "", ""]);
        otpInputs.current[0]?.focus();
      }
    } catch {
      setError("Error de red");
    } finally {
      setOtpVerifying(false);
    }
  }

  function handleOtpInput(i: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[i] = clean;
    setOtp(next);
    if (clean && i < 5) otpInputs.current[i + 1]?.focus();
    if (next.every((c) => c.length === 1) && i === 5) {
      setTimeout(verifyOtp, 100);
    }
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpInputs.current[i - 1]?.focus();
    if (e.key === "Enter") verifyOtp();
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      setTimeout(verifyOtp, 100);
    }
  }

  // AI prompt generation (for "otro" industry)
  const [generating, setGenerating] = useState(false);
  async function generatePromptAI() {
    if (!data.description.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: data.business_name,
          city: data.city,
          agent_name: data.agent_name || "Sofía",
          description: data.description,
        }),
      });
      const result = await res.json();
      if (result.status === "ok") {
        update("generated_prompt", result.general_prompt);
        update("generated_greeting", result.begin_message);
      } else {
        setError(result.message ?? "No se pudo generar el prompt");
      }
    } catch {
      setError("Error de red al generar el prompt");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (data.industry === "custom" && data.generated_prompt) {
        payload.general_prompt_override = data.generated_prompt;
        payload.begin_message_override = data.generated_greeting;
      }
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result.status === "ok") {
        // Crear sesión sin OTP (auth simplificado)
        try {
          await fetch("/api/auth/quick-signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.owner_email.trim().toLowerCase() }),
          });
        } catch {}

        // Persist business info en localStorage para sidebar/perfil
        try {
          localStorage.setItem(
            "sofia_session",
            JSON.stringify({
              business_name: data.business_name,
              industry: data.industry,
              owner_name: data.owner_name,
              owner_email: data.owner_email,
              agent_id: result.agent_id,
              llm_id: result.llm_id,
              agent_name: result.agent_name,
              created_at: new Date().toISOString(),
            })
          );
        } catch {}
        router.push(`/onboarding/exito?agent_id=${encodeURIComponent(result.agent_id)}`);
      } else {
        setError(result.message ?? "Error desconocido");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 md:gap-6">
        {STEPS.map((s, i) => {
          const done = step > s.key;
          const active = step === s.key;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs ${
                  active
                    ? "bg-amber-400 text-black font-medium"
                    : done
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-white/[0.04] text-neutral-500 border border-white/[0.08]"
                }`}
              >
                <span>{done ? "✓" : s.icon}</span>
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-4 md:w-8 ${done ? "bg-emerald-500/40" : "bg-white/[0.08]"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Negocio */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-3xl font-bold italic tracking-tight">
              ¿Qué tipo de negocio tienes?
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Esto nos ayuda a pre-configurar el tono y el flujo de tu agente.
            </p>
          </div>

          {industries.length === 0 ? (
            <p className="text-sm text-neutral-500">Cargando industrias…</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {industries.map((i) => {
                const selected = data.industry === i.key;
                return (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => selectIndustry(i.key)}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-amber-400/60 bg-amber-400/[0.08]"
                        : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                    }`}
                  >
                    <div className="text-2xl mb-2">{i.icon}</div>
                    <p className="text-sm font-medium text-neutral-100">{i.label}</p>
                    <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
                      {i.description}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="business_name" className="text-sm text-neutral-300">
                Nombre del negocio
              </Label>
              <input
                id="business_name"
                type="text"
                value={data.business_name}
                onChange={(e) => update("business_name", e.target.value)}
                placeholder={
                  selectedIndustry?.label === "Clínica Dental"
                    ? "Clínica Sonríe"
                    : "Mi Negocio"
                }
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-sm text-neutral-300">
                Ciudad
              </Label>
              <input
                id="city"
                type="text"
                value={data.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Medellín"
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setStep(2)}
              disabled={!canNext1}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium px-8 disabled:opacity-40"
            >
              Siguiente →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Owner */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-3xl font-bold italic tracking-tight">
              Tus datos
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Para poder contactarte cuando algo importante pase con tus leads.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name" className="text-sm text-neutral-300">
                Tu nombre
              </Label>
              <input
                id="owner_name"
                type="text"
                value={data.owner_name}
                onChange={(e) => update("owner_name", e.target.value)}
                placeholder="Juan Pérez"
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_email" className="text-sm text-neutral-300">
                  Email
                </Label>
                <input
                  id="owner_email"
                  type="email"
                  value={data.owner_email}
                  onChange={(e) => update("owner_email", e.target.value)}
                  placeholder="juan@minegocio.com"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_phone" className="text-sm text-neutral-300">
                  Teléfono (opcional)
                </Label>
                <input
                  id="owner_phone"
                  type="tel"
                  value={data.owner_phone}
                  onChange={(e) => update("owner_phone", e.target.value)}
                  placeholder="+573001234567"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className="border-white/[0.08] text-neutral-300 hover:bg-white/[0.04]"
            >
              ← Atrás
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!canNext2}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium px-8 disabled:opacity-40"
            >
              Siguiente →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: OTP verification */}
      {/* Step 3: Agent */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-3xl font-bold italic tracking-tight">
              Dale nombre a tu agente
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Es el nombre con el que tu agente se va a presentar al contestar.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent_name" className="text-sm text-neutral-300">
                Nombre del agente
              </Label>
              <input
                id="agent_name"
                type="text"
                value={data.agent_name}
                onChange={(e) => update("agent_name", e.target.value)}
                placeholder={selectedIndustry?.default_agent_name ?? "Sofía"}
                className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
              />
              <p className="text-[11px] text-neutral-500">
                Puedes cambiarlo después en Configuración.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature" className="text-sm text-neutral-300">
                Creatividad de respuestas: <span className="font-mono text-amber-400">{data.temperature}</span>
              </Label>
              <input
                id="temperature"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={data.temperature}
                onChange={(e) => update("temperature", parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-neutral-600">
                <span>Precisa (se apega al guión)</span>
                <span>Creativa (improvisa más)</span>
              </div>
            </div>

            {/* AI prompt generator — solo si industry === "otro" */}
            {data.industry === "custom" && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-5 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">✨</span>
                    <Label className="text-sm text-amber-200 font-medium">
                      Genera el prompt con IA
                    </Label>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Describe tu negocio en 2-3 líneas y Claude armará el prompt
                    personalizado para tu agente.
                  </p>
                </div>

                <textarea
                  value={data.description}
                  onChange={(e) => update("description", e.target.value)}
                  rows={4}
                  placeholder="Ejemplo: Vendemos paquetes de automatización con IA para pymes. Los clientes suelen preguntar por precios, tiempo de implementación y casos de éxito. Queremos calificarlos y agendar demo de 30 min."
                  className="w-full rounded-md bg-black/30 border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50 resize-none"
                />

                <Button
                  type="button"
                  onClick={generatePromptAI}
                  disabled={generating || data.description.trim().length < 20}
                  className="bg-amber-400 text-black hover:bg-amber-300 font-medium disabled:opacity-40"
                >
                  {generating
                    ? "Generando con Claude…"
                    : data.generated_prompt
                      ? "Regenerar prompt"
                      : "Generar prompt con IA ✨"}
                </Button>

                {data.generated_prompt && (
                  <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                    <div>
                      <Label className="text-xs text-neutral-400">
                        Saludo inicial generado
                      </Label>
                      <Textarea
                        value={data.generated_greeting}
                        onChange={(e) => update("generated_greeting", e.target.value)}
                        rows={2}
                        className="mt-1 bg-black/30 border-white/[0.08] text-xs resize-none"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-neutral-400">
                        Prompt generado (puedes editarlo)
                      </Label>
                      <Textarea
                        value={data.generated_prompt}
                        onChange={(e) => update("generated_prompt", e.target.value)}
                        rows={12}
                        className="mt-1 bg-black/30 border-white/[0.08] text-xs font-mono resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary preview */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
              <p className="text-xs text-neutral-500 uppercase tracking-wider">
                Resumen
              </p>
              <div className="space-y-1.5 text-sm text-neutral-300">
                <p>
                  <span className="text-neutral-500">Industria:</span>{" "}
                  {selectedIndustry?.icon} {selectedIndustry?.label}
                </p>
                <p>
                  <span className="text-neutral-500">Negocio:</span> {data.business_name} ({data.city})
                </p>
                <p>
                  <span className="text-neutral-500">Contacto:</span> {data.owner_name} — {data.owner_email}
                </p>
                <p>
                  <span className="text-neutral-500">Agente:</span> {data.agent_name || "—"} (voz cartesia-Sofia, es-419)
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button
              onClick={() => setStep(2)}
              variant="outline"
              disabled={loading}
              className="border-white/[0.08] text-neutral-300 hover:bg-white/[0.04]"
            >
              ← Atrás
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium px-8 disabled:opacity-40"
            >
              {loading ? "Creando agente…" : "Crear mi agente 🚀"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
