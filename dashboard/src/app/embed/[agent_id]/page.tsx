import { EmbedForm } from "./embed-form";

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ agent_id: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { agent_id } = await params;
  const { source } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-950 text-neutral-100">
      <EmbedForm agentId={agent_id} source={source ?? ""} />
    </div>
  );
}
