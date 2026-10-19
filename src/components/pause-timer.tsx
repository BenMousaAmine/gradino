"use client";

import { useEffect, useState } from "react";

export function PauseTimer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const value = Math.max(0, minutes * 60 - Math.floor((Date.now() - startedAt) / 1000));
      setLeft(value);
      if (value === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [minutes]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return <p className="font-display text-5xl font-extrabold tabular-nums text-brand">{`${mm}:${ss}`}</p>;
}
