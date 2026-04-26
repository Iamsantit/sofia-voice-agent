import { Shell } from "@/components/shell";

export function ComingSoon({
  title,
  description,
  emoji,
}: {
  title: string;
  description: string;
  emoji: string;
}) {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-base text-neutral-500">{description}</p>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-white/[0.08] p-16 text-center">
        <p className="text-7xl mb-6">{emoji}</p>
        <p className="font-heading text-2xl italic font-bold text-neutral-300 mb-2">
          Próximamente
        </p>
        <p className="text-sm text-neutral-500 max-w-md mx-auto">
          Esta sección está en desarrollo. Te avisaremos por email cuando esté lista.
        </p>
      </div>
    </Shell>
  );
}
