import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewUserForm } from "@/components/admin/new-user-form";
import { AppHeader } from "@/components/app-header";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/queries";
import { APP_NAME } from "@/lib/app";

export const metadata: Metadata = { title: `Nuovo utente · ${APP_NAME}` };

async function NewUser() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader name={user.displayName} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
        <Link href="/admin" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ← Tutti gli studenti
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight">Nuovo utente</h1>
          <p className="text-ink-soft">Crea l’account: comparirà subito nel pannello.</p>
        </div>
        <Card>
          <NewUserForm />
        </Card>
      </main>
    </>
  );
}

export default function NewUserPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-4 py-6">
          <div className="h-96 animate-pulse rounded-3xl bg-line/60" />
        </main>
      }
    >
      <NewUser />
    </Suspense>
  );
}
