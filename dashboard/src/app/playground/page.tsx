import { Shell } from "@/components/shell";
import { PlaygroundChat } from "./playground-chat";

export const dynamic = "force-dynamic";

export default function PlaygroundPage() {
  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-heading text-5xl font-bold italic tracking-tight">
          Playground
        </h1>
        <p className="mt-2 text-base text-neutral-500">
          Chatea con tu agente en el navegador antes de hacer una llamada real.
          Sin gastar minutos.
        </p>
      </div>
      <PlaygroundChat />
    </Shell>
  );
}
