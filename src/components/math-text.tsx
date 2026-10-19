import katex from "katex";

const MATH_PATTERN = /\$([^$]+)\$/g;

type Part = { math: boolean; value: string };

function split(text: string): Part[] {
  const parts: Part[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(MATH_PATTERN)) {
    if (match.index > lastIndex) parts.push({ math: false, value: text.slice(lastIndex, match.index) });
    parts.push({ math: true, value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push({ math: false, value: text.slice(lastIndex) });
  return parts;
}

export function MathText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {split(text).map((part, index) =>
        part.math ? (
          <span
            key={index}
            dangerouslySetInnerHTML={{ __html: katex.renderToString(part.value, { throwOnError: false }) }}
          />
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </span>
  );
}
