import { Shell } from "@/components/shell";
import { AgentesView } from "./agentes-view";

export default function AgentesPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Agentes
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Crea, edita y administra tus agentes de voz IA
        </p>
      </div>
      <AgentesView />
    </Shell>
  );
}
