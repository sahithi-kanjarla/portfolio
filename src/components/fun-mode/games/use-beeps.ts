import { useCallback, useEffect, useRef, useState } from "react";

import { writeStore } from "./shared";

// Tiny square-wave beeps for the retro games. The AudioContext is created on
// the first beep (always after a click or key press) and closed on unmount.
export function useBeeps(storeKey: string) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(() => {
    try {
      return window.localStorage.getItem(storeKey) !== "0";
    } catch {
      return true;
    }
  });
  const onRef = useRef(on);
  onRef.current = on;

  const beep = useCallback((notes: [number, number][], type: OscillatorType = "square") => {
    if (!onRef.current) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = (ctxRef.current ??= new AC());
      if (ctx.state === "suspended") void ctx.resume();
      let t = ctx.currentTime;
      for (const [freq, dur] of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.045, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        t += dur * 0.9;
      }
    } catch {
      /* audio is a nicety */
    }
  }, []);

  useEffect(
    () => () => {
      void ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
    },
    [],
  );

  const toggle = useCallback(() => {
    setOn((v) => {
      writeStore(storeKey, v ? "0" : "1");
      return !v;
    });
  }, [storeKey]);
  return { on, beep, toggle };
}
