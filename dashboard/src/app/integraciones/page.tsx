import { Shell } from "@/components/shell";
import { IntegracionesView } from "./integraciones-view";

export default function IntegracionesPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Integraciones
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Conecta Voicely con Slack, Zapier y otras herramientas
        </p>
      </div>
      <IntegracionesView />
    </Shell>
  );
}
