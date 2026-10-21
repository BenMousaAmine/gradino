"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui";
import type { Audio } from "@/lib/items/schemas";

function subscribe() {
  return () => {};
}

function pickVoices(voices: SpeechSynthesisVoice[], lang: string): [SpeechSynthesisVoice | null, SpeechSynthesisVoice | null] {
  const english = voices.filter((voice) => voice.lang.startsWith("en"));
  const first = english.find((voice) => voice.lang === lang) ?? english[0] ?? null;
  const second = english.find((voice) => voice !== first && voice.lang === lang) ?? english.find((voice) => voice !== first) ?? null;
  return [first, second];
}

export function AudioButton({ audio, onPlay }: { audio: Audio; onPlay?: () => void }) {
  const supported = useSyncExternalStore(subscribe, () => "speechSynthesis" in window, () => false);
  const [speaking, setSpeaking] = useState(false);
  const [plays, setPlays] = useState(0);
  const left = audio.maxPlays === undefined ? null : Math.max(0, audio.maxPlays - plays);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const play = (rate: number) => {
    if (left === 0) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const [first, second] = pickVoices(synth.getVoices(), audio.lang);
    const lines = audio.dialogue ?? [{ voice: 0 as const, text: audio.text }];
    lines.forEach((line, index) => {
      const utterance = new SpeechSynthesisUtterance(line.text);
      utterance.lang = audio.lang;
      utterance.rate = rate;
      const voice = line.voice === 1 ? (second ?? first) : first;
      if (voice) utterance.voice = voice;
      if (line.voice === 1 && !second) utterance.pitch = 1.35;
      if (index === lines.length - 1) {
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
      }
      synth.speak(utterance);
    });
    setSpeaking(true);
    setPlays((value) => value + 1);
    onPlay?.();
  };

  if (!supported) {
    return <p className="text-sm text-ink-soft">Questo browser non legge l’audio: chiedi a qualcuno di leggerti la frase.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => play(0.95)} aria-pressed={speaking} disabled={left === 0}>
          {speaking ? "🔊 Ascolto…" : "▶ Ascolta"}
        </Button>
        {audio.maxPlays === undefined && (
          <Button variant="ghost" onClick={() => play(0.65)}>
            🐢 Più lento
          </Button>
        )}
      </div>
      {left !== null && (
        <p className="text-sm text-ink-soft" aria-live="polite">
          {left === 0 ? "Ascolti finiti: rispondi con quello che hai capito." : `Puoi ascoltare ancora ${left} ${left === 1 ? "volta" : "volte"}.`}
        </p>
      )}
    </div>
  );
}
