const STEPS = [
  {
    n: "01",
    title: "Cuéntale de tu negocio",
    desc: "Respondes 4 preguntas: industria, qué vendes, qué horarios manejas y cómo te gusta atender. Toma menos de 2 minutos.",
    icon: "📝",
  },
  {
    n: "02",
    title: "Sofia genera tu agente",
    desc: "Claude redacta el prompt, elige la voz adecuada para tu industria y configura las herramientas (calendario, CRM, WhatsApp).",
    icon: "✨",
  },
  {
    n: "03",
    title: "Conecta tu número",
    desc: "Compras un número desde el dashboard o portas el tuyo. En 5 minutos Sofia ya está contestando llamadas reales.",
    icon: "📞",
  },
  {
    n: "04",
    title: "Optimiza con datos",
    desc: "Cada llamada queda transcrita y analizada. Ves qué funciona, qué objeciones aparecen y ajustas el prompt sin tocar código.",
    icon: "📈",
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="border-t border-white/[0.06] relative"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(251,191,36,0.05),transparent_60%)] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 py-24 relative">
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl font-bold italic tracking-tight">
            Cómo funciona
          </h2>
          <p className="mt-3 text-neutral-400 max-w-xl mx-auto">
            Sin instalación, sin código, sin equipo de TI. En 4 pasos tienes tu
            agente respondiendo llamadas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-amber-400/20 transition group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-heading text-3xl font-bold italic text-amber-400/60 group-hover:text-amber-400 transition">
                  {s.n}
                </span>
                <span className="text-2xl">{s.icon}</span>
              </div>
              <h3 className="font-medium text-neutral-100 mb-2">{s.title}</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">{s.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-amber-400/40 to-transparent" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
