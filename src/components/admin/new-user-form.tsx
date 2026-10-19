"use client";

import { useActionState } from "react";
import { Button, Spinner } from "@/components/ui";
import { createUser, type NewUserState } from "@/lib/admin/actions";

const initialState: NewUserState = { error: null, name: "", email: "", role: "student" };

const inputClass =
  "h-[54px] w-full rounded-[14px] border-2 border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand focus:ring-4 focus:ring-brand/18";

const ROLES = [
  { value: "student", label: "Studente", hint: "Fa il test iniziale e studia." },
  { value: "admin", label: "Admin", hint: "Vede il pannello e può creare utenti." },
] as const;

export function NewUserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Nome</span>
        <input name="name" required maxLength={60} defaultValue={state.name} placeholder="Come lo vedrà nell’app" className={inputClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          defaultValue={state.email}
          placeholder="nome@esempio.it"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-bold">Password</span>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          maxLength={72}
          autoComplete="off"
          spellCheck={false}
          placeholder="Almeno 8 caratteri"
          className={inputClass}
        />
        <span className="text-xs text-ink-soft">Gliela comunichi tu: con email e password entra subito.</span>
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-bold">Ruolo</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ROLES.map((role) => (
            <label
              key={role.value}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-line p-3 has-checked:border-brand has-checked:bg-brand-soft"
            >
              <input type="radio" name="role" value={role.value} defaultChecked={state.role === role.value} className="mt-1 accent-brand" />
              <span className="flex flex-col">
                <span className="font-semibold">{role.label}</span>
                <span className="text-xs text-ink-soft">{role.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 w-full gap-2">
        {pending && <Spinner className="size-5" />}
        {pending ? "Creazione in corso…" : "Crea utente"}
      </Button>
    </form>
  );
}
