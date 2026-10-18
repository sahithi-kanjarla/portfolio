import { useEffect, useRef } from "react";

import swirl from "@/assets/rabbit-hole/swirl.webp";

// The entrance: the rabbit hole's own spiral, with nothing flying into it.
// It opens in the middle of the screen, spins up, and swallows everything.

const DONE_MS = 2000;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

export function WellFall({ onDone }: { onDone: () => void }) {
  const swirlRef = useRef<HTMLImageElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let frame = 0;
    let finished = false;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const reach = Math.hypot(w, h) + 120;
      const small = w < 768 ? 0.62 : 1;

      const grow = ease(span(t, 0, 1400));
      const engulf = ease(span(t, 900, 1800)) ** 1.6;
      const scale = (0.5 + grow * 3) * (1 + engulf * 14) * small;
      const turn = -t / 3;

      const s = swirlRef.current;
      if (s) {
        s.style.left = `${cx}px`;
        s.style.top = `${cy}px`;
        s.style.opacity = `${span(t, 0, 350) * (1 - span(t, 1600, 1850))}`;
        s.style.transform = `translate(-63%, -47%) rotate(${turn}deg) scale(${scale})`;
      }
      const hole = holeRef.current;
      if (hole) {
        // the swirl's dark core is ~70px across at scale 1
        const core = (34 * scale) / (0.72 * reach);
        hole.style.left = `${cx - reach * 2}px`;
        hole.style.top = `${cy - reach * 2}px`;
        hole.style.width = hole.style.height = `${reach * 4}px`;
        hole.style.transform = `rotate(${turn - 20}deg) scale(${core}, ${core * (0.74 + 0.26 * engulf)})`;
        hole.style.opacity = `${span(t, 150, 600)}`;
      }
      if (!finished && t >= DONE_MS) {
        finished = true;
        done.current();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ background: "#f7f5f0" }}>
      <div
        ref={holeRef}
        className="absolute rounded-full opacity-0 [filter:blur(6px)]"
        style={{
          transform: "scale(0)",
          background:
            "radial-gradient(closest-side, #0b0b0d 0%, #0b0b0d 36%, rgb(22 22 25) 42%, rgb(40 40 43 / 0.82) 48%, rgb(78 76 73 / 0.5) 56%, rgb(130 126 120 / 0.24) 65%, rgb(170 166 160 / 0.08) 74%, transparent 84%)",
        }}
      />
      <img ref={swirlRef} src={swirl} alt="" className="absolute w-[360px] max-w-none origin-[63%_47%] opacity-0 [mask-image:radial-gradient(closest-side,black_55%,transparent_100%)]" />
    </div>
  );
}
