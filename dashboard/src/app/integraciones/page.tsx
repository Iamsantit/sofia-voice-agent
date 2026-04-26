import { Shell } from "@/components/shell";
import { IntegracionesView } from "./integraciones-view";

export default function IntegracionesPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Integraciones
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Conecta SofiaAI con tus herramientas
        </p>
      </div>
      <IntegracionesView />
    </Shell>
  );
}
