"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Msg = {
  role: "user" | "assistant";
  content: string;
  ts: number;
};

type AgentInfo = {
  agent_name?: string;
  voice_id?: string;
  business_name?: string;
};

export function PlaygroundChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Load agent info + greeting on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/my-agent", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.status === "ok") {
          setAgent({
            agent_name: d.link?.agent_name || d.agent?.agent_name,
            voice_id: d.agent?.voice_id,
            business_name: d.link?.business_name,
          });
          // Inject greeting as the first assistant message so user sees it
          const greeting = d.llm?.begin_message;
          if (greeting) {
            setMessages([{ role: "assistant", content: greeting, ts: Date.now() }]);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Autoscroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const next: Msg[] = [
      ...messages,
      { role: "user", content: text, ts: Date.now() },
    ];
    setMessages(next);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (data.status === "ok" && data.reply) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply, ts: Date.now() },
        ]);
      } else {
        setError(data.message ?? "Sin respuesta");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function reset() {
    setMessages([]);
    setError(null);
    // Re-fetch greeting
    fetch("/api/my-agent", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const greeting = d.llm?.begin_message;
        if (greeting) {
          setMessages([{ role: "assistant", content: greeting, ts: Date.now() }]);
        }
      })
      .catch(() => {});
  }

  const initial = (agent?.agent_name?.[0] || "S").toUpperCase();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* Chat column */}
      <div className="rounded-2xl border border-white/[0.08] glass overflow-hidden flex flex-col h-[70vh] min-h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-base font-bold text-black">
                {initial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-neutral-950 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-100">
                {agent?.agent_name ?? "Tu agente"}
                {agent?.business_name ? (
                  <span className="text-neutral-500"> · {agent.business_name}</span>
                ) : null}
              </p>
              <p className="text-[11px] text-neutral-500">
                Modo texto · Claude responde como tu agente
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            disabled={sending}
            className="text-[11px] text-neutral-500 hover:text-neutral-300 disabled:opacity-30"
          >
            ↻ Reiniciar
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gradient-to-b from-transparent via-transparent to-black/10"
        >
          {messages.length === 0 && (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">💬</p>
              <p className="text-sm text-neutral-500">
                Escribe algo para empezar a probar a tu agente.
              </p>
              <p className="text-[11px] text-neutral-600 mt-1">
                Como si fuera un cliente llamando.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} initial={initial} />
          ))}
          {sending && (
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-[11px] font-bold text-black shrink-0">
                {initial}
              </div>
              <div className="rounded-2xl rounded-bl-sm bg-white/[0.05] border border-white/[0.06] px-4 py-2.5 flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-2 rounded-md border border-red-500/30 bg-red-500/[0.04] p-2 text-[11px] text-red-300">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <div className="flex items-end gap-2 rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-amber-400/40 px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              placeholder="Escribe lo que diría el cliente…"
              className="flex-1 bg-transparent text-sm outline-none resize-none max-h-32 leading-relaxed"
            />
            <Button
              onClick={send}
              disabled={!input.trim() || sending}
              className="bg-amber-400 text-black hover:bg-amber-300 font-medium h-8 px-4 disabled:opacity-30"
            >
              {sending ? "…" : "Enviar ↑"}
            </Button>
          </div>
          <p className="text-[10px] text-neutral-600 mt-1.5 px-1">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/[0.08] glass p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-3">
            Cómo usarlo
          </p>
          <ul className="space-y-2.5 text-xs text-neutral-300 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-amber-400">1.</span>
              <span>Escribe lo que diría un cliente real al llamar.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400">2.</span>
              <span>El agente responde con el mismo prompt y reglas que usa por teléfono.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400">3.</span>
              <span>Si el flujo no te gusta, ve a <a href="/configuracion" className="text-amber-400 hover:underline">Configuración</a> y ajusta el prompt.</span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300 mb-2">
            ¿Listo para llamar?
          </p>
          <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
            Cuando el agente responda como quieres, dispara una llamada de
            prueba a tu propio número.
          </p>
          <a
            href="/llamada-prueba"
            className="inline-block rounded-md bg-amber-400 text-black hover:bg-amber-300 transition px-3 py-1.5 text-xs font-medium"
          >
            📞 Llamada de prueba →
          </a>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-2">
            Tips
          </p>
          <ul className="space-y-2 text-[11px] text-neutral-400 leading-relaxed">
            <li>• Prueba objeciones difíciles: "Está muy caro", "Lo voy a pensar".</li>
            <li>• Pide hablar con un asesor — debería decir "Te transfiero".</li>
            <li>• Pide info que NO esté en el prompt — debería redirigirte.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg, initial }: { msg: Msg; initial: string }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
          isUser
            ? "bg-white/[0.08] text-neutral-300"
            : "bg-gradient-to-br from-amber-300 to-orange-500 text-black"
        }`}
      >
        {isUser ? "Tú" : initial}
      </div>
      <div
        className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-br-sm bg-amber-400/15 text-amber-50 border border-amber-400/20"
            : "rounded-bl-sm bg-white/[0.05] text-neutral-100 border border-white/[0.06]"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}
