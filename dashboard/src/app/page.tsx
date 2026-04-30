import Link from "next/link";
import { Pricing } from "@/components/landing/pricing";
import { CustomPlanBuilder } from "@/components/landing/custom-plan-builder";
import { FAQ } from "@/components/landing/faq";
import { Stats } from "@/components/landing/stats";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Reveal } from "@/components/fx/reveal";

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

const TESTIMONIALS = [
  {
    quote:
      "Pasamos de perder 4 de cada 10 llamadas fuera de horario a contestar el 100%. En 2 meses recuperamos lo invertido al año.",
    author: "Marisol R.",
    role: "Dueña, Clínica Dental",
    initial: "M",
  },
  {
    quote:
      "Sofia agenda visitas a propiedades sola. El equipo de ventas ahora solo recibe leads ya filtrados — el cierre subió 30%.",
    author: "Carlos V.",
    role: "Director Comercial, Inmobiliaria",
    initial: "C",
  },
  {
    quote:
      "Probamos con un agente para confirmar reservas. Ahora tenemos 3 — el ROI fue ridículo. Los clientes ni notan que es IA.",
    author: "Ana T.",
    role: "Gerente, Restaurante",
    initial: "A",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 text-base font-bold text-black">
              S
            </div>
            <p className="font-heading text-xl font-bold italic tracking-tight">
              Sofia<span className="text-amber-400">AI</span>
            </p>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a
              href="#como-funciona"
              className="text-neutral-400 hover:text-neutral-100 transition"
            >
              Cómo funciona
            </a>
            <a
              href="#features"
              className="text-neutral-400 hover:text-neutral-100 transition"
            >
              Qué hace
            </a>
            <a
              href="#industries"
              className="text-neutral-400 hover:text-neutral-100 transition"
            >
              Industrias
            </a>
            <a
              href="#planes"
              className="text-neutral-400 hover:text-neutral-100 transition"
            >
              Planes
            </a>
            <a
              href="#faq"
              className="text-neutral-400 hover:text-neutral-100 transition"
            >
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-neutral-400 hover:text-neutral-100 transition"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:bg-amber-300 transition"
            >
              Crear mi agente
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(249,115,22,0.06),transparent_40%)]" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-neutral-300 mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Voz natural · Español latam · Claude 4.5
            </div>
            <h1 className="font-heading text-5xl md:text-7xl font-bold italic tracking-tight leading-[1.05]">
              La recepcionista que
              <br />
              <span className="text-aurora">nunca duerme.</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-400 max-w-2xl">
              Sofia contesta tus llamadas, califica leads, agenda citas y
              actualiza tu CRM — todo con inteligencia artificial. Sin
              empleados, sin guardias, sin drama.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/registro"
                className="rounded-lg bg-amber-400 px-6 py-3 text-sm font-medium text-black hover:bg-amber-300 transition shadow-lg shadow-amber-400/20"
              >
                Crear mi agente gratis →
              </Link>
              <a
                href="#como-funciona"
                className="rounded-lg border border-white/[0.1] px-6 py-3 text-sm text-neutral-300 hover:bg-white/[0.04] transition"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-6 text-xs text-neutral-500">
              Setup en 3 minutos · Plan gratis incluido · Sin tarjeta requerida
              para empezar
            </p>

            {/* Trust badges */}
            <div className="mt-12 flex flex-wrap items-center gap-6 text-[11px] text-neutral-500">
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> Cifrado E2E
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> GDPR / SOC 2
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> 99.9% uptime
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-emerald-400">✓</span> Sin permanencia
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats animados */}
      <Reveal>
        <Stats />
      </Reveal>

      {/* Cómo funciona */}
      <Reveal>
        <HowItWorks />
      </Reveal>

      {/* Features */}
      <Reveal>
      <section id="features" className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-12">
            <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
              Qué hace Sofia
            </h2>
            <p className="mt-3 text-neutral-400">
              No es un chatbot. Es una recepcionista con voz natural, contexto
              de tu negocio y criterio para decidir qué hacer.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="lift rounded-xl border border-white/[0.06] glass p-6 hover:border-amber-400/30 hover:shadow-[0_0_40px_-15px_rgba(251,191,36,0.4)] transition group"
              >
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-medium text-neutral-100 mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      </Reveal>

      {/* Industries */}
      <Reveal>
      <section id="industries" className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-2xl mb-12">
            <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
              Hecha para tu industria
            </h2>
            <p className="mt-3 text-neutral-400">
              Cada template viene pre-configurado con el tono, los tools y el
              flujo de tu tipo de negocio. Solo la ajustas con tu nombre y
              listo.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {INDUSTRIES.map((i) => (
              <div
                key={i.label}
                className="lift rounded-xl border border-white/[0.06] glass p-5 text-center hover:border-amber-500/30 hover:shadow-[0_0_30px_-15px_rgba(251,191,36,0.4)] transition cursor-default"
              >
                <div className="text-3xl mb-2">{i.icon}</div>
                <p className="text-sm text-neutral-200">{i.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-neutral-500 mt-8">
            ¿Otro negocio? También funciona — el template genérico adapta Sofia
            a tu caso con un prompt redactado por Claude.
          </p>
        </div>
      </section>

      </Reveal>

      {/* Testimonials */}
      <Reveal>
      <section className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
              Lo que dicen quienes ya la usan
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.author}
                className="lift rounded-2xl border border-white/[0.06] glass p-6 flex flex-col hover:border-amber-400/30 transition"
              >
                <div className="text-amber-400 text-2xl mb-3">"</div>
                <p className="text-sm text-neutral-300 leading-relaxed flex-1">
                  {t.quote}
                </p>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/[0.06]">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-black">
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-sm text-neutral-100 font-medium">
                      {t.author}
                    </p>
                    <p className="text-[11px] text-neutral-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      </Reveal>

      {/* Pricing con toggle */}
      <Reveal>
        <Pricing />
      </Reveal>

      {/* Plan ajustable (Max → Ajustar uso) */}
      <Reveal>
        <CustomPlanBuilder />
      </Reveal>

      {/* FAQ */}
      <Reveal>
        <FAQ />
      </Reveal>

      {/* CTA final */}
      <Reveal>
      <section className="border-t border-white/[0.06] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.08),transparent_60%)]" />
        <div className="max-w-4xl mx-auto px-6 py-24 text-center relative">
          <h2 className="font-heading text-4xl md:text-6xl font-bold italic tracking-tight">
            3 minutos y Sofia
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              empieza a trabajar.
            </span>
          </h2>
          <p className="mt-6 text-neutral-400 max-w-xl mx-auto">
            No hay código, ni tutorial de 30 pasos. Respondes 4 preguntas sobre
            tu negocio y tu agente queda listo.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <Link
              href="/registro"
              className="rounded-lg bg-amber-400 px-8 py-4 text-sm font-medium text-black hover:bg-amber-300 transition shadow-lg shadow-amber-400/20"
            >
              Crear mi agente gratis →
            </Link>
            <Link
              href="/llamada-prueba"
              className="rounded-lg border border-white/[0.1] px-8 py-4 text-sm text-neutral-300 hover:bg-white/[0.04] transition"
            >
              📞 Hablar con Sofia primero
            </Link>
          </div>
        </div>
      </section>

      </Reveal>

      {/* Footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-sm font-bold text-black">
                  S
                </div>
                <p className="font-heading text-lg font-bold italic tracking-tight">
                  Sofia<span className="text-amber-400">AI</span>
                </p>
              </div>
              <p className="text-sm text-neutral-400 max-w-md">
                Agentes de voz IA para negocios que no quieren perder ni una
                llamada.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
                Producto
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="text-neutral-400 hover:text-neutral-100"
                  >
                    Funciones
                  </a>
                </li>
                <li>
                  <a
                    href="#planes"
                    className="text-neutral-400 hover:text-neutral-100"
                  >
                    Planes
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="text-neutral-400 hover:text-neutral-100"
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500 mb-3">
                Cuenta
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/login"
                    className="text-neutral-400 hover:text-neutral-100"
                  >
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link
                    href="/registro"
                    className="text-neutral-400 hover:text-neutral-100"
                  >
                    Crear cuenta
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:hola@sofia.ai"
                    className="text-neutral-400 hover:text-neutral-100"
                  >
                    Contacto
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-500">
            <p>© {new Date().getFullYear()} SofiaAI. Todos los derechos reservados.</p>
            <p>Powered by Retell · Claude · Twilio</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
