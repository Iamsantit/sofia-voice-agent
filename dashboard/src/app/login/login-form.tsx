"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Step = "email" | "code";

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  async function requestCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setStep("code");
        setResendCooldown(45);
        setTimeout(() => codeInputs.current[0]?.focus(), 100);
      } else {
        setError(data.message ?? "No se pudo enviar el código");
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    const joined = code.join("");
    if (joined.length !== 6) {
      setError("Ingresa los 6 dígitos");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: joined }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        router.push("/dashboard");
      } else {
        setError(data.message ?? "Código inválido");
        setCode(["", "", "", "", "", ""]);
        codeInputs.current[0]?.focus();
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeInput(i: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(0, 1);
    const next = [...code];
    next[i] = clean;
    setCode(next);
    if (clean && i < 5) codeInputs.current[i + 1]?.focus();
    if (next.every((c) => c.length === 1) && i === 5) {
      // Auto-submit when last digit typed
      setTimeout(verifyCode, 100);
    }
  }

  function handleCodeKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      codeInputs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") verifyCode();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      setTimeout(verifyCode, 100);
    }
  }

  const emailValid = email.includes("@") && email.includes(".");

  if (step === "email") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-3xl font-bold italic tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p className="text-sm text-neutral-400">
            Te mandaremos un código de 6 dígitos a tu correo
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (emailValid) requestCode();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-neutral-300">
              Email
            </Label>
            <input
              id="email"
              type="email"
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm outline-none focus:border-amber-400/50"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={!emailValid || loading}
            className="w-full bg-amber-400 text-black hover:bg-amber-300 font-medium py-3 disabled:opacity-40"
          >
            {loading ? "Enviando código…" : "Enviar código"}
          </Button>
        </form>

        <p className="text-xs text-neutral-500 text-center">
          ¿Aún no tienes cuenta?{" "}
          <a href="/registro" className="text-amber-400 hover:underline">
            Crear cuenta
          </a>
        </p>
      </div>
    );
  }

  // Code step
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-heading text-3xl font-bold italic tracking-tight">
          Revisa tu correo
        </h1>
        <p className="text-sm text-neutral-400">
          Enviamos un código de 6 dígitos a{" "}
          <span className="text-neutral-200 font-mono">{email}</span>
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 justify-center">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                codeInputs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeInput(i, e.target.value)}
              onKeyDown={(e) => handleCodeKey(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className="w-12 h-14 text-center text-2xl font-mono font-bold bg-white/[0.04] border border-white/[0.08] rounded-md outline-none focus:border-amber-400/50 focus:bg-amber-400/[0.04]"
            />
          ))}
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        <Button
          onClick={verifyCode}
          disabled={code.some((c) => !c) || loading}
          className="w-full bg-amber-400 text-black hover:bg-amber-300 font-medium py-3 disabled:opacity-40"
        >
          {loading ? "Verificando…" : "Verificar"}
        </Button>
      </div>

      <div className="text-center space-y-2 text-xs text-neutral-500">
        <p>¿No te llegó? Revisa tu spam.</p>
        <button
          onClick={() => resendCooldown === 0 && requestCode()}
          disabled={resendCooldown > 0 || loading}
          className="text-amber-400 hover:underline disabled:text-neutral-600 disabled:no-underline"
        >
          {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : "Reenviar código"}
        </button>
        <p className="pt-2">
          <button
            onClick={() => {
              setStep("email");
              setCode(["", "", "", "", "", ""]);
              setError(null);
            }}
            className="text-neutral-400 hover:text-neutral-200"
          >
            ← Cambiar email
          </button>
        </p>
      </div>
    </div>
  );
}
