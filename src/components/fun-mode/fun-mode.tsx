import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Joystick } from "@/components/joystick";
import { cn } from "@/lib/utils";

import { Garden } from "./garden";
import { Ball } from "./ball";
import { ThreadUnfold } from "./thread-unfold";
import { Welcome } from "./welcome";
import { WellFall } from "./well-fall";

// "thread": the thread pulls a sheet of paper open from the right.
// "rabbit-hole": the original fall through the well. Flip this to roll back.
const FUN_TRANSITION: "thread" | "rabbit-hole" = "thread";

type Phase = "fall" | "welcome" | "garden";

const prefersReduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fun Mode: an overlay on top of the portfolio, so leaving it puts you exactly
// where you were. Either the thread unfolds a sheet of paper over the page, or
// (rabbit-hole) well → fall → black → welcome → white gallery.
export function FunMode({ onExit }: { onExit: () => void }) {
  const threadMode = FUN_TRANSITION === "thread";
  const [reduced] = useState(prefersReduced);
  const [phase, setPhase] = useState<Phase>(threadMode ? "welcome" : "fall");
  const [leaving, setLeaving] = useState(false);
  // thread mode: the plane has fully opened (ball and controls are live)
  const [opened, setOpened] = useState(false);
  // the falling canvas stays under the garden while the garden fades in
  const [canvasUp, setCanvasUp] = useState(!threadMode);
  const rootRef = useRef<HTMLDivElement>(null);
  const exiting = useRef(false);
  const exit = useRef(onExit);
  exit.current = onExit;
  // where to scroll the portfolio once Fun Mode has closed (set by a game's links)
  const pendingId = useRef<string | null>(null);

  // Freeze the page behind: no scrolling, nothing focusable, focus kept inside.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const page = document.querySelector("main");
    page?.setAttribute("inert", "");
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    rootRef.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = before;
      page?.removeAttribute("inert");
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  const leave = useCallback(() => {
    if (exiting.current) return;
    exiting.current = true;
    setLeaving(true);
  }, []);

  const finish = useCallback(() => {
    exit.current();
    const id = pendingId.current;
    pendingId.current = null;
    if (id) window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, []);

  const goTo = useCallback(
    (id: string) => {
      pendingId.current = id;
      leave();
    },
    [leave],
  );

  // rabbit hole: a short, plain fade out; the fall is never replayed backwards
  useEffect(() => {
    if (threadMode || !leaving) return;
    const t = window.setTimeout(finish, reduced ? 80 : 450);
    return () => window.clearTimeout(t);
  }, [threadMode, leaving, reduced, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leave]);

  // reduced motion: a plain moment, then straight on to the welcome
  useEffect(() => {
    if (threadMode || !reduced || phase !== "fall") return;
    const t = window.setTimeout(() => setPhase("welcome"), 400);
    return () => window.clearTimeout(t);
  }, [threadMode, reduced, phase]);

  useEffect(() => {
    if (threadMode || phase !== "garden") return;
    const t = window.setTimeout(() => setCanvasUp(false), 1200);
    return () => window.clearTimeout(t);
  }, [threadMode, phase]);

  if (typeof document === "undefined") return null;
  const inGarden = phase === "garden";

  // the way back, reusing the portfolio's own joystick
  const backStick = (
    <div
      className={cn(
        "absolute z-20 origin-top px-2 pb-1 pt-1 transition-opacity duration-700 max-sm:scale-[.82] sm:px-3 sm:pt-2",
        "right-2 top-0 origin-top-right sm:right-5 sm:top-0",
        inGarden ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      style={{ ["--foreground" as string]: "oklch(0.2 0 0)" }}
    >
      <Joystick onRewind={leave} mode="fun" onWork={leave} workLabel="Back to Work Mode" />
    </div>
  );

  // the name, level with the joystick, in the portfolio header's serif
  const nameTag = (
    <p
      className={cn(
        "pointer-events-none absolute left-5 top-3 z-20 font-serif text-3xl font-medium transition-opacity duration-700 sm:left-8 sm:top-4",
        inGarden ? "opacity-100" : "opacity-0",
      )}
      style={{ color: "oklch(0.2 0 0)" }}
    >
      Sahithi
    </p>
  );

  if (threadMode) {
    return createPortal(
      <div ref={rootRef} role="dialog" aria-modal="true" aria-label="Fun Mode" tabIndex={-1} className="fixed inset-0 z-[300] overflow-hidden outline-none">
        <ThreadUnfold
          target={leaving ? "closed" : "open"}
          reduced={reduced}
          onDone={(state) => (state === "closed" ? finish() : setOpened(true))}
        >
          {opened && phase === "welcome" && <Welcome paper reduced={reduced} onDone={() => setPhase("garden")} />}
          {inGarden && (
            <div className="fm-garden-in absolute inset-0">
              <Garden onNavigate={goTo} />
            </div>
          )}
          {nameTag}
          {backStick}
        </ThreadUnfold>
        {opened && !leaving && <Ball />}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Fun Mode"
      tabIndex={-1}
      className={cn("fixed inset-0 z-[300] overflow-hidden bg-black outline-none transition-opacity", leaving ? "opacity-0" : "opacity-100")}
      style={{ transitionDuration: reduced ? "80ms" : "450ms" }}
    >
      {canvasUp &&
        (reduced ? (
          <div className="absolute inset-0" style={{ background: "#f7f5f0" }} />
        ) : (
          <WellFall onDone={() => setPhase((p) => (p === "fall" ? "welcome" : p))} />
        ))}

      {phase === "welcome" && <Welcome reduced={reduced} onDone={() => setPhase("garden")} />}

      {inGarden && (
        <div className="fm-garden-in absolute inset-0">
          <Garden onNavigate={goTo} />
        </div>
      )}

      {nameTag}
      {backStick}

      {inGarden && <Ball />}
    </div>,
    document.body,
  );
}
