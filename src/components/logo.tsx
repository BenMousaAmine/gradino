const SIZES = {
  sm: { mark: 26, text: "text-xl" },
  lg: { mark: 52, text: "text-5xl" },
} as const;

export function LogoMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="3" y="34" width="20" height="9" rx="4.5" className="fill-step-1" />
      <rect x="14" y="20" width="20" height="9" rx="4.5" className="fill-step-2" />
      <rect x="25" y="6" width="20" height="9" rx="4.5" className="fill-step-3" />
    </svg>
  );
}

export function Logo({ size = "sm" }: { size?: keyof typeof SIZES }) {
  const { mark, text } = SIZES[size];
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={mark} />
      <span className={`font-extrabold tracking-tighter text-ink ${text}`}>gradino</span>
    </span>
  );
}
