import { Shell } from "@/components/shell";
import { TeamChatView } from "./team-chat-view";

export const dynamic = "force-dynamic";

export default function MensajesPage() {
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Mensajes
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Chat interno entre los miembros de tu equipo
        </p>
      </div>
      <TeamChatView />
    </Shell>
  );
}
