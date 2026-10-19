"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/ui";

export function SubmitButton({ children, className }: { children: ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={`inline-flex items-center gap-1.5 aria-busy:cursor-wait ${className}`}
    >
      {pending && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
