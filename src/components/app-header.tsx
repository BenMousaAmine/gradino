import Link from "next/link";
import { Logo } from "@/components/logo";
import { SubmitButton } from "@/components/submit-button";
import { APP_NAME } from "@/lib/app";
import { signOut, switchMode } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

async function HeaderActions({ name }: { name: string }) {
  const user = await getCurrentUser();
  const isAdmin = user.role === "admin";
  const studentMode = user.mode === "student";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className={`text-sm font-medium text-brand-soft ${isAdmin ? "hidden sm:inline" : ""}`}>{name}</span>
      {isAdmin && (
        <form action={switchMode.bind(null, studentMode ? "admin" : "student")}>
          <SubmitButton
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold whitespace-nowrap ${
              studentMode ? "bg-lime text-ink hover:brightness-105" : "bg-white text-brand-deep hover:bg-brand-soft"
            }`}
          >
            {studentMode ? "Torna admin" : "Vista studente"}
          </SubmitButton>
        </form>
      )}
      <form action={signOut}>
        <SubmitButton className="rounded-full bg-white/14 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-white/22">
          Esci
        </SubmitButton>
      </form>
    </div>
  );
}

export function AppHeader({ name }: { name?: string }) {
  return (
    <header className="bg-brand-deep text-white">
      <div className="mx-auto flex h-16 w-full max-w-xl items-center justify-between px-4">
        <Link href="/" aria-label={APP_NAME}>
          <Logo tone="white" />
        </Link>
        {name && <HeaderActions name={name} />}
      </div>
    </header>
  );
}
