import type { ComponentType } from "react";

import { BugRun } from "./bug-run";
import { ChaosCanvas } from "./chaos-canvas";
import { INK, LAVENDER, PAPER, PINK, SAGE, YELLOW, type GameProps } from "./shared";
import { Snake } from "./snake";

export type GameId = "snake" | "bugrun" | "chaos";

export const GAMES: { id: GameId; title: string; note: string; hover: string; ready: boolean; Component: ComponentType<GameProps> }[] = [
  { id: "bugrun", title: "bug run: ship it!", note: "jump the bugs", hover: "mind the bugs.", ready: true, Component: BugRun },
  { id: "snake", title: "snake: doodle edition", note: "a little nostalgia", hover: "nostalgia, with a pen.", ready: true, Component: Snake },
  { id: "chaos", title: "chaos canvas", note: "make something weird", hover: "make a mess. on purpose.", ready: false, Component: ChaosCanvas },
];

// Little hand-drawn covers, in the same cream-and-ink language as the games.
function Cover({ id }: { id: GameId }) {
  const common = { fill: "none", stroke: INK, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "snake") {
    const body = [[4, 11], [5, 11], [6, 11], [7, 11], [7, 10], [7, 9], [8, 9], [9, 9], [10, 9], [10, 8], [10, 7]];
    return (
      <svg viewBox="0 0 200 200" className="block h-full w-full" shapeRendering="crispEdges" aria-hidden="true">
        <rect width="200" height="200" fill="#c6d8a4" />
        {Array.from({ length: 24 }, (_, i) => (
          <rect key={i} x={i * 8 + 8} y="0" width="1" height="200" fill="rgba(34,58,36,.1)" />
        ))}
        {Array.from({ length: 24 }, (_, i) => (
          <rect key={i} x="0" y={i * 8 + 8} width="200" height="1" fill="rgba(34,58,36,.1)" />
        ))}
        {body.map(([x, y]) => (
          <g key={`${x}${y}`}>
            <rect x={x! * 8 + 24} y={y! * 8 - 28} width="8" height="8" fill="#223a24" />
            <rect x={x! * 8 + 26} y={y! * 8 - 26} width="4" height="4" fill="#5d8a56" />
          </g>
        ))}
        <rect x="136" y="44" width="8" height="8" fill="#223a24" />
        <rect x="138" y="46" width="4" height="4" fill="#c6d8a4" />
        {/* apple */}
        <g fill="#223a24" transform="translate(40 60)">
          <rect x="6" y="0" width="4" height="4" />
          <rect x="2" y="4" width="12" height="4" />
          <rect x="0" y="8" width="16" height="8" />
          <rect x="2" y="16" width="12" height="2" />
          <rect x="4" y="9" width="3" height="3" fill="#c6d8a4" />
        </g>
        <text x="100" y="28" textAnchor="middle" fontFamily="Silkscreen, VT323, monospace" fontWeight="700" fontSize="22" fill="#223a24">SNAKE</text>
        <text x="100" y="186" textAnchor="middle" fontFamily="VT323, monospace" fontSize="17" fill="#223a24">SCORE: 12   BEST: 48</text>
      </svg>
    );
  }
  if (id === "bugrun") {
    const r = (x: number, y: number, w: number, h: number, f: string) => <rect x={x} y={y} width={w} height={h} fill={f} />;
    return (
      <svg viewBox="0 0 200 200" className="block h-full w-full" shapeRendering="crispEdges" aria-hidden="true">
        {r(0, 0, 200, 50, "#7fb8ec")}
        {r(0, 50, 200, 50, "#98c8f0")}
        {r(0, 100, 200, 40, "#b3d6f2")}
        {r(0, 140, 200, 10, "#cfe6f6")}
        {/* clouds */}
        {r(24, 40, 28, 6, "#fff")}
        {r(18, 46, 40, 6, "#fff")}
        {r(140, 62, 30, 6, "#fff")}
        {r(134, 68, 42, 6, "#fff")}
        {/* skyline */}
        {r(8, 110, 22, 40, "#8fb4dc")}
        {r(34, 96, 26, 54, "#a9c9e8")}
        {r(64, 118, 20, 32, "#8fb4dc")}
        {r(150, 100, 24, 50, "#a9c9e8")}
        {r(178, 120, 22, 30, "#8fb4dc")}
        {/* ground */}
        {r(0, 150, 200, 4, "#4a9238")}
        {r(0, 154, 200, 8, "#62b04a")}
        {r(0, 162, 200, 38, "#8c5b3b")}
        {[0, 1, 2].map((i) => (
          <g key={i}>{r(0, 170 + i * 14, 200, 2, "#6e4429")}</g>
        ))}
        {/* runner */}
        <g transform="translate(40 96)">
          {r(-2, -2, 32, 56, "#2a2230")}
          {r(6, 0, 18, 8, "#6b3f2a")}
          {r(8, 8, 14, 12, "#f6d1aa")}
          {r(-2, 6, 8, 10, "#6b3f2a")}
          {r(8, 20, 14, 14, "#fffaf0")}
          {r(8, 34, 14, 8, "#4d74b3")}
          {r(8, 42, 6, 6, "#f6d1aa")}
          {r(18, 40, 6, 8, "#f6d1aa")}
          {r(6, 48, 8, 4, "#d9533f")}
          {r(18, 48, 8, 4, "#d9533f")}
        </g>
        {/* ladybug */}
        <g transform="translate(112 130)">
          {r(-2, -2, 40, 24, "#2a2230")}
          {r(6, 0, 28, 18, "#e2413b")}
          {r(0, 8, 10, 10, "#2a2230")}
          {r(18, 2, 3, 16, "#2a2230")}
          {r(24, 6, 4, 4, "#2a2230")}
        </g>
        {/* hearts */}
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${10 + i * 18} 10)`}>
            {r(-1, -1, 16, 13, "#2a2230")}
            {r(0, 0, 6, 6, "#e2413b")}
            {r(8, 0, 6, 6, "#e2413b")}
            {r(0, 4, 14, 4, "#e2413b")}
            {r(3, 8, 8, 2, "#e2413b")}
          </g>
        ))}
        <text x="190" y="22" textAnchor="end" fontFamily="VT323, monospace" fontSize="22" fill="#fff" stroke="#2a2230" strokeWidth="3" paintOrder="stroke">SCORE: 128</text>
        <text x="100" y="72" textAnchor="middle" fontFamily="Silkscreen, VT323, monospace" fontWeight="700" fontSize="26" fill="#f7c948" stroke="#3a2410" strokeWidth="5" paintOrder="stroke">BUG RUN</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" className="block h-full w-full" aria-hidden="true">
      <rect width="200" height="200" fill={PAPER} />
      <path d="M100 38 l13 30 l32 3 l-24 22 l8 32 l-29 -17 l-29 17 l8 -32 l-24 -22 l32 -3z" fill={YELLOW} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" transform="translate(-26 -14) scale(.8)" />
      <path d="M128 112 c0 -14 22 -18 28 -6 c14 -4 24 12 12 22 c4 14 -18 20 -26 10 c-14 4 -22 -14 -14 -26z" fill={LAVENDER} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" transform="translate(-4 -18)" />
      <path d="M30 150 c14 -22 26 22 40 0 s26 22 40 0" {...common} stroke={SAGE} strokeWidth="9" />
      <path d="M30 150 c14 -22 26 22 40 0 s26 22 40 0" {...common} strokeWidth="2" />
      <path d="M150 168 c-10 -4 -16 -14 -8 -20 c-2 -12 14 -14 18 -6 c10 -4 20 6 12 14 c4 10 -10 16 -22 12z" fill={PINK} stroke={INK} strokeWidth="2.4" strokeLinejoin="round" transform="translate(-12 -8) scale(.9)" />
      <circle cx="46" cy="52" r="5" fill={PINK} stroke={INK} strokeWidth="2" />
      <circle cx="170" cy="46" r="3" fill={INK} />
    </svg>
  );
}

// A tile in the collage. Hand-tilted a touch, no heavy chrome.
export function GameTile({ id, tilt, onOpen }: { id: GameId; tilt: number; onOpen: (el: HTMLElement) => void }) {
  const game = GAMES.find((g) => g.id === id)!;
  const frame = id === "bugrun" ? { bg: "#4d74b3", edge: "#2a3a66", hi: "#7d9fd6", shadow: "rgba(42,58,102,.85)", text: "#e8f0ff", chip: "#1f2a4a", chipText: "#cfe0ff" } : { bg: "#6d9b64", edge: "#33533a", hi: "#86b07c", shadow: "rgba(34,58,36,.85)", text: "#e9f0d2", chip: "#223a24", chipText: "#c6d8a4" };
  return (
    <button
      type="button"
      aria-label={`Play ${game.title}`}
      data-cursor={game.hover}
      data-game={id}
      onClick={(e) => onOpen(e.currentTarget)}
      className="group block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <span
        className="relative block p-2.5 pb-3 transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[.8deg] motion-reduce:transition-none"
        style={{ background: frame.bg, border: `4px solid ${frame.edge}`, borderRadius: 10, boxShadow: `inset 0 0 0 2px ${frame.hi}, 5px 6px 0 ${frame.shadow}` }}
      >
        <span className="block overflow-hidden" style={{ border: "3px solid #223a24", aspectRatio: "1 / 1" }}>
          <Cover id={id} />
        </span>
        <span className="mt-2 flex items-center justify-between font-pixel text-lg leading-none" style={{ color: frame.text }}>
          <span className="tracking-wider">{id === "snake" ? "SNAKE" : id === "bugrun" ? "BUG RUN" : game.title.toUpperCase()}</span>
          <span className="px-2 py-0.5 transition-opacity group-hover:opacity-80" style={{ background: frame.chip, color: frame.chipText }}>▶ PLAY</span>
        </span>
      </span>
      <span className="mt-3 block font-hand text-lg leading-tight">{game.title}</span>
      <span className="block text-xs text-neutral-500">{game.note}</span>
    </button>
  );
}
