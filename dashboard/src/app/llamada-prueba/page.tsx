import { Shell } from "@/components/shell";
import { TestCallForm } from "./test-call-form";

export default function LlamadaPruebaPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Llamada de Prueba
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Dispara una llamada saliente al instante para probar al agente
        </p>
      </div>

      <TestCallForm />
    </Shell>
  );
}
