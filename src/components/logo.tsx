const SIZES = {
  sm: { mark: "h-[22px]", text: "text-2xl" },
  lg: { mark: "h-[29px] lg:h-[40px]", text: "text-3xl lg:text-[40px]" },
} as const;

const TONES = {
  ink: { pill: "fill-brand", text: "text-ink" },
  white: { pill: "fill-white", text: "text-white" },
} as const;

export function LogoMark({ className, tone = "ink" }: { className: string; tone?: keyof typeof TONES }) {
  return (
    <svg viewBox="0 0 46 40" className={`w-auto ${className}`} aria-hidden="true">
      <rect x="24" y="0" width="22" height="10" rx="5" className="fill-lime" />
      <rect x="12" y="15" width="22" height="10" rx="5" className={TONES[tone].pill} />
      <rect x="0" y="30" width="22" height="10" rx="5" className={TONES[tone].pill} />
    </svg>
  );
}

export function Logo({ size = "sm", tone = "ink" }: { size?: keyof typeof SIZES; tone?: keyof typeof TONES }) {
  const { mark, text } = SIZES[size];
  return (
    <span className="inline-flex items-center gap-2.5 lg:gap-3.5">
      <LogoMark className={mark} tone={tone} />
      <span className={`font-display leading-none font-extrabold tracking-tighter ${TONES[tone].text} ${text}`}>
        gradino
      </span>
    </span>
  );
}
