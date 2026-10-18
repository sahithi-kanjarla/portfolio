import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { btnBase, GameWindow, INK, isTyping, LAVENDER, PAPER, prefersReducedMotion, writeStore, type GameProps } from "./shared";

// ---- model ----------------------------------------------------------------

type Shape = "star" | "heart" | "flower" | "circle" | "cloud" | "squiggle" | "blob" | "splash";
type Stamp = { id: number; type: "stamp"; shape: Shape; x: number; y: number; size: number; rot: number; color: string; seed: number };
type Stroke = { id: number; type: "stroke"; pts: [number, number][]; color: string; width: number; dx: number; dy: number };
type Item = Stamp | Stroke;
type Session = { w: number; h: number; items: Item[] };

const CHARCOAL = "#2b2b2b";
const PALETTE: { name: string; color: string }[] = [
  { name: "Charcoal", color: CHARCOAL },
  { name: "Dusty pink", color: "#e8a0b4" },
  { name: "Lavender", color: "#b9a6e3" },
  { name: "Pale yellow", color: "#f3dd8a" },
  { name: "Sage green", color: "#9dbf94" },
  { name: "Muted blue", color: "#8fadd1" },
];
const COLORS = PALETTE.map((p) => p.color);
const SHAPES: { shape: Shape; label: string }[] = [
  { shape: "star", label: "Star" },
  { shape: "heart", label: "Heart" },
  { shape: "flower", label: "Flower" },
  { shape: "circle", label: "Circle" },
  { shape: "cloud", label: "Cloud" },
  { shape: "squiggle", label: "Squiggle" },
  { shape: "blob", label: "Blob" },
  { shape: "splash", label: "Splash" },
];

const STORE_KEY = "fm-chaos-session";
const HINT_KEY = "fm-chaos-hint-dismissed";
const MAX_HISTORY = 60;
const MAX_ITEMS = 150;

// kept for the whole visit, so closing the window never loses a doodle
let memory: Session | null = null;
const loadSession = (): Session | null => {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (s && Array.isArray(s.items) && s.w > 0 && s.h > 0) return (memory = s);
  } catch {
    /* ignore */
  }
  return null;
};

// ---- hand-drawn geometry --------------------------------------------------

type P = [number, number];
type Geo = { polys: P[][]; closed: boolean; sharp: boolean };

const prng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const polar = (n: number, f: (a: number) => number, jitter: (a: number) => number): P[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = f(a) * (1 + jitter(a));
    return [Math.cos(a) * r, Math.sin(a) * r] as P;
  });

const geoCache = new Map<string, Geo>();
function geo(shape: Shape, seed: number): Geo {
  const key = `${shape}:${seed}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const r = prng(seed);
  const j = (amt: number) => () => (r() - 0.5) * amt;
  let g: Geo;
  switch (shape) {
    case "star": {
      const pts: P[] = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5 + (r() - 0.5) * 0.1;
        const rad = (i % 2 ? 0.47 : 1) * (1 + (r() - 0.5) * 0.14);
        pts.push([Math.cos(a) * rad, Math.sin(a) * rad + 0.06]);
      }
      g = { polys: [pts], closed: true, sharp: true };
      break;
    }
    case "heart": {
      const pts: P[] = [];
      for (let i = 0; i < 44; i++) {
        const t = (i / 44) * Math.PI * 2;
        const k = 1 + (r() - 0.5) * 0.05;
        pts.push([((16 * Math.sin(t) ** 3) / 17) * k, (-(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17) * k + 0.05]);
      }
      g = { polys: [pts], closed: true, sharp: false };
      break;
    }
    case "flower":
      g = { polys: [polar(100, (a) => 0.6 + 0.4 * Math.abs(Math.cos(2.5 * a + 0.3)), j(0.05))], closed: true, sharp: false };
      break;
    case "circle":
      g = { polys: [polar(40, () => 1, j(0.09)).map(([x, y]) => [x * 1.04, y * 0.96] as P)], closed: true, sharp: false };
      break;
    case "cloud": {
      const pts: P[] = [];
      for (let i = 0; i < 70; i++) {
        const a = (i / 70) * Math.PI * 2;
        const bump = 1 + 0.15 * Math.cos(6.5 * a + 0.4);
        const sy = Math.sin(a) < 0 ? 0.62 : 0.34;
        pts.push([Math.cos(a) * bump * (1 + (r() - 0.5) * 0.03), Math.sin(a) * bump * sy + 0.05]);
      }
      g = { polys: [pts], closed: true, sharp: false };
      break;
    }
    case "blob": {
      const a1 = r() * 6;
      const a2 = r() * 6;
      const a3 = r() * 6;
      g = { polys: [polar(60, (a) => 0.72 + 0.18 * Math.sin(2 * a + a1) + 0.12 * Math.sin(3 * a + a2) + 0.07 * Math.sin(5 * a + a3), () => 0)], closed: true, sharp: false };
      break;
    }
    case "splash": {
      const a1 = r() * 6;
      const polys: P[][] = [polar(40, (a) => 0.46 + 0.1 * Math.sin(3 * a + a1), j(0.1))];
      const n = 6 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.5;
        const d = 0.68 + r() * 0.3;
        const rad = 0.06 + r() * 0.1;
        polys.push(polar(14, () => rad, () => 0).map(([x, y]) => [x + Math.cos(a) * d, y + Math.sin(a) * d] as P));
      }
      g = { polys, closed: true, sharp: false };
      break;
    }
    default: {
      const ph = r() * 3;
      const pts: P[] = [];
      for (let i = 0; i <= 28; i++) {
        const x = -1 + (i / 28) * 2;
        pts.push([x, 0.3 * Math.sin(x * Math.PI * 2.3 + ph) * (0.85 + r() * 0.3)]);
      }
      g = { polys: [pts], closed: false, sharp: false };
    }
  }
  geoCache.set(key, g);
  return g;
}

const trace = (ctx: CanvasRenderingContext2D, pts: P[], closed: boolean, sharp: boolean) => {
  const n = pts.length;
  ctx.beginPath();
  if (sharp || n < 3) {
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (closed) ctx.closePath();
    return;
  }
  if (closed) {
    ctx.moveTo((pts[n - 1]![0] + pts[0]![0]) / 2, (pts[n - 1]![1] + pts[0]![1]) / 2);
    for (let i = 0; i < n; i++) {
      const a = pts[i]!;
      const b = pts[(i + 1) % n]!;
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < n - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.lineTo(pts[n - 1]![0], pts[n - 1]![1]);
  }
};

// ---- drawing --------------------------------------------------------------

function drawStamp(ctx: CanvasRenderingContext2D, s: Pick<Stamp, "shape" | "x" | "y" | "size" | "rot" | "color" | "seed">, k = 1) {
  const size = s.size * k;
  if (size < 0.5) return;
  const g = geo(s.shape, s.seed);
  const lw = 2.4 / size;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rot);
  ctx.scale(size, size);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  if (s.shape === "squiggle") {
    const pts = g.polys[0]!;
    const core = Math.max(0.1, 0.15);
    if (s.color !== CHARCOAL) {
      trace(ctx, pts, false, false);
      ctx.lineWidth = core + lw * 2.2;
      ctx.stroke();
    }
    trace(ctx, pts, false, false);
    ctx.strokeStyle = s.color;
    ctx.lineWidth = core;
    ctx.stroke();
  } else {
    ctx.fillStyle = s.color;
    for (const poly of g.polys) {
      trace(ctx, poly, g.closed, g.sharp);
      ctx.fill();
    }
    for (const poly of g.polys) {
      trace(ctx, poly, g.closed, g.sharp);
      ctx.lineWidth = lw;
      ctx.stroke();
    }
    // a second, fainter pass slightly off-register, like a quick pen outline
    ctx.save();
    ctx.translate(0.025, -0.02);
    ctx.globalAlpha *= 0.4;
    trace(ctx, g.polys[0]!, g.closed, g.sharp);
    ctx.lineWidth = lw * 0.7;
    ctx.stroke();
    ctx.restore();
    if (s.shape === "flower") {
      ctx.beginPath();
      ctx.arc(0, 0, 0.2, 0, Math.PI * 2);
      ctx.fillStyle = s.color === "#f3dd8a" ? "#e8a0b4" : "#f3dd8a";
      ctx.fill();
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, k = 1) {
  if (!s.pts.length) return;
  ctx.save();
  ctx.translate(s.dx, s.dy);
  ctx.globalAlpha = Math.max(0, Math.min(1, k));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.pts.length === 1) {
    const [x, y] = s.pts[0]!;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, y, s.width / 2 + 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(x, y, s.width / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const path = () => trace(ctx, s.pts, false, false);
    if (s.color !== CHARCOAL) {
      path();
      ctx.strokeStyle = INK;
      ctx.lineWidth = s.width + 2.6;
      ctx.stroke();
    }
    path();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.stroke();
  }
  ctx.restore();
}

function bounds(s: Stroke) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [x, y] of s.pts) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  const pad = s.width / 2 + 6;
  return { x0: x0 + s.dx - pad, y0: y0 + s.dy - pad, x1: x1 + s.dx + pad, y1: y1 + s.dy + pad };
}

const HANDLE_ANGLE = Math.PI / 4;
const handleOf = (s: Stamp): P => {
  const r = s.size * (s.shape === "squiggle" ? 1.15 : 1.12);
  return [s.x + Math.cos(HANDLE_ANGLE) * r, s.y + Math.sin(HANDLE_ANGLE) * r];
};

type Anim = { start: number; dur: number; from: Map<number, Item>; delay: Map<number, number> };
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const back = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

type Renderable = { item: Item; k: number };
function resolve(items: Item[], anim: Anim | null, now: number): Renderable[] {
  if (!anim) return items.map((item) => ({ item, k: 1 }));
  const p = clamp01((now - anim.start) / anim.dur);
  return items.map((item) => {
    const from = anim.from.get(item.id);
    if (from) {
      const t = easeOut(p);
      if (item.type === "stamp" && from.type === "stamp") return { item: { ...item, x: from.x + (item.x - from.x) * t, y: from.y + (item.y - from.y) * t, size: from.size + (item.size - from.size) * t, rot: from.rot + (item.rot - from.rot) * t, color: t < 0.5 ? from.color : item.color }, k: 1 };
      if (item.type === "stroke" && from.type === "stroke") return { item: { ...item, dx: from.dx + (item.dx - from.dx) * t, dy: from.dy + (item.dy - from.dy) * t, color: t < 0.5 ? from.color : item.color }, k: 1 };
    }
    const d = anim.delay.get(item.id) ?? 0;
    const q = clamp01((p - d) / Math.max(0.01, 1 - d));
    return { item, k: q <= 0 ? 0 : back(q) };
  });
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, list: Renderable[], opts: { selected?: Item | null; example?: boolean } = {}) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  if (opts.example) {
    // faint examples that fade as soon as there is real artwork
    ctx.save();
    ctx.globalAlpha = 0.16;
    drawStamp(ctx, { shape: "star", x: w * 0.2, y: h * 0.28, size: Math.min(w, h) * 0.1, rot: -0.2, color: CHARCOAL, seed: 3 });
    drawStamp(ctx, { shape: "heart", x: w * 0.76, y: h * 0.3, size: Math.min(w, h) * 0.085, rot: 0.2, color: CHARCOAL, seed: 5 });
    drawStamp(ctx, { shape: "squiggle", x: w * 0.3, y: h * 0.76, size: Math.min(w, h) * 0.14, rot: -0.1, color: CHARCOAL, seed: 8 });
    drawStamp(ctx, { shape: "cloud", x: w * 0.78, y: h * 0.76, size: Math.min(w, h) * 0.11, rot: 0, color: CHARCOAL, seed: 2 });
    ctx.restore();
  }
  for (const { item, k } of list) {
    if (item.type === "stamp") drawStamp(ctx, item, k);
    else drawStroke(ctx, item, k);
  }
  const sel = opts.selected;
  if (sel) {
    ctx.save();
    ctx.strokeStyle = "rgba(28,28,28,.7)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    if (sel.type === "stamp") {
      ctx.beginPath();
      ctx.arc(sel.x, sel.y, sel.size * (sel.shape === "squiggle" ? 1.15 : 1.12), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const [hx, hy] = handleOf(sel);
      ctx.fillStyle = PAPER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      const b = bounds(sel);
      ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
    }
    ctx.restore();
  }
}

// ---- hit testing ------------------------------------------------------------

function hit(item: Item, x: number, y: number): boolean {
  if (item.type === "stamp") {
    const dx = x - item.x;
    const dy = y - item.y;
    const c = Math.cos(-item.rot);
    const s = Math.sin(-item.rot);
    const lx = (dx * c - dy * s) / item.size;
    const ly = (dx * s + dy * c) / item.size;
    if (item.shape === "squiggle") return Math.abs(lx) < 1.08 && Math.abs(ly) < 0.5;
    return lx * lx + ly * ly < 1.1;
  }
  const px = x - item.dx;
  const py = y - item.dy;
  const tol = item.width / 2 + 9;
  if (item.pts.length === 1) return Math.hypot(px - item.pts[0]![0], py - item.pts[0]![1]) < tol;
  for (let i = 1; i < item.pts.length; i++) {
    const [ax, ay] = item.pts[i - 1]!;
    const [bx, by] = item.pts[i]!;
    const vx = bx - ax;
    const vy = by - ay;
    const len2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
    if (Math.hypot(px - (ax + vx * t), py - (ay + vy * t)) < tol) return true;
  }
  return false;
}

// ---- Make it weirder ----------------------------------------------------

const rnd = Math.random;
const between = (a: number, b: number) => a + rnd() * (b - a);
const pickOne = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]!;
const shuffled = <T,>(arr: T[]) => [...arr].sort(() => rnd() - 0.5);

function makeWeirder(items: Item[], w: number, h: number, newId: () => number): { items: Item[]; from: Map<number, Item>; delay: Map<number, number> } {
  const out: Item[] = items.map((i) => (i.type === "stamp" ? { ...i } : { ...i }));
  const from = new Map(items.map((i) => [i.id, i]));
  const delay = new Map<number, number>();
  const full = out.length >= MAX_ITEMS - 6;
  const inX = (v: number) => Math.max(34, Math.min(w - 34, v));
  const inY = (v: number) => Math.max(34, Math.min(h - 34, v));
  const star = (x: number, y: number, size: number): Stamp => ({ id: newId(), type: "stamp", shape: "star", x: inX(x), y: inY(y), size, rot: between(-0.8, 0.8), color: pickOne([COLORS[3]!, COLORS[1]!, COLORS[2]!, CHARCOAL]), seed: Math.floor(rnd() * 9999) });
  let pop = 0;
  const add = (s: Item, front = true) => {
    delay.set(s.id, Math.min(0.6, pop++ * 0.07));
    if (front) out.push(s);
    else out.unshift(s);
  };

  // 1. shake up about a third of what is there
  let targets = out.filter(() => rnd() < 0.35);
  if (!targets.length && out.length) targets = [pickOne(out)];
  for (const t of targets) {
    if (t.type === "stamp") {
      t.rot += (rnd() < 0.5 ? -1 : 1) * between(0.35, 1.1);
      t.size = Math.max(22, Math.min(125, t.size * between(0.75, 1.4)));
      t.x = inX(t.x + between(-34, 34));
      t.y = inY(t.y + between(-34, 34));
    } else {
      t.dx += between(-28, 28);
      t.dy += between(-28, 28);
    }
  }

  // 2. sometimes a new colour combination for part of the page
  if (out.length && rnd() < 0.65) {
    const pair = shuffled(COLORS).slice(0, 2);
    for (const i of out) if (rnd() < 0.38) i.color = pickOne(pair);
  }

  // 3. a few unexpected little stars
  if (!full) {
    const n = out.length < 4 ? 3 : 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) add(star(between(40, w - 40), between(40, h - 40), between(13, 26)));
  }

  // 4. one surprising flourish
  if (!full) {
    const stamps = out.filter((i): i is Stamp => i.type === "stamp");
    const options = ["splash", "squiggle", "cloud", "arc", ...(stamps.length ? ["ring", "ring"] : ["flower", "heart"])];
    const kind = pickOne(options);
    const base = { type: "stamp" as const, seed: Math.floor(rnd() * 9999), rot: between(-0.5, 0.5), color: pickOne(COLORS.slice(1)) };
    if (kind === "ring") {
      const c = pickOne(stamps);
      const n = 6 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = c.size * 1.45;
        add({ id: newId(), type: "stamp", shape: i % 2 ? "circle" : "star", x: inX(c.x + Math.cos(a) * r), y: inY(c.y + Math.sin(a) * r), size: between(8, 13), rot: a, color: pickOne(COLORS.slice(1)), seed: Math.floor(rnd() * 9999) });
      }
    } else if (kind === "arc") {
      const cx = between(w * 0.3, w * 0.7);
      const cy = between(h * 0.4, h * 0.9);
      const rad = between(w * 0.14, w * 0.26);
      const pts: [number, number][] = Array.from({ length: 24 }, (_, i) => {
        const a = Math.PI + (i / 23) * Math.PI;
        return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.8];
      });
      add({ id: newId(), type: "stroke", pts, color: pickOne(COLORS.slice(1)), width: between(5, 9), dx: 0, dy: 0 }, false);
    } else {
      add({ ...base, id: newId(), shape: kind as Shape, x: inX(between(60, w - 60)), y: inY(between(60, h - 60)), size: kind === "splash" ? between(60, 95) : between(46, 80) }, kind !== "splash" && kind !== "cloud");
    }
    if (!items.length) {
      add({ id: newId(), type: "stamp", shape: "flower", x: w * between(0.25, 0.75), y: h * between(0.3, 0.7), size: between(42, 64), rot: between(-0.4, 0.4), color: pickOne(COLORS.slice(1)), seed: Math.floor(rnd() * 9999) });
    }
  }
  return { items: out, from, delay };
}

// ---- icons ------------------------------------------------------------------

function ShapeIcon({ shape, color = "#f3dd8a" }: { shape: Shape; color?: string }) {
  const g = useMemo(() => geo(shape, 11), [shape]);
  const d = g.polys
    .map((poly) => {
      const n = poly.length;
      if (g.sharp || !g.closed) return poly.map(([x, y], i) => `${i ? "L" : "M"}${(x * 10).toFixed(1)} ${(y * 10).toFixed(1)}`).join("") + (g.closed ? "Z" : "");
      const mid = (a: P, b: P) => `${(((a[0] + b[0]) / 2) * 10).toFixed(1)} ${(((a[1] + b[1]) / 2) * 10).toFixed(1)}`;
      let s = `M${mid(poly[n - 1]!, poly[0]!)}`;
      for (let i = 0; i < n; i++) s += `Q${(poly[i]![0] * 10).toFixed(1)} ${(poly[i]![1] * 10).toFixed(1)} ${mid(poly[i]!, poly[(i + 1) % n]!)}`;
      return s + "Z";
    })
    .join("");
  return (
    <svg viewBox="-12 -12 24 24" width="26" height="26" aria-hidden="true">
      <path d={d} fill={g.closed ? color : "none"} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {shape === "flower" && <circle r="2.4" fill="#e8a0b4" stroke={INK} strokeWidth="1.2" />}
    </svg>
  );
}

// ---- component --------------------------------------------------------------

type Tool = "pen" | "stamp" | "move";
type Drag =
  | { kind: "pen"; stroke: Stroke }
  | { kind: "stamp"; stamp: Stamp }
  | { kind: "move"; id: number; start: Item; sx: number; sy: number; moved: boolean }
  | { kind: "resize"; id: number; start: Stamp; moved: boolean };

export function ChaosCanvas({ onClose }: GameProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const initial = useMemo<Session>(() => {
    const s = loadSession();
    if (s) return s;
    const narrow = typeof window !== "undefined" && window.innerWidth < 640;
    return { w: narrow ? 600 : 900, h: narrow ? 760 : 600, items: [] };
  }, []);
  const W = initial.w;
  const H = initial.h;

  const items = useRef<Item[]>(initial.items);
  const live = useRef<Item[] | null>(null);
  const history = useRef<Item[][]>([]);
  const selected = useRef<number | null>(null);
  const anim = useRef<Anim | null>(null);
  const drag = useRef<Drag | null>(null);
  const nextId = useRef(initial.items.reduce((m, i) => Math.max(m, i.id), 0) + 1);
  const frame = useRef(0);
  const saveTimer = useRef(0);
  const reduced = useRef(prefersReducedMotion());

  const [tool, setTool] = useState<Tool>("stamp");
  const [shape, setShape] = useState<Shape>("star");
  const [color, setColor] = useState(COLORS[2]!);
  const [size, setSize] = useState(46);
  const [count, setCount] = useState(initial.items.length);
  const [canUndo, setCanUndo] = useState(false);
  const [hasSel, setHasSel] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    try {
      return window.localStorage.getItem(HINT_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [note, setNote] = useState("");

  const toolRef = useRef(tool);
  toolRef.current = tool;

  const render = useCallback(() => {
    frame.current = 0;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const now = performance.now();
    if (anim.current && now - anim.current.start >= anim.current.dur) anim.current = null;
    const list = live.current ?? items.current;
    const sel = selected.current != null ? (list.find((i) => i.id === selected.current) ?? null) : null;
    paint(ctx, W, H, resolve(list, anim.current, now), { selected: sel, example: list.length === 0 });
    if (anim.current) frame.current = requestAnimationFrame(render);
  }, [W, H]);

  const invalidate = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(render);
  }, [render]);

  // size the backing store once, repaint on dpr changes
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    invalidate();
    return () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [W, H, invalidate]);

  const persist = useCallback(() => {
    memory = { w: W, h: H, items: items.current };
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => writeStore(STORE_KEY, JSON.stringify(memory)), 350);
  }, [W, H]);

  // flush on close
  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current);
      if (memory) writeStore(STORE_KEY, JSON.stringify(memory));
    },
    [],
  );

  const sync = useCallback(() => {
    setCount(items.current.length);
    setCanUndo(history.current.length > 0);
    setHasSel(selected.current != null && items.current.some((i) => i.id === selected.current));
  }, []);

  const commit = useCallback(
    (next: Item[]) => {
      history.current.push(items.current);
      if (history.current.length > MAX_HISTORY) history.current.shift();
      items.current = next;
      live.current = null;
      persist();
      sync();
      invalidate();
    },
    [invalidate, persist, sync],
  );

  const toLocal = (e: { clientX: number; clientY: number }): P => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height];
  };

  const select = (id: number | null) => {
    selected.current = id;
    setHasSel(id != null);
    invalidate();
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (drag.current) return;
    e.preventDefault();
    const cv = e.currentTarget;
    cv.setPointerCapture(e.pointerId);
    const [x, y] = toLocal(e);
    anim.current = null;

    if (tool === "pen") {
      const stroke: Stroke = { id: nextId.current++, type: "stroke", pts: [[x, y]], color, width: 2 + size / 12, dx: 0, dy: 0 };
      drag.current = { kind: "pen", stroke };
      live.current = [...items.current, stroke];
      select(null);
    } else if (tool === "stamp") {
      const stamp: Stamp = { id: nextId.current++, type: "stamp", shape, x, y, size, rot: between(-0.3, 0.3), color, seed: Math.floor(rnd() * 9999) };
      drag.current = { kind: "stamp", stamp };
      live.current = [...items.current, stamp];
      selected.current = stamp.id;
    } else {
      const cur = items.current;
      const sel = cur.find((i) => i.id === selected.current);
      if (sel && sel.type === "stamp") {
        const [hx, hy] = handleOf(sel);
        if (Math.hypot(x - hx, y - hy) < 20) {
          drag.current = { kind: "resize", id: sel.id, start: sel, moved: false };
          live.current = [...cur];
          invalidate();
          return;
        }
      }
      let found: Item | null = null;
      for (let i = cur.length - 1; i >= 0; i--) {
        if (hit(cur[i]!, x, y)) {
          found = cur[i]!;
          break;
        }
      }
      if (found) {
        select(found.id);
        drag.current = { kind: "move", id: found.id, start: found, sx: x, sy: y, moved: false };
        live.current = [...cur];
      } else select(null);
    }
    if (count === 0 && showHint) setNote("");
    invalidate();
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toLocal(e);
    if (d.kind === "pen") {
      const last = d.stroke.pts[d.stroke.pts.length - 1]!;
      if (Math.hypot(x - last[0], y - last[1]) < 1.6) return;
      d.stroke.pts.push([x, y]);
    } else if (d.kind === "stamp") {
      d.stamp.x = x;
      d.stamp.y = y;
    } else if (d.kind === "move") {
      const dx = x - d.sx;
      const dy = y - d.sy;
      if (!d.moved && Math.hypot(dx, dy) < 3) return;
      d.moved = true;
      const moved: Item = d.start.type === "stamp" ? { ...d.start, x: d.start.x + dx, y: d.start.y + dy } : { ...d.start, dx: d.start.dx + dx, dy: d.start.dy + dy };
      live.current = items.current.map((i) => (i.id === d.id ? moved : i));
    } else {
      const r = Math.hypot(x - d.start.x, y - d.start.y) / (d.start.shape === "squiggle" ? 1.15 : 1.12);
      d.moved = true;
      const next: Stamp = { ...d.start, size: Math.max(16, Math.min(150, r)) };
      live.current = items.current.map((i) => (i.id === d.id ? next : i));
    }
    invalidate();
  };

  const onUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.kind === "pen") {
      commit([...items.current, d.stroke]);
    } else if (d.kind === "stamp") {
      commit([...items.current, d.stamp]);
      sync();
    } else if (d.moved && live.current) commit(live.current);
    else {
      live.current = null;
      invalidate();
    }
  };

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev) return;
    items.current = prev;
    live.current = null;
    anim.current = null;
    if (selected.current != null && !prev.some((i) => i.id === selected.current)) selected.current = null;
    persist();
    sync();
    invalidate();
  }, [invalidate, persist, sync]);

  const clear = () => {
    if (!items.current.length) return;
    select(null);
    commit([]);
  };

  const remove = useCallback(() => {
    if (selected.current == null) return;
    const id = selected.current;
    selected.current = null;
    commit(items.current.filter((i) => i.id !== id));
  }, [commit]);

  const weirder = () => {
    select(null);
    const res = makeWeirder(items.current, W, H, () => nextId.current++);
    history.current.push(items.current);
    if (history.current.length > MAX_HISTORY) history.current.shift();
    items.current = res.items;
    live.current = null;
    anim.current = reduced.current ? null : { start: performance.now(), dur: 750, from: res.from, delay: res.delay };
    persist();
    sync();
    invalidate();
  };

  const pickColor = (c: string) => {
    setColor(c);
    // a selected shape takes the new colour
    const id = selected.current;
    if (id != null) {
      const cur = items.current.find((i) => i.id === id);
      if (cur && cur.color !== c) commit(items.current.map((i) => (i.id === id ? { ...i, color: c } : i)));
    }
  };

  const changeSize = (v: number) => {
    setSize(v);
    const id = selected.current;
    const cur = id != null ? items.current.find((i) => i.id === id) : null;
    if (cur && cur.type === "stamp") {
      const next = { ...cur, size: v };
      live.current = items.current.map((i) => (i.id === id ? next : i));
      invalidate();
    }
  };
  const commitSize = () => {
    if (live.current && !drag.current) commit(live.current);
  };

  const save = async () => {
    const out = document.createElement("canvas");
    const scale = 2;
    out.width = W * scale;
    out.height = H * scale;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paint(ctx, W, H, items.current.map((item) => ({ item, k: 1 })));
    const blob: Blob | null = await new Promise((res) => out.toBlob(res, "image/png"));
    if (!blob) {
      setNote("Couldn't save that one.");
      return;
    }
    const file = new File([blob], "my-chaos-canvas-doodle.png", { type: "image/png" });
    try {
      // phones: the share sheet is the dependable way to get an image into Photos
      if (window.matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My doodle" });
        setNote("Saved ✓");
        window.setTimeout(() => setNote(""), 2200);
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    setNote("Saved ✓");
    window.setTimeout(() => setNote(""), 2200);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected.current != null) {
        e.preventDefault();
        remove();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, remove]);

  const dismissHint = () => {
    setShowHint(false);
    writeStore(HINT_KEY, "1");
  };

  const chip = `${btnBase} px-3 py-1.5 text-base`;
  const on = "bg-[#1c1c1c] text-[#fbf9f4]";
  const off = "bg-[#fffdf7] text-[#1c1c1c]";

  return (
    <GameWindow title="CHAOS CANVAS" label="Chaos Canvas" onClose={onClose} maxWidth={940}>
      <p className="px-4 font-hand text-base leading-tight opacity-70 sm:px-5 sm:text-lg">Make something. Break the rules. Make it weirder.</p>

      {showHint && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-2 border border-dashed border-[#1c1c1c]/50 bg-[#f6e393]/50 px-3 py-1 font-hand text-sm sm:mx-5 sm:text-base">
          <span>Draw · Stamp · Drag · Undo · Make it weirder</span>
          <button type="button" onClick={dismissHint} aria-label="Dismiss tips" className="px-1 text-lg leading-none">
            ×
          </button>
        </div>
      )}

      {/* tools */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3 sm:px-5" role="toolbar" aria-label="Drawing tools">
        <div className="flex gap-1.5">
          {([
            ["pen", "✎ Doodle"],
            ["stamp", "✦ Stamp"],
            ["move", "✥ Move"],
          ] as const).map(([t, label]) => (
            <button key={t} type="button" aria-pressed={tool === t} onClick={() => setTool(t)} className={`${chip} ${tool === t ? on : off}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Colour">
          {PALETTE.map((p) => (
            <button
              key={p.color}
              type="button"
              aria-label={p.name}
              aria-pressed={color === p.color}
              onClick={() => pickColor(p.color)}
              className="h-7 w-7 rounded-full border-2 border-[#1c1c1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1c]"
              style={{ background: p.color, boxShadow: color === p.color ? "0 0 0 2px #fbf9f4, 0 0 0 4px #1c1c1c" : "none" }}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 font-hand text-base">
          size
          <input type="range" min={16} max={110} value={size} onChange={(e) => changeSize(Number(e.target.value))} onPointerUp={commitSize} onKeyUp={commitSize} onBlur={commitSize} className="w-24 accent-[#1c1c1c]" aria-label="Size" />
        </label>
      </div>

      {tool === "stamp" && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-2 sm:px-5" role="group" aria-label="Stamps">
          {SHAPES.map((s) => (
            <button key={s.shape} type="button" aria-label={s.label} title={s.label} aria-pressed={shape === s.shape} onClick={() => setShape(s.shape)} className={`grid h-10 w-10 place-items-center border-2 border-[#1c1c1c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1c1c] ${shape === s.shape ? "bg-[#f6e393]" : "bg-[#fffdf7]"}`}>
              <ShapeIcon shape={s.shape} color={color} />
            </button>
          ))}
        </div>
      )}

      {/* canvas */}
      <div className="px-4 pt-3 sm:px-5">
        <div className="relative mx-auto border-2 border-[#1c1c1c] bg-[#fffdf7]" style={{ width: `min(100%, calc((100dvh - 360px) * ${W / H}))`, minWidth: "min(100%, 300px)", aspectRatio: `${W} / ${H}` }}>
          <canvas
            ref={canvas}
            className="block h-full w-full"
            style={{ touchAction: "none", cursor: tool === "move" ? "grab" : "crosshair" }}
            aria-label="Drawing canvas"
            role="img"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onLostPointerCapture={onUp}
          />
          {count === 0 && (
            <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-hand text-xl opacity-60">Psst... tap anywhere to start.</p>
          )}
        </div>
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-1 pt-3 sm:px-5">
        <button type="button" onClick={undo} disabled={!canUndo} className={`${chip} ${off}`}>
          ↶ Undo
        </button>
        <button type="button" onClick={clear} disabled={count === 0} className={`${chip} ${off}`}>
          Clear
        </button>
        {hasSel && (
          <button type="button" onClick={remove} className={`${chip} ${off}`}>
            Remove
          </button>
        )}
        <button type="button" onClick={weirder} className={`${btnBase} px-4 py-1.5 text-lg`} style={{ background: LAVENDER }}>
          Make it weirder ✨
        </button>
        <button type="button" onClick={save} disabled={count === 0} className={`${chip} ${on}`}>
          Save my doodle
        </button>
      </div>
      <p className="px-4 pb-3 text-center font-hand text-sm opacity-50 sm:px-5" role="status">
        {note || "autosaved on this device"}
      </p>
    </GameWindow>
  );
}
