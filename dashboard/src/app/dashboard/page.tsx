import { Shell } from "@/components/shell";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Shell>
      <DashboardClient />
    </Shell>
  );
}
