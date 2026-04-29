import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CopilotWidget } from "./copilot-widget";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pl-64">
        <Topbar />
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
      <CopilotWidget />
    </div>
  );
}
