import { useCallback, useEffect, useRef, useState } from "react";

import { GALLERY, SECTION_LABEL, SECTION_ORDER, type GalleryItem, type Section } from "./gallery";
import { GAMES, GameTile, type GameId } from "./games/game-tiles";

const INK = "#1c1c1c";

// A minimal green garden along the bottom edge.
const GREEN = "#4f9a45";
const GREEN_DARK = "#3a7a34";
function Plants() {
  const blade = (x: number, h: number, lean: number) => `M${x} 48 C${x + lean * 0.3} ${48 - h * 0.5} ${x + lean} ${48 - h * 0.8} ${x + lean * 1.4} ${48 - h}`;
  const tufts = Array.from({ length: 46 }, (_, i) => {
    const x = 10 + i * 26 + ((i * 37) % 11);
    const h = 10 + ((i * 53) % 17);
    return <path key={i} d={`${blade(x, h, -4)} ${blade(x + 5, h * 1.35, 1)} ${blade(x + 10, h * 0.85, 5)}`} fill="none" stroke={i % 3 ? GREEN : GREEN_DARK} strokeWidth="2.4" strokeLinecap="round" />;
  });
  const sprout = (x: number, h: number) => (
    <g key={`s${x}`} fill={GREEN} stroke={GREEN_DARK} strokeWidth="1.2" strokeLinejoin="round">
      <path d={`M${x} 48 L${x} ${48 - h}`} fill="none" strokeWidth="2.4" strokeLinecap="round" />
      <path d={`M${x} ${48 - h * 0.55} C${x - 16} ${48 - h * 0.6} ${x - 20} ${48 - h * 0.85} ${x - 18} ${48 - h * 0.95} C${x - 8} ${48 - h * 0.92} ${x - 1} ${48 - h * 0.75} ${x} ${48 - h * 0.55}Z`} />
      <path d={`M${x} ${48 - h * 0.75} C${x + 14} ${48 - h * 0.8} ${x + 18} ${48 - h * 0.98} ${x + 16} ${48 - h * 1.05} C${x + 7} ${48 - h * 1.02} ${x + 1} ${48 - h * 0.9} ${x} ${48 - h * 0.75}Z`} />
    </g>
  );
  return (
    <svg viewBox="0 0 1200 48" preserveAspectRatio="xMidYMax slice" aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-[5] h-12 w-full">
      <rect x="0" y="44" width="1200" height="4" fill={GREEN} />
      {tufts}
      {sprout(150, 34)}
      {sprout(520, 28)}
      {sprout(860, 38)}
      {sprout(1120, 30)}
    </svg>
  );
}

const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const useColumns = () => {
  const get = () => (typeof window === "undefined" ? 3 : window.innerWidth < 640 ? 2 : window.innerWidth < 1100 ? 3 : 4);
  const [n, setN] = useState(get);
  useEffect(() => {
    const on = () => setN(get());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return n;
};

function Lightbox({ items, index, onIndex, onClose }: { items: GalleryItem[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = items[index]!;

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Tab") {
        e.stopImmediatePropagation();
        e.preventDefault();
        if (e.key === "Escape") onClose();
        else if (e.key !== "Tab") onIndex((index + (e.key === "ArrowRight" ? 1 : items.length - 1)) % items.length);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, items.length, onClose, onIndex]);

  const btn = "absolute grid h-11 w-11 place-items-center rounded-full border text-xl leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <div role="dialog" aria-modal="true" aria-label="Artwork" className="fixed inset-0 z-[400] flex items-center justify-center bg-white/95 p-4 sm:p-10" onClick={onClose}>
      <img src={item.src} alt={item.alt} className="max-h-full max-w-full rounded-md object-contain" onClick={(e) => e.stopPropagation()} />
      <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className={`${btn} right-3 top-3 border-neutral-300 bg-white text-neutral-900 sm:right-6 sm:top-5`}>
        ×
      </button>
      {items.length > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={(e) => (e.stopPropagation(), onIndex((index + items.length - 1) % items.length))} className={`${btn} left-3 top-1/2 -translate-y-1/2 border-neutral-300 bg-white text-neutral-900`}>
            ‹
          </button>
          <button type="button" aria-label="Next" onClick={(e) => (e.stopPropagation(), onIndex((index + 1) % items.length))} className={`${btn} right-3 top-1/2 -translate-y-1/2 border-neutral-300 bg-white text-neutral-900`}>
            ›
          </button>
        </>
      )}
      {(item.title || item.note) && (
        <p className="absolute inset-x-0 bottom-3 text-center font-hand text-base text-neutral-800">
          {item.title}
          {item.note ? <span className="opacity-60"> · {item.note}</span> : null}
        </p>
      )}
    </div>
  );
}

// The landing page of Fun Mode: white, a small side menu, and a loose collage
// of whatever is in the assets/fun-mode folders (see gallery.ts).
type Entry = { kind: "img"; item: GalleryItem; i: number } | { kind: "game"; id: GameId; n: number };

export function Garden({ onNavigate }: { onNavigate: (id: string) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [game, setGame] = useState<GameId | null>(null);
  const [filter, setFilter] = useState<Section | "all">("all");
  const scroller = useRef<HTMLDivElement>(null);
  const gameOpener = useRef<HTMLElement | null>(null);
  const closeGame = useCallback(() => {
    setGame(null);
    gameOpener.current?.focus({ preventScroll: true });
  }, []);
  const opener = useRef<HTMLElement | null>(null);
  const cols = useColumns();
  const close = useCallback(() => {
    setOpen(null);
    opener.current?.focus({ preventScroll: true });
  }, []);

  const sections = SECTION_ORDER.filter((sec) => sec === "games" || GALLERY.some((g) => g.section === sec));
  const pick = (f: Section | "all") => {
    setFilter(f);
    scroller.current?.scrollTo({ top: 0 });
  };
  // natural aspect ratios, learned as the pictures load, so wide ones get the room they need
  const [ratios, setRatios] = useState<Record<string, number>>({});
  // only what was picked: everything (games first), or just one section
  const visible = filter === "all" ? GALLERY : GALLERY.filter((g) => g.section === filter);
  const entries: Entry[] = [];
  const games = GAMES.filter((g) => g.ready);
  visible.forEach((item, i) => entries.push({ kind: "img", item, i }));
  if (filter === "games") entries.unshift(...games.map((g, n): Entry => ({ kind: "game", id: g.id, n })));
  else if (filter === "all") {
    // the first game leads; the others sit in the second row, a little way in
    const [lead, ...others] = games;
    others.forEach((g, n) => entries.splice(Math.min(cols + n * 2, entries.length), 0, { kind: "game", id: g.id, n: n + 1 }));
    if (lead) entries.unshift({ kind: "game", id: lead.id, n: 0 });
  }
  const columns: { entry: Entry; k: number }[][] = Array.from({ length: cols }, () => []);
  entries.forEach((entry, k) => columns[k % cols]!.push({ entry, k }));

  return (
    <div ref={scroller} className="absolute inset-0 overflow-y-auto overflow-x-hidden" style={{ color: INK, background: "#fbf9f4" }}>
      <Plants />
      <div className="relative mx-auto flex w-full max-w-[1500px] flex-col px-5 pb-32 pt-24 sm:px-8 sm:pt-24 md:flex-row md:gap-10">
        <nav aria-label="Sections" className="relative z-10 shrink-0 md:sticky md:top-20 md:h-fit md:w-44">
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 md:block md:space-y-3">
            {(["all", ...sections] as (Section | "all")[]).map((sec) => (
              <li key={sec}>
                <button
                  type="button"
                  onClick={() => pick(sec)}
                  aria-pressed={filter === sec}
                  className={`text-sm uppercase tracking-wide hover:underline focus-visible:underline focus-visible:outline-none ${filter === sec ? "underline decoration-2 underline-offset-4" : ""}`}
                >
                  {sec === "all" ? "all" : SECTION_LABEL[sec]}
                  {sec === "games" && (
                    <span aria-hidden="true" className="ml-1.5 text-base normal-case">
                      🎮
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="relative min-w-0 flex-1">
          <div className="relative z-10">
            <header className="fm-rise max-w-xl pb-10">
              <h1 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.1]">little things, made by me.</h1>
              <p className="mt-2 font-serif text-base leading-relaxed text-neutral-600">things I create, explore, and enjoy just because.</p>
            </header>
            <div className="relative">
            {entries.length === 0 ? (
              <p className="relative font-hand text-xl text-neutral-600">Coming soon.</p>
            ) : (
              <ul key={filter} className="fm-rise relative flex items-start gap-4 sm:gap-6" style={{ animationDelay: filter === "all" ? ".25s" : ".05s" }}>
                {columns.map((col, c) => (
                  <li key={c} className="min-w-0 flex-1" style={{ paddingTop: `${Math.round(hash(c, 3) * 90)}px` }}>
                    <ul>
                      {col.map(({ entry, k }) => {
                        const gap = 16 + Math.round(hash(k, 4) * 70);
                        if (entry.kind === "game") {
                          const wPct = 62 + Math.round(hash(k, 1) * 18);
                          const left = Math.round(hash(k, 2) * (100 - wPct));
                          return (
                            <li key={entry.id} style={{ width: `${wPct}%`, marginLeft: `${left}%`, marginBottom: gap + 14, scrollMarginTop: 96 }}>
                              <GameTile
                                id={entry.id}
                                tilt={Math.round((hash(k, 5) - 0.5) * 50) / 10}
                                onOpen={(el) => {
                                  gameOpener.current = el;
                                  setGame(entry.id);
                                }}
                              />
                            </li>
                          );
                        }
                        const { item, i } = entry;
                                        const ratio = ratios[item.src] ?? 0.8;
                        // wide pictures use the whole column; tall ones vary a little
                        const wPct = ratio > 1.1 ? 100 : 74 + Math.round(hash(k, 1) * 26);
                        const left = Math.round(hash(k, 2) * (100 - wPct));
                        return (
                          <li key={item.src} style={{ width: `${wPct}%`, marginLeft: `${left}%`, marginBottom: gap, scrollMarginTop: 96 }}>
                            <button
                              type="button"
                              aria-label={item.title ? `Open ${item.title}` : `Open artwork ${i + 1}`}
                              onClick={(e) => {
                                opener.current = e.currentTarget;
                                setOpen(i);
                              }}
                              data-cursor={item.hover}
                              className="block w-full overflow-hidden rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                            >
                              <img
                                src={item.src}
                                alt={item.alt}
                                decoding="async"
                                onLoad={(e) => {
                                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                                  if (w && h) setRatios((r) => (r[item.src] ? r : { ...r, [item.src]: w / h }));
                                }}
                                className="block h-auto w-full"
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
            </div>
          </div>
        </main>
      </div>
      {open !== null && <Lightbox items={visible} index={open} onIndex={setOpen} onClose={close} />}
      {game && (() => {
        const Active = GAMES.find((g) => g.id === game)!.Component;
        return <Active key={game} onClose={closeGame} onNavigate={onNavigate} />;
      })()}
    </div>
  );
}
