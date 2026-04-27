import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen text-neutral-100 flex flex-col">
      <header className="border-b border-white/[0.06] glass">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-bold text-black">
              S
            </div>
            <div>
              <p className="font-heading text-lg font-semibold italic tracking-tight">
                Sofía
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                Iniciar sesión
              </p>
            </div>
          </Link>
          <Link href="/registro" className="text-sm text-neutral-400 hover:text-neutral-100">
            Crear cuenta →
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
