import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-[0_5px_0_var(--color-brand-dark)] hover:brightness-105 active:translate-y-1 active:shadow-[0_1px_0_var(--color-brand-dark)]",
  secondary:
    "border-2 border-line bg-surface text-ink shadow-[0_4px_0_var(--color-line)] hover:border-brand/40 active:translate-y-1 active:shadow-none",
  ghost: "text-ink-soft hover:text-ink",
};

export function buttonClass(variant: Variant = "primary") {
  return `inline-flex h-13 items-center justify-center gap-2 rounded-2xl px-5 font-display text-lg font-extrabold transition-[transform,box-shadow,filter] duration-75 disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-wait aria-busy:opacity-100 ${variants[variant]}`;
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant)} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border-2 border-line bg-surface p-5 ${className}`}>{children}</div>;
}
