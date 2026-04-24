import Link from "next/link";
import { OnboardingSuccess } from "./onboarding-success";

export default function OnboardingExitoPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-black">
              S
            </div>
            <p className="font-heading text-lg font-semibold italic tracking-tight">
              Sofía
            </p>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <OnboardingSuccess />
      </main>
    </div>
  );
}
