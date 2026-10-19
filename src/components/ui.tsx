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
  return `inline-flex h-13 items-center justify-center rounded-2xl px-5 font-display text-lg font-extrabold transition-[transform,box-shadow,filter] duration-75 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`${buttonClass(variant)} ${className}`} {...props} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border-2 border-line bg-surface p-5 ${className}`}>{children}</div>;
}
