"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INDUSTRIES, type Industry } from "@/lib/industries";

type FormData = {
  // Step 1: Negocio
  industry: string;
  business_name: string;
  city: string;
  // Step 2: Cuenta del dueño
  first_name: string;
  last_name: string;
  owner_phone: string;
  owner_email: string;
  password: string;
  password_confirm: string;
  // Step 3: Agente
  agent_name: string;
  temperature: number;
  // Extra (solo para industry === "custom")
  description: string;
  generated_prompt: string;
  generated_greeting: string;
};

const INITIAL: FormData = {
  industry: "",
  business_name: "",
  city: "",
  first_name: "",
  last_name: "",
  owner_phone: "",
  owner_email: "",
  password: "",
  password_confirm: "",
  agent_name: "",
  temperature: 0.4,
  description: "",
  generated_prompt: "",
  generated_greeting: "",
};

const STEPS = [
  { key: 1, label: "Tu negocio", icon: "🏢" },
  { key: 2, label: "Tu cuenta", icon: "👤" },
  { key: 3, label: "Tu agente", icon: "🤖" },
];

export function RegistroWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(INITIAL);
  // Industries are hardcoded for instant render (no Modal cold-start wait).
  // We still refresh from backend on mount in case the catalog changes later.
  const [industries, setIndustries] = useState<Industry[]>(INDUSTRIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/industries", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.industries) && d.industries.length > 0) {
          setIndustries(d.industries);
        }
      })
      .catch(() => {
        // Silent — we already have the static fallback rendered.
      });
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
  const canNext2 =
    data.first_name.trim().length >= 2 &&
    data.last_name.trim().length >= 2 &&
    data.owner_email.includes("@") &&
    data.owner_email.includes(".") &&
    data.password.length >= 8 &&
    data.password === data.password_confirm;
  const needsGenPrompt = data.industry === "custom";
  const canSubmit =
    data.agent_name.trim().length >= 2 &&
    !loading &&
    (!needsGenPrompt || data.generated_prompt.trim().length > 50);

  // Live password validation hints
  const passwordTooShort = data.password.length > 0 && data.password.length < 8;
  const passwordMismatch =
    data.password_confirm.length > 0 && data.password !== data.password_confirm;

  // OTP state
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSandboxNotice, setOtpSandboxNotice] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const id = setInterval(() => setOtpResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [otpResendCooldown]);

  async function requestOtp() {
    setLoading(true);
    setError(null);
    setDevCode(null);
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
            `Modo sandbox de prueba: el correo se envió a ${result.sent_to}. Usa el código que aparece abajo.`,
          );
        } else if (result.email_sent === false) {
          setOtpSandboxNotice(
            "No se pudo enviar el correo. Usa el código que aparece abajo para continuar.",
          );
        } else {
          setOtpSandboxNotice(null);
        }
        if (typeof result.dev_code === "string") {
          setDevCode(result.dev_code);
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
    setError(null);
    setLoading(true);

    const owner_name = `${data.first_name} ${data.last_name}`.trim();

    // 1) Register the user (creates account + sets session cookie)
    try {
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.owner_email.trim().toLowerCase(),
          phone: data.owner_phone.trim(),
          first_name: data.first_name.trim(),
          last_name: data.last_name.trim(),
          password: data.password,
        }),
      });
      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok || regData.status !== "ok") {
        // already_registered → push them to login
        if (regData.code === "already_registered") {
          setError(
            "Este correo ya está registrado. Ve a 'Iniciar sesión' para entrar.",
          );
          setLoading(false);
          return;
        }
        setError(regData.message ?? "No se pudo crear la cuenta");
        setLoading(false);
        return;
      }
    } catch {
      setError("Error de red al crear la cuenta");
      setLoading(false);
      return;
    }

    // 2) Stash payload + nav to /exito which will create the agent in background
    const payload: Record<string, unknown> = {
      industry: data.industry,
      business_name: data.business_name,
      city: data.city,
      owner_name,
      owner_email: data.owner_email.trim().toLowerCase(),
      owner_phone: data.owner_phone.trim(),
      agent_name: data.agent_name,
      temperature: data.temperature,
    };
    if (data.industry === "custom" && data.generated_prompt) {
      payload.general_prompt_override = data.generated_prompt;
      payload.begin_message_override = data.generated_greeting;
    }

    try {
      localStorage.setItem(
        "sofia_session",
        JSON.stringify({
          business_name: data.business_name,
          industry: data.industry,
          owner_name,
          owner_email: data.owner_email,
          agent_name: data.agent_name,
          created_at: new Date().toISOString(),
        }),
      );
      sessionStorage.setItem(
        "sofia_pending_onboarding",
        JSON.stringify(payload),
      );
    } catch {}

    router.push("/onboarding/exito?creating=1");
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

      {/* Step 2: Tu cuenta */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-3xl font-bold italic tracking-tight">
              Crea tu cuenta
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Con esto podrás iniciar sesión después con tu correo o teléfono.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm text-neutral-300">
                  Nombre *
                </Label>
                <input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  value={data.first_name}
                  onChange={(e) => update("first_name", e.target.value)}
                  placeholder="Juan"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm text-neutral-300">
                  Apellido *
                </Label>
                <input
                  id="last_name"
                  type="text"
                  autoComplete="family-name"
                  value={data.last_name}
                  onChange={(e) => update("last_name", e.target.value)}
                  placeholder="Pérez"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner_email" className="text-sm text-neutral-300">
                  Correo *
                </Label>
                <input
                  id="owner_email"
                  type="email"
                  autoComplete="email"
                  value={data.owner_email}
                  onChange={(e) => update("owner_email", e.target.value)}
                  placeholder="juan@minegocio.com"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_phone" className="text-sm text-neutral-300">
                  Teléfono *
                </Label>
                <input
                  id="owner_phone"
                  type="tel"
                  autoComplete="tel"
                  value={data.owner_phone}
                  onChange={(e) => update("owner_phone", e.target.value)}
                  placeholder="+573001234567"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-neutral-300">
                  Contraseña *
                </Label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={data.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className={`w-full rounded-md bg-white/[0.04] border px-3 py-2 text-sm outline-none focus:border-amber-400/50 ${
                    passwordTooShort
                      ? "border-red-500/40"
                      : "border-white/[0.08]"
                  }`}
                />
                {passwordTooShort && (
                  <p className="text-[11px] text-red-400">
                    Debe tener al menos 8 caracteres
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password_confirm"
                  className="text-sm text-neutral-300"
                >
                  Confirma contraseña *
                </Label>
                <input
                  id="password_confirm"
                  type="password"
                  autoComplete="new-password"
                  value={data.password_confirm}
                  onChange={(e) => update("password_confirm", e.target.value)}
                  placeholder="Repite la contraseña"
                  className={`w-full rounded-md bg-white/[0.04] border px-3 py-2 text-sm outline-none focus:border-amber-400/50 ${
                    passwordMismatch
                      ? "border-red-500/40"
                      : "border-white/[0.08]"
                  }`}
                />
                {passwordMismatch && (
                  <p className="text-[11px] text-red-400">
                    Las contraseñas no coinciden
                  </p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-neutral-500">
              ¿Ya tienes cuenta?{" "}
              <a href="/login" className="text-amber-400 hover:underline">
                Inicia sesión
              </a>
            </p>
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

      {/* OTP step removed — now using password auth instead. Kept code for now in
          case we want to bring it back as an optional second factor later. */}
      {false && step === -999 && (
        <div className="space-y-6">
          <div>
            <h2 className="font-heading text-3xl font-bold italic tracking-tight">
              Verifica tu correo
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              Enviamos un código de 6 dígitos a{" "}
              <span className="text-neutral-200">{data.owner_email}</span>.
              Revisa tu bandeja (y la carpeta de spam).
            </p>
          </div>

          {otpSandboxNotice && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.04] p-3 text-xs text-amber-300">
              {otpSandboxNotice}
            </div>
          )}

          {devCode && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/[0.06] p-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">
                Tu código de prueba
              </p>
              <p className="font-mono text-3xl tracking-[0.4em] text-amber-200 font-bold">
                {devCode}
              </p>
              <p className="text-[11px] text-neutral-500 mt-2">
                Esto solo aparece en modo prueba. En producción el código llega al correo.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-sm text-neutral-300">Código de 6 dígitos</Label>
            <div className="flex gap-2 justify-center">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpInputs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  className="h-14 w-12 text-center text-2xl font-mono font-semibold rounded-md bg-white/[0.04] border border-white/[0.1] outline-none focus:border-amber-400/60 focus:bg-white/[0.06]"
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={requestOtp}
              disabled={otpResendCooldown > 0 || loading}
              className="text-xs text-amber-400 hover:text-amber-300 disabled:text-neutral-600 disabled:cursor-not-allowed"
            >
              {otpResendCooldown > 0
                ? `Reenviar código en ${otpResendCooldown}s`
                : loading
                  ? "Enviando…"
                  : "Reenviar código"}
            </button>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              onClick={() => {
                setOtp(["", "", "", "", "", ""]);
                setOtpRequested(false);
                setError(null);
                setStep(2);
              }}
              variant="outline"
              disabled={otpVerifying}
              className="border-white/[0.08] text-neutral-300 hover:bg-white/[0.04]"
            >
              ← Atrás
            </Button>
            <Button
              onClick={verifyOtp}
              disabled={otp.join("").length !== 6 || otpVerifying}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium px-8 disabled:opacity-40"
            >
              {otpVerifying ? "Verificando…" : "Verificar →"}
            </Button>
          </div>
        </div>
      )}

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
                  <span className="text-neutral-500">Contacto:</span>{" "}
                  {`${data.first_name} ${data.last_name}`.trim()} — {data.owner_email}
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
