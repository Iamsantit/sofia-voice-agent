import { Shell } from "@/components/shell";
import { PerfilForm } from "./perfil-form";

export default function PerfilPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold italic tracking-tight">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Personaliza tu nombre, foto y datos de contacto
        </p>
      </div>
      <PerfilForm />
    </Shell>
  );
}
