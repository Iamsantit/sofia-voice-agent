"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Stage =
  | "not_started"
  | "pending"
  | "phone_verified"
  | "approved"
  | "flagged"
  | "rejected";

type AIResult = {
  score: number;
  verdict: "approved" | "flagged" | "rejected";
  reasons: string[];
};

type LookupResult = {
  carrier_name?: string;
  type?: string;
  national_format?: string;
  country_code?: string;
};

const COUNTRIES = [
  { code: "CO", name: "Colombia", doc: "Cédula", phone: "+57" },
  { code: "MX", name: "México", doc: "INE/CURP", phone: "+52" },
  { code: "US", name: "Estados Unidos", doc: "SSN/ID", phone: "+1" },
  { code: "AR", name: "Argentina", doc: "DNI", phone: "+54" },
  { code: "PE", name: "Perú", doc: "DNI", phone: "+51" },
  { code: "CL", name: "Chile", doc: "RUT", phone: "+56" },
  { code: "ES", name: "España", doc: "DNI/NIE", phone: "+34" },
];

export function KycDialog({
  onClose,
  onApproved,
}: {
  onClose: () => void;
  onApproved: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [stage, setStage] = useState<Stage>("not_started");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: personal data
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("CO");
  const [docType, setDocType] = useState("CC");
  const [docNumber, setDocNumber] = useState("");
  const [address, setAddress] = useState("");

  // Step 2: phone OTP
  const [phone, setPhone] = useState("+57");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 3: AI analysis
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [lookup, setLookup] = useState<LookupResult | null>(null);

  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  // Load existing KYC status on mount → resume where they left off
  useEffect(() => {
    fetch("/api/kyc/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.status !== "ok") return;
        const s: Stage = d.stage ?? "not_started";
        setStage(s);
        if (d.kyc?.personal) {
          setFullName(d.kyc.personal.full_name ?? "");
          setCountry(d.kyc.personal.country ?? "CO");
          setDocType(d.kyc.personal.doc_type ?? "CC");
          setDocNumber(d.kyc.personal.doc_number ?? "");
          setAddress(d.kyc.personal.address ?? "");
        }
        if (d.kyc?.phone_verified) setPhone(d.kyc.phone_verified);
        if (d.kyc?.ai_analysis) setAiResult(d.kyc.ai_analysis);
        if (d.kyc?.lookup) setLookup(d.kyc.lookup);
        // Jump to the appropriate step
        if (s === "phone_verified") setStep(3);
        else if (s === "approved" || s === "flagged" || s === "rejected") setStep(4);
        else if (d.kyc?.personal) setStep(2);
      })
      .catch(() => {});
  }, []);

  // Countdown for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  // ── Step 1 submit ────────────────────────────────────────────────────────
  async function submitPersonal() {
    if (!fullName.trim() || fullName.trim().length < 4) {
      setError("Escribe tu nombre completo");
      return;
    }
    if (!docNumber.trim() || docNumber.trim().length < 4) {
      setError("Documento inválido");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          country,
          doc_type: docType,
          doc_number: docNumber.trim(),
          address: address.trim(),
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setStage("pending");
        setStep(2);
      } else {
        setError(data.message ?? "Error guardando datos");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2 send OTP ──────────────────────────────────────────────────────
  async function sendPhoneOtp() {
    if (phone.replace(/\D/g, "").length < 8) {
      setError("Número inválido");
      return;
    }
    setLoading(true);
    setError(null);
    setDevCode(null);
    try {
      const res = await fetch("/api/kyc/send-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setResendCooldown(45);
        if (data.dev_code) setDevCode(data.dev_code);
        setTimeout(() => otpInputs.current[0]?.focus(), 80);
      } else {
        setError(data.message ?? "No se pudo enviar el SMS");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2 verify OTP ────────────────────────────────────────────────────
  async function verifyPhoneOtp() {
    const code = otp.join("");
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc/verify-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setStage("phone_verified");
        setStep(3);
        // Auto-fire AI analysis
        runAnalysis();
      } else {
        setError(data.message ?? "Código inválido");
        setOtp(["", "", "", "", "", ""]);
        otpInputs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(i: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[i] = clean;
    setOtp(next);
    if (clean && i < 5) otpInputs.current[i + 1]?.focus();
    if (next.every((c) => c.length === 1) && i === 5) {
      setTimeout(verifyPhoneOtp, 80);
    }
  }

  function handleOtpKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpInputs.current[i - 1]?.focus();
    if (e.key === "Enter") verifyPhoneOtp();
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      setTimeout(verifyPhoneOtp, 80);
    }
  }

  // ── Step 3 AI analysis ───────────────────────────────────────────────────
  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kyc/analyze", { method: "POST" });
      const data = await res.json();
      if (data.status === "ok") {
        setAiResult({
          score: data.score,
          verdict: data.verdict,
          reasons: data.reasons ?? [],
        });
        setLookup(data.lookup ?? null);
        setStage(data.stage);
        setStep(4);
      } else {
        setError(data.message ?? "El análisis falló");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl my-8 rounded-2xl border border-white/[0.08] bg-neutral-950 shadow-2xl"
      >
        <div className="flex items-start justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h2 className="font-heading text-2xl font-bold italic">
              Verificación de identidad
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Plan Basic y Pro requieren verificación antes de comprar un
              número. Toma 2 minutos.
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-white/[0.1] text-neutral-400 h-7"
          >
            ✕
          </Button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 px-6 py-4 border-b border-white/[0.06]">
          {[
            { k: 1, label: "Datos", icon: "👤" },
            { k: 2, label: "SMS", icon: "📱" },
            { k: 3, label: "Análisis IA", icon: "🤖" },
            { k: 4, label: "Resultado", icon: "✓" },
          ].map((s, i) => {
            const done = step > s.k;
            const active = step === s.k;
            return (
              <div key={s.k} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] ${
                    active
                      ? "bg-amber-400 text-black font-medium"
                      : done
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/[0.04] text-neutral-500"
                  }`}
                >
                  <span>{done ? "✓" : s.icon}</span>
                  <span>{s.label}</span>
                </div>
                {i < 3 && (
                  <div
                    className={`h-px w-3 ${done ? "bg-emerald-500/40" : "bg-white/[0.08]"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="p-6 space-y-5">
          {/* ── Step 1: Datos personales ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-300">
                Tus datos solo se usan para verificar identidad y prevenir
                fraude. No se comparten.
              </p>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">Nombre completo *</Label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Juan Pérez García"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">País *</Label>
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      const c = COUNTRIES.find((x) => x.code === e.target.value);
                      if (c) setPhone(c.phone);
                    }}
                    className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-neutral-900">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">
                    Tipo de documento *
                  </Label>
                  <input
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    placeholder={selectedCountry?.doc ?? "CC"}
                    className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">
                  Número de documento *
                </Label>
                <input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="1234567890"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">
                  Dirección (opcional)
                </Label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, ciudad"
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: SMS verification ── */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-300">
                Te enviaremos un código por SMS para confirmar que el número es
                tuyo.
              </p>
              <div className="space-y-1">
                <Label className="text-xs text-neutral-400">
                  Tu número personal
                </Label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+573001234567"
                  disabled={resendCooldown > 0 && !!devCode}
                  className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm font-mono outline-none focus:border-amber-400/50 disabled:opacity-60"
                />
              </div>

              {!resendCooldown && otp.every((c) => !c) && (
                <Button
                  onClick={sendPhoneOtp}
                  disabled={loading}
                  className="bg-amber-400 text-black hover:bg-amber-300 font-medium w-full"
                >
                  {loading ? "Enviando…" : "Enviar código por SMS"}
                </Button>
              )}

              {(resendCooldown > 0 || otp.some((c) => c)) && (
                <>
                  {devCode && (
                    <div className="rounded-lg border border-amber-400/40 bg-amber-400/[0.06] p-3 text-center">
                      <p className="text-[10px] uppercase tracking-wider text-amber-300 mb-1">
                        Código de prueba (Twilio falló)
                      </p>
                      <p className="font-mono text-2xl tracking-[0.4em] text-amber-200 font-bold">
                        {devCode}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs text-neutral-400">
                      Código de 6 dígitos
                    </Label>
                    <div className="flex gap-2 justify-center">
                      {otp.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpInputs.current[i] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleOtpInput(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKey(i, e)}
                          onPaste={i === 0 ? handleOtpPaste : undefined}
                          className="h-12 w-10 text-center text-xl font-mono font-semibold rounded-md bg-white/[0.04] border border-white/[0.1] outline-none focus:border-amber-400/60"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={sendPhoneOtp}
                      disabled={resendCooldown > 0 || loading}
                      className="text-[11px] text-amber-400 hover:text-amber-300 disabled:text-neutral-600"
                    >
                      {resendCooldown > 0
                        ? `Reenviar en ${resendCooldown}s`
                        : "Reenviar código"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 3: AI running ── */}
          {step === 3 && (
            <div className="text-center py-10 space-y-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/30 to-orange-500/20 animate-pulse">
                <span className="text-4xl">🤖</span>
              </div>
              <div>
                <p className="text-sm text-neutral-100 font-medium">
                  Claude está analizando tus datos
                </p>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Validando carrier · línea · coherencia con tu identidad
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4: Result ── */}
          {step === 4 && aiResult && (
            <div className="space-y-4">
              {aiResult.verdict === "approved" && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 text-center">
                  <span className="text-4xl">✅</span>
                  <p className="font-heading text-2xl italic text-emerald-200 mt-2">
                    Identidad verificada
                  </p>
                  <p className="text-sm text-neutral-300 mt-1">
                    Score: {aiResult.score}/100 · Ya puedes comprar números.
                  </p>
                </div>
              )}
              {aiResult.verdict === "flagged" && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-5 text-center">
                  <span className="text-4xl">⚠️</span>
                  <p className="font-heading text-2xl italic text-amber-200 mt-2">
                    Aprobado con observaciones
                  </p>
                  <p className="text-sm text-neutral-300 mt-1">
                    Score: {aiResult.score}/100 · Puedes comprar pero la cuenta
                    queda marcada para revisión manual.
                  </p>
                </div>
              )}
              {aiResult.verdict === "rejected" && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-5 text-center">
                  <span className="text-4xl">⛔</span>
                  <p className="font-heading text-2xl italic text-red-200 mt-2">
                    Verificación rechazada
                  </p>
                  <p className="text-sm text-neutral-300 mt-1">
                    Score: {aiResult.score}/100
                  </p>
                </div>
              )}

              {lookup && (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-xs space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                    Detalles del análisis
                  </p>
                  <Row label="Carrier" value={lookup.carrier_name ?? "—"} />
                  <Row label="Tipo de línea" value={lookup.type ?? "—"} />
                  <Row label="País" value={lookup.country_code ?? "—"} />
                  {lookup.national_format && (
                    <Row label="Formato" value={lookup.national_format} />
                  )}
                </div>
              )}

              {aiResult.reasons.length > 0 && (
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">
                    Razones del veredicto
                  </p>
                  <ul className="space-y-1 text-xs text-neutral-300">
                    {aiResult.reasons.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-400">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between gap-2 p-6 border-t border-white/[0.06]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-white/[0.1] text-neutral-300"
          >
            Cerrar
          </Button>
          {step === 1 && (
            <Button
              onClick={submitPersonal}
              disabled={loading}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
            >
              {loading ? "Guardando…" : "Continuar →"}
            </Button>
          )}
          {step === 2 && otp.every((c) => c.length === 1) && (
            <Button
              onClick={verifyPhoneOtp}
              disabled={loading}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
            >
              {loading ? "Verificando…" : "Verificar →"}
            </Button>
          )}
          {step === 4 && aiResult && aiResult.verdict !== "rejected" && (
            <Button
              onClick={onApproved}
              className="bg-emerald-500 text-black hover:bg-emerald-400 font-medium"
            >
              Continuar a comprar →
            </Button>
          )}
          {step === 4 && aiResult?.verdict === "rejected" && (
            <Button
              onClick={onClose}
              variant="outline"
              className="border-red-500/30 text-red-300"
            >
              Entendido
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-200 font-mono">{value}</span>
    </div>
  );
}
