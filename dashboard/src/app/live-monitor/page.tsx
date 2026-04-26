import { Shell } from "@/components/shell";
import { LiveMonitorView } from "./live-monitor-view";

export default function LiveMonitorPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Live monitor
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Llamadas en curso y recientes en tiempo real
        </p>
      </div>
      <LiveMonitorView />
    </Shell>
  );
}
