"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Msg = {
  id: string;
  sender_email: string;
  sender_name: string;
  text: string;
  ts: string;
};

type Profile = {
  owner_email?: string;
  owner_name?: string;
};

const POLL_MS = 5000;

function initialsOf(name: string, email: string) {
  const src = name?.trim() || email?.split("@")[0] || "?";
  const parts = src.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function colorFor(email: string): string {
  // Stable color per sender email
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) | 0;
  const palette = [
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-fuchsia-400 to-pink-500",
    "from-blue-400 to-cyan-500",
    "from-violet-400 to-purple-500",
    "from-rose-400 to-red-500",
  ];
  return palette[Math.abs(hash) % palette.length];
}

export function TeamChatView() {
  const [profile, setProfile] = useState<Profile>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planLocked, setPlanLocked] = useState(false);
  const [planLockReason, setPlanLockReason] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Read local profile (current user's email)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("sofia_session");
      if (raw) {
        const s = JSON.parse(raw);
        setProfile({
          owner_email: s.owner_email,
          owner_name: s.owner_name,
        });
      }
    } catch {}
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/team-chat", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "ok") {
        setMessages(data.messages ?? []);
        setPlanLocked(false);
        setPlanLockReason(null);
        setError(null);
      } else if (data.code === "plan_locked") {
        setPlanLocked(true);
        setPlanLockReason(data.message);
      } else if (res.status === 401) {
        setError("Inicia sesión para ver los mensajes");
      } else {
        setError(data.message ?? "Error cargando mensajes");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(id);
  }, [fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setInput("");
        // Optimistic append
        setMessages((m) => [...m, data.message]);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (data.code === "plan_locked") {
        setPlanLocked(true);
        setPlanLockReason(data.message);
      } else {
        setError(data.message ?? "No se pudo enviar");
      }
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // Plan-locked state
  if (planLocked) {
    return (
      <div className="rounded-2xl border border-amber-400/30 glass p-10 text-center max-w-2xl mx-auto">
        <div className="text-5xl mb-4">🔒</div>
        <h3 className="font-heading text-2xl font-bold italic mb-2">
          Chat de equipo bloqueado
        </h3>
        <p className="text-sm text-neutral-300 max-w-md mx-auto mb-6">
          {planLockReason ??
            "El chat interno está disponible solo en el plan Max."}
        </p>
        <Link
          href="/facturacion"
          className="inline-block rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-medium px-6 py-2.5 text-sm transition"
        >
          Ver planes →
        </Link>
      </div>
    );
  }

  const myEmail = (profile.owner_email || "").toLowerCase();

  return (
    <div className="rounded-2xl border border-white/[0.08] glass overflow-hidden flex flex-col h-[72vh] min-h-[520px]">
      {/* Header */}
      <div className="px-5 py-3 border-b border-white/[0.06] flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-base">
          💬
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-100">Chat del equipo</p>
          <p className="text-[11px] text-neutral-500">
            Polling cada 5s · Solo miembros aceptados pueden ver
          </p>
        </div>
        <button
          onClick={fetchMessages}
          className="text-[11px] text-neutral-500 hover:text-neutral-300"
        >
          ↻
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5"
      >
        {!loaded ? (
          <p className="text-sm text-neutral-500 text-center py-10">
            Cargando…
          </p>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-2">👋</p>
            <p className="text-sm text-neutral-500">
              No hay mensajes aún. Escribe el primero.
            </p>
            <p className="text-[11px] text-neutral-600 mt-1">
              Tip: invita a tu equipo en{" "}
              <Link href="/equipo" className="text-amber-400 hover:underline">
                /equipo
              </Link>{" "}
              para que puedan escribir aquí.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_email.toLowerCase() === myEmail;
            const prev = messages[i - 1];
            const sameSenderAsPrev =
              prev && prev.sender_email === m.sender_email;
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${
                  mine ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    sameSenderAsPrev ? "invisible" : ""
                  } bg-gradient-to-br ${colorFor(m.sender_email)} text-black`}
                >
                  {initialsOf(m.sender_name, m.sender_email)}
                </div>
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${
                    mine
                      ? "rounded-br-sm bg-amber-400/15 text-amber-50 border border-amber-400/20"
                      : "rounded-bl-sm bg-white/[0.05] text-neutral-100 border border-white/[0.06]"
                  }`}
                >
                  {!sameSenderAsPrev && !mine && (
                    <p className="text-[10px] text-neutral-400 font-medium mb-0.5">
                      {m.sender_name || m.sender_email.split("@")[0]}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>
                  <p className="text-[9px] text-neutral-500 mt-1 text-right">
                    {formatTime(m.ts)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="mx-5 mb-2 rounded-md border border-red-500/30 bg-red-500/[0.04] p-2 text-[11px] text-red-300">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.08] focus-within:border-amber-400/40 px-4 py-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Escribe un mensaje al equipo…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || sending}
            className="bg-amber-400 text-black hover:bg-amber-300 font-medium h-8 px-4 disabled:opacity-30"
          >
            {sending ? "…" : "Enviar ↑"}
          </Button>
        </div>
      </div>
    </div>
  );
}
