import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { GameWindow, isTyping, prefersReducedMotion, readNumber, writeStore, type GameProps } from "./shared";
import { useBeeps } from "./use-beeps";

// ---- constants ----------------------------------------------------------------

const W = 640;
const H = 340;
const GROUND = 270; // ground line while running
const GROUND_OVER = 170; // higher on the results scene, so the panel never covers the runner
const U = 3; // one sprite cell, in canvas px
const GRAVITY = 2700;
const JUMP_V = 860;
const PX = 70; // runner x
const PW = 39;
const PH = 45;
type Mode = "run" | "debug";
const BEST_KEYS: Record<Mode, string> = { run: "fm-bugrun-best", debug: "fm-bugrun-debug-best" };
const SND_KEY = "fm-bugrun-sound";
const OUT = "#2a2230";

type Kind = "bug" | "cactus";
type Obstacle = { id: number; kind: Kind; x: number; w: number; h: number; hit: boolean; dead?: boolean };
type Pickup = { id: number; kind: "shield" | "coffee" | "debug"; x: number; y: number };
type Status = "menu" | "how" | "playing" | "paused" | "dying" | "over";

const SIZES: Record<Kind, [number, number]> = { bug: [39, 22], cactus: [30, 36] };

// ---- pixel sprites (one character per cell, "." is empty) -------------------

const GIRL_TOP = [
  "....HHHHH....",
  "...HHHHHHH...",
  "..HHHSSSSH...",
  "HHHHSSSKSS...",
  "HHH.SSSSSS...",
  ".H..SSSCSS...",
  ".....WWWW....",
  "....WWWWWW...",
  "...SWWWWWWS..",
  "...S.WWWW.S..",
  ".....BBBB....",
  ".....BBBB....",
];
const GIRL_RUN_A = ["....SS..SS...", "...SS....SS..", "..RRR....RRR."];
const GIRL_RUN_B = [".....SSSS....", ".....SSSS....", "....RRRRR...."];
const GIRL_AIR = ["....SSSS.....", "...SS..SS....", "...RR..RR...."];
const GIRL_SIT = [...GIRL_TOP.slice(0, 10), "....BBBBBBB..", "....SSSSSSSSR"];
const GIRL_PAL = { H: "#6b3f2a", S: "#f6d1aa", W: "#fffaf0", B: "#4d74b3", R: "#d9533f", K: OUT, C: "#f0a0a0" };

const BUG = ["....RRRRRR...", "..RRRRKRRRR..", ".RRKRRKRRKRR.", "KKRRRRKRRRRRR", "KWKRKRKRRKRRR", "KKKRRRKRRRRR."];
const BUG_LEGS = [".K.K.K.K.K.K.", "K.K.K.K.K.K.."];
const BUG_PAL = { R: "#e2413b", K: OUT, W: "#ffffff" };

const CACTUS = ["....GG....", "...GGGG...", ".G.GGGG.G.", "GG.GGGG.GG", "GG.GGGG.GG", "GGGGGGG.GG", ".GGGGGGGG.", "...GGGG...", "...GGGG...", "...GGGG...", "...GGGG...", "...GGGG..."];
const CACTUS_PAL = { G: "#4f9a45" };

const HEART = [".RR.RR.", "RRRRRRR", "RRRRRRR", ".RRRRR.", "..RRR..", "...R..."];
const COFFEE = ["WWWWWWW..", "WBBBBBWWW", "WBBBBBW.W", "WBBBBBWWW", ".WWWWWW..", "..WWWW..."];
const COFFEE_PAL = { W: "#fff8ec", B: "#7a4a2a" };
const SHIELD = ["LLLLLLLLL", "LLLLLLLLL", "LLLLLLWLL", "LWLLLWLLL", "LLWLWLLLL", "LLLWLLLLL", ".LLLLLLL.", "..LLLLL..", "...LLL..."];
const SHIELD_PAL = { L: "#b9a6e3", W: "#ffffff" };

type Pal = Record<string, string>;

// draws a sprite with an automatic 1-cell dark outline
function spr(ctx: CanvasRenderingContext2D, rows: string[], x: number, y: number, pal: Pal, flip = false, outline = OUT) {
  const h = rows.length;
  const w = rows[0]!.length;
  const at = (i: number, j: number) => (i < 0 || j < 0 || i >= w || j >= h ? "." : rows[j]![flip ? w - 1 - i : i]!);
  const filled = (i: number, j: number) => at(i, j) !== "." && pal[at(i, j)] !== undefined;
  ctx.fillStyle = outline;
  for (let j = -1; j <= h; j++)
    for (let i = -1; i <= w; i++) {
      if (filled(i, j)) continue;
      if (filled(i - 1, j) || filled(i + 1, j) || filled(i, j - 1) || filled(i, j + 1)) ctx.fillRect(x + i * U, y + j * U, U, U);
    }
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (!filled(i, j)) continue;
      ctx.fillStyle = pal[at(i, j)]!;
      ctx.fillRect(x + i * U, y + j * U, U, U);
    }
}

// the same idea as inline SVG, for the hearts in the HUD
function heartRects(full: boolean) {
  const filled = (i: number, j: number) => HEART[j]?.[i] === "R";
  const out: { x: number; y: number; c: string }[] = [];
  for (let j = -1; j <= HEART.length; j++)
    for (let i = -1; i <= 7; i++) {
      if (filled(i, j)) out.push({ x: i, y: j, c: full ? "#e2413b" : "#4a3d56" });
      else if (filled(i - 1, j) || filled(i + 1, j) || filled(i, j - 1) || filled(i, j + 1)) out.push({ x: i, y: j, c: OUT });
    }
  return out;
}
const HEART_FULL = heartRects(true);
const HEART_EMPTY = heartRects(false);

function PixelHeart({ full }: { full: boolean }) {
  return (
    <svg viewBox="-1 -1 9 8" width="30" height="27" shapeRendering="crispEdges" aria-hidden="true">
      {(full ? HEART_FULL : HEART_EMPTY).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width="1" height="1" fill={r.c} />
      ))}
    </svg>
  );
}

// ---- the scene ------------------------------------------------------------------

type Theme = { sky: string[]; cloud: string; far: string; near: string; win: string; grass: string; grassDark: string; dirt: string; brick: string };
const DAY: Theme = { sky: ["#7fb8ec", "#98c8f0", "#b3d6f2", "#cfe6f6"], cloud: "#ffffff", far: "#a9c9e8", near: "#8fb4dc", win: "#cfe1f4", grass: "#62b04a", grassDark: "#4a9238", dirt: "#8c5b3b", brick: "#6e4429" };
const DUSK: Theme = { sky: ["#43376e", "#6a4a8a", "#a8688e", "#dc9a9c"], cloud: "#d6a0b6", far: "#5b4a86", near: "#483a72", win: "#f3c77a", grass: "#4b7a4a", grassDark: "#3a6140", dirt: "#7a4a48", brick: "#5e3636" };

const TILE = 960;
const skyline = (seed: number, minW: number, maxW: number, minH: number, maxH: number) => {
  const out: { x: number; w: number; h: number }[] = [];
  let s = seed;
  const r = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  let x = 0;
  while (x < TILE) {
    const w = Math.round(minW + r() * (maxW - minW));
    out.push({ x, w, h: Math.round(minH + r() * (maxH - minH)) });
    x += w + Math.round(r() * 6);
  }
  return out;
};
const FAR = skyline(11, 26, 52, 60, 130);
const NEAR = skyline(29, 22, 44, 36, 86);
const CLOUDS = [
  { x: 60, y: 36, s: 1 },
  { x: 300, y: 70, s: 0.8 },
  { x: 520, y: 28, s: 1.2 },
  { x: 800, y: 60, s: 0.9 },
];

function drawScene(ctx: CanvasRenderingContext2D, t: Theme, gy: number, scroll: number, time: number, still: boolean) {
  const band = gy / t.sky.length;
  t.sky.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, Math.floor(i * band), W, Math.ceil(band) + 1);
  });
  // clouds
  ctx.fillStyle = t.cloud;
  for (const c of CLOUDS) {
    const x = ((((c.x - (still ? 0 : scroll * 0.05 + time * 5)) % (W + 160)) + W + 160) % (W + 160)) - 80;
    const u = 6 * c.s;
    ctx.fillRect(x + 3 * u, c.y, 4 * u, u);
    ctx.fillRect(x + u, c.y + u, 8 * u, u);
    ctx.fillRect(x, c.y + 2 * u, 10 * u, u);
  }
  // two skyline layers
  const layer = (list: typeof FAR, color: string, par: number, windows: boolean) => {
    const off = still ? 0 : (scroll * par) % TILE;
    ctx.fillStyle = color;
    for (let k = -1; k <= 1; k++)
      for (const b of list) {
        const bx = Math.round(b.x - off + k * TILE);
        if (bx > W || bx + b.w < 0) continue;
        ctx.fillStyle = color;
        ctx.fillRect(bx, gy - b.h, b.w, b.h);
        if (windows) {
          ctx.fillStyle = t.win;
          for (let wy = gy - b.h + 8; wy < gy - 8; wy += 12) for (let wx = bx + 5; wx < bx + b.w - 5; wx += 9) if (((wx * 7 + wy * 13) >> 2) % 3 !== 0) ctx.fillRect(wx, wy, 4, 5);
        }
      }
  };
  layer(FAR, t.far, 0.1, false);
  layer(NEAR, t.near, 0.22, true);
  // ground: grass over a brick-patterned dirt
  ctx.fillStyle = t.grassDark;
  ctx.fillRect(0, gy, W, 4);
  ctx.fillStyle = t.grass;
  ctx.fillRect(0, gy + 4, W, 8);
  const off = still ? 0 : scroll % 60;
  ctx.fillStyle = t.grassDark;
  for (let x = -off; x < W; x += 12) ctx.fillRect(Math.round(x + ((x * 7) % 5)), gy - 3, 3, 4);
  ctx.fillStyle = t.dirt;
  ctx.fillRect(0, gy + 12, W, H - gy - 12);
  ctx.fillStyle = t.brick;
  const boff = still ? 0 : scroll % 48;
  for (let row = 0, y = gy + 12; y < H; row++, y += 14) {
    ctx.fillRect(0, y, W, 2);
    for (let x = -boff - (row % 2 ? 24 : 0); x < W; x += 48) ctx.fillRect(Math.round(x), y, 2, 14);
  }
  // little flowers on the grass
  const foff = still ? 0 : scroll % 211;
  for (let k = 0; k < 4; k++) {
    const fx = Math.round((((k * 211 - foff) % 844) + 844) % 844) - 100;
    if (fx < 0 || fx > W) continue;
    ctx.fillStyle = k % 2 ? "#f4a6c0" : "#f6d86b";
    ctx.fillRect(fx, gy - 6, 4, 4);
    ctx.fillStyle = t.grassDark;
    ctx.fillRect(fx + 1, gy - 2, 2, 3);
  }
}

// ---- the world --------------------------------------------------------------------

const fresh = () => ({
  y: 0, // height above the ground
  vy: 0,
  lives: 3,
  shield: false,
  coffee: 0, // seconds left
  invuln: 0,
  dist: 0,
  speed: 290,
  obstacles: [] as Obstacle[],
  pickups: [] as Pickup[],
  nextObstacle: 520,
  nextPickup: 3000,
  id: 1,
  time: 0,
  dying: 0,
  puffs: [] as { x: number; y: number; t: number }[],
  killer: null as Obstacle | null,
  // debug mode
  bonus: 0,
  kills: 0,
  combo: 0,
  comboT: 0,
  bestCombo: 0,
  fireCd: 0,
  debugT: 0, // seconds of the </> debugging ability left
  shake: 0,
  shots: [] as { x: number; y: number; dead?: boolean }[],
  parts: [] as { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; s: number }[],
  pops: [] as { x: number; y: number; text: string; t: number; c: string }[],
});
type World = ReturnType<typeof fresh>;

function spawn(w: World, debug: boolean) {
  const kinds: Kind[] = debug ? ["bug", "bug", "bug", "bug", "cactus"] : ["bug", "bug", "bug", "cactus"];
  const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
  const [bw, bh] = SIZES[kind];
  const x = W + 40;
  w.obstacles.push({ id: w.id++, kind, x, w: bw, h: bh, hit: false });
  // now and then a pair (or, later in debug mode, a trio): fair game for a jump or a shot
  if (kind === "bug" && w.dist > 1500 && Math.random() < (debug ? 0.35 : 0.22)) {
    const [bw2, bh2] = SIZES.bug;
    w.obstacles.push({ id: w.id++, kind: "bug", x: x + bw + 14, w: bw2, h: bh2, hit: false });
    if (debug && w.dist > 3000 && Math.random() < 0.35) w.obstacles.push({ id: w.id++, kind: "bug", x: x + 2 * (bw + 14), w: bw2, h: bh2, hit: false });
  }
  // the gap always leaves room to land and jump again
  w.nextObstacle = (340 + Math.random() * 260 + w.speed * 0.55) * (debug ? 0.8 : 1);
}

// pixel explosions: little squares that fly out, fall and fade
const BURST = ["#fff3b0", "#f7c948", "#f48c2a", "#e2413b", "#2a2230"];
function burst(w: World, x: number, y: number, n: number, colors: string[] = BURST, power = 1) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (70 + Math.random() * 190) * power;
    const max = 0.35 + Math.random() * 0.35;
    w.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90 * power, life: max, max, c: colors[Math.floor(Math.random() * colors.length)]!, s: Math.random() < 0.4 ? 6 : 3 });
  }
}
function stepFx(w: World, dt: number) {
  w.shake = Math.max(0, w.shake - dt);
  for (const p of w.parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 700 * dt;
    p.life -= dt;
  }
  w.parts = w.parts.filter((p) => p.life > 0);
  for (const p of w.pops) p.t += dt;
  w.pops = w.pops.filter((p) => p.t < 0.9);
}
const multOf = (combo: number) => (combo > 0 ? Math.min(5, 1 + Math.floor((combo - 1) / 2)) : 0);

function drawBug(ctx: CanvasRenderingContext2D, x: number, gy: number, t: number, id: number, flip = false) {
  const frame = Math.abs(Math.floor(t * 10 + id) || 0) % 2;
  spr(ctx, [...BUG, BUG_LEGS[frame]!], x, gy - 7 * U, BUG_PAL, flip);
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle, t: number, gy: number) {
  if (o.kind === "bug") drawBug(ctx, o.x, gy, t, o.id);
  else spr(ctx, CACTUS, o.x, gy - CACTUS.length * U, CACTUS_PAL);
}

function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, t: number) {
  const y = Math.round(p.y + Math.sin(t * 4 + p.id) * 3);
  if (p.kind === "shield") spr(ctx, SHIELD, Math.round(p.x - 13), y - 13, SHIELD_PAL);
  else if (p.kind === "debug") {
    // the </> icon: a glowing little code badge
    const x = Math.round(p.x - 20);
    const glow = Math.floor(t * 6) % 2;
    ctx.fillStyle = glow ? "rgba(155,224,122,.45)" : "rgba(155,224,122,.25)";
    ctx.fillRect(x - 6, y - 18, 52, 36);
    ctx.fillStyle = OUT;
    ctx.fillRect(x - 3, y - 15, 46, 30);
    ctx.fillStyle = "#9be07a";
    ctx.fillRect(x, y - 12, 40, 24);
    ctx.fillStyle = "#c9f5b0";
    ctx.fillRect(x, y - 12, 40, 5);
    ctx.fillStyle = OUT;
    ctx.font = "bold 24px VT323, ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("</>", x + 20, y + 3);
  } else {
    spr(ctx, COFFEE, Math.round(p.x - 13), y - 9, COFFEE_PAL);
    ctx.fillStyle = "rgba(255,255,255,.85)";
    const s = Math.floor(t * 5) % 2;
    ctx.fillRect(Math.round(p.x - 7 + s * 3), y - 22, 3, 6);
    ctx.fillRect(Math.round(p.x + 1 - s * 3), y - 26, 3, 6);
  }
}

function drawGirl(ctx: CanvasRenderingContext2D, x: number, gy: number, t: number, pose: "run" | "air" | "stand" | "sit") {
  if (pose === "sit") {
    spr(ctx, GIRL_SIT, x, gy - GIRL_SIT.length * U, GIRL_PAL);
    return;
  }
  const legs = pose === "air" ? GIRL_AIR : pose === "stand" ? GIRL_RUN_B : Math.floor(t * 11) % 2 ? GIRL_RUN_A : GIRL_RUN_B;
  const rows = [...GIRL_TOP, ...legs];
  spr(ctx, rows, x, gy - rows.length * U, GIRL_PAL);
}

// ---- screen furniture ---------------------------------------------------------------

const menuBtn = "group flex items-center gap-2 px-2 font-pixel text-[clamp(1rem,4.4cqw,1.9rem)] leading-none tracking-wider text-[#fff8ec] focus-visible:outline-none";
const shadow = { textShadow: "2px 2px 0 #2a2230" } as const;
const tiny = "grid h-8 min-w-9 place-items-center border-[3px] border-[#fff8ec] bg-[#3a3048] px-2 font-pixel text-lg leading-none text-[#fff8ec] hover:bg-[#54456a] disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f7c948]";
const ctaBase = "inline-flex items-center justify-center border-[3px] border-[#2a2230] px-2.5 py-1 font-pixel text-[clamp(.8rem,min(3cqw,3.9cqh),1.25rem)] leading-none tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2230]";

function MenuItem({ children, onClick, autoFocus }: { children: ReactNode; onClick: () => void; autoFocus?: boolean }) {
  return (
    <button type="button" onClick={onClick} autoFocus={autoFocus} onMouseEnter={(e) => e.currentTarget.focus({ preventScroll: true })} onPointerDown={(e) => e.stopPropagation()} className={menuBtn} style={shadow}>
      <span className="w-4 text-left opacity-0 group-focus:opacity-100">▶</span>
      {children}
    </button>
  );
}

export function BugRun({ onClose, onNavigate }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const world = useRef<World>(fresh());
  const statusRef = useRef<Status>("menu");
  const modeRef = useRef<Mode>("run");
  const [fx, setFx] = useState({ kills: 0, mult: 0, bestCombo: 0, debug: 0 });
  const [status, setStatus] = useState<Status>("menu");
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => readNumber(BEST_KEYS.run));
  const [buffs, setBuffs] = useState({ shield: false, coffee: false });
  const bestRef = useRef(best);
  const { on: soundOn, beep, toggle: toggleSound } = useBeeps(SND_KEY);

  const setS = useCallback((s: Status) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const start = useCallback(
    (m?: Mode) => {
      const next = m ?? modeRef.current;
      modeRef.current = next;
      const saved = readNumber(BEST_KEYS[next]);
      bestRef.current = saved;
      setBest(saved);
      world.current = fresh();
      // DEBUG MODE: the debugging ability never runs out
      if (next === "debug") world.current.debugT = 1e9;
      setLives(3);
      setScore(0);
      setBuffs({ shield: false, coffee: false });
      setFx({ kills: 0, mult: 0, bestCombo: 0, debug: 0 });
      setS("playing");
      beep([
        [523, 0.06],
        [659, 0.06],
        [784, 0.09],
      ]);
      stage.current?.focus({ preventScroll: true });
    },
    [beep, setS],
  );

  // while the </> power-up lasts: a little debugging bolt from the runner's hand
  const fire = useCallback(() => {
    const w = world.current;
    if (statusRef.current !== "playing" || w.debugT <= 0) return;
    if (w.fireCd > 0 || w.shots.length >= 3) return;
    w.fireCd = 0.2;
    const y = GROUND - w.y - 16;
    w.shots.push({ x: PX + PW - 2, y });
    burst(w, PX + PW, y, 3, ["#fffbe0", "#f7c948"], 0.35);
    beep([
      [880, 0.03],
      [1320, 0.04],
    ]);
  }, [beep]);

  const jump = useCallback(() => {
    const w = world.current;
    if (statusRef.current !== "playing") return;
    if (w.y <= 0.5) {
      w.vy = JUMP_V;
      beep([
        [420, 0.04],
        [640, 0.06],
      ]);
    }
  }, [beep]);
  const release = useCallback(() => {
    const w = world.current;
    if (w.vy > 330) w.vy *= 0.55; // let go early for a shorter hop
  }, []);

  const pause = useCallback(() => {
    if (statusRef.current === "playing") setS("paused");
    else if (statusRef.current === "paused") setS("playing");
  }, [setS]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = statusRef.current;
      const onButton = e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement;
      if (s === "menu" || s === "how" || s === "over") {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? [])];
          e.preventDefault();
          if (items.length) {
            const at = items.indexOf(document.activeElement as HTMLElement);
            const step = e.key === "ArrowDown" ? 1 : -1;
            items[(at + step + items.length) % items.length]!.focus({ preventScroll: true });
          }
        } else if (e.key === " ") {
          if (!onButton && s === "menu") {
            e.preventDefault();
            start("run");
          } else if (!onButton) e.preventDefault();
        }
        return;
      }
      if (world.current.debugT > 0 && ["x", "X", "z", "Z", "f", "F", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        fire();
        return;
      }
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        if (e.repeat) return;
        if (s === "paused") setS("playing");
        else jump();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        pause();
      }
    };
    const up = (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "ArrowUp") && !isTyping(e)) {
        const s = statusRef.current;
        if (s === "playing" || s === "paused") e.preventDefault();
        if (s === "playing") release();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [fire, jump, pause, release, setS, start]);

  useEffect(() => {
    const on = () => document.hidden && statusRef.current === "playing" && setS("paused");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, [setS]);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const reduced = prefersReducedMotion();
    let last = performance.now();
    let raf = 0;
    let shown = { score: -1, lives: 3, shield: false, coffee: false, kills: 0, mult: 0, bestCombo: 0, dbg: 0 };

    const lose = (w: World, o: Obstacle) => {
      o.hit = true;
      if (w.shield) {
        w.shield = false;
        w.invuln = 0.7;
        beep([[500, 0.06], [360, 0.08]]);
        return;
      }
      w.lives -= 1;
      w.invuln = 1.3;
      w.combo = 0;
      w.comboT = 0;
      beep([[200, 0.1], [140, 0.16]], "sawtooth");
      if (w.lives <= 0) {
        w.dying = 0;
        w.killer = o;
        w.puffs = [];
        setS("dying");
      }
    };

    const kill = (w: World, o: Obstacle, how: "shot" | "stomp") => {
      o.dead = true;
      w.combo += 1;
      w.comboT = 2.4;
      w.bestCombo = Math.max(w.bestCombo, w.combo);
      w.kills += 1;
      const mult = multOf(w.combo);
      const pts = 25 * mult;
      w.bonus += pts;
      const cx = o.x + o.w / 2;
      const cy = GROUND - o.h / 2;
      burst(w, cx, cy, 20, BURST);
      w.pops.push({ x: cx, y: cy - 14, text: `+${pts}${mult > 1 ? ` x${mult}` : ""}`, t: 0, c: mult > 1 ? "#f7c948" : "#fffaf0" });
      if (how === "stomp") w.pops.push({ x: cx, y: cy - 34, text: "SQUASH!", t: 0, c: "#9be07a" });
      if (!reduced) w.shake = 0.14;
      beep([
        [300 + mult * 90, 0.04],
        [520 + mult * 120, 0.07],
      ]);
    };

    const update = (dt: number) => {
      const w = world.current;
      const debug = w.debugT > 0;
      w.time += dt;
      w.fireCd = Math.max(0, w.fireCd - dt);
      w.debugT = Math.max(0, w.debugT - dt);
      if (w.comboT > 0) {
        w.comboT = Math.max(0, w.comboT - dt);
        if (w.comboT === 0) w.combo = 0;
      }
      stepFx(w, dt);
      const boost = w.coffee > 0 ? 1.28 : 1;
      w.speed = Math.min(620, 290 + w.dist * 0.032);
      const v = w.speed * boost;
      w.dist += v * dt;
      w.coffee = Math.max(0, w.coffee - dt);
      w.invuln = Math.max(0, w.invuln - dt);

      // jump physics: a clear takeoff, a slightly heavier fall
      w.vy -= GRAVITY * (w.vy < 0 ? 1.15 : 1) * dt;
      w.y += w.vy * dt;
      if (w.y <= 0) {
        w.y = 0;
        w.vy = 0;
      }

      w.nextObstacle -= v * dt;
      if (w.nextObstacle <= 0) spawn(w, debug);
      w.nextPickup -= v * dt;
      if (w.nextPickup <= 0) {
        w.pickups.push({ id: w.id++, kind: ((r) => (r < 0.45 && modeRef.current !== "debug" ? "debug" : r < 0.72 ? "shield" : "coffee"))(Math.random()), x: W + 30, y: GROUND - 82 - Math.random() * 22 });
        w.nextPickup = 4200 + Math.random() * 2800;
      }
      for (const o of w.obstacles) o.x -= v * dt;
      for (const p of w.pickups) p.x -= v * dt;
      // bolts fly right; bugs and code boxes pop, cacti just shrug them off
      for (const s of w.shots) {
        s.x += 640 * dt;
        for (const o of w.obstacles) {
          if (s.dead || o.dead || o.hit) continue;
          if (s.x + 12 > o.x + 2 && s.x < o.x + o.w - 2 && s.y + 5 > GROUND - o.h && s.y - 5 < GROUND) {
            s.dead = true;
            if (o.kind === "cactus") {
              burst(w, s.x + 12, s.y, 5, ["#d0d0d0", "#ffffff"], 0.4);
              beep([[180, 0.04]]);
            } else kill(w, o, "shot");
          }
        }
      }
      w.shots = w.shots.filter((s) => !s.dead && s.x < W + 20);
      w.obstacles = w.obstacles.filter((o) => !o.dead && o.x + o.w > -30);
      w.pickups = w.pickups.filter((p) => p.x > -30);

      // collisions use a box a little smaller than the drawing, so near misses feel fair
      const px0 = PX + 9;
      const px1 = PX + PW - 7;
      const py1 = GROUND - w.y - 3;
      const py0 = GROUND - w.y - PH + 6;
      for (const o of w.obstacles) {
        if (o.hit || o.dead) continue;
        const ox0 = o.x + 6;
        const ox1 = o.x + o.w - 6;
        const oy0 = GROUND - o.h + 6;
        if (px1 > ox0 && px0 < ox1 && py1 > oy0 && py0 < GROUND) {
          // debug mode: coming down on a bug squashes it and bounces you up
          if (debug && o.kind === "bug" && w.vy < 0 && py1 <= GROUND - o.h + 16) {
            kill(w, o, "stomp");
            w.vy = 520;
            continue;
          }
          if (w.invuln > 0) continue;
          lose(w, o);
          if (statusRef.current === "dying") return;
        }
      }
      for (let i = w.pickups.length - 1; i >= 0; i--) {
        const p = w.pickups[i]!;
        if (px1 > p.x - 14 && px0 < p.x + 14 && py1 > p.y - 14 && py0 < p.y + 14) {
          if (p.kind === "shield") w.shield = true;
          else if (p.kind === "coffee") w.coffee = 3.5;
          else {
            w.debugT = 8;
            w.pops.push({ x: PX + 20, y: GROUND - w.y - 60, text: "DEBUG MODE!", t: 0, c: "#9be07a" });
            burst(w, PX + 20, GROUND - w.y - 24, 12, ["#9be07a", "#c9f5b0", "#fffbe0"], 0.8);
          }
          beep([[660, 0.05], [880, 0.05], [1175, 0.08]]);
          w.pickups.splice(i, 1);
        }
      }
    };

    const updateDying = (dt: number) => {
      const w = world.current;
      w.dying += dt;
      w.time += dt;
      stepFx(w, dt);
      // the last bug scurries off while the runner dusts themselves off
      if (w.killer) w.killer.x += 420 * dt;
      w.vy -= GRAVITY * dt;
      w.y = Math.max(0, w.y + w.vy * dt);
      if (w.y === 0) w.vy = 0;
      if (!reduced && Math.random() < dt * 14 && w.dying > 0.15) w.puffs.push({ x: PX + 8 + Math.random() * 24, y: GROUND - 20 - Math.random() * 25, t: 0 });
      for (const p of w.puffs) p.t += dt;
      w.puffs = w.puffs.filter((p) => p.t < 0.5);
      if (w.dying > (reduced ? 0.2 : 1.05)) {
        const final = Math.floor(w.dist / 14) + w.bonus;
        if (final > bestRef.current) {
          bestRef.current = final;
          setBest(final);
          writeStore(BEST_KEYS[modeRef.current], String(final));
        }
        setScore(final);
        setS("over");
      }
    };

    const drawInner = () => {
      const w = world.current;
      const s = statusRef.current;
      const t = w.time;
      const running = s === "playing" || s === "paused" || s === "dying";
      const scroll = running ? w.dist : t * 40;

      if (s === "over") {
        drawScene(ctx, DUSK, GROUND_OVER, scroll, t, reduced);
        const cx = W / 2 - 18;
        drawBug(ctx, cx - 110, GROUND_OVER, reduced ? 0 : t * 0.5, 3);
        drawBug(ctx, cx + 80, GROUND_OVER, reduced ? 0 : t * 0.5, 7, true);
        drawBug(ctx, cx - 190, GROUND_OVER, reduced ? 0 : t * 0.5, 5);
        drawGirl(ctx, cx, GROUND_OVER, t, "sit");
        // a little "..." speech bubble
        ctx.fillStyle = OUT;
        ctx.fillRect(cx + 38, GROUND_OVER - 56, 38, 22);
        ctx.fillStyle = "#fffaf0";
        ctx.fillRect(cx + 40, GROUND_OVER - 54, 34, 18);
        ctx.fillStyle = OUT;
        for (let i = 0; i < 3; i++) ctx.fillRect(cx + 46 + i * 9, GROUND_OVER - 46, 4, 4);
        ctx.fillRect(cx + 34, GROUND_OVER - 34, 4, 4);
        return;
      }

      drawScene(ctx, DAY, GROUND, scroll, t, reduced);

      if (s === "menu" || s === "how") {
        drawGirl(ctx, 40, GROUND, t, "stand");
        drawBug(ctx, 330, GROUND, t, 1);
        spr(ctx, CACTUS, 470, GROUND - CACTUS.length * U, CACTUS_PAL);
        return;
      }

      for (const p of w.pickups) drawPickup(ctx, p, t);
      for (const o of w.obstacles) drawObstacle(ctx, o, t, GROUND);
      for (const sh of w.shots) {
        const sx = Math.round(sh.x);
        const sy = Math.round(sh.y);
        ctx.fillStyle = "rgba(247,201,72,.28)";
        ctx.fillRect(sx - 26, sy - 2, 26, 4);
        ctx.fillStyle = "rgba(247,201,72,.5)";
        ctx.fillRect(sx - 14, sy - 3, 14, 6);
        ctx.fillStyle = OUT;
        ctx.fillRect(sx - 1, sy - 5, 15, 10);
        ctx.fillStyle = "#f7c948";
        ctx.fillRect(sx, sy - 4, 13, 8);
        ctx.fillStyle = "#fffbe0";
        ctx.fillRect(sx + 6, sy - 2, 7, 4);
      }

      const blink = w.invuln > 0 && Math.floor(w.invuln * 12) % 2 === 0 && s !== "dying";
      const py = GROUND - w.y;
      ctx.fillStyle = "rgba(42,34,48,.18)";
      ctx.fillRect(PX + 6 + Math.min(6, w.y / 20), GROUND + 2, PW - 12 - Math.min(12, w.y / 10), 3);
      if (!blink) drawGirl(ctx, PX, py, t, w.y > 1 ? "air" : s === "dying" ? "stand" : "run");
      if (w.debugT > 0 && s !== "dying") {
        // a little </> badge over the head, with a timer bar
        const bx = PX + 2;
        const by = py - PH - 24;
        ctx.fillStyle = OUT;
        ctx.fillRect(bx - 2, by - 2, 38, 18);
        ctx.fillStyle = "#9be07a";
        ctx.fillRect(bx, by, 34, 14);
        ctx.fillStyle = OUT;
        ctx.font = "bold 16px VT323, ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("</>", bx + 17, by + 8);
        ctx.fillStyle = OUT;
        ctx.fillRect(bx - 2, by + 17, 38, 6);
        ctx.fillStyle = "#fff8ec";
        ctx.fillRect(bx, by + 18, Math.round(Math.min(1, w.debugT / 8) * 34), 4);
      }
      if (w.shield && s !== "dying") {
        ctx.strokeStyle = "#b9a6e3";
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.ellipse(PX + 19, py - 22, 30, 34, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (w.coffee > 0 && !reduced) {
        ctx.fillStyle = "rgba(255,255,255,.7)";
        for (let i = 0; i < 3; i++) ctx.fillRect(PX - 14 - i * 12, py - 14 - i * 9, 9, 3);
      }
      for (const p of w.puffs) {
        ctx.fillStyle = `rgba(255,250,240,${0.8 * (1 - p.t * 2)})`;
        const r = 3 + p.t * 12;
        ctx.fillRect(Math.round(p.x - r / 2), Math.round(p.y - p.t * 16 - r / 2), Math.round(r), Math.round(r));
      }
      for (const p of w.parts) {
        ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
        ctx.fillStyle = p.c;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
      }
      ctx.globalAlpha = 1;
      ctx.font = "bold 22px VT323, ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.lineWidth = 4;
      ctx.strokeStyle = OUT;
      for (const p of w.pops) {
        const y = Math.round(p.y - p.t * 34);
        ctx.globalAlpha = Math.min(1, (0.9 - p.t) * 3);
        ctx.strokeText(p.text, Math.round(p.x), y);
        ctx.fillStyle = p.c;
        ctx.fillText(p.text, Math.round(p.x), y);
      }
      ctx.globalAlpha = 1;
      // the combo timer: a thin bar that drains while you keep the chain alive
      if (w.combo > 0 && w.comboT > 0) {
        const bw = Math.round((w.comboT / 2.4) * 90);
        ctx.fillStyle = OUT;
        ctx.fillRect(W / 2 - 49, 12, 98, 10);
        ctx.fillStyle = "#fff8ec";
        ctx.fillRect(W / 2 - 45, 14, 90, 6);
        ctx.fillStyle = "#f7c948";
        ctx.fillRect(W / 2 - 45, 14, bw, 6);
      }
    };

    const draw = () => {
      const w = world.current;
      const shaky = w.shake > 0 && !reduced;
      ctx.save();
      if (shaky) ctx.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 6));
      drawInner();
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(0.034, (now - last) / 1000);
      last = now;
      const s = statusRef.current;
      if (s === "playing") update(dt);
      else if (s === "dying") updateDying(dt);
      else if (s !== "paused") world.current.time += dt;
      draw();
      const w = world.current;
      const sc = Math.floor(w.dist / 14) + w.bonus;
      if (s === "playing" || s === "dying") {
        const mult = multOf(w.combo);
        const dbg = Math.ceil(w.debugT);
        if (sc !== shown.score) setScore(sc);
        if (w.lives !== shown.lives) setLives(Math.max(0, w.lives));
        if (w.shield !== shown.shield || w.coffee > 0 !== shown.coffee) setBuffs({ shield: w.shield, coffee: w.coffee > 0 });
        if (w.kills !== shown.kills || mult !== shown.mult || w.bestCombo !== shown.bestCombo || dbg !== shown.dbg) setFx({ kills: w.kills, mult, bestCombo: w.bestCombo, debug: dbg });
        shown = { score: sc, lives: w.lives, shield: w.shield, coffee: w.coffee > 0, kills: w.kills, mult, bestCombo: w.bestCombo, dbg };
      } else shown = { score: -1, lives: -1, shield: false, coffee: false, kills: -1, mult: -1, bestCombo: -1, dbg: -1 };
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [beep, setS]);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(id);
  };
  const over = status === "over";
  const playing = status === "playing" || status === "paused";

  return (
    <GameWindow bare title="BUG RUN: SHIP IT!" label="Bug Run: Ship It!" onClose={onClose} maxWidth={720}>
      <div
        className="mx-auto overflow-hidden"
        style={{
          border: `4px solid ${OUT}`,
          borderRadius: 8,
          background: OUT,
          boxShadow: "6px 7px 0 rgba(42,34,48,.85)",
          // fit the screen's height: no scrolling to see the whole game
          width: over ? "100%" : `min(100%, max(300px, calc((100dvh - 150px) * ${W / H})))`,
        }}
      >
        <div
          ref={stage}
          tabIndex={-1}
          className="relative w-full select-none overflow-hidden outline-none"
          style={over ? { height: "clamp(300px, calc(100dvh - 90px), 440px)", containerType: "size", background: DUSK.sky[0], touchAction: "none" } : { aspectRatio: `${W} / ${H}`, containerType: "size", background: DAY.sky[0], touchAction: "none" }}
          aria-label="Bug Run game area. Press space or arrow up to jump, or tap."
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            if (statusRef.current === "paused") setS("playing");
            else jump();
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onPointerLeave={release}
        >
          <canvas ref={canvas} className="absolute inset-0 block h-full w-full object-cover" style={{ imageRendering: "pixelated", objectPosition: "center bottom" }} />

          {fx.debug > 0 && status === "playing" && (
            <button
              type="button"
              aria-label="Fire"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                fire();
              }}
              className="absolute bottom-3 right-3 z-20 border-[3px] border-[#2a2230] bg-[#f7c948] px-3 py-2 font-pixel text-xl leading-none text-[#2a2230] active:translate-y-0.5 sm:bottom-4 sm:right-4"
            >
              FIRE
            </button>
          )}

          {(playing || status === "dying") && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-2 pr-11 sm:p-3 sm:pr-12">
              <div className="flex items-center gap-1" role="img" aria-label={`${lives} of 3 lives left`}>
                {[0, 1, 2].map((i) => (
                  <PixelHeart key={i} full={i < lives} />
                ))}
                {buffs.shield && (
                  <span className="ml-2 border-2 border-[#2a2230] bg-[#b9a6e3] px-1.5 font-pixel text-base leading-5 text-[#2a2230]">SHIELD</span>
                )}
                {fx.debug > 0 && (
                  <span className="ml-1 border-2 border-[#2a2230] bg-[#9be07a] px-1.5 font-pixel text-base leading-5 text-[#2a2230]">{fx.debug > 99 ? "DEBUG ON" : `DEBUG ${fx.debug}s`}</span>
                )}
                {buffs.coffee && (
                  <span className="ml-1 border-2 border-[#2a2230] bg-[#f6d86b] px-1.5 font-pixel text-base leading-5 text-[#2a2230]">COFFEE</span>
                )}
              </div>
              <div className="text-right font-pixel leading-none text-[#fffaf0]" style={shadow}>
                <div className="text-[clamp(1.1rem,4cqw,1.9rem)]">SCORE: {score}</div>
                <div className="mt-1 text-base opacity-80 sm:text-lg">BEST: {best}</div>
                {(fx.kills > 0 || fx.debug > 0) && (
                  <div className="mt-1 text-base sm:text-lg">
                    BUGS: {fx.kills}
                    {fx.mult > 0 && <span className="ml-2 border-2 border-[#2a2230] bg-[#f7c948] px-1 text-[#2a2230]" style={{ textShadow: "none" }}>COMBO x{fx.mult}</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {status === "menu" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-start gap-1 px-3 pt-3 text-center sm:pt-5">
              <h3
                className="font-silk text-[clamp(1.6rem,10cqw,4.2rem)] font-bold leading-none tracking-wide text-[#f7c948]"
                style={{ textShadow: "3px 3px 0 #7a4a1a, -2px -2px 0 #3a2410, 2px -2px 0 #3a2410, -2px 2px 0 #3a2410, 0 5px 0 #3a2410" }}
              >
                BUG RUN
              </h3>
              <span className="border-[3px] border-[#7a4a1a] bg-[#f6a24a] px-4 py-0.5 font-silk text-[clamp(.8rem,3.4cqw,1.5rem)] font-bold tracking-wide text-[#fff7e0]" style={{ boxShadow: "0 3px 0 #7a4a1a" }}>
                SHIP IT!
              </span>
              <div ref={menuRef} className="mt-1 flex flex-col items-start sm:mt-3">
                <MenuItem autoFocus onClick={() => start("run")}>
                  START RUN
                </MenuItem>
                <MenuItem onClick={() => start("debug")}>
                  DEBUG MODE
                  <span className="ml-1 border-2 border-[#2a2230] bg-[#9be07a] px-1 font-pixel text-sm leading-4 text-[#2a2230]" style={{ textShadow: "none" }}>
                    SHOOT
                  </span>
                </MenuItem>
                <MenuItem onClick={() => setS("how")}>HOW TO PLAY</MenuItem>
                <MenuItem onClick={onClose}>BACK</MenuItem>
              </div>
              <div className="pointer-events-none absolute bottom-[24%] right-[3%] hidden text-center sm:block" aria-hidden="true">
                <div className="border-4 border-[#6b4226] bg-[#c58a4f] px-2 py-1 font-silk text-[11px] font-bold leading-tight text-[#2a1a0e]">
                  DODGE
                  <br />
                  DEBUG
                  <br />
                  DEPLOY
                </div>
                <div className="mx-auto h-8 w-2 bg-[#6b4226]" />
              </div>
            </div>
          )}

          {status === "how" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 px-3 text-center font-pixel text-[#fff8ec]" style={{ background: "rgba(42,34,48,.72)" }}>
              <h3 className="font-silk text-[clamp(1rem,4.4cqw,1.9rem)] font-bold leading-none" style={shadow}>
                HOW TO PLAY
              </h3>
              <ul className="mt-1 text-[clamp(.8rem,3.3cqw,1.5rem)] leading-tight">
                <li>SPACE / ↑ / TAP to jump</li>
                <li>HOLD for a higher hop</li>
                <li>COFFEE = quick speed boost</li>
                <li>SHIELD = one free hit</li>
                <li>3 LIVES. Dodge the bugs!</li>
                <li className="text-[#9be07a]">Grab the &lt;/&gt; icon to DEBUG for 8s:</li>
                <li className="text-[#9be07a]">X / F fires bolts, land on bugs</li>
                <li className="text-[#9be07a]">to squash them. Chain kills!</li>
                <li className="text-[#9be07a]">DEBUG MODE: always armed.</li>
              </ul>
              <div ref={menuRef} className="flex flex-col items-start">
                <MenuItem autoFocus onClick={() => setS("menu")}>
                  BACK
                </MenuItem>
              </div>
            </div>
          )}

          {status === "paused" && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2" style={{ background: "rgba(42,34,48,.55)" }}>
              <h3 className="font-silk text-3xl font-bold text-[#fff8ec]" style={shadow}>
                PAUSED
              </h3>
              <button type="button" autoFocus onClick={pause} onPointerDown={(e) => e.stopPropagation()} className={`${ctaBase} bg-[#fff8ec] text-[#2a2230]`}>
                RESUME
              </button>
            </div>
          )}

          {over && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-between px-3 pb-3 pt-4 text-center">
              <div>
                <h3 className="font-silk text-[clamp(1.05rem,min(6cqw,7cqh),2.4rem)] font-bold leading-tight tracking-wide text-[#fffaf0]" style={{ textShadow: "3px 3px 0 #2a2230" }}>
                  BUGS WON.
                  <br />
                  THIS ROUND.
                </h3>
                <p className="mt-1 font-pixel text-[clamp(.9rem,min(4cqw,4.6cqh),1.5rem)] leading-none text-[#fffaf0]" style={shadow}>
                  But I've got more things to build.
                </p>
              </div>
              <div ref={menuRef} className="w-full max-w-[560px] border-4 border-[#6b4226] bg-[#fbf3df] px-3 py-2 text-[#2a2230]" onPointerDown={(e) => e.stopPropagation()}>
                <p className="font-pixel text-[clamp(.85rem,min(3.6cqw,4.4cqh),1.5rem)] leading-tight">
                  Curious builder. Always learning.
                  <br />
                  Excited to solve interesting problems.
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <a href="#work" onClick={go("work")} className={`${ctaBase} bg-[#1f2a4a] text-[#fbf3df] hover:bg-[#2f3d66]`} data-testid="bugrun-projects">
                    EXPLORE MY PROJECTS ↗
                  </a>
                  <a href="#hi" onClick={go("hi")} className={`${ctaBase} bg-[#f48fa0] text-[#2a2230] hover:bg-[#f7a8b5]`} data-testid="bugrun-contact">
                    LET'S TALK ↗
                  </a>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-pixel text-[clamp(.85rem,min(3.2cqw,4cqh),1.25rem)] leading-none">
                  <button type="button" autoFocus onClick={() => start()} className="tracking-wide underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2230]">
                    PLAY AGAIN ↻
                  </button>
                  <span className="opacity-60">
                    SCORE: {score} · BEST: {best}
                    {fx.kills > 0 ? ` · SQUASHED: ${fx.kills} · BEST CHAIN: ${fx.bestCombo}` : ""}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* control strip: only while a run is going */}
        {(playing || status === "dying") && (
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 sm:px-3">
          <p className="font-pixel text-base leading-none text-[#fff8ec]/70 sm:text-lg">{fx.debug > 0 ? "SPACE: JUMP · X / F / FIRE: SHOOT · LAND ON BUGS" : "SPACE / ↑ / TAP: JUMP · P: PAUSE"}</p>
          <div className="flex gap-1.5">
            <button type="button" onClick={pause} disabled={!playing} aria-label={status === "paused" ? "Resume" : "Pause"} className={tiny}>
              {status === "paused" ? "▶" : "❚❚"}
            </button>
            <button type="button" onClick={() => start()} aria-label="Restart" className={tiny}>
              ↻
            </button>
            <button type="button" onClick={toggleSound} aria-label={soundOn ? "Sound on" : "Sound off"} aria-pressed={soundOn} className={tiny}>
              {soundOn ? "SND" : "---"}
            </button>
          </div>
        </div>
        )}
      </div>
    </GameWindow>
  );
}
