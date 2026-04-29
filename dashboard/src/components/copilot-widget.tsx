"use client";

import { useEffect, useRef, useState } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

const SUGGESTIONS = [
  "¿Cuántos leads hot tengo?",
  "Resume mis últimas 5 llamadas",
  "¿Qué dice el prompt de mi agente?",
  "¿Cuál es mi tasa de éxito?",
];

/**
 * Floating AI co-pilot widget mounted at the bottom-right of the dashboard.
 * Click the orb → opens a chat panel powered by Claude with tool access
 * to leads / calls / agent config.
 */
export function CopilotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "Hola 👋 Soy tu copiloto. Pregúntame lo que quieras sobre tus leads, llamadas o agente.",
        },
      ]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (data.status === "ok" && data.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      } else {
        setError(data.message ?? "No pude responder");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
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

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir copiloto IA"
        className={`fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-[0_0_30px_-5px_rgba(251,191,36,0.6)] transition-transform hover:scale-105 ${
          open
            ? "bg-neutral-900 border border-white/[0.1]"
            : "bg-gradient-to-br from-amber-300 to-orange-500"
        }`}
      >
        <span className="text-2xl">{open ? "✕" : "✨"}</span>
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-neutral-950 animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-8rem)] rounded-2xl border border-white/[0.1] glass-strong shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-base">
              ✨
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-100">
                Copiloto IA
              </p>
              <p className="text-[10px] text-neutral-500">
                Powered by Claude
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-amber-400/15 text-amber-50 border border-amber-400/20"
                    : "rounded-bl-sm bg-white/[0.05] text-neutral-100 border border-white/[0.06]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="rounded-2xl rounded-bl-sm bg-white/[0.05] border border-white/[0.06] px-3.5 py-2.5 inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:240ms]" />
              </div>
            )}

            {/* Suggestion chips on first opening */}
            {messages.length <= 1 && !sending && (
              <div className="pt-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                  Prueba con
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left text-xs rounded-md border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-amber-400/20 transition px-3 py-2 text-neutral-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mx-4 mb-2 rounded-md border border-red-500/30 bg-red-500/[0.04] p-2 text-[11px] text-red-300">
              {error}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.08] focus-within:border-amber-400/40 px-3 py-1.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Pregúntame algo…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || sending}
                className="h-7 w-7 rounded-full bg-amber-400 text-black text-xs font-bold disabled:opacity-30 hover:bg-amber-300 transition"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
