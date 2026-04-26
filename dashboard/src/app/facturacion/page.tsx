import { Shell } from "@/components/shell";
import { FacturacionView } from "./facturacion-view";

export default function FacturacionPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Facturación
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Consumo, plan actual y métodos de pago
        </p>
      </div>
      <FacturacionView />
    </Shell>
  );
}
