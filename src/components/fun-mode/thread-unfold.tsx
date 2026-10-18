import { useEffect, useRef, type ReactNode } from "react";

const PAPER = "#fbf9f4";
const IN_MS = 1800;
const OUT_MS = 1200;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

// The paper-unfold transition. One progress value `e` (0 = closed, 1 = open) is
// walked toward `target`; everything is a pure function of it, so interrupting
// (Esc mid-way) or reversing is free. The plane carries the Fun Mode content,
// so the content really is revealed by the unfolding: the sheet slides in from
// the right while the page eases left behind it.
export function ThreadUnfold({
  target,
  reduced,
  onDone,
  children,
}: {
  target: "open" | "closed";
  reduced: boolean;
  onDone: (state: "open" | "closed") => void;
  children: ReactNode;
}) {
  const planeRef = useRef<HTMLDivElement>(null);
  const e = useRef(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const page = document.querySelector<HTMLElement>("main");

    const paint = () => {
      const v = e.current;
      const plane = planeRef.current;
      if (!plane) return;
      if (reduced) {
        plane.style.opacity = String(v);
        return;
      }
      const unfold = easeInOut(v);
      plane.style.transform = unfold >= 1 ? "none" : `perspective(1600px) translateX(${(1 - unfold) * 100}%) rotateY(${(1 - unfold) * -4}deg)`;
      plane.style.boxShadow = unfold > 0 && unfold < 1 ? "-18px 0 40px rgba(0,0,0,.12), -1px 0 0 rgba(0,0,0,.18)" : "none";
      if (page) page.style.transform = unfold > 0 && unfold < 1 ? `translateX(${-5 * unfold}vw)` : "";
    };

    let raf = 0;
    let last = performance.now();
    const goal = target === "open" ? 1 : 0;
    const dur = reduced ? 150 : target === "open" ? IN_MS : OUT_MS;
    const step = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      const dir = goal > e.current ? 1 : -1;
      e.current = clamp(e.current + (dir * dt) / dur);
      if ((dir > 0 && e.current >= goal) || (dir < 0 && e.current <= goal)) e.current = goal;
      paint();
      if (e.current === goal) {
        if (page) page.style.transform = "";
        done.current(target);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    paint();
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);

  // never leave the page shifted if we unmount mid-way
  useEffect(() => {
    const page = document.querySelector<HTMLElement>("main");
    return () => {
      if (page) page.style.transform = "";
    };
  }, []);

  return (
    <div
      ref={planeRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: PAPER, transform: reduced ? "none" : "translateX(100%)", opacity: reduced ? 0 : 1, willChange: "transform" }}
    >
      {children}
    </div>
  );
}
