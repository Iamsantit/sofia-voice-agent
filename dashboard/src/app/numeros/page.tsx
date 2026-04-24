import { Shell } from "@/components/shell";
import { NumerosView } from "./numeros-view";

export default function NumerosPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Números
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Compra números de teléfono y asígnalos a tu agente
        </p>
      </div>
      <NumerosView />
    </Shell>
  );
}
