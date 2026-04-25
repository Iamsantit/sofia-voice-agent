"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Session = {
  owner_name?: string;
  owner_email?: string;
  business_name?: string;
  industry?: string;
  agent_name?: string;
  agent_id?: string;
  avatar_data_url?: string;
  created_at?: string;
};

const MAX_AVATAR_BYTES = 1_500_000; // 1.5 MB

function initialsOf(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export function PerfilForm() {
  const router = useRouter();
  const [session, setSession] = useState<Session>({});
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [avatar, setAvatar] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("sofia_session");
      if (raw) {
        const s: Session = JSON.parse(raw);
        setSession(s);
        setName(s.owner_name || "");
        setBusinessName(s.business_name || "");
        setAvatar(s.avatar_data_url);
      }
    } catch {}
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(`Imagen demasiado grande (máx 1.5 MB). La tuya pesa ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(String(reader.result));
    };
    reader.onerror = () => setError("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatar(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next: Session = {
        ...session,
        owner_name: name.trim(),
        business_name: businessName.trim(),
        avatar_data_url: avatar,
      };
      localStorage.setItem("sofia_session", JSON.stringify(next));
      // Disparar storage event manualmente para que el sidebar se actualice en la misma pestaña
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "sofia_session",
          newValue: JSON.stringify(next),
        })
      );
      setSession(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (!confirm("¿Cerrar sesión? Los datos guardados localmente se mantienen.")) return;
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/login");
  }

  const dirty =
    name !== (session.owner_name || "") ||
    businessName !== (session.business_name || "") ||
    avatar !== session.avatar_data_url;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Avatar */}
      <Card className="border-white/[0.06] bg-gradient-to-br from-fuchsia-500/[0.04] via-transparent to-cyan-500/[0.04]">
        <CardHeader>
          <CardTitle className="font-heading text-lg italic">Foto de perfil</CardTitle>
          <p className="text-xs text-neutral-500">
            Aparece en el sidebar y en tus mensajes
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            {/* Avatar preview */}
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-white/[0.1]"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-fuchsia-500/40 to-amber-500/40 ring-2 ring-white/[0.1] flex items-center justify-center text-2xl font-semibold text-white">
                  {initialsOf(name || session.owner_name)}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  variant="outline"
                  className="border-white/[0.1] text-neutral-200 hover:bg-white/[0.04]"
                >
                  📁 Subir imagen
                </Button>
                {avatar && (
                  <Button
                    type="button"
                    onClick={removeAvatar}
                    variant="outline"
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    Quitar
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-neutral-500">
                PNG, JPG o WEBP. Máximo 1.5 MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name + business */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="font-heading text-lg italic">Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm text-neutral-300">
              Tu nombre
            </Label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business_name" className="text-sm text-neutral-300">
              Nombre del negocio
            </Label>
            <input
              id="business_name"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Mi Negocio"
              className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-neutral-300">Email</Label>
            <input
              type="email"
              value={session.owner_email || ""}
              disabled
              className="w-full rounded-md bg-white/[0.02] border border-white/[0.06] px-3 py-2 text-sm font-mono text-neutral-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-neutral-500">
              El email se asocia con tu sesión y no se puede cambiar aquí.
            </p>
          </div>

          {session.industry && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-neutral-500">Industria:</span>
              <Badge variant="outline" className="border-amber-500/30 text-amber-300">
                {session.industry}
              </Badge>
            </div>
          )}
          {session.agent_name && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500">Agente:</span>
              <Badge variant="outline" className="border-fuchsia-500/30 text-fuchsia-300">
                {session.agent_name}
              </Badge>
              {session.agent_id && (
                <code className="text-[10px] text-neutral-600 font-mono">
                  {session.agent_id.slice(0, 14)}…
                </code>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Save bar */}
      <div className="flex items-center justify-between gap-4 sticky bottom-0 -mx-2 px-2">
        <div className="rounded-xl border border-white/[0.08] bg-neutral-950/90 backdrop-blur-md p-4 flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-red-500/20 text-red-300 hover:bg-red-500/10"
            >
              Cerrar sesión
            </Button>
            {saved && <span className="text-xs text-emerald-400">✓ Guardado</span>}
          </div>
          <Button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="bg-amber-400 text-black hover:bg-amber-300 font-medium disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
