import { Shell } from "@/components/shell";
import { PlantillasView } from "./plantillas-view";

export default function PlantillasPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Plantillas
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Guarda prompts reutilizables y aplícalos a cualquier agente
        </p>
      </div>
      <PlantillasView />
    </Shell>
  );
}
