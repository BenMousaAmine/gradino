"use client";

import { useActionState, useState } from "react";
import { Spinner } from "@/components/ui";
import { signIn, type LoginState } from "./actions";

const initialState: LoginState = { error: null, email: "" };

const inputClass =
  "h-[54px] w-full rounded-[14px] border-2 border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-brand focus:ring-4 focus:ring-brand/18 lg:h-[58px] lg:rounded-2xl lg:px-[18px] lg:text-[17px]";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4 lg:gap-[22px]">
      <label className="flex flex-col gap-1.5 lg:gap-2">
        <span className="text-sm font-bold lg:text-[15px]">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nome@scuola.it"
          required
          defaultValue={state.email}
          className={inputClass}
        />
      </label>
      <div className="flex flex-col gap-1.5 lg:gap-2">
        <label htmlFor="password" className="text-sm font-bold lg:text-[15px]">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="La tua password"
            required
            className={`${inputClass} pr-14 lg:pr-[60px]`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Nascondi password" : "Mostra password"}
            className="absolute top-[5px] right-[5px] flex size-11 items-center justify-center rounded-xl text-ink-soft lg:top-[7px] lg:right-1.5"
          >
            {showPassword ? (
              <svg {...iconProps} strokeWidth="2" className="size-[22px]">
                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
              </svg>
            ) : (
              <svg {...iconProps} strokeWidth="2" className="size-[22px]">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {state.error && (
        <p role="alert" className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-1.5 flex h-[58px] items-center justify-center gap-2.5 rounded-2xl bg-brand font-display text-[19px] font-extrabold text-white shadow-[0_6px_0_var(--color-brand-dark)] transition-[transform,box-shadow,filter] duration-75 hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_var(--color-brand-dark)] disabled:cursor-wait lg:mt-1 lg:h-[62px] lg:rounded-[18px] lg:text-xl"
      >
        {pending && <Spinner className="size-5" />}
        {pending ? "Accesso in corso…" : "Entra"}
        {!pending && (
          <svg {...iconProps} strokeWidth="2.5" className="size-5 lg:size-[22px]">
            <path d="M4 18h5v-5h5V8h5" />
            <path d="M16 5l3 3-3 3" />
          </svg>
        )}
      </button>
      <p className="mt-1 text-center text-sm leading-normal text-ink-soft lg:mt-1.5 lg:text-[15px]">
        Non ricordi la password? Chiedila a chi ti ha dato l’account.
      </p>
    </form>
  );
}
