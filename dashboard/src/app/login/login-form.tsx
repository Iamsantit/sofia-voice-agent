"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubmitting(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    // Optimistic redirect: kick off the auth call, prefetch the dashboard,
    // and navigate immediately. If the cookie is set in time the dashboard
    // loads authenticated; if not, the proxy/middleware bounces back here.
    fetch("/api/auth/quick-signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.status !== "ok") {
          // Auth failed — undo optimistic state, surface error
          setSubmitting(false);
          setError(data?.message ?? "No se pudo iniciar sesión");
          // Send the user back to /login if we already navigated
          router.replace("/login");
        }
      })
      .catch(() => {
        setSubmitting(false);
        setError("Error de red. Intenta de nuevo.");
        router.replace("/login");
      });

    // Navigate now — the dashboard renders its skeleton instantly.
    router.prefetch("/dashboard");
    router.push("/dashboard");
  }

  const emailValid = email.includes("@") && email.includes(".");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-heading text-3xl font-bold italic tracking-tight">
          Bienvenido de vuelta
        </h1>
        <p className="text-sm text-neutral-400">Entra con tu correo</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          disabled={!emailValid || submitting}
          className="w-full bg-amber-400 text-black hover:bg-amber-300 font-medium py-3 disabled:opacity-40"
        >
          {submitting ? "Entrando…" : "Entrar"}
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
