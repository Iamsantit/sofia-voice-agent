"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "invited" | "active";
  created_at: string;
  invited_by?: string;
};

const ROLES = [
  { key: "admin", label: "Admin", desc: "Todo excepto cerrar la cuenta", color: "fuchsia" },
  { key: "editor", label: "Editor", desc: "Crea y edita agentes/leads", color: "amber" },
  { key: "viewer", label: "Solo lectura", desc: "Ve métricas y conversaciones", color: "cyan" },
];

const ROLE_COLORS: Record<string, string> = {
  owner: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  admin: "border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-500/10",
  editor: "border-amber-500/30 text-amber-300 bg-amber-500/5",
  viewer: "border-cyan-500/30 text-cyan-300 bg-cyan-500/10",
};

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

export function EquipoView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("editor");
  const [submitting, setSubmitting] = useState(false);
  const [inviteToast, setInviteToast] = useState<{
    text: string;
    kind: "success" | "warn" | "error";
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") setMembers(data.members ?? []);
      else setError(data.message ?? "Error");
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
        }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        const invite = data.invite ?? {};
        const targetEmail = data.member?.email ?? email;
        if (invite.sent && !invite.sandbox_redirect) {
          setInviteToast({
            text: `✓ Invitación enviada a ${targetEmail}`,
            kind: "success",
          });
        } else if (invite.sent && invite.sandbox_redirect) {
          setInviteToast({
            text: `Invitación redirigida al owner (Resend en sandbox). Para enviar a usuarios reales, verifica tu dominio.`,
            kind: "warn",
          });
        } else {
          setInviteToast({
            text: `Miembro guardado, pero el email no salió: ${invite.error ?? "desconocido"}. Compártele el acceso manualmente.`,
            kind: "warn",
          });
        }
        setTimeout(() => setInviteToast(null), 8000);
        setShowInvite(false);
        setName("");
        setEmail("");
        setRole("editor");
        await load();
      } else {
        setError(data.message ?? "Error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function changeRole(memberId: string, newRole: string) {
    await fetch(`/api/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    await load();
  }

  async function removeMember(member: Member) {
    if (!confirm(`¿Quitar a ${member.name} (${member.email}) del equipo?`)) return;
    const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.status !== "ok") {
      alert(data.message ?? "Error");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-5">
      {/* Header card */}
      <Card className="border-white/[0.06] bg-gradient-to-br from-fuchsia-500/[0.04] via-transparent to-cyan-500/[0.04]">
        <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
              Miembros activos
            </p>
            <p className="font-heading text-3xl italic font-bold">
              {loading ? "—" : members.length}
            </p>
          </div>
          <Button
            onClick={() => setShowInvite(!showInvite)}
            className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
          >
            {showInvite ? "Cerrar" : "+ Invitar miembro"}
          </Button>
        </CardContent>
      </Card>

      {/* Invite form */}
      {showInvite && (
        <Card className="border-amber-500/20 bg-amber-500/[0.02]">
          <CardHeader>
            <CardTitle className="font-heading text-lg italic">Nuevo miembro</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">Nombre</Label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="María López"
                    className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-neutral-400">Email</Label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="maria@empresa.com"
                    className="w-full rounded-md bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm outline-none focus:border-amber-400/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-neutral-400">Rol</Label>
                <div className="grid md:grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key as Member["role"])}
                      className={`rounded-lg border p-3 text-left transition ${
                        role === r.key
                          ? "border-amber-400/60 bg-amber-400/[0.08]"
                          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <p className="text-sm font-medium text-neutral-100">{r.label}</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/[0.04] p-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInvite(false)}
                  className="border-white/[0.1] text-neutral-300"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-amber-400 text-black hover:bg-amber-300 font-medium"
                >
                  {submitting ? "Invitando…" : "Enviar invitación"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="font-heading text-lg italic">Miembros</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-neutral-500 text-center py-6">Cargando…</p>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">👥</p>
              <p className="text-sm text-neutral-400 mb-3">Aún estás solo en el equipo</p>
              <Button
                onClick={() => setShowInvite(true)}
                variant="outline"
                className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              >
                Invitar al primero
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-white/[0.06] bg-black/20 p-4 flex items-center gap-4"
                >
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-fuchsia-500/40 to-amber-500/40 ring-1 ring-white/[0.1] flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {initialsOf(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-neutral-100 truncate">
                        {m.name}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${ROLE_COLORS[m.role] || ""}`}
                      >
                        {m.role}
                      </Badge>
                      {m.status === "invited" && (
                        <Badge variant="outline" className="border-neutral-700 text-neutral-400 text-[10px]">
                          pendiente
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate">{m.email}</p>
                  </div>

                  {m.role !== "owner" ? (
                    <div className="flex gap-2 shrink-0">
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                        className="rounded-md bg-white/[0.04] border border-white/[0.08] px-2 py-1 text-xs outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => removeMember(m)}
                        className="text-xs text-red-400 hover:bg-red-500/10 px-3 py-1 rounded-md border border-red-500/20"
                      >
                        Quitar
                      </button>
                    </div>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                      Tú
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {inviteToast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md ${
            inviteToast.kind === "success"
              ? "border-emerald-500/40 bg-emerald-500/[0.08] text-emerald-100"
              : inviteToast.kind === "warn"
                ? "border-amber-500/40 bg-amber-500/[0.08] text-amber-100"
                : "border-red-500/40 bg-red-500/[0.08] text-red-100"
          }`}
        >
          {inviteToast.text}
        </div>
      )}
    </div>
  );
}
