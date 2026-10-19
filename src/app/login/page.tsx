import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/lib/app";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: `Accedi · ${APP_NAME}` };

const SYMBOLS = [
  { text: "π", className: "top-[70px] right-7 rotate-12 text-[64px] lg:top-[120px] lg:right-[60px] lg:text-[96px]" },
  { text: "Aa", className: "top-[150px] left-[170px] text-[40px] lg:top-10 lg:right-[220px] lg:left-auto lg:text-5xl" },
  { text: "DNA", className: "top-[300px] left-[46%] hidden -rotate-10 text-[64px] lg:block" },
  { text: "Hi!", className: "top-[210px] left-16 hidden -rotate-6 text-[56px] lg:block" },
];

const STEPS = [
  { label: "Ripasso", className: "bg-lime h-[34px] lg:h-[70px]" },
  { label: "Lezione", className: "bg-sky h-[58px] lg:h-[125px]", current: true },
  { label: "Pratica", className: "bg-coral h-[82px] lg:h-[180px]" },
  { label: "Verifica", className: "bg-sun h-[106px] lg:h-[235px]" },
];

const CHIPS = [
  { label: "Esercizi a gradini", className: "bg-brand-soft text-brand-dark" },
  { label: "Spiegazioni passo passo", className: "bg-good-soft text-good" },
  { label: "Pronto per l’esame", className: "bg-bad-soft text-bad" },
];

function TrophyIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

function Stairs() {
  return (
    <div aria-hidden="true" className="relative flex h-[132px] items-end gap-1.5 px-6 lg:h-[300px] lg:gap-2.5 lg:px-0">
      {STEPS.map((step) => (
        <div
          key={step.label}
          className={`relative flex-1 rounded-t-xl text-sm font-bold text-ink lg:rounded-t-[18px] lg:px-3 lg:py-3.5 ${step.className}`}
        >
          <span className="hidden lg:inline">{step.label}</span>
          {step.current && (
            <div className="absolute -top-[26px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 lg:-top-16">
              <span className="hidden rounded-[10px] bg-white px-2.5 py-1 text-[13px] font-extrabold whitespace-nowrap text-brand-deep lg:block">
                Sei qui
              </span>
              <span className="size-5 rounded-full border-3 border-ink bg-sun lg:size-[26px] lg:border-4" />
            </div>
          )}
        </div>
      ))}
      <div className="flex h-[130px] flex-1 flex-col items-center gap-2.5 rounded-t-xl bg-white pt-2.5 text-sm font-extrabold text-brand-deep lg:h-[290px] lg:items-start lg:rounded-t-[18px] lg:px-3 lg:py-3.5">
        <span className="hidden text-ink lg:inline">Esame!</span>
        <TrophyIcon className="size-[22px] lg:size-[34px]" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col bg-brand-deep lg:flex-row lg:bg-canvas">
      <section className="relative flex flex-col overflow-hidden bg-brand-deep text-white lg:min-h-[520px] lg:flex-[1_1_520px] lg:justify-between lg:gap-10 lg:px-14 lg:py-12">
        {SYMBOLS.map((symbol) => (
          <span
            key={symbol.text}
            aria-hidden="true"
            className={`absolute font-display font-extrabold text-white/8 ${symbol.className}`}
          >
            {symbol.text}
          </span>
        ))}
        <div className="relative flex flex-col gap-[18px] px-6 pt-9 lg:contents">
          <div className="lg:relative">
            <Logo size="lg" tone="white" />
          </div>
          <div className="flex max-w-[520px] flex-col gap-4 lg:relative">
            <span className="hidden items-center gap-2 self-start rounded-full bg-white/14 px-3.5 py-2 text-[15px] font-bold lg:inline-flex">
              <span aria-hidden="true" className="size-2 rounded-full bg-lime" />
              Studio per la terza media
            </span>
            <h1 className="text-4xl leading-[1.04] font-extrabold tracking-[-1.2px] lg:text-6xl lg:leading-[1.02] lg:tracking-[-2px]">
              Un gradino <br className="hidden lg:inline" />
              alla volta, <br className="hidden lg:inline" />
              <span className="text-lime">fino all’esame.</span>
            </h1>
            <p className="hidden max-w-[440px] text-[19px] leading-normal text-brand-soft lg:block">
              Esercizi che salgono con te: parti da quello che sai e arrivi dove vuoi arrivare.
            </p>
          </div>
        </div>
        <div className="mt-[18px] lg:mt-0">
          <Stairs />
        </div>
      </section>
      <main className="flex flex-1 flex-col rounded-t-[28px] bg-canvas px-6 pt-7 pb-6 lg:flex-[1_1_440px] lg:items-center lg:justify-center lg:rounded-none lg:py-14">
        <div className="flex w-full max-w-[420px] flex-col gap-4 lg:gap-[22px]">
          <div className="flex flex-col gap-1.5 lg:gap-2">
            <h2 className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.6px] lg:text-[40px] lg:tracking-[-1px]">
              Ciao! Pronto a salire?
            </h2>
            <p className="text-[15px] leading-normal text-ink-soft lg:text-[17px]">
              Entra con l’email e la password che ti abbiamo dato.
            </p>
          </div>
          <LoginForm />
          <div className="mt-2.5 hidden flex-wrap justify-center gap-2 lg:flex">
            {CHIPS.map((chip) => (
              <span key={chip.label} className={`rounded-full px-3.5 py-2 text-sm font-bold ${chip.className}`}>
                {chip.label}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
