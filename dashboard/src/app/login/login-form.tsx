"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ErrorState = {
  message: string;
  code?: "not_registered" | "wrong_password" | "invalid_input" | string;
} | null;

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !password) return;
    setSubmitting(true);
    setError(null);

    router.prefetch("/dashboard");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.status === "ok") {
        router.replace("/dashboard");
        return;
      }

      setError({
        message: data.message ?? "No se pudo iniciar sesión",
        code: data.code,
      });
      setSubmitting(false);
    } catch {
      setError({ message: "Error de red. Intenta de nuevo." });
      setSubmitting(false);
    }
  }

  const canSubmit =
    identifier.trim().length >= 3 && password.length >= 1 && !submitting;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-heading text-3xl font-bold italic tracking-tight">
          Bienvenido de vuelta
        </h1>
        <p className="text-sm text-neutral-400">
          Entra con tu correo o teléfono
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier" className="text-sm text-neutral-300">
            Correo o número de teléfono
          </Label>
          <input
            id="identifier"
            type="text"
            autoFocus
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="tu@email.com  ó  +573001234567"
            className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-sm outline-none focus:border-amber-400/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm text-neutral-300">
            Contraseña
          </Label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-4 py-3 pr-12 text-sm outline-none focus:border-amber-400/50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-300"
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>

        {error && (
          <div
            className={`rounded-md border p-3 text-xs space-y-2 ${
              error.code === "not_registered"
                ? "border-amber-500/30 bg-amber-500/[0.04] text-amber-200"
                : "border-red-500/30 bg-red-500/[0.04] text-red-300"
            }`}
          >
            <p>{error.message}</p>
            {error.code === "not_registered" && (
              <Link
                href={`/registro?prefill=${encodeURIComponent(identifier)}`}
                className="inline-block rounded-md bg-amber-400 px-3 py-1.5 text-[11px] font-medium text-black hover:bg-amber-300 transition"
              >
                Crear cuenta con este correo →
              </Link>
            )}
          </div>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-amber-400 text-black hover:bg-amber-300 font-medium py-3 disabled:opacity-40"
        >
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>

      <p className="text-xs text-neutral-500 text-center">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="text-amber-400 hover:underline">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
