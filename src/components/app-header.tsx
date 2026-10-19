import Link from "next/link";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/app";
import { signOut } from "@/lib/auth/actions";

export function AppHeader({ name }: { name?: string }) {
  return (
    <header className="bg-brand-deep text-white">
      <div className="mx-auto flex h-16 w-full max-w-xl items-center justify-between px-4">
        <Link href="/" aria-label={APP_NAME}>
          <Logo tone="white" />
        </Link>
        {name && (
          <form action={signOut} className="flex items-center gap-3">
            <span className="text-sm font-medium text-brand-soft">{name}</span>
            <button
              type="submit"
              className="rounded-full bg-white/14 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-white/22"
            >
              Esci
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
