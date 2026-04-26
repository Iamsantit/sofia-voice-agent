import { Shell } from "@/components/shell";
import { CampanasView } from "./campanas-view";

export default function CampanasPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Campañas
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Lanza llamadas outbound masivas con seguimiento por lead
        </p>
      </div>
      <CampanasView />
    </Shell>
  );
}
