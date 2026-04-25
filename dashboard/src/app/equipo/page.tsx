import { Shell } from "@/components/shell";
import { EquipoView } from "./equipo-view";

export default function EquipoPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Equipo
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Invita a tu equipo a colaborar en Voicely
        </p>
      </div>
      <EquipoView />
    </Shell>
  );
}
