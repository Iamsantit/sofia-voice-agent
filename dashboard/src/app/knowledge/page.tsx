import { Shell } from "@/components/shell";
import { KnowledgeView } from "./knowledge-view";

export default function KnowledgePage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Knowledge
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Documentos y respuestas que Sofia usa en cada llamada
        </p>
      </div>
      <KnowledgeView />
    </Shell>
  );
}
