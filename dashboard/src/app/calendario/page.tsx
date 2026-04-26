import { Shell } from "@/components/shell";
import { CalendarioView } from "./calendario-view";

export default function CalendarioPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Calendario
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Citas agendadas por Sofia, ordenadas por fecha
        </p>
      </div>
      <CalendarioView />
    </Shell>
  );
}
