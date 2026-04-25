import Link from "next/link";

const INDUSTRIES = [
  { icon: "🏠", label: "Inmobiliaria" },
  { icon: "🦷", label: "Clínicas Dentales" },
  { icon: "💪", label: "Gimnasios" },
  { icon: "🍽️", label: "Restaurantes" },
  { icon: "🏥", label: "Clínicas Médicas" },
  { icon: "⚖️", label: "Bufetes de Abogados" },
  { icon: "💇", label: "Salones de Belleza" },
  { icon: "🐾", label: "Veterinarias" },
];

const FEATURES = [
  {
    title: "Contesta 24/7",
    desc: "Nunca más un cliente al buzón. Sofía responde siempre, incluso a las 3 AM.",
    icon: "📞",
  },
  {
    title: "Califica leads automáticamente",
    desc: "Clasifica cada llamada como Hot, Warm o Cold con IA. Tu equipo solo ve los que valen la pena.",
    icon: "🎯",
  },
  {
    title: "Agenda sin intervención humana",
    desc: "Conectada con tu calendario, propone horarios, confirma y te llega la cita lista.",
    icon: "📅",
  },
  {
    title: "CRM que se actualiza solo",
    desc: "Cada llamada se registra en tu CRM con transcripción, resumen IA y próxima acción.",
    icon: "🗂️",
  },
  {
    title: "Llamadas outbound en piloto",
    desc: "Sofía llama sola a tus leads pendientes cada hora. Sin perseguir a nadie.",
    icon: "🤖",
  },
  {
    title: "Análisis con Claude 4.5",
    desc: "Al terminar cada llamada, Claude analiza sentimiento, interés real y próximo paso.",
    icon: "🧠",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 via-amber-400 to-cyan-400 text-lg font-bold text-black shadow-lg shadow-fuchsia-500/20">
              V
            </div>
            <div>
              <p className="font-heading text-lg font-semibold italic tracking-tight bg-gradient-to-r from-fuchsia-300 via-amber-300 to-cyan-300 bg-clip-text text-transparent">
                Voicely
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                AI Voice Platform
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#features" className="text-neutral-400 hover:text-neutral-100">
              Qué hace
            </a>
            <a href="#industries" className="text-neutral-400 hover:text-neutral-100">
              Industrias
            </a>
            <Link
              href="/login"
              className="text-neutral-400 hover:text-neutral-100"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:bg-amber-300 transition"
            >
              Crear mi agente
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(249,115,22,0.06),transparent_40%)]" />
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-neutral-300 mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Voz natural · Español latam · Claude 4.5
            </div>
            <h1 className="font-heading text-5xl md:text-7xl font-bold italic tracking-tight leading-[1.05]">
              La recepcionista que
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                nunca duerme.
              </span>
            </h1>
            <p className="mt-6 text-lg text-neutral-400 max-w-2xl">
              Sofía contesta tus llamadas, califica leads, agenda citas y actualiza
              tu CRM — todo con inteligencia artificial. Sin empleados, sin
              guardias, sin drama.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/registro"
                className="rounded-lg bg-amber-400 px-6 py-3 text-sm font-medium text-black hover:bg-amber-300 transition"
              >
                Crear mi agente gratis →
              </Link>
              <a
                href="#features"
                className="rounded-lg border border-white/[0.1] px-6 py-3 text-sm text-neutral-300 hover:bg-white/[0.04] transition"
              >
                Ver qué hace
              </a>
            </div>
            <p className="mt-6 text-xs text-neutral-500">
              Setup en 3 minutos · Plan gratis incluido · Sin tarjeta requerida para empezar
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-12">
            <h2 className="font-heading text-4xl font-bold italic tracking-tight">
              Qué hace Sofía
            </h2>
            <p className="mt-3 text-neutral-400">
              No es un chatbot. Es una recepcionista con voz natural, contexto de
              tu negocio y criterio para decidir qué hacer.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] transition"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-medium text-neutral-100 mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-12">
            <h2 className="font-heading text-4xl font-bold italic tracking-tight">
              Hecha para tu industria
            </h2>
            <p className="mt-3 text-neutral-400">
              Cada template viene pre-configurado con el tono, los tools y el flujo
              de tu tipo de negocio. Solo la ajustas con tu nombre y listo.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {INDUSTRIES.map((i) => (
              <div
                key={i.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 text-center hover:bg-amber-500/[0.04] hover:border-amber-500/20 transition"
              >
                <div className="text-3xl mb-2">{i.icon}</div>
                <p className="text-sm text-neutral-200">{i.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-neutral-500 mt-8">
            ¿Otro negocio? También funciona — el template genérico adapta Sofía a
            tu caso.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
            3 minutos y Sofía empieza a trabajar.
          </h2>
          <p className="mt-4 text-neutral-400">
            No hay código, ni tutorial de 30 pasos. Respondes 4 preguntas sobre tu
            negocio y tu agente queda listo.
          </p>
          <Link
            href="/registro"
            className="inline-block mt-10 rounded-lg bg-amber-400 px-8 py-4 text-sm font-medium text-black hover:bg-amber-300 transition"
          >
            Empezar ahora →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-8 text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Voicely</p>
          <p>Powered by Retell · Claude · Twilio</p>
        </div>
      </footer>
    </div>
  );
}
