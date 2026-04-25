"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/quick-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        router.push("/dashboard");
      } else {
        setError(data.message ?? "No se pudo iniciar sesión");
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const emailValid = email.includes("@") && email.includes(".");

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="font-heading text-3xl font-bold italic tracking-tight">
          Bienvenido de vuelta
        </h1>
        <p className="text-sm text-neutral-400">
          Entra con tu correo
        </p>
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
          disabled={!emailValid || loading}
          className="w-full bg-amber-400 text-black hover:bg-amber-300 font-medium py-3 disabled:opacity-40"
        >
          {loading ? "Entrando…" : "Entrar"}
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
