import { Shell } from "@/components/shell";
import { DiagnosticsView } from "./diagnostics-view";

export default function DiagnosticsPage() {
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Diagnóstico
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Prueba cada servicio externo — Retell, Twilio, Notion, Cal.com, Claude
        </p>
      </div>

      <DiagnosticsView />
    </Shell>
  );
}
