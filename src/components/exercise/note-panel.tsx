"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";

export type NoteSource = "typed" | "voice" | "mixed";

type RecognitionResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: RecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type RecognitionConstructor = new () => Recognition;

const MIN_WORDS = 3;

function recognitionConstructor(): RecognitionConstructor | null {
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

function subscribe() {
  return () => {};
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter((word) => word.length > 1).length;
}

export function NotePanel({
  solved,
  pending,
  onSubmit,
}: {
  solved: boolean;
  pending: boolean;
  onSubmit: (note: string, source: NoteSource, ms: number) => void;
}) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceFailed, setVoiceFailed] = useState(false);
  const canDictate = useSyncExternalStore(subscribe, () => recognitionConstructor() !== null, () => false);
  const shownAt = useRef<number | null>(null);
  const typed = useRef(false);
  const dictated = useRef(false);
  const recognition = useRef<Recognition | null>(null);

  useEffect(() => {
    shownAt.current = performance.now();
    return () => recognition.current?.stop();
  }, []);

  const toggleDictation = () => {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    const instance = new Constructor();
    instance.lang = "it-IT";
    instance.continuous = true;
    instance.interimResults = false;
    instance.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) transcript += ` ${result[0].transcript}`;
      }
      const words = transcript.trim();
      if (!words) return;
      dictated.current = true;
      setText((previous) => (previous.trim() ? `${previous.trimEnd()} ${words}` : words));
    };
    instance.onerror = () => setVoiceFailed(true);
    instance.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = instance;
    setVoiceFailed(false);
    setListening(true);
    instance.start();
  };

  const words = countWords(text);
  const ready = words >= MIN_WORDS;

  const submit = () => {
    recognition.current?.stop();
    const source: NoteSource = typed.current && dictated.current ? "mixed" : dictated.current ? "voice" : "typed";
    const ms = shownAt.current === null ? 0 : Math.round(performance.now() - shownAt.current);
    onSubmit(text.trim(), source, ms);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-2xl bg-brand-soft px-4 py-3 text-brand-dark">
        <p className="font-display text-xl font-extrabold">
          {solved ? "Raccontaci come l’hai pensata" : "Raccontaci come l’hai pensata e dove ti sei bloccato"}
        </p>
        <p className="text-sm">Bastano un paio di frasi, scritte o dettate. Poi vedi la soluzione.</p>
      </div>

      <textarea
        value={text}
        onChange={(event) => {
          typed.current = true;
          setText(event.target.value);
        }}
        rows={4}
        maxLength={4000}
        placeholder="Prima ho pensato di…"
        aria-label="Come l’hai pensata"
        className="w-full resize-y rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg outline-none focus:border-brand"
      />

      <div className="flex items-center justify-between gap-3">
        {canDictate ? (
          <Button variant="secondary" onClick={toggleDictation} disabled={pending} aria-pressed={listening}>
            {listening ? "⏹ Ferma la dettatura" : "🎤 Detta"}
          </Button>
        ) : (
          <span />
        )}
        <span className={`text-sm ${ready ? "text-good" : "text-ink-soft"}`}>
          {ready ? "Perfetto" : `Ancora ${MIN_WORDS - words} ${MIN_WORDS - words === 1 ? "parola" : "parole"}`}
        </span>
      </div>
      {voiceFailed && <p className="text-sm text-bad">Il microfono non ha funzionato: puoi scrivere.</p>}

      <Button onClick={submit} disabled={!ready} loading={pending} className="w-full">
        Invia e vedi la soluzione
      </Button>
    </div>
  );
}
