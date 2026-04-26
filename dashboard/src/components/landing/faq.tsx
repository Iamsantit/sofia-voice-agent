"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "¿Necesito instalar algo?",
    a: "No. Sofia funciona 100% en la nube. Solo creas tu cuenta, contestas 4 preguntas sobre tu negocio y tu agente queda listo en 3 minutos. No hay app, no hay código, no hay equipo de TI involucrado.",
  },
  {
    q: "¿Qué pasa si el cliente pregunta algo que Sofia no sabe?",
    a: "Sofia tiene un protocolo de escalación: te pide los datos del cliente, agenda un callback con un humano de tu equipo y registra todo en tu CRM. Nunca cuelga sin opción.",
  },
  {
    q: "¿Puedo usar mi propia voz?",
    a: "Sí, en plan Business y Enterprise puedes clonar tu voz (o la de un actor profesional) y Sofia hablará con ese tono. La clonación toma 5 minutos de audio y queda lista en 24h.",
  },
  {
    q: "¿Qué tan natural suena?",
    a: "Usamos los modelos de TTS más avanzados del mercado (ElevenLabs y Cartesia) en español latam. La mayoría de personas no detectan que es IA en los primeros 30 segundos.",
  },
  {
    q: "¿Qué idiomas soporta?",
    a: "Español (latam, neutro, mexicano, colombiano, argentino), inglés (US/UK), portugués, francés e italiano. Cambiar el idioma es un toggle en la configuración del agente.",
  },
  {
    q: "¿Cómo se integra con mi CRM?",
    a: "Conexión por webhook con HubSpot, Pipedrive, Salesforce, Zoho y cualquier sistema vía Zapier o Make. Sofia escribe la transcripción, el resumen IA, el sentimiento del lead y la siguiente acción automáticamente.",
  },
  {
    q: "¿Es seguro? ¿Qué pasa con los datos?",
    a: "Cifrado en tránsito y en reposo. No usamos tus llamadas para entrenar modelos. Cumplimos con GDPR y, en plan Enterprise, ofrecemos compliance HIPAA y SOC 2 con BAA firmado.",
  },
  {
    q: "¿Puedo cambiar de plan o cancelar?",
    a: "Cuando quieras, sin letras chicas ni penalidades. Si bajas de plan, mantienes acceso al plan superior hasta el final del periodo pagado.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="border-t border-white/[0.06]"
    >
      <div className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
            Preguntas frecuentes
          </h2>
          <p className="mt-3 text-neutral-400">
            Lo que la gente nos pregunta antes de empezar.
          </p>
        </div>

        <div className="space-y-2">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div
                key={item.q}
                className={`rounded-xl border transition ${
                  isOpen
                    ? "border-amber-400/30 bg-amber-400/[0.03]"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                >
                  <span className="text-sm md:text-base text-neutral-100 font-medium">
                    {item.q}
                  </span>
                  <span
                    className={`flex-shrink-0 h-6 w-6 rounded-full border border-white/[0.15] flex items-center justify-center text-xs transition-transform ${
                      isOpen
                        ? "rotate-45 border-amber-400/50 text-amber-300"
                        : "text-neutral-400"
                    }`}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 -mt-1 text-sm text-neutral-300 leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-neutral-500 mt-10">
          ¿Más dudas? Escríbenos a{" "}
          <a
            href="mailto:hola@sofia.ai"
            className="text-amber-400 hover:text-amber-300"
          >
            hola@sofia.ai
          </a>
        </p>
      </div>
    </section>
  );
}
