import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export const INK = "#1c1c1c";
export const CREAM = "#fbf9f4";
export const PAPER = "#fffdf7";
export const PINK = "#f1b5c6";
export const LAVENDER = "#cdbdf0";
export const YELLOW = "#f6e393";
export const SAGE = "#a9cba0";

export type GameProps = {
  onClose: () => void;
  // closes Fun Mode and scrolls the portfolio to a section id
  onNavigate: (id: string) => void;
};

export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// true when a key press belongs to a form field, not to the game
export const isTyping = (e: Event) => {
  const t = e.target;
  return t instanceof HTMLElement && Boolean(t.closest("input:not([type=range]), textarea, select, [contenteditable=''], [contenteditable='true']"));
};

export const readNumber = (key: string) => {
  try {
    const v = Number(window.localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
};
export const writeStore = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage can be blocked; the game still works */
  }
};

export const btnBase =
  "inline-flex items-center justify-center gap-1.5 border-2 border-[#1c1c1c] px-4 py-2 font-hand text-lg leading-none transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1c] disabled:opacity-40 disabled:hover:translate-y-0";
export const btnInk = `${btnBase} bg-[#1c1c1c] text-[#fbf9f4]`;
export const btnPaper = `${btnBase} bg-[#fffdf7] text-[#1c1c1c]`;

// A hand-drawn-ish frame: slightly uneven corners, not a perfect rounded box.
export const sketchy = { borderRadius: "14px 4px 12px 5px / 5px 12px 4px 14px" } as const;

// The shared game window. It sits above everything in Fun Mode (including the
// bouncing ball), owns Escape while open, keeps Tab inside, and leaves the page
// behind it exactly as it was.
export function GameWindow({ title, label, onClose, children, maxWidth = 520, bare = false }: { title: string; label: string; onClose: () => void; children: ReactNode; maxWidth?: number; bare?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Fun Mode also listens for Escape; this one is just for the game
        e.stopImmediatePropagation();
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key === "Tab" && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])")].filter((n) => n.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        const active = document.activeElement;
        if (!panel.current.contains(active) || (e.shiftKey && (active === first || active === panel.current))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden p-2 sm:p-6"
      style={{ background: "rgba(251,249,244,.9)", touchAction: "none", overscrollBehavior: "contain" }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close.current();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`fm-pop relative flex max-h-full w-full flex-col overflow-y-auto overscroll-contain outline-none ${bare ? "pb-2 pr-2" : "border-2 border-[#1c1c1c] bg-[#fbf9f4]"}`}
        style={bare ? { maxWidth } : { maxWidth, ...sketchy, boxShadow: "5px 6px 0 rgba(28,28,28,.9)" }}
      >
        {bare && (
          <button type="button" onClick={onClose} aria-label="Close game" className="absolute right-1 top-1 z-30 grid h-8 w-8 place-items-center border-2 border-[#2a2a2a] bg-[#fbf9f4] font-pixel text-xl leading-none text-[#2a2a2a] hover:bg-[#f6e393] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#223a24]">
            X
          </button>
        )}
        <div className={`${bare ? "hidden" : "flex"} items-center justify-between gap-3 px-4 pb-1 pt-3 sm:px-5`}>
          <h2 className="font-hand text-xl leading-none tracking-wide sm:text-2xl">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close game" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#1c1c1c] bg-[#fffdf7] font-hand text-xl leading-none hover:bg-[#f6e393] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1c]">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// A cover that sits on top of a game's board for start, pause and end screens.
export function Cover({ children, tint = "rgba(255,253,247,.9)" }: { children: ReactNode; tint?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 p-4 text-center" style={{ background: tint }}>
      {children}
    </div>
  );
}
