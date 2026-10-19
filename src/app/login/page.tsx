import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { APP_NAME, APP_TAGLINE } from "@/lib/app";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: `Accedi · ${APP_NAME}` };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-10 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <p className="text-lg text-ink-soft">{APP_TAGLINE}</p>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-center text-ink-soft">Ciao! Entra con l’email e la password che ti abbiamo dato.</p>
        <LoginForm />
      </div>
    </main>
  );
}
