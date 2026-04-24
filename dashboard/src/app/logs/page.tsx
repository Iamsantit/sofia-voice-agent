import { Shell } from "@/components/shell";
import { LogsStream } from "./logs-stream";

export default function LogsPage() {
  return (
    <Shell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-bold italic tracking-tight">
            Logs
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Eventos del backend en tiempo real — Modal, Retell, Twilio, Notion
          </p>
        </div>
      </div>

      <LogsStream />
    </Shell>
  );
}
