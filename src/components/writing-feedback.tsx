import type { WritingView } from "@/lib/writing/queries";

export function writingState(writing: WritingView): { label: string; tone: string } {
  if (writing.review) return { label: `Voto ${writing.review.score}/10`, tone: "bg-good-soft text-good" };
  if (writing.ai) return { label: `Correzione automatica ${writing.ai.score}/10`, tone: "bg-brand-soft text-brand-dark" };
  if (writing.aiStatus === "pending") return { label: "Correzione in corso", tone: "bg-warn-soft text-warn" };
  return { label: "In attesa di correzione", tone: "bg-warn-soft text-warn" };
}

export function WritingBadge({ writing }: { writing: WritingView }) {
  const state = writingState(writing);
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${state.tone}`}>{state.label}</span>;
}

export function WritingText({ writing }: { writing: WritingView }) {
  return (
    <p lang="en" className="rounded-3xl border-2 border-line bg-surface p-5 text-lg leading-relaxed whitespace-pre-wrap">
      {writing.body}
    </p>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-bold">{title}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function WritingFeedback({ writing }: { writing: WritingView }) {
  const { ai, review } = writing;
  return (
    <div className="flex flex-col gap-4">
      {review && (
        <section className="flex flex-col gap-2 rounded-3xl border-2 border-good-soft bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-extrabold">Correzione finale</h2>
            <span className="font-display text-3xl font-extrabold text-good">{review.score}/10</span>
          </div>
          {review.comment && <p className="whitespace-pre-wrap">{review.comment}</p>}
        </section>
      )}

      {ai ? (
        <section className="flex flex-col gap-4 rounded-3xl border-2 border-line bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-extrabold">Correzione automatica</h2>
            <span className="font-display text-3xl font-extrabold text-brand-dark">{ai.score}/10</span>
          </div>
          <p>{ai.summary}</p>
          {ai.covered.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold">Punti della traccia</p>
              <ul className="flex flex-col gap-1">
                {ai.covered.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <span aria-hidden="true">{item.done ? "✅" : "❌"}</span>
                    <span>
                      {item.point}
                      <span className="sr-only">{item.done ? ": fatto" : ": manca"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <List title="Cosa hai fatto bene" items={ai.strengths} />
          {ai.fixes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold">Da correggere</p>
              <ol className="flex flex-col gap-2">
                {ai.fixes.map((fix, index) => (
                  <li key={index} className="flex flex-col gap-1 rounded-2xl bg-canvas p-3">
                    <p lang="en">
                      <span className="text-bad line-through">{fix.original}</span>
                      <span aria-hidden="true"> → </span>
                      <span className="sr-only"> diventa </span>
                      <span className="font-semibold text-good">{fix.corrected}</span>
                    </p>
                    <p className="text-sm text-ink-soft">{fix.explanation}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="rounded-2xl bg-sun/15 px-4 py-3">
            <p className="text-sm font-bold">La prossima volta</p>
            <p>{ai.nextStep}</p>
          </div>
        </section>
      ) : (
        !review && (
          <section className="rounded-3xl border-2 border-line bg-surface p-5">
            <h2 className="text-xl font-extrabold">{writing.aiStatus === "pending" ? "Correzione in corso" : "In attesa di correzione"}</h2>
            <p className="text-ink-soft">Il testo è consegnato. Quando arriva la correzione la trovi qui, con il voto e i consigli.</p>
          </section>
        )
      )}
    </div>
  );
}
