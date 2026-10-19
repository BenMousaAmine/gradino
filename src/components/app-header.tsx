import Link from "next/link";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/app";
import { signOut } from "@/lib/auth/actions";

export function AppHeader({ name }: { name?: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-4">
        <Link href="/" aria-label={APP_NAME}>
          <Logo />
        </Link>
        {name && (
          <form action={signOut} className="flex items-center gap-3">
            <span className="text-sm text-ink-soft">{name}</span>
            <button type="submit" className="text-sm font-semibold text-ink-soft hover:text-ink">
              Esci
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
