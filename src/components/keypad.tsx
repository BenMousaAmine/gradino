"use client";

export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "comma" | "minus" | "backspace" | "next";

const DIGIT_ROWS: KeypadKey[][] = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["minus", "0", "comma"],
];

const LABELS: Partial<Record<KeypadKey, string>> = { comma: ",", minus: "−", backspace: "⌫", next: "Avanti →" };

export function keyFromKeyboard(event: KeyboardEvent): KeypadKey | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null;
  if (/^[0-9]$/.test(event.key)) return event.key as KeypadKey;
  if (event.key === "," || event.key === ".") return "comma";
  if (event.key === "-") return "minus";
  if (event.key === "Backspace") return "backspace";
  if (event.key === "Tab" || event.key === "Enter") return "next";
  return null;
}

export function applyKey(text: string, key: KeypadKey, allowDecimal: boolean): string {
  const negative = text.startsWith("−");
  const digits = negative ? text.slice(1) : text;
  switch (key) {
    case "backspace":
      return text.slice(0, -1);
    case "minus":
      return negative ? digits : `−${digits}`;
    case "comma":
      if (!allowDecimal || digits.includes(",")) return text;
      return digits === "" ? `${text}0,` : `${text},`;
    case "next":
      return text;
    default:
      return digits.length >= 12 ? text : `${text}${key}`;
  }
}

export function Keypad({
  onKey,
  allowDecimal,
  showNext,
  disabled,
}: {
  onKey: (key: KeypadKey) => void;
  allowDecimal: boolean;
  showNext: boolean;
  disabled: boolean;
}) {
  const baseClass =
    "h-12 rounded-2xl border-2 font-display font-extrabold transition-[transform,box-shadow] duration-75 active:translate-y-[3px] active:shadow-none disabled:opacity-40";
  const keyClass = `${baseClass} border-line bg-surface text-xl text-ink shadow-[0_3px_0_var(--color-line)] active:bg-brand-soft`;

  return (
    <div className="grid grid-cols-3 gap-2 rounded-3xl border-2 border-line bg-canvas p-2">
      {DIGIT_ROWS.flat().map((key) => (
        <button
          key={key}
          type="button"
          className={keyClass}
          disabled={disabled || (key === "comma" && !allowDecimal)}
          onClick={() => onKey(key)}
          aria-label={key === "comma" ? "virgola" : key === "minus" ? "meno" : key}
        >
          {LABELS[key] ?? key}
        </button>
      ))}
      <button
        type="button"
        className={`${keyClass} ${showNext ? "" : "col-span-3"}`}
        disabled={disabled}
        onClick={() => onKey("backspace")}
        aria-label="cancella"
      >
        {LABELS.backspace}
      </button>
      {showNext && (
        <button
          type="button"
          className={`${baseClass} col-span-2 border-brand bg-brand text-base text-white shadow-[0_3px_0_var(--color-brand-dark)]`}
          disabled={disabled}
          onClick={() => onKey("next")}
        >
          {LABELS.next}
        </button>
      )}
    </div>
  );
}
