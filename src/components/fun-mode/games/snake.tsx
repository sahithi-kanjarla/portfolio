import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { GameWindow, isTyping, prefersReducedMotion, readNumber, writeStore, type GameProps } from "./shared";
import { useBeeps } from "./use-beeps";

// A handheld-LCD palette, like the old green-screen consoles.
const LCD = "#c6d8a4";
const LCD_DIM = "#b4c993";
const DARK = "#223a24";
const SNAKE = "#5d8a56";
const BEZEL = "#6d9b64";
const BEZEL_EDGE = "#33533a";

const COLS = 20;
const ROWS = 15;
const CELL = 24;
const BEST_KEY = "fm-snake-best";
const SND_KEY = "fm-snake-sound";

type Dir = { x: number; y: number };
type Pt = { x: number; y: number };
const DIRS: Record<string, Dir> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const KEYS: Record<string, string> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", W: "up", s: "down", S: "down", a: "left", A: "left", d: "right", D: "right" };

type View = "menu" | "how" | "playing" | "paused" | "over";

// every free cell, so a collectible can never land on the snake
const freeCells = (snake: Pt[]) => {
  const taken = new Set(snake.map((p) => p.y * COLS + p.x));
  const out: Pt[] = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!taken.has(y * COLS + x)) out.push({ x, y });
  return out;
};
const pickFood = (snake: Pt[]): Pt | null => {
  const free = freeCells(snake);
  return free.length ? free[Math.floor(Math.random() * free.length)]! : null;
};

const newGame = () => {
  const snake: Pt[] = [
    { x: 6, y: 7 },
    { x: 5, y: 7 },
    { x: 4, y: 7 },
  ];
  return { snake, dir: DIRS["right"]!, queue: [] as Dir[], food: pickFood(snake)!, score: 0, acc: 0, interval: 140, died: false, diedAt: 0 };
};

// ---- pixel sprites --------------------------------------------------------

const APPLE = ["...DD...", "..D.D...", ".######.", "########", "###H####", "########", ".######.", "..#..#.."];
const TUFT = ["#.#.#", ".###.", "..#.."];

function sprite(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, px: number, colors: Record<string, string>) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = colors[row[i]!];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(x + i * px, y + j * px, px, px);
      }
    }
  });
}

// quiet decorations that live only in the background
const tufts = (() => {
  const out: Pt[] = [];
  let s = 17;
  for (let i = 0; i < 9; i++) {
    s = (s * 48271) % 2147483647;
    out.push({ x: s % COLS, y: Math.floor(s / 997) % ROWS });
  }
  return out;
})();

// ---- pieces of the console ---------------------------------------------------

function Flower({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`pointer-events-none h-9 w-9 sm:h-12 sm:w-12 ${className}`} shapeRendering="crispEdges" aria-hidden="true">
      <path d="M7 6h2v2H7zM5 4h2v2H5zM9 4h2v2H9zM5 8h2v2H5zM9 8h2v2H9z" fill={DARK} />
      <path d="M7 6h2v2H7z" fill="#e9f0d2" />
      <path d="M7 10h2v6H7zM9 12h3v1H9zM4 13h3v1H4z" fill={BEZEL_EDGE} />
    </svg>
  );
}

function Lcd({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 p-3 text-center font-pixel text-[#223a24] sm:gap-2" style={{ background: LCD }}>
      {children}
    </div>
  );
}

const menuBtn = "group flex items-center gap-2 px-2 font-pixel text-[clamp(1.1rem,5.6cqw,1.9rem)] leading-none tracking-wider text-[#223a24] focus-visible:outline-none";
const solid = "border-[3px] border-[#223a24] bg-[#223a24] px-3 py-1 font-pixel text-[clamp(1rem,4.6cqw,1.5rem)] leading-none tracking-wider text-[#c6d8a4] hover:bg-[#33533a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#223a24]";
const hollow = "border-[3px] border-[#223a24] bg-transparent px-3 py-1 font-pixel text-[clamp(1rem,4.6cqw,1.5rem)] leading-none tracking-wider text-[#223a24] hover:bg-[#b4c993] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#223a24]";
const tiny = "grid h-8 min-w-9 place-items-center border-[3px] border-[#223a24] bg-[#c6d8a4] px-2 font-pixel text-lg leading-none text-[#223a24] hover:bg-[#f2f6e4] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2f6e4]";

function MenuItem({ children, onClick, autoFocus }: { children: ReactNode; onClick: () => void; autoFocus?: boolean }) {
  return (
    <button type="button" onClick={onClick} autoFocus={autoFocus} onMouseEnter={(e) => e.currentTarget.focus({ preventScroll: true })} className={menuBtn}>
      <span className="w-4 text-left opacity-0 group-focus:opacity-100">▶</span>
      {children}
    </button>
  );
}

export function Snake({ onClose }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const game = useRef(newGame());
  const viewRef = useRef<View>("menu");
  const [view, setViewState] = useState<View>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => readNumber(BEST_KEY));
  const bestRef = useRef(best);
  const [fresh, setFresh] = useState(false);
  const { on: soundOn, beep, toggle: toggleSound } = useBeeps(SND_KEY);

  const setView = useCallback((s: View) => {
    viewRef.current = s;
    setViewState(s);
  }, []);

  const start = useCallback(() => {
    game.current = newGame();
    setScore(0);
    setFresh(false);
    setView("playing");
    beep([
      [523, 0.07],
      [659, 0.07],
      [784, 0.1],
    ]);
    stage.current?.focus({ preventScroll: true });
  }, [beep, setView]);

  const turn = useCallback((name: string) => {
    const g = game.current;
    if (g.died) return;
    const d = DIRS[name]!;
    const last = g.queue.length ? g.queue[g.queue.length - 1]! : g.dir;
    // never straight back into the body, and ignore a repeat of the same turn
    if ((d.x === -last.x && d.y === -last.y) || (d.x === last.x && d.y === last.y)) return;
    if (g.queue.length < 2) g.queue.push(d);
  }, []);

  const pause = useCallback(() => {
    if (viewRef.current === "playing") setView("paused");
    else if (viewRef.current === "paused") setView("playing");
  }, [setView]);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = viewRef.current;
      const onButton = e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement;
      const dir = KEYS[e.key];
      if (s === "menu" || s === "how" || s === "over") {
        // arrows walk the menu; Enter / Space press the focused item
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "s" || e.key === "w") {
          const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("button") ?? [])];
          if (items.length) {
            e.preventDefault();
            const at = items.indexOf(document.activeElement as HTMLElement);
            const step = e.key === "ArrowDown" || e.key === "s" ? 1 : -1;
            items[(at + step + items.length) % items.length]!.focus({ preventScroll: true });
          }
        } else if (dir || e.key === " ") e.preventDefault();
        if (e.key === " " && !onButton && s !== "how") start();
        return;
      }
      if (dir) {
        e.preventDefault();
        if (s === "playing") turn(dir);
        else if (s === "paused") setView("playing");
        return;
      }
      if (e.key === " " || e.key === "p" || e.key === "P") {
        e.preventDefault();
        pause();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // stops Space from "clicking" a focused button once the game is running
      if (e.key === " " && (viewRef.current === "playing" || viewRef.current === "paused") && !isTyping(e)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [pause, setView, start, turn]);

  // swipe
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let sx = 0;
    let sy = 0;
    let id = -1;
    const down = (e: PointerEvent) => {
      id = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id || viewRef.current !== "playing") return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
      sx = e.clientX;
      sy = e.clientY;
    };
    const up = () => (id = -1);
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [turn]);

  // pause if the tab is hidden
  useEffect(() => {
    const on = () => document.hidden && viewRef.current === "playing" && setView("paused");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, [setView]);

  // the loop: fixed-step logic, crisp pixel drawing
  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    cv.width = COLS * CELL;
    cv.height = ROWS * CELL;
    ctx.imageSmoothingEnabled = false;
    const calm = prefersReducedMotion();
    let last = performance.now();
    let raf = 0;

    const step = () => {
      const g = game.current;
      if (g.queue.length) g.dir = g.queue.shift()!;
      const head = { x: g.snake[0]!.x + g.dir.x, y: g.snake[0]!.y + g.dir.y };
      const eating = head.x === g.food.x && head.y === g.food.y;
      // the tail moves out of the way this very step unless we are growing
      const body = eating ? g.snake : g.snake.slice(0, -1);
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || body.some((p) => p.x === head.x && p.y === head.y)) {
        g.died = true;
        g.diedAt = performance.now();
        return;
      }
      g.snake.unshift(head);
      if (eating) {
        g.score += 1;
        g.interval = Math.max(70, 140 - g.score * 3);
        const next = pickFood(g.snake);
        setScore(g.score);
        beep([
          [880, 0.05],
          [1175, 0.07],
        ]);
        if (next) g.food = next;
        else {
          g.died = true; // the whole board is snake: that is a win, really
          g.diedAt = performance.now();
        }
      } else g.snake.pop();
    };

    const finish = () => {
      const g = game.current;
      if (g.score > bestRef.current) {
        bestRef.current = g.score;
        setBest(g.score);
        writeStore(BEST_KEY, String(g.score));
        setFresh(true);
      }
      setScore(g.score);
      setView("over");
    };

    const draw = (now: number) => {
      const g = game.current;
      ctx.fillStyle = LCD;
      ctx.fillRect(0, 0, cv.width, cv.height);
      // faint grid and grass: background only
      ctx.fillStyle = "rgba(34,58,36,.11)";
      for (let x = 1; x < COLS; x++) ctx.fillRect(x * CELL, 0, 1, cv.height);
      for (let y = 1; y < ROWS; y++) ctx.fillRect(0, y * CELL, cv.width, 1);
      for (const t of tufts) sprite(ctx, TUFT, t.x * CELL + 7, t.y * CELL + 9, 2, { "#": LCD_DIM });
      // the apple, with a gentle bob
      const f = g.food;
      const bob = !calm && Math.floor(now / 420) % 2 === 0 ? 0 : 1;
      sprite(ctx, APPLE, f.x * CELL + 2, f.y * CELL + 2 + bob, 2.5, { "#": DARK, D: DARK, H: LCD });

      if (g.died && Math.floor((now - g.diedAt) / 120) % 2 === 1) return;
      g.snake.forEach((p, i) => {
        const x = p.x * CELL;
        const y = p.y * CELL;
        ctx.fillStyle = DARK;
        ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = i === 0 ? SNAKE : i % 2 ? "#6f9a66" : SNAKE;
        ctx.fillRect(x + 4, y + 4, CELL - 8, CELL - 8);
      });
      // face: two eyes and a flicking tongue
      const h = g.snake[0]!;
      const d = g.dir;
      const cx = h.x * CELL + CELL / 2;
      const cy = h.y * CELL + CELL / 2;
      const px = -d.y;
      const py = d.x;
      ctx.fillStyle = LCD;
      for (const s of [-1, 1]) ctx.fillRect(cx + d.x * 3 + px * s * 5 - 2.5, cy + d.y * 3 + py * s * 5 - 2.5, 5, 5);
      ctx.fillStyle = DARK;
      for (const s of [-1, 1]) ctx.fillRect(cx + d.x * 4.5 + px * s * 5 - 1, cy + d.y * 4.5 + py * s * 5 - 1, 2, 2);
      if (!g.died && Math.floor(now / 300) % 3 === 0) ctx.fillRect(cx + d.x * 12 - 1, cy + d.y * 12 - 1, 3, 3);
    };

    const frame = (now: number) => {
      const dt = Math.min(100, now - last);
      last = now;
      const g = game.current;
      if (viewRef.current === "playing") {
        if (g.died) {
          if (now - g.diedAt > 650) finish();
        } else {
          g.acc += dt;
          while (g.acc >= g.interval && !g.died) {
            g.acc -= g.interval;
            step();
            if (g.died)
              beep(
                [
                  [220, 0.12],
                  [165, 0.12],
                  [110, 0.22],
                ],
                "sawtooth",
              );
          }
        }
      }
      draw(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [beep, setView]);

  const press = (name: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (viewRef.current === "playing") turn(name);
  };
  const pad = "grid h-12 w-12 place-items-center border-[3px] border-[#223a24] bg-[#c6d8a4] font-pixel text-2xl leading-none text-[#223a24] active:bg-[#f2f6e4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2f6e4]";
  const playing = view === "playing" || view === "paused";

  return (
    <GameWindow bare title="SNAKE: DOODLE EDITION" label="Snake: Doodle Edition" onClose={onClose} maxWidth={640}>
      {/* the console: a chunky green bezel around the LCD */}
      <div className="relative mx-auto p-3 pb-2 [--snake-chrome:215px] sm:p-5 sm:pb-3 [@media(pointer:coarse)]:[--snake-chrome:385px]" style={{ width: "min(100%, max(290px, calc((100dvh - var(--snake-chrome)) * 1.3333 + 90px)))", background: BEZEL, border: `4px solid ${BEZEL_EDGE}`, boxShadow: "inset 0 0 0 3px #86b07c, 6px 7px 0 rgba(34,58,36,.85)", borderRadius: 10 }}>
        <div className="relative overflow-hidden" style={{ background: LCD, border: `4px solid ${DARK}`, boxShadow: "inset 0 0 0 3px #9fb77f", borderRadius: 4 }}>
          <div className="flex items-end justify-between px-3 pb-1 pt-2 font-pixel text-xl leading-none text-[#223a24] sm:px-4 sm:text-2xl" aria-live="polite">
            <span>SCORE: {score}</span>
            <span>BEST: {best}</span>
          </div>
          <div
            ref={stage}
            tabIndex={-1}
            className="relative mx-2 mb-2 select-none outline-none sm:mx-3 sm:mb-3"
            style={{ aspectRatio: `${COLS} / ${ROWS}`, containerType: "size", touchAction: "none", border: `3px solid ${DARK}`, background: LCD }}
            aria-label="Snake board. Use arrow keys or WASD, or swipe."
          >
            <canvas ref={canvas} className="block h-full w-full" style={{ imageRendering: "pixelated" }} />

            {view === "menu" && (
              <Lcd>
                <h3 className="font-silk text-[clamp(2rem,13cqw,3.75rem)] font-bold leading-none tracking-wide">SNAKE</h3>
                <p className="font-pixel text-[clamp(1rem,6cqw,1.9rem)] leading-none tracking-[.25em]">DOODLE EDITION</p>
                <p className="font-pixel text-[clamp(.8rem,3.8cqw,1.25rem)] leading-none opacity-70">A little nostalgia never hurt.</p>
                <div ref={menuRef} className="mt-2 flex flex-col items-start gap-0.5">
                  <MenuItem autoFocus onClick={start}>
                    PLAY
                  </MenuItem>
                  <MenuItem onClick={() => setView("how")}>INSTRUCTIONS</MenuItem>
                  <MenuItem onClick={onClose}>BACK</MenuItem>
                </div>
              </Lcd>
            )}
            {view === "how" && (
              <Lcd>
                <h3 className="font-silk text-[clamp(1.1rem,6cqw,1.9rem)] font-bold leading-none">HOW TO PLAY</h3>
                <ul className="font-pixel text-[clamp(.85rem,4cqw,1.5rem)] leading-tight">
                  <li>ARROWS / WASD or SWIPE to steer</li>
                  <li>EAT APPLES to grow</li>
                  <li>DON'T HIT THE WALLS OR YOURSELF</li>
                  <li>SPACE to pause</li>
                </ul>
                <div ref={menuRef} className="mt-1 flex flex-col items-start">
                  <MenuItem autoFocus onClick={() => setView("menu")}>
                    BACK
                  </MenuItem>
                </div>
              </Lcd>
            )}
            {view === "paused" && (
              <Lcd>
                <h3 className="font-silk text-[clamp(1.4rem,8cqw,1.9rem)] font-bold leading-none">PAUSED</h3>
                <button type="button" autoFocus onClick={pause} className={solid}>
                  RESUME
                </button>
              </Lcd>
            )}
            {view === "over" && (
              <Lcd>
                <h3 className="font-silk text-[clamp(1.3rem,8cqw,2.25rem)] font-bold leading-none">GAME OVER</h3>
                {/* a dizzy little snake */}
                <svg viewBox="0 0 40 14" className="h-auto w-[24cqw] max-w-[120px]" shapeRendering="crispEdges" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <rect key={i} x={2 + i * 6} y={i === 4 ? 3 : 7} width="6" height="6" fill={SNAKE} stroke={DARK} strokeWidth="1" />
                  ))}
                  <rect x="27" y="4" width="2" height="2" fill={DARK} />
                  <rect x="31" y="4" width="2" height="2" fill={DARK} />
                  <path d="M34 1h3v2h-3z" fill={DARK} />
                </svg>
                <p className="font-pixel text-[clamp(.9rem,4.2cqw,1.5rem)] leading-none">{fresh ? "A new personal best!" : "Oops. Got a little carried away?"}</p>
                <p className="font-pixel text-[clamp(.9rem,4.2cqw,1.5rem)] leading-none">
                  SCORE: {score}&nbsp;&nbsp;&nbsp;BEST: {best}
                </p>
                <div ref={menuRef} className="mt-1 flex flex-wrap justify-center gap-2">
                  <button type="button" autoFocus onClick={start} className={solid}>
                    PLAY AGAIN
                  </button>
                  <button type="button" onClick={onClose} className={hollow}>
                    BACK
                  </button>
                </div>
              </Lcd>
            )}
          </div>
        </div>

        {/* bezel: tiny controls, flowers in the corners */}
        <div className="relative mt-2 flex items-center justify-center gap-2 sm:mt-3" style={{ minHeight: 40 }}>
          <Flower className="absolute -bottom-1 left-0" />
          <Flower className="absolute -bottom-1 right-0 -scale-x-100" />
          <button type="button" onClick={pause} disabled={!playing} aria-label={view === "paused" ? "Resume" : "Pause"} className={tiny}>
            {view === "paused" ? "▶" : "❚❚"}
          </button>
          <button type="button" onClick={start} disabled={view === "menu" || view === "how"} aria-label="Restart" className={tiny}>
            ↻
          </button>
          <button type="button" onClick={toggleSound} aria-label={soundOn ? "Sound on" : "Sound off"} aria-pressed={soundOn} className={tiny}>
            {soundOn ? "SND" : "---"}
          </button>
        </div>
      </div>

      {/* compact d-pad for touch screens */}
      <div className="mx-auto mt-3 hidden grid-cols-3 gap-1 [@media(pointer:coarse)]:grid" role="group" aria-label="Direction pad">
        <span />
        <button type="button" aria-label="Up" className={pad} onPointerDown={press("up")}>
          ▲
        </button>
        <span />
        <button type="button" aria-label="Left" className={pad} onPointerDown={press("left")}>
          ◀
        </button>
        <button type="button" aria-label="Down" className={pad} onPointerDown={press("down")}>
          ▼
        </button>
        <button type="button" aria-label="Right" className={pad} onPointerDown={press("right")}>
          ▶
        </button>
      </div>
    </GameWindow>
  );
}
