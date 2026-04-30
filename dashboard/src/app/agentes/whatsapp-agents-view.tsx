"use client";

import Link from "next/link";

/**
 * Placeholder view for WhatsApp agents. The infrastructure is ready
 * (Twilio WhatsApp, plan limits) but the actual prompt-driven message
 * loop ships in a follow-up. For now the page directs users to wire
 * up a number first.
 */
export function WhatsappAgentsView() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent p-8">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl shrink-0">
            💬
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-2xl font-bold italic mb-1">
              Agentes de WhatsApp
            </h3>
            <p className="text-sm text-neutral-300">
              Cada agente WhatsApp es un chatbot con IA que responde 24/7 en{" "}
              <strong className="text-neutral-100">WhatsApp Business</strong>{" "}
              usando los mismos números que ya compraste para voz.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs text-neutral-400">
              <li className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                Mismo prompt y personalidad que tu agente de voz, sin reescribir
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                Califica leads, agenda citas y guarda historial en tu CRM
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                Plantillas pre-aprobadas (HSM) para mensajes proactivos
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                Transferencia a humano con un comando ("hablar con asesor")
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-3">
          Cómo activarlo
        </p>
        <ol className="space-y-3">
          <Step
            n={1}
            title="Compra un número telefónico"
            body="Ese mismo número se usa para llamadas y WhatsApp Business."
            link={{ href: "/numeros", label: "Ir a Números →" }}
          />
          <Step
            n={2}
            title="Conecta WhatsApp Business al número"
            body="En Integraciones, en la card WhatsApp, pega el número y aparece el botón para activar el sandbox de Twilio (gratis para pruebas)."
            link={{ href: "/integraciones", label: "Ir a Integraciones →" }}
          />
          <Step
            n={3}
            title="Crea tu agente de WhatsApp"
            body="Aquí mismo (próxima versión). Reusa el prompt de tu agente de voz si quieres, o creas uno nuevo desde cero."
            soon
          />
          <Step
            n={4}
            title="Tu chatbot vive 24/7"
            body="Los clientes mandan mensaje al WhatsApp del número, el bot responde, califica y agenda. Puedes ver el hilo completo en /llamadas (próxima versión: tab Mensajes WhatsApp)."
            soon
          />
        </ol>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 flex items-start gap-3">
        <span className="text-xl shrink-0">⚡</span>
        <div className="flex-1">
          <p className="text-sm text-amber-100 font-medium">
            ¿Quieres que tus invitados del trial / Pro vean WhatsApp activo?
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Tu plan controla cuántos agentes de WhatsApp puedes tener (Starter:
            0, Pro: 1, Max: 5, Custom: hasta 20). Si necesitas más,{" "}
            <Link href="/facturacion" className="text-amber-400 hover:underline">
              ajusta tu plan
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  link,
  soon,
}: {
  n: number;
  title: string;
  body: string;
  link?: { href: string; label: string };
  soon?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span className="h-7 w-7 shrink-0 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-xs font-mono font-bold text-amber-300">
        {n}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-100">
          {title}
          {soon && (
            <span className="ml-2 inline-block text-[9px] uppercase tracking-wider rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-amber-300">
              próximo
            </span>
          )}
        </p>
        <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
          {body}
        </p>
        {link && (
          <Link
            href={link.href}
            className="inline-block mt-1.5 text-[11px] text-amber-400 hover:text-amber-300 hover:underline"
          >
            {link.label}
          </Link>
        )}
      </div>
    </li>
  );
}
