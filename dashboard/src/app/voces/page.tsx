import { Shell } from "@/components/shell";
import { VocesView } from "./voces-view";

export default function VocesPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Voces
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Elige una voz del catálogo o crea la tuya propia
        </p>
      </div>
      <VocesView />
    </Shell>
  );
}
