import { Shell } from "@/components/shell";
import { PanelAdminView } from "./panel-admin-view";

export default function PanelAdminPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Panel admin
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Estado del sistema, métricas globales y herramientas internas
        </p>
      </div>
      <PanelAdminView />
    </Shell>
  );
}
