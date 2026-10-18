import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

const PIVOT = "60px 66px";

// A small mode switch: a glossy red knob on a slim rod in a slot that glows green in fun mode, with
// "work" beside it on one side and "fun mode" on the other. It rests on work.
// Tilt it to fun mode and (for now) it simply rewinds to the top, then settles
// back on work.
//
// Optional props, used by Fun Mode: `onFun` is called (after the lever has
// visibly flipped) when the knob is deliberately activated, instead of the
// rewind-to-top; `mode` + `onWork` let the owner drive the lever, so the copy
// shown inside Fun Mode sits tilted to "fun" and sends you back to work.
export function Joystick({
  onRewind,
  onFun,
  mode: controlledMode,
  onWork,
  workLabel,
  className,
}: {
  onRewind: () => void;
  onFun?: () => void;
  mode?: "work" | "fun";
  onWork?: () => void;
  workLabel?: string;
  className?: string;
}) {
  const [localMode, setMode] = useState<"work" | "fun">("work");
  const [flipping, setFlipping] = useState(false);
  // while the lever flips back to work (before the sheet slides away) it already looks like work
  const mode = flipping ? "work" : (controlledMode ?? localMode);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const toFun = () => {
    if (mode === "fun" || busy.current) return;
    setMode("fun");
    if (onFun) {
      // flip the lever first, then go; it springs back once Fun Mode is up
      busy.current = true;
      timers.current.push(
        window.setTimeout(onFun, 380),
        window.setTimeout(() => {
          setMode("work");
          busy.current = false;
        }, 1500),
      );
      return;
    }
    timers.current.push(
      window.setTimeout(onRewind, 600),
      window.setTimeout(() => setMode("work"), 2000),
    );
  };
  const toWork = () => {
    if (onWork) {
      if (flipping) return;
      setFlipping(true);
      timers.current.push(window.setTimeout(onWork, 500));
      return;
    }
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setMode("work");
  };

  const interactive = Boolean(onFun || onWork);
  const backToWork = (controlledMode ?? localMode) === "fun" && Boolean(onWork);
  const label = "bg-transparent text-base font-medium leading-none transition-colors duration-300 md:text-lg xl:text-xl";
  return (
    <div className={cn("flex items-center gap-1 text-foreground sm:gap-2", className)}>
      <button type="button" onClick={toWork} aria-label={workLabel} title={workLabel} className={cn(label, mode === "work" ? "text-foreground" : "text-foreground/30")}>
        work
      </button>
      <div data-stick-art className="h-[4.5rem] w-24 shrink-0 xl:h-[5.25rem] xl:w-28">
        <svg viewBox="0 0 120 90" className="block h-full w-full overflow-visible" role={interactive ? "group" : "img"} aria-label="mode switch">
          <defs>
            <radialGradient id="stick-knob" cx="34%" cy="28%" r="78%">
              <stop offset="0" stopColor="#ffb0a4" />
              <stop offset=".3" stopColor="#e8473a" />
              <stop offset="1" stopColor="#a31c14" />
            </radialGradient>
            <linearGradient id="stick-slot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8fcb7a" />
              <stop offset="1" stopColor="#4f9a45" />
            </linearGradient>
            <linearGradient id="stick-idle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#c9c9c9" />
              <stop offset="1" stopColor="#9a9a9a" />
            </linearGradient>
            <linearGradient id="stick-rod" gradientUnits="userSpaceOnUse" x1="57" y1="0" x2="63" y2="0">
              <stop offset="0" stopColor="#f2f2f2" />
              <stop offset="1" stopColor="#a8a8a8" />
            </linearGradient>
          </defs>
          {/* the slot, with a soft glow round it */}
          {/* grey at rest; it lights up green only in fun mode */}
          <rect x="24" y="58" width="72" height="18" rx="9" fill="#9bd78a" style={{ opacity: mode === "fun" ? 0.35 : 0, transition: "opacity .4s" }} />
          <rect x="30" y="62" width="60" height="10" rx="5" fill="url(#stick-idle)" />
          <rect x="30" y="62" width="60" height="10" rx="5" fill="url(#stick-slot)" style={{ opacity: mode === "fun" ? 1 : 0, transition: "opacity .4s" }} />
          {/* the rod and knob, pivoting at the foot of the rod */}
          <g
            data-cursor={backToWork ? "rewind ↑" : "enter my other world"}
            className="cursor-pointer"
            style={{ transformOrigin: PIVOT, transformBox: "view-box", transform: `rotate(${mode === "fun" ? 32 : -32}deg)`, transition: "transform .55s cubic-bezier(.34,1.56,.64,1)" }}
            onClick={backToWork ? toWork : toFun}
            {...(interactive
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": backToWork ? (workLabel ?? "Back to work") : "Enter fun mode",
                  onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (backToWork ? toWork : toFun)();
                    }
                  },
                }
              : {})}
          >
            <path d="M60 66 L60 30" stroke="url(#stick-rod)" strokeWidth="4.4" strokeLinecap="round" />
            <circle cx="60" cy="22" r="15" fill="url(#stick-knob)" />
            <ellipse cx="55" cy="16" rx="5.5" ry="3.6" fill="#fff" opacity=".6" transform="rotate(-30 55 16)" />
            {/* a generous invisible target so the thin rod is easy to hit */}
            <rect x="40" y="2" width="40" height="66" fill="transparent" />
          </g>
        </svg>
      </div>
      <button type="button" onClick={toFun} className={cn(label, "whitespace-nowrap font-hand text-[1.15rem] tracking-wide md:text-xl xl:text-2xl", mode === "fun" ? "text-foreground" : "text-foreground/75")}>
        fun mode
      </button>
    </div>
  );
}
