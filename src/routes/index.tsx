import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

// TODO: swap these images for your own. The file names can stay the same,
// just replace the pictures inside src/assets.
import badminton from "@/assets/obj3d-badminton.webp";
import brain from "@/assets/obj3d-brain.webp";
import dance from "@/assets/dance.webp";
import book from "@/assets/book.webp";
// TODO: replace with a stick-figure doodle (your DoodleDance character) hanging by its hands.
import iot from "@/assets/iot.webp";
import mic from "@/assets/Mic.webp";
import paint from "@/assets/paint.webp";
import profile from "@/assets/profile.png";
import comic from "@/assets/comic.webp";
import portLaptop from "@/assets/port-laptop.png";
// TODO: add screenshots of your projects with these names (1200×912 works best).
import doodledanceImage from "@/assets/project-doodledance.webp";
import greenswapImage from "@/assets/project-greenswap.webp";
import videomindImage from "@/assets/project-videomind.webp";
import { CLIMBED_OUT, takeFlag } from "@/components/rabbit-hole";
import { ThreadPlaneButton } from "@/components/thread-plane";
import { Joystick } from "@/components/joystick";
import { FunMode } from "@/components/fun-mode/fun-mode";
import { PLUG_CORD, SocketPlug } from "@/components/socket-plug";
import { Button } from "@/components/ui/button";
import { jsonLd, pageMeta, person, SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    ...pageMeta({
      title: "Sahithi Kanjarla — software engineer (new grad '26), AI & full-stack",
      description:
        "Sahithi Kanjarla is a Hyderabad-based software engineer (B.Tech CSE 2026) building AI and real-time apps: document AI, RAG over audio and video, and a multiplayer dance app that tracks your pose in the browser. DoodleDance, VideoMind, GreenSwap. Open to full-time roles.",
      path: "/",
    }),
    scripts: [
      jsonLd({
        "@graph": [
          person,
          { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "Sahithi Kanjarla", publisher: { "@id": `${SITE_URL}/#person` } },
          { "@type": "ProfilePage", url: SITE_URL, name: "Sahithi Kanjarla — professionally curious. personally chaotic.", mainEntity: { "@id": `${SITE_URL}/#person` } },
        ],
      }),
    ],
  }),
  component: Portfolio,
});

// TODO: your email.
const EMAIL = "sahithikanjarla4082@gmail.com";
const LINKS = {
  linkedin: "https://www.linkedin.com/in/sahithi-kanjarla-569025289/",
  github: "https://github.com/sahithi-kanjarla",
  // TODO: your X link, or leave it empty and the button disappears.
  x: "",
  // TODO: paste your resume link (e.g. Google Drive share link), the button is always shown; until you add it, it does nothing.
  resume: "",
};

// The cursor's comment bubble stays quiet until something has a reason to
// speak: a moment in the story, or hovering something that has a comment.
type CursorComment = { id: string; text: string; fade: boolean };
// Only one bubble speaks at a time: "figure-open" tells every other bubble
// (objects, the cutout, the cursor/phone comment) to go quiet.
const quietOthers = (id: number) => window.dispatchEvent(new CustomEvent<number>("figure-open", { detail: id }));
const say = (id: string, text: string, fade = true) => {
  quietOthers(-1);
  window.dispatchEvent(new CustomEvent<CursorComment>("cursor-comment", { detail: { id, text, fade } }));
};

// The image opens the live site (or the code, if there's no live link yet);
// the arrow opens the code.
// TODO: fill in the live links and check the repo URLs.
const projects = [
  { number: "01", title: "GreenSwap", image: greenswapImage, tags: ["Agentic AI", "Currently building"], blurb: "an agent that hunts for greener swaps of things you already buy, and shows its receipts. still building this one.", live: "", code: "https://github.com/sahithi-kanjarla" },
  { number: "02", title: "VideoMind", image: videomindImage, tags: ["RAG"], blurb: "throw it a youtube link, an mp4 or an mp3, in english or an indian language, and ask it anything. answers come with timestamps.", live: "", code: "https://github.com/sahithi-kanjarla/Video_mind" },
  { number: "03", title: "DoodleDance", image: doodledanceImage, tags: ["Fullstack", "Real-time", "Open source"], blurb: "draw a stick figure and it dances with you. up to 12 friends in one room, live. only 10 bone angles leave your laptop, never your video.", live: "", code: "https://github.com/sahithi-kanjarla/DoodleDance" },
];

// The story canvas is CANVAS_VW wide and slides CANVAS_TRAVEL_VW across the
// scroll. Everything on it is placed in vw/vh, and the SVG uses a viewBox of
// (CANVAS_VW * 10) x 1000, so one vw is 10 units and one vh is 10 units.
// THREAD_SHIFT is the extra stretch of thread between the laptop and "a jack of
// all trades": everything after the intro sits that many vw further right.
const THREAD_SHIFT = 20;
const CANVAS_VW = 570 + THREAD_SHIFT;
const CANVAS_TRAVEL_VW = 470 + THREAD_SHIFT;

// Place something on the canvas by its vw/vh coordinates.
const at = (x: number, y: number) => ({ left: `${x}vw`, top: `${y}vh` });

// A waypoint for the thread, in vw/vh. `loop` ties a little loop-de-loop at
// that point (radius in vh; negative loops downward).
type Waypoint = [x: number, y: number, loop?: number];

// Horizontal units are ~1.8x wider on screen than vertical ones, so loops are
// narrowed to stay round rather than squashed.
const LOOP_ASPECT = 1.8;

// Where the thread finally ends: at the "see the work" button.
const BUTTON_X = 537;
const BUTTON_Y = 59;

// The big loop the habit is tied around, near the end of the story.
const LOOP_X = 474;
const LOOP_Y = 70;
const LOOP_R = 17;

// The thread is a Catmull-Rom curve through the waypoints (plus the extra
// points each loop adds), written out as cubic Béziers in viewBox units.
type Segment = [x0: number, y0: number, c1x: number, c1y: number, c2x: number, c2y: number, x1: number, y1: number];

// `scale` maps waypoint units to path units (vw/vh → viewBox is 10; pixels
// are 1), and `aspect` squeezes loops to stay round on a stretched canvas.
function threadSegments(waypoints: Waypoint[], scale = 10, aspect = LOOP_ASPECT): Segment[] {
  const pts: [number, number][] = [];
  for (const [wx, wy, loop] of waypoints) {
    const x = wx * scale;
    const y = wy * scale;
    pts.push([x, y]);
    if (loop) {
      const r = loop * scale;
      const rx = Math.abs(r) / aspect;
      pts.push([x + rx, y - r], [x, y - 2 * r], [x - rx, y - r], [x + rx * 0.5, y + r * 0.15]);
    }
  }
  const segments: Segment[] = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    segments.push([p1[0], p1[1], p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]]);
  }
  return segments;
}

function threadPath(waypoints: Waypoint[]) {
  return segmentsPath(threadSegments(waypoints));
}

function segmentsPath(segments: Segment[]) {
  const f = (n: number) => n.toFixed(1);
  let d = `M${segments[0]?.[0] ?? 0} ${segments[0]?.[1] ?? 0}`;
  for (const [, , c1x, c1y, c2x, c2y, x1, y1] of segments) d += ` C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(x1)} ${f(y1)}`;
  return d;
}

// Points along the thread, evaluated straight from the Bézier maths, with the
// running arc length at each one. This replaces thousands of browser
// getPointAtLength calls, which froze the page for seconds on load.
type ThreadSamples = { xs: Float32Array; ys: Float32Array; lengths: Float32Array; total: number };

function sampleSegments(segments: Segment[], perSegment = 48): ThreadSamples {
  const n = segments.length * perSegment + 1;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const lengths = new Float32Array(n);
  let k = 0;
  let total = 0;
  segments.forEach(([x0, y0, c1x, c1y, c2x, c2y, x1, y1], index) => {
    for (let step = index === 0 ? 0 : 1; step <= perSegment; step += 1) {
      const t = step / perSegment;
      const u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1;
      const y = u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1;
      if (k > 0) total += Math.hypot(x - xs[k - 1]!, y - ys[k - 1]!);
      xs[k] = x;
      ys[k] = y;
      lengths[k] = total;
      k += 1;
    }
  });
  return { xs, ys, lengths, total };
}

// The thread leaves the tangle and loops wildly between the rabbit holes,
// smooths out through the few things that have my heart, runs straight along
// the timeline, and simply stops before the work.
const THREAD_INTRO_WAYPOINTS: Waypoint[] = [[56.9, 19.9], [80, 58], [104, 52], [120, 55]];
const THREAD_WAYPOINTS: Waypoint[] = [
  [110, 44, 8], [120, 66], [132, 68], [142, 66, -6],
  [151, 56], [156, 40], [164, 29], [171, 33], [174.5, 35.6], [181, 42], [186, 62], [198, 68],
  [205, 68], [216, 50], [229, 34], [233, 50], [250, 58], [262, 70], [272, 88], [292, 54],
  [304, 48], [322, 51], [340, 52], [358, 50], [376, 46], [394, 43], [410, 46],
  [422, 60], [440, 70], [458, 71], [LOOP_X, LOOP_Y, LOOP_R], [496, 76], [514, 78], [528, 70], [BUTTON_X, BUTTON_Y],
];
// The cable leaves the laptop's charging connector. These are the connector's
// position inside the laptop picture (as a fraction of it) and its default
// place on the canvas (vw/vh) until the real laptop has been measured.
const LAPTOP_PORT = { x: 0.835, y: 0.607 };
const DEFAULT_THREAD_START: [number, number] = [51, 44];

// Only the first waypoint moves with the laptop; the rest of the path, and
// everything pinned to it, stays exactly where it was. A tiny lead-out keeps
// the curve leaving the connector smoothly.
const threadWaypoints = ([sx, sy]: [number, number]): Waypoint[] => [[sx, sy], [sx + 4, sy + 1.5], ...THREAD_INTRO_WAYPOINTS.slice(1), ...THREAD_WAYPOINTS.map(([x, y, loop]): Waypoint => (loop === undefined ? [x + THREAD_SHIFT, y] : [x + THREAD_SHIFT, y, loop]))];

// Built (and sampled) lazily, and again whenever the laptop's connector moves.
let threadStart = DEFAULT_THREAD_START;
let threadCache: { d: string; samples: ThreadSamples } | null = null;
const getThread = () => (threadCache ??= { d: threadPath(threadWaypoints(threadStart)), samples: sampleSegments(threadSegments(threadWaypoints(threadStart))) });
const getThreadSamples = () => getThread().samples;
function setThreadStart(x: number, y: number) {
  if (Math.abs(x - threadStart[0]) < 0.01 && Math.abs(y - threadStart[1]) < 0.01) return;
  threadStart = [x, y];
  threadCache = null;
}

function Portfolio() {
  const storyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const laptopRef = useRef<HTMLImageElement>(null);
  const listeners = useRef(new Set<(progress: number) => void>());
  const [noteRevealed, setNoteRevealed] = useState(false);
  const [scrollReady, setScrollReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The header floats over the story, but gets the page colour from the work
  // section on, so the links don't sit on top of project images.
  const [solidHeader, setSolidHeader] = useState(false);
  useEffect(() => {
    const check = () => {
      const work = document.getElementById("work");
      if (work) setSolidHeader(window.scrollY >= work.offsetTop - 80);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  const [filter, setFilter] = useState("All");

  // First the mind arrives, then its note, and only then does scrolling take over.
  useEffect(() => {
    const root = document.documentElement;
    // Climbing back out of the rabbit hole lands straight on the work, no intro.
    if (takeFlag(CLIMBED_OUT) || window.location.hash === "#work") {
      setNoteRevealed(true);
      setScrollReady(true);
      requestAnimationFrame(() => document.getElementById("work")?.scrollIntoView({ behavior: "instant" }));
      return;
    }
    root.style.overflow = "hidden";
    window.scrollTo(0, 0);
    let greet = 0;
    const unlock = () => {
      root.style.overflow = "";
      setNoteRevealed(true);
      setScrollReady(true);
      window.clearTimeout(greet);
      greet = window.setTimeout(() => say("intro", "hey. sahithi here. mind the doodles."), 1800);
      window.clearTimeout(noteTimer);
      window.clearTimeout(unlockTimer);
      skipEvents.forEach((name) => window.removeEventListener(name, unlock));
    };
    const noteTimer = window.setTimeout(() => setNoteRevealed(true), 2200);
    const unlockTimer = window.setTimeout(unlock, 2600);
    // Anyone who tries to scroll early skips the rest of the intro.
    const skipEvents = ["wheel", "touchmove", "keydown"] as const;
    skipEvents.forEach((name) => window.addEventListener(name, unlock, { passive: true }));
    return () => {
      window.clearTimeout(greet);
      window.clearTimeout(noteTimer);
      window.clearTimeout(unlockTimer);
      skipEvents.forEach((name) => window.removeEventListener(name, unlock));
      root.style.overflow = "";
    };
  }, []);

  // One animation-frame loop runs the whole story. It eases toward the scroll
  // position, so wheel steps become a glide, and then moves the canvas, draws
  // the thread and reveals whatever the thread has reached — all directly on
  // the DOM, without asking React to re-render the page every frame.
  useEffect(() => {
    let frame = 0;
    let current = -1;
    const spoken = new Set<string>();
    const tick = () => {
      const section = storyRef.current;
      const canvas = canvasRef.current;
      if (section) {
        const distance = section.offsetHeight - window.innerHeight;
        const target = Math.min(1, Math.max(0, (window.scrollY - section.offsetTop) / Math.max(distance, 1)));
        const next = current < 0 || Math.abs(target - current) < 0.00005 ? target : current + (target - current) * SCROLL_EASE;
        if (next !== current) {
          current = next;
          if (canvas && window.innerWidth >= 768) {
            canvas.style.transform = `translate3d(-${current * CANVAS_TRAVEL_VW}vw,0,0)`;
            const tip = current * CANVAS_TRAVEL_VW + TIP_SCREEN_ANCHOR * 100;
            const edge = current * CANVAS_TRAVEL_VW + 100 - REVEAL_INSET;
            canvas.querySelectorAll<HTMLElement>("[data-at]").forEach((el) => {
              // Most things reveal as they enter the screen; "thread" ones wait
              // for the thread itself (the loop's steps, the story comments).
              const shown = (el.dataset["mode"] === "thread" ? tip : edge) >= Number(el.dataset["at"]) + THREAD_SHIFT;
              el.toggleAttribute("data-shown", shown);
              // Story comments are said once, the first time the thread arrives.
              const line = el.dataset["say"];
              if (shown && line && !spoken.has(line)) {
                spoken.add(line);
                say(`story:${line}`, line);
              }
            });
          }
          listeners.current.forEach((listen) => listen(current));
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const subscribe = (listen: (progress: number) => void) => {
    listeners.current.add(listen);
    return () => {
      listeners.current.delete(listen);
    };
  };

  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <main>
      <header className={cn("fixed inset-x-0 top-0 z-50 grid grid-cols-[minmax(0,1fr)_auto] items-center px-5 py-5 transition-opacity duration-700 sm:px-8 sm:py-7", solidHeader ? "bg-background" : "bg-transparent", scrollReady ? "opacity-100" : "pointer-events-none animate-reveal [animation-delay:2.6s]")}>
        <div className="flex items-center gap-3">
          <button aria-label="Back to introduction" onClick={() => go("brain")} className="w-fit bg-transparent font-serif text-3xl font-medium">
            Sahithi
          </button>
          {/* when you join a team, change this to "currently at ___" */}
          <button onClick={() => go("hi")} className="inline-flex items-center gap-1.5 rounded-full border border-foreground/30 bg-transparent px-3 py-1 font-hand text-base leading-none tracking-wide" data-cursor="yes, really. say hi.">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            open to work
          </button>
        </div>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex" aria-label="Main navigation">
          <button onClick={() => go("brain")} className="story-link bg-transparent">home</button>
          <button onClick={() => go("work")} className="story-link bg-transparent">work</button>
          <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="story-link" data-cursor="the professional version.">linkedin</a>
          <button onClick={() => go("hi")} className="story-link bg-transparent" data-cursor="say hello?">let's talk</button>
        </nav>
        <button className="relative h-10 w-10 md:hidden" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((open) => !open)}>
          <span className={cn("absolute left-1/2 top-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300", menuOpen ? "rotate-45" : "-translate-y-[5px]")} />
          <span className={cn("absolute left-1/2 top-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full bg-foreground transition-all duration-300", menuOpen ? "-rotate-45" : "translate-y-[4px]")} />
        </button>
        {menuOpen && (
          <nav className="absolute inset-x-4 top-16 grid gap-1 border border-border bg-background p-3 text-lg shadow-xl md:hidden">
            <button onClick={() => go("brain")} className="p-3 text-left">home</button>
            <button onClick={() => go("work")} className="p-3 text-left">work</button>
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className="p-3">linkedin</a>
            <button onClick={() => go("hi")} className="p-3 text-left">let's talk</button>
          </nav>
        )}
      </header>

      <section id="brain" ref={storyRef} className="relative md:h-[var(--story-h)]" style={{ "--story-h": `${(720 * CANVAS_TRAVEL_VW) / 470}vh` } as CSSProperties}>
        <div className="sticky top-0 hidden h-screen overflow-hidden md:block">
          <div ref={canvasRef} className="relative h-full will-change-transform max-md:hidden" style={{ width: `${CANVAS_VW}vw` }}>
            <StringLine subscribe={subscribe} laptopRef={laptopRef} />
            <ThreadText subscribe={subscribe} />
            <div className="absolute inset-0 z-10">
              <IntroScene contentRevealed={noteRevealed} noteRevealed={noteRevealed} laptopRef={laptopRef} />
              <div className="absolute top-0 h-full" style={{ left: `${THREAD_SHIFT}vw`, width: `${CANVAS_VW - THREAD_SHIFT}vw` }}>
                <TinkerScene />
                <HeartScene />
                <TimelineScene />
                <ApparentlyScene />
                <EnoughScene onWork={() => go("work")} />
              </div>
            </div>
          </div>
        </div>
        <MobileStory ready={noteRevealed} onWork={() => go("work")} />
      </section>

      <Works filter={filter} setFilter={setFilter} />
      <OhHi />
      <CuriousCursor visible={scrollReady} />
      <PhoneComment />
    </main>
  );
}

// While scrolling, the string's tip is anchored to ~55% of the viewport width,
// so the freshly drawn thread always stays on screen instead of lagging behind.
const TIP_SCREEN_ANCHOR = 0.55;
// How quickly the story catches up with the scrollbar each frame (0–1).
const SCROLL_EASE = 0.085;
// Content sharpens in as it enters from the right edge: it's revealed once
// its x is this far (vw) inside the screen, so it's clear by the time you read it.
const REVEAL_INSET = 4;

type Subscribe = (listen: (progress: number) => void) => () => void;

function StringLine({ subscribe, laptopRef }: { subscribe: Subscribe; laptopRef: RefObject<HTMLImageElement | null> }) {
  const pathRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const progressRef = useRef(0);
  // The cable starts at the laptop's connector, wherever the laptop lands.
  const [start, setStart] = useState(DEFAULT_THREAD_START);

  useEffect(() => {
    const measure = () => {
      const img = laptopRef.current;
      if (!img || img.offsetParent === null || window.innerWidth < 768) return;
      const x = ((img.offsetLeft + img.offsetWidth * LAPTOP_PORT.x) / window.innerWidth) * 100;
      const y = ((img.offsetTop + img.offsetHeight * LAPTOP_PORT.y) / window.innerHeight) * 100;
      setThreadStart(x, y);
      setStart((prev) => (Math.abs(prev[0] - x) < 0.01 && Math.abs(prev[1] - y) < 0.01 ? prev : [x, y]));
    };
    measure();
    const img = laptopRef.current;
    img?.addEventListener("load", measure);
    window.addEventListener("resize", measure);
    return () => {
      img?.removeEventListener("load", measure);
      window.removeEventListener("resize", measure);
    };
  }, [laptopRef]);

  useEffect(() => {
    const path = pathRef.current;
    const tip = tipRef.current;
    if (!path || !tip) return;
    const { xs, ys, lengths, total } = getThreadSamples();
    const count = xs.length - 1;

    const draw = (progress: number) => {
      progressRef.current = progress;
      // Where the tip should sit: viewport's left edge (in viewBox units) plus
      // 55% of the visible width (1000 units).
      // Over the last stretch the tip runs ahead of its anchor, so the thread
      // reaches the button at the very end instead of stopping mid-screen.
      const catchUp = Math.max(0, (progress - 0.9) / 0.1) * 150;
      const targetX = progress * CANVAS_TRAVEL_VW * 10 + TIP_SCREEN_ANCHOR * 1000 + catchUp;
      let i = 0;
      while (i < count && (xs[i] ?? 0) < targetX) i += 1;
      const length = lengths[i] ?? total;

      path.style.strokeDashoffset = `${1 - length / total}`;
      tip.setAttribute("cx", `${xs[i]}`);
      tip.setAttribute("cy", `${ys[i]}`);
      tip.style.opacity = length <= 0 || length >= total * 0.999 ? "0" : "1";
    };
    draw(progressRef.current);
    return subscribe(draw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full animate-reveal overflow-visible [animation-delay:.9s]" viewBox={`0 0 ${CANVAS_VW * 10} 1000`} preserveAspectRatio="none">
      <path ref={pathRef} pathLength="1" style={{ strokeDashoffset: 1 }} d={getThread().d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" />
      <circle ref={tipRef} r="9" cx={start[0] * 10} cy={start[1] * 10} style={{ opacity: 0 }} className="fill-foreground" />
    </svg>
  );
}

// A line of text that rides on top of the thread, just before "a jack of all
// trades". It follows the thread's curve and is uncovered left to right by the
// thread tip, so it arrives in the same movement as the thread.
const THREAD_TEXT = "a little bit about me";
const THREAD_TEXT_FROM = 76;
const THREAD_TEXT_TO = 118;

function ThreadText({ subscribe }: { subscribe: Subscribe }) {
  const clipRef = useRef<SVGRectElement>(null);
  const progressRef = useRef(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // The stretch of thread under the text, in pixels (so the letters aren't stretched).
  const d = useMemo(() => {
    if (!size.w) return "";
    const { xs, ys } = getThreadSamples();
    let path = "";
    for (let i = 0; i < xs.length; i += 1) {
      const x = xs[i]! / 10;
      if (x < THREAD_TEXT_FROM || x > THREAD_TEXT_TO) continue;
      path += `${path ? "L" : "M"}${((x / 100) * size.w).toFixed(1)} ${((ys[i]! / 1000) * size.h).toFixed(1)} `;
    }
    return path;
  }, [size]);

  useEffect(() => {
    const reveal = (progress: number) => {
      progressRef.current = progress;
      const tipVw = progress * CANVAS_TRAVEL_VW + TIP_SCREEN_ANCHOR * 100;
      clipRef.current?.setAttribute("width", `${Math.max(0, (tipVw / 100) * size.w)}`);
    };
    reveal(progressRef.current);
    return subscribe(reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  if (!d) return null;
  const fontSize = 52; // a bit smaller than "a jack of all trades" (text-6xl)
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-full overflow-visible" style={{ width: `${CANVAS_VW}vw` }} viewBox={`0 0 ${CANVAS_VW * (size.w / 100)} ${size.h}`}>
      <defs>
        <clipPath id="thread-text-clip">
          <rect ref={clipRef} x="0" y="0" width="0" height={size.h} />
        </clipPath>
      </defs>
      <path id="thread-text-path" d={d} fill="none" />
      <g clipPath="url(#thread-text-clip)">
        <text className="fill-foreground font-serif" style={{ fontSize, letterSpacing: "0.06em" }} dy={-fontSize * 0.3}>
          <textPath href="#thread-text-path" startOffset="2%">{THREAD_TEXT}</textPath>
        </text>
      </g>
    </svg>
  );
}

function IntroScene({ contentRevealed, noteRevealed, laptopRef }: { contentRevealed: boolean; noteRevealed: boolean; laptopRef: RefObject<HTMLImageElement | null> }) {
  return (
    <div className="absolute left-0 top-0 h-full w-screen">
      {/* the laptop the cable charges from; its connector is where the thread begins */}
      <img
        ref={laptopRef}
        src={portLaptop}
        alt="a doodled laptop with hands typing, a charging cable plugged into its side"
        width={612}
        height={408}
        draggable={false}
        className="pointer-events-none absolute top-[17vh] h-auto max-w-none animate-reveal select-none [animation-delay:.2s]"
        style={{ width: "min(46vw, 105vh)", left: "calc(50vw - min(46vw, 105vh) / 2)" }}
      />
      <div className={cn("absolute bottom-10 left-8 transition-all duration-700 sm:bottom-8", contentRevealed ? "opacity-100" : "animate-reveal [animation-delay:2.2s]")}>
<p className="text-[1.9rem] font-semibold leading-[0.95] sm:text-5xl">
  professionally<br />
  curious.<br />
  personally <span className="font-serif italic">chaotic.</span>
</p>
        {/* <p className="mt-4 text-sm text-muted-foreground">software engineer · class of '26 · ai & full-stack</p> */}
      </div>
      <div className={cn("absolute left-[62%] top-28 flex max-w-56 origin-bottom-left items-start gap-2 text-sm text-muted-foreground transition-all duration-500", noteRevealed ? "opacity-100" : "animate-reveal [animation-delay:2.2s]")}>
        <svg aria-hidden="true" viewBox="0 0 40 30" className="mt-1 h-6 w-8 shrink-0"><path d="M38 4 C24 6 12 14 4 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M4 24 L13 22 M4 24 L7 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <span>every tab i opened at 2am, drawn as one line.</span>
      </div>
      <div className={cn("absolute bottom-8 right-8 hidden text-right transition-all delay-150 duration-700 sm:block", contentRevealed ? "opacity-100" : "animate-reveal [animation-delay:2.35s]")}>
        <p className="mb-4 text-sm">or, in plain words: welcome to my portfolio :)</p>
        <Button asChild variant="paper" className="mr-2"><a href="#work">view work</a></Button>
        <Button asChild variant="ink"><a href="#hi" data-cursor="i don't bite.">let's talk</a></Button>
      </div>
    </div>
  );
}

// A piece of text pinned to the canvas.
// `at` is the canvas x (in vw) the thread must reach before a `.reveal` note shows.
function Note({ x, y, className, at: revealAt, children }: { x: number; y: number; className?: string; at?: number; children: ReactNode }) {
  return <div className={cn("absolute", className)} style={at(x, y)} data-at={revealAt}>{children}</div>;
}

// i tinker with a lot of stuff — a quiet line in the middle, the objects
// scattered around it, and the thread looping between them.
// TODO: the cat and the badminton racket are placeholders. swap them (and their
// lines) for things that are really you: a pet, a sport, a hobby.
function TinkerScene() {
  return (
    <div>
      <Note x={120} y={42} className="reveal w-[38vw] text-center" at={122}>
        <p className="text-lg text-muted-foreground">i tinker with a lot of stuff.</p>
        <h2 className="whitespace-nowrap font-serif text-6xl leading-tight">a jack of all trades</h2>
        <p className="mt-2 text-lg text-muted-foreground">and a master of "wait, let me just try one thing."</p>
      </Note>
      <Object src={paint} alt="a painting palette and a brush" label="My kind of therapy." style={at(106, 19)} size="sm" delay="0s" />
      <Object src={dance} alt="ghungroo" label="9 years, countless rhythms." style={at(104, 60)} size="sm" delay=".6s" />
      <Object src={book} alt="a book and pen" label="I like writing my thoughts down." style={at(124, 68)} size="sm" delay="1.2s" />
      <Object src={comic} alt="comics" label="just one more chapter." style={at(136, 18)} size="sm" delay=".3s" />
      <Object src={badminton} alt="a badminton racket and shuttle" label="loser buys chai." style={at(150, 68)} size="sm" delay="1.5s" />
    </div>
  );
}

// Points on the thread between two x positions, as (x, y) pairs in vw/vh.
function sampleThread(from: number, to: number) {
  const { xs: allX, ys: allY } = getThreadSamples();
  from += THREAD_SHIFT;
  to += THREAD_SHIFT;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < allX.length; i += 1) {
    const x = allX[i]! / 10;
    if (x >= from - 1 && x <= to + 1) {
      xs.push(x - THREAD_SHIFT);
      ys.push(allY[i]! / 10);
    }
  }
  return { xs, ys };
}

// TODO: swap these three images for something that fits each line
// (an eye or a camera, a mic or a crowd, a brain is fine as it is).
const heart = [
  { src: iot, alt: "iot", x: 200, y: 56, title: "IOT came first", body: "a little coding, a handful of components, and the joy of making things work in the real world.", label: "" },
  { src: mic, alt: "mic", x: 224, y: 22, title: "people & purpose.", body: "i enjoy teaching, volunteering, and helping people learn.", label: "Communities, events, Workshops" },
  { src: brain, alt: "a brain", x: 260, y: 60, title: "AI agents, lately", body: "learning, experimenting, and building along the way.", label: "still learning this one. out loud." },
];

// but few things have my heart — each one an object with a big line and a
// quiet one beside it, and the thread running calmly between the objects.
function HeartScene() {
  return (
    <div>
      <span hidden data-mode="thread" data-at={184} data-say="okay, the soft part." />
      <Note x={181} y={18} className="reveal w-[22rem]" at={182}><h2 className="font-serif text-6xl leading-none">but few things have my heart.</h2></Note>
      {heart.map((h, index) => (
        <Note key={h.title} x={h.x} y={h.y} className="reveal flex items-center gap-5" at={h.x + 2}>
          <Figure src={h.src} alt={h.alt} label={h.label} delay={`${index * 0.5}s`} />
          <div className="w-64">
            <p className="font-serif text-4xl leading-tight">{h.title}</p>
            <p className="mt-2 text-muted-foreground">{h.body}</p>
          </div>
        </Note>
      ))}
    </div>
  );
}

// One beat at a time, told like a story: a short line that moves it forward,
// and the detail underneath for anyone who wants it.
// Entries with no year happened in the same year as the one before them.
const timeline = [
  { year: "2022", title: "curiosity called.", line: "started cse at icfai tech." },
  { year: "2023", title: "things came alive.", line: "first projects and iot experiments." },
  { year: "2024", title: "first real code.", line: "software development trainee at codeplayers." },
  { year: "2025", title: "brought people along.", line: "started gdg on campus; grew to 100+ students." },
  { year: "2025", title: "podium twice.", line: "runner-up at aws genai; 3rd at internal sih." },
  { year: "2026", title: "teaching machines.", line: "Ai intern at nu10, working on ocr." },
  { year: "2026", title: "defence diaries.", line: "intern at ordnance factory medak; built dashboards." },
  { year: "now", title: "making ai verify.", line: "building evidence-driven ai agents." },
];
const TIMELINE_FROM = 304;
// 8 entries fit between the "somehow" line and the loop at this spacing.
const TIMELINE_STEP = 13;
const STEM = 11;

// The thread curves gently through the years. Each one hangs off it on a thin
// stem — alternating above and below — and only appears once the thread
// arrives. Underneath, what all of it keeps adding up to.
function TimelineScene() {
  const [ys, setYs] = useState<number[] | null>(null);

  // Hang each stem from exactly where the thread passes.
  useEffect(() => {
    const { xs, ys: samples } = sampleThread(TIMELINE_FROM - 2, TIMELINE_FROM + TIMELINE_STEP * timeline.length);
    setYs(timeline.map((_, index) => {
      const x = TIMELINE_FROM + index * TIMELINE_STEP;
      let k = 0;
      while (k < xs.length - 1 && (xs[k + 1] ?? 0) < x) k += 1;
      return samples[k] ?? 50;
    }));
  }, []);

  return (
    <div>
      <span hidden data-mode="thread" data-at={306} data-say="the short version. very short." />
      {ys && timeline.map((stop, index) => {
        const x = TIMELINE_FROM + index * TIMELINE_STEP;
        const y = ys[index] ?? 50;
        const up = index % 2 === 1;
        return (
          <div key={stop.title} className="reveal" data-at={x}>
            <span className="absolute w-px bg-muted-foreground/60" style={{ left: `${x}vw`, top: `${up ? y - STEM : y}vh`, height: `${STEM}vh` }} />
            <span className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground" style={{ left: `calc(${x}vw + 0.5px)`, top: `${up ? y - STEM : y + STEM}vh` }} />
            <Note x={x} y={up ? y - STEM - 2 : y + STEM + 2} className={cn("w-[min(16rem,24vw)] -translate-x-1/2 text-center leading-snug", up && "-translate-y-full")}>
              <p className="text-lg">{stop.title}</p>
              <p className="text-muted-foreground">{stop.line}</p>
              {stop.year && <p className="mt-1 text-sm text-muted-foreground/80">{stop.year}</p>}
            </Note>
          </div>
        );
      })}
    </div>
  );
}
// The habit that keeps repeating, told as a cycle: the thread ties one big
// loop beside the line, and the four steps sit around it in the order the
// thread draws them — bottom, right, top, left — with "repeat." in the middle.
const LOOP_RX = LOOP_R / LOOP_ASPECT;
const habit = [
  { step: "Identify", x: LOOP_X, y: LOOP_Y, place: "below" },
  { step: "Explore", x: LOOP_X + LOOP_RX, y: LOOP_Y - LOOP_R, place: "right" },
  { step: "Understand", x: LOOP_X, y: LOOP_Y - 2 * LOOP_R, place: "above" },
  { step: "Build", x: LOOP_X - LOOP_RX, y: LOOP_Y - LOOP_R, place: "left" },
] as const;

const habitLabel = {
  below: "-translate-x-1/2 translate-y-4",
  right: "translate-x-5 -translate-y-1/2",
  above: "-translate-x-1/2 -translate-y-[calc(100%+1rem)]",
  left: "-translate-x-[calc(100%+1.25rem)] -translate-y-1/2",
};

function ApparentlyScene() {
  // The loop is drawn in one go once the thread reaches it, so its steps
  // arrive one after another, in drawing order.
  const looped = LOOP_X + LOOP_RX + 1;
  return (
    <div>
      <span hidden data-mode="thread" data-at={looped} data-say="yes, it's a loop. i tested it." />
      <Note x={428} y={22} className="reveal w-[32rem]" at={428}>
        <p className="font-serif text-6xl leading-[1.05]">apparently, <span className="text-muted-foreground">"just curious" is how it always starts.</span></p>
      </Note>
      {habit.map(({ step, x, y, place }, index) => (
        <div key={step} className="reveal" data-mode="thread" data-at={looped} style={{ "--reveal-delay": `${index * 0.25}s` } as CSSProperties}>
          <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={at(x, y)} />
          <p className={cn("absolute whitespace-nowrap text-lg", habitLabel[place])} style={at(x, y)}>{step}</p>
        </div>
      ))}
      <p className="reveal absolute -translate-x-1/2 -translate-y-1/2 font-serif text-4xl italic" data-mode="thread" data-at={looped} style={{ ...at(LOOP_X, LOOP_Y - LOOP_R), "--reveal-delay": "1s" } as CSSProperties}>repeat.</p>
    </div>
  );
}

// The thread stops. Whitespace. Then the turn into the work.
function EnoughScene({ onWork }: { onWork: () => void }) {
  // The button is pinned to the thread's end point (its left edge, halfway
  // down), so the thread meets it on every screen size; the words sit above.
  return (
    <>
      <span hidden data-mode="thread" data-at={BUTTON_X - 8} data-say="go on. it's the good part." />
      <Note x={BUTTON_X + 4.6} y={BUTTON_Y - 6} className="reveal w-[46vw] -translate-x-1/2 -translate-y-full text-center" at={BUTTON_X - 14}>
        <p className="text-lg text-muted-foreground">okay, enough about me.</p>
        <h2 className="mt-3 font-serif text-6xl leading-[1.05]">let's see what<br />came out of it.</h2>
      </Note>
      <div className="absolute -translate-y-1/2" style={at(BUTTON_X, BUTTON_Y)}>
        <Button variant="ink" onClick={onWork} data-cursor="show me the work ↓">see the work <ArrowDown className="ml-2 h-4 w-4" /></Button>
      </div>
    </>
  );
}

const figureSizes = { fill: "h-full w-full", xs: "h-28 w-28", sm: "h-36 w-36 lg:h-44 lg:w-44", md: "h-44 w-44 lg:h-56 lg:w-56", lg: "h-52 w-52 lg:h-64 lg:w-64" };

// Each object keeps its own little confession. It types itself out on hover and
// springs back into hiding the moment the cursor leaves. The object tilts toward
// the pointer and floats above a soft ground shadow so it reads as 3D.
function Figure({ src, alt, label, className, delay, size = "md", still = false, hang = false, labelBelow = false, labelStyle }: { src: string; alt: string; label?: string | undefined; className?: string; delay?: string; size?: keyof typeof figureSizes | undefined; still?: boolean; hang?: boolean; labelBelow?: boolean | undefined; labelStyle?: CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  const [typed, setTyped] = useState("");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  // On phones, objects near an edge open their bubble toward the middle of
  // the screen instead of centred, so the words never run off-screen.
  const [align, setAlign] = useState<"center" | "left" | "right">("center");
  const hideTimer = useRef(0);

  const open = (el: HTMLElement) => {
    quietOthers(id.current);
    setHovered(true);
    if (window.innerWidth >= 768) return;
    const r = el.getBoundingClientRect();
    const middle = r.left + r.width / 2;
    setAlign(middle < 140 ? "left" : middle > window.innerWidth - 140 ? "right" : "center");
  };

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  // Only one confession at a time: opening this one closes any other.
  const id = useRef(Math.random());
  useEffect(() => {
    const close = (e: Event) => {
      if ((e as CustomEvent<number>).detail !== id.current) setHovered(false);
    };
    window.addEventListener("figure-open", close);
    return () => window.removeEventListener("figure-open", close);
  }, []);

  // A tap anywhere else closes the confession.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hovered) return;
    const away = (e: PointerEvent) => {
      if (e.pointerType === "touch" && !rootRef.current?.contains(e.target as Node)) setHovered(false);
    };
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [hovered]);

  useEffect(() => {
    if (!hovered || !label) {
      setTyped("");
      return;
    }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(label.slice(0, index));
      if (index >= label.length) window.clearInterval(timer);
    }, 26);
    return () => window.clearInterval(timer);
  }, [hovered, label]);

  return (
    <div
      ref={rootRef}
      className={cn("relative shrink-0 [perspective:900px]", figureSizes[size], className)}
      onPointerEnter={(e) => {
        if (e.pointerType !== "touch") open(e.currentTarget);
      }}
      // A tap opens the confession and keeps it up for a moment; a touch
      // "leaves" as soon as the finger lifts, so it can't rely on hover.
      onPointerDown={(e) => {
        if (e.pointerType !== "touch") return;
        open(e.currentTarget);
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => setHovered(false), 2500);
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setTilt({ x: ((e.clientX - r.left) / r.width - 0.5) * 2, y: ((e.clientY - r.top) / r.height - 0.5) * 2 });
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "touch") return;
        setHovered(false);
        setTilt({ x: 0, y: 0 });
      }}
    >
      <div aria-hidden="true" className="absolute bottom-[6%] left-1/2 h-4 w-1/2 rounded-[50%] bg-foreground/20 blur-md transition-all duration-500" style={{ transform: `translateX(-50%) scale(${hovered ? 0.8 : 1})`, opacity: hovered ? 0.6 : 1 }} />
      <div className={cn("h-full w-full", hang ? "animate-hang" : !still && "animate-float-object")} style={{ animationDelay: delay }}>
        <img
          src={src}
          alt={alt}
          decoding="async"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          style={{ transform: `rotateY(${tilt.x * 16}deg) rotateX(${-tilt.y * 14}deg) scale(${hovered ? 1.08 : 1}) translateZ(0)`, transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
          className="h-full w-full select-none object-contain transition-transform duration-500"
        />
      </div>
      {label && (
        <div
          aria-hidden="true"
          style={{ transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)", ...labelStyle }}
          className={cn(
            "pointer-events-none absolute z-40 w-max max-w-[min(16rem,calc(100vw-2rem))] whitespace-pre-line",
            align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
            labelBelow ? "top-[calc(100%+4px)] rounded-[5px_18px_18px_18px]" : align === "right" ? "bottom-[calc(100%+4px)] rounded-[18px_18px_5px_18px]" : "bottom-[calc(100%+4px)] rounded-[18px_18px_18px_5px]",
            " border border-cursor-border bg-cursor px-4 py-2 text-sm text-cursor-foreground shadow-lg transition-all duration-300",
            hovered ? "translate-y-0 scale-100 opacity-100" : cn(labelBelow ? "-translate-y-3" : "translate-y-3", "scale-90 opacity-0"),
          )}
        >
          {typed}
          <span className="animate-pulse">|</span>
        </div>
      )}
    </div>
  );
}

function Object({ src, alt, label, style, delay, size, labelBelow }: { src: string; alt: string; label?: string | undefined; style: CSSProperties; delay: string; size?: keyof typeof figureSizes; labelBelow?: boolean }) {
  return <div className="absolute" style={style}><Figure src={src} alt={alt} label={label} delay={delay} size={size} labelBelow={labelBelow} /></div>;
}

// ---------------------------------------------------------------------------
// Mobile: the same story told vertically. The thread falls from the tangle and
// weaves down the page between the objects, the years hang off it on little
// stems, and it ties the habit loop before ending at the work button. Anchor
// points are read from the laid-out page, so the thread fits any phone.

// Radius (px) of the habit loop on mobile.
const MOBILE_LOOP = 70;

// An object pinned in a mobile block, with the thread passing through its middle.
function MobileObject({ src, alt, label, style, delay, size = "sm" }: { src: string; alt: string; label: string; style: CSSProperties; delay: string; size?: "xs" | "sm" }) {
  return (
    <div className="absolute" style={style}>
      <Figure src={src} alt={alt} label={label} size={size} delay={delay} />
      <span data-anchor className="absolute left-1/2 top-1/2" />
    </div>
  );
}

// An invisible point the thread must pass through, placed within its block.
function Anchor({ x, y, loop }: { x: string; y: number | string; loop?: number }) {
  return <span data-anchor={loop ?? ""} className="absolute" style={{ left: x, top: y }} />;
}

function MobileStory({ ready, onWork }: { ready: boolean; onWork: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const laptopImgRef = useRef<HTMLImageElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const samplesRef = useRef<ThreadSamples | null>(null);
  const [geo, setGeo] = useState<{ d: string; w: number; h: number } | null>(null);

  // Trace the thread through every anchor, starting at the laptop's connector.
  useEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      const img = laptopImgRef.current;
      if (!root || !img || root.offsetParent === null) return;
      const r = root.getBoundingClientRect();
      // Layout offsets, not the bounding rect: the picture is still fading in
      // (and shifted 12px) when this first runs.
      const box = img.offsetParent as HTMLElement | null;
      const sx = (box?.offsetLeft ?? 0) + img.offsetLeft + img.offsetWidth * LAPTOP_PORT.x;
      const sy = (box?.offsetTop ?? 0) + img.offsetTop + img.offsetHeight * LAPTOP_PORT.y;
      const points: Waypoint[] = [[sx, sy], [sx + 16, sy + 8]];
      root.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
        const a = el.getBoundingClientRect();
        const loop = Number(el.dataset["anchor"]);
        points.push(loop ? [a.left - r.left, a.top - r.top, loop] : [a.left - r.left, a.top - r.top]);
      });
      const segments = threadSegments(points, 1, 1);
      samplesRef.current = sampleSegments(segments, 24);
      setGeo({ d: segmentsPath(segments), w: r.width, h: r.height });
    };
    measure();
    void document.fonts?.ready.then(measure);
    const img = laptopImgRef.current;
    img?.addEventListener("load", measure);
    window.addEventListener("resize", measure);
    return () => {
      img?.removeEventListener("load", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Draw the thread down to ~70% of the screen as you scroll, like a pen
  // following your thumb; scrolling back up rewinds it.
  useEffect(() => {
    if (!geo) return;
    let frame = 0;
    // The thread is already out of the laptop, down to the bottom of the first
    // screen, the moment the laptop appears; scrolling carries it on.
    const intro = window.innerHeight * 0.8;
    const bonus = window.innerHeight * 0.3;
    const draw = () => {
      frame = 0;
      const root = rootRef.current;
      const path = pathRef.current;
      const tip = tipRef.current;
      const samples = samplesRef.current;
      if (!root || !path || !tip || !samples) return;
      const { xs, ys, lengths, total } = samples;
      // Beyond the first screen the thread grows with the scroll, like a pen
      // following your thumb.
      const top = root.getBoundingClientRect().top;
      const reach = Math.min(window.innerHeight * 0.7 + bonus - top, (ys[0] ?? 0) + intro + Math.max(0, -top) * 1.4);
      let i = 0;
      while (i < xs.length - 1 && (ys[i] ?? 0) < reach) i += 1;
      const length = lengths[i] ?? 0;
      path.style.strokeDashoffset = `${1 - length / total}`;
      tip.setAttribute("cx", `${xs[i]}`);
      tip.setAttribute("cy", `${ys[i]}`);
      tip.style.opacity = length > 0 && length < total * 0.999 ? "1" : "0";
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [geo]);

  // Things sharpen in as they scroll into view.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.setAttribute("data-shown", "");
        io.unobserve(e.target);
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.15 },
    );
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    // Story comments, said once each as their moment scrolls up the screen.
    const talk = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        const line = (e.target as HTMLElement).dataset["say"];
        if (!e.isIntersecting || !line) return;
        say(`story:${line}`, line);
        talk.unobserve(e.target);
      }),
      { rootMargin: "0px 0px -40% 0px" },
    );
    root.querySelectorAll("[data-say]").forEach((el) => talk.observe(el));
    return () => {
      io.disconnect();
      talk.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="relative overflow-hidden md:hidden">
      {geo && (
        <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 animate-reveal [animation-delay:.2s]" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`}>
          <path ref={pathRef} d={geo.d} pathLength="1" strokeDasharray="1" style={{ strokeDashoffset: 1 }} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle ref={tipRef} r="4.5" cx="0" cy="0" style={{ opacity: 0 }} className="fill-foreground" />
        </svg>
      )}

      {/* professionally curious. personally chaotic. */}
      <div className="relative h-[max(calc(100svh+1rem),calc(33svh+61.3vw+17.5rem))]">
        <img
          ref={laptopImgRef}
          src={portLaptop}
          alt="a doodled laptop with hands typing, a charging cable plugged into its side"
          width={612}
          height={408}
          draggable={false}
          className="pointer-events-none absolute left-[4vw] top-[33svh] h-auto w-[92vw] max-w-none animate-reveal select-none [animation-delay:.2s]"
        />
        <div className={cn("absolute right-5 top-[23svh] flex w-44 items-start gap-1.5 text-[0.8rem] leading-snug text-muted-foreground", ready ? "opacity-100" : "animate-reveal [animation-delay:2.2s]")}>
          <svg aria-hidden="true" viewBox="0 0 40 30" className="mt-4 h-5 w-7 shrink-0"><path d="M38 4 C24 6 12 14 4 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M4 24 L13 22 M4 24 L7 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <span>every tab i opened at 2am, drawn as one line.</span>
        </div>
        <div className={cn("absolute left-5 top-[calc(33svh+61.3vw+8rem)]", ready ? "opacity-100" : "animate-reveal [animation-delay:2.2s]")}>
          <p className="text-[1.9rem] font-semibold leading-[0.95]">professionally<br />curious.<br />personally <span className="font-serif italic">chaotic.</span></p>
          {/* <p className="mt-3 text-sm text-muted-foreground">software engineer · class of '26</p> */}
        </div>
        <Anchor x="86%" y="calc(33svh + 61.3vw + 1.5rem)" />
        <Anchor x="93%" y="calc(33svh + 61.3vw + 15.5rem)" />
      </div>

      {/* i tinker with a lot of stuff — everything fits in one phone frame, objects around the words */}
      <div className="relative h-[max(100svh,760px)]">
        <MobileObject size="xs" src={paint} alt="a painting palette and a brush" label="My kind of therapy." style={{ left: "4%", top: "14%" }} delay="0s" />
        <MobileObject size="xs" src={comic} alt="manga" label="just one more chapter." style={{ right: "4%", top: "22%" }} delay=".4s" />
        <Anchor x="93%" y="37%" />
        <div className="reveal absolute inset-x-0 top-[39%] mx-auto max-w-[17rem] text-center">
          <p className="text-muted-foreground">i tinker with a lot of stuff.</p>
          <h2 className="mt-1 whitespace-nowrap font-serif text-[2.1rem] leading-tight">a jack of all trades</h2>
          <p className="mt-1 text-balance text-sm text-muted-foreground">and a master of "wait, let me just try one thing."</p>
        </div>
        <Anchor x="93%" y="52%" />
        <MobileObject size="xs" src={badminton} alt="a badminton racket and shuttle" label="loser buys chai." style={{ right: "5%", top: "54%" }} delay="1.2s" />
        <MobileObject size="xs" src={dance} alt="ghungroo" label="9 years, countless rhythms." style={{ left: "5%", top: "62%" }} delay=".8s" />
        <MobileObject size="xs" src={book} alt="a book and pen" label="I like writing my thoughts down.”" style={{ left: "46%", top: "76%" }} delay="1.6s" />
      </div>

      {/* but few things have my heart — object above its words, alternating sides */}
      <div className="relative px-5 pt-16">
        <span data-say="okay, the soft part." className="absolute left-0 top-0 h-px w-px" />
        <Anchor x="5%" y={0} />
        <Anchor x="5%" y={110} />
        <h2 className="reveal text-center font-serif text-[2.4rem] leading-none">but few things<br />have my heart.</h2>
        {heart.map((h, index) => {
          const right = index % 2 === 1;
          return (
            <div key={h.title} className={cn("reveal relative mt-10 w-[66%]", right && "ml-auto text-right")}>
              <div className={cn("relative w-fit", right && "ml-auto")}>
                <Figure src={h.src} alt={h.alt} label={h.label} size="sm" delay={`${index * 0.5}s`} />
                <span data-anchor className="absolute left-1/2 top-1/2" />
              </div>
              <p className="font-serif text-2xl leading-tight [text-shadow:0_0_5px_var(--background),0_0_5px_var(--background),0_0_9px_var(--background),0_0_9px_var(--background)]">{h.title}</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground [text-shadow:0_0_5px_var(--background),0_0_5px_var(--background),0_0_9px_var(--background),0_0_9px_var(--background)]">{h.body}</p>
              {/* leave along the outer edge, below the words */}
              <Anchor x={right ? "calc(100% + 0.25rem)" : "-0.9rem"} y="calc(100% + 0.75rem)" />
            </div>
          );
        })}
      </div>

      {/* somehow, i keep ending up... — the years hang off the thread */}
      <div className="relative mt-20 px-5">
        <span data-say="the short version. very short." className="absolute left-0 top-20 h-px w-px" />
        <Anchor x="6%" y={-20} />
        <ol className="relative mt-10 pl-9">
          {timeline.map((stop, i) => {
            // The thread sways side to side between the years. Every year keeps the same
            // hyphen and dot, so the whole row shifts with the thread instead.
            const shift = Math.sin(i * 0.7) * 0.8;
            return (
            <li key={stop.year + stop.title} className="reveal relative pb-7" style={{ marginLeft: `${shift}rem` }}>
              <span data-anchor className="absolute -left-[2.2rem] top-[0.7rem]" />
              <span aria-hidden="true" className="absolute -left-[2.2rem] top-[0.7rem] h-px w-[1.3rem] bg-muted-foreground/60" />
              <span aria-hidden="true" className="absolute left-[-1rem] top-[0.55rem] h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              <p>{stop.title}</p>
              <p className="text-sm leading-snug text-muted-foreground">{stop.line}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/80">{stop.year}</p>
            </li>
            );
          })}
        </ol>
        <Anchor x="6%" y="100%" />
      </div>
      <div className="relative px-5 pt-4">
        <Anchor x="5%" y="calc(100% + 1rem)" />
      </div>

      {/* apparently, i can't stop at "it works" — tied in a loop */}
      <div className="relative mt-16 px-5">
        <Anchor x="89%" y={-24} />
        <Anchor x="90%" y={150} />
        <p className="reveal font-serif text-[2.3rem] leading-[1.05]">apparently, <span className="text-muted-foreground">"just curious" is how it always starts.</span></p>
        <div className="reveal relative mt-4 h-[270px]">
          <span data-say="yes, it's a loop. i tested it." className="absolute left-0 top-1/2 h-px w-px" />
          <Anchor x="86%" y={205} />
          <Anchor x="50%" y={230} loop={MOBILE_LOOP} />
          <span className="absolute -translate-x-1/2 translate-y-3 whitespace-nowrap text-sm" style={{ left: "50%", top: 230 }}>Understand</span>
          <span className="absolute -translate-y-1/2 whitespace-nowrap text-sm" style={{ left: `calc(50% + ${MOBILE_LOOP + 10}px)`, top: 230 - MOBILE_LOOP }}>Explore</span>
          <span className="absolute -translate-x-1/2 -translate-y-[calc(100%+0.6rem)] whitespace-nowrap text-sm" style={{ left: "50%", top: 230 - 2 * MOBILE_LOOP }}>Identify</span>
          <span className="absolute -translate-x-[calc(100%+0.6rem)] -translate-y-1/2 whitespace-nowrap text-sm" style={{ left: `calc(50% - ${MOBILE_LOOP}px)`, top: 230 - MOBILE_LOOP }}>Build</span>
          <span className="absolute -translate-x-1/2 -translate-y-1/2 font-serif text-2xl italic" style={{ left: "50%", top: 230 - MOBILE_LOOP }}>repeat.</span>
        </div>
      </div>

      {/* enough about me — the thread ends at the button */}
      <div className="relative px-5 pb-24 pt-14 text-center">
        <span data-say="go on. it's the good part." className="absolute left-0 top-10 h-px w-px" />
        <Anchor x="94%" y={40} />
        <p className="reveal text-sm text-muted-foreground">okay, enough about me.</p>
        <h2 className="reveal mt-2 font-serif text-[2.3rem] leading-tight">let's see what<br />came out of it.</h2>
        <div className="relative mt-7 inline-block">
          <span data-anchor className="absolute left-[calc(100%+2.75rem)] top-[-0.25rem]" />
          <span data-anchor className="absolute left-full top-1/2" />
          <Button variant="ink" onClick={onWork}>see the work <ArrowDown className="ml-2 h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}

const skillGroups = [
  { title: "Development", items: ["Python", "JavaScript", "React", "Django", "Flask", "SQL"] },
  { title: "AI & Generative AI", items: ["Generative AI", "LLM Integration", "LangChain", "RAG", "Computer Vision"] },
  { title: "Data & Analytics", items: ["Power BI", "Pandas", "Data Visualization"] },
  { title: "Tools & Platforms", items: ["Git & GitHub", "Postman", "AWS", "Supabase"] },
];

function Works({ filter, setFilter }: { filter: string; setFilter: (filter: string) => void }) {
  const filtered = filter === "All" ? projects : projects.filter((project) => project.tags.includes(filter));
  return (
    <section id="work" className="relative min-h-screen border-t border-foreground bg-background px-5 pb-24 pt-28 sm:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden" aria-hidden="true"><p className="-mt-[0.27em] whitespace-nowrap text-center text-[28vw] font-semibold leading-[1.1] text-muted lg:text-[23vw]">WORKS</p></div>
      <div className="relative mx-auto grid max-w-[1500px] gap-16 pt-[14vw] sm:pt-[19vw] lg:grid-cols-[minmax(360px,1fr)_minmax(0,1fr)] lg:pt-[15vw]">
        <aside className="h-fit lg:sticky lg:top-24">
          <p className="text-sm text-muted-foreground">selected work </p>
          <h2 className="mt-4 max-w-md font-serif text-3xl leading-tight sm:text-4xl">Some Ideas <br /><em>brought to life</em></h2>
          <h3 className="mt-8 font-serif text-2xl">Things I've worked with</h3>
          <div className="mt-3 grid max-w-xl gap-x-6 gap-y-4 sm:grid-cols-2">
            {skillGroups.map((group) => (
              <div key={group.title}>
                <p className="text-xs text-muted-foreground">{group.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.items.map((item) => <span key={item} className="rounded-full border border-border px-2.5 py-0.5 text-xs">{item}</span>)}
                </div>
              </div>
            ))}
          </div>
          <p className="mb-3 mt-8 text-sm">show me</p>
          <div className="flex flex-wrap gap-2">
            {["All", "Agentic AI", "RAG", "Fullstack"].map((item) => <Button key={item} variant="filter" data-active={filter === item} onClick={() => setFilter(item)} data-cursor={`filter: ${item.toLowerCase()}`}>{item}</Button>)}
          </div>
        </aside>
        <div className="grid gap-20">
          {filtered.map((project) => (
            <article key={project.title} className="group ml-auto w-full max-w-[34rem]">
              <a href={project.live || project.code} target="_blank" rel="noreferrer" className="block overflow-hidden border border-border bg-muted" data-cursor={project.live ? "see it live ↗" : "see the code ↗"}>
                <img src={project.image} alt={`${project.title} screenshot`} loading="lazy" width={1200} height={912} className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]" />
              </a>
              <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-5">
                <div className="min-w-0"><p className="text-xs text-muted-foreground">{project.number}</p><h3 className="mt-1 font-serif text-4xl">{project.title}</h3><p className="mt-2 max-w-xl text-muted-foreground">{project.blurb}</p></div>
                <Button asChild variant="paper" size="icon"><a href={project.code} target="_blank" rel="noreferrer" aria-label={`${project.title} on GitHub`} data-cursor="read the code ↗"><ArrowUpRight className="h-5 w-5" /></a></Button>
              </div>
            </article>
          ))}
          {filtered.length === 0 && <p className="py-24 text-muted-foreground">nothing on this shelf yet. give it a week.</p>}
          {/* the way down to everything else */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-10">
            <p className="font-serif text-3xl">interested? <span className="text-muted-foreground">there's more.</span></p>
            {/* testing the thread plane; swap back to <RabbitHoleButton /> (import from @/components/rabbit-hole) to restore the fall */}
            <ThreadPlaneButton />
          </div>
        </div>
      </div>
    </section>
  );
}

// Where the ID card's lanyard hangs from, in vw of the section.
const HAND_X = 71;
// How big the card (and everything hung round it) is drawn on desktop.
const CARD_S = 1;

// My ID card on a lanyard. It hangs from the top of the section like a
// pendulum: grab it and swing it around, let go and it settles back. The
// physics runs in a rAF loop writing straight to the DOM, no React renders.
function LanyardCard({ visible, phone = false }: { visible: boolean; phone?: boolean }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const strapRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const sim = useRef({ x: 0, y: 0, vx: 0, vy: 0, a: 0, w: 0, rx: 0, ry: 0, grabX: 0, grabY: 0, tx: 0, ty: 0, drag: false, kick: false });

  // Drop in with a little swing the first time it appears.
  useEffect(() => {
    if (visible && !sim.current.kick) {
      sim.current.kick = true;
      sim.current.vx = phone ? -260 : -420;
    }
  }, [visible, phone]);

  useEffect(() => {
    const s = sim.current;
    const rope = () => (phone ? 96 : Math.min(300, Math.max(150, window.innerHeight * 0.25)));
    s.y = rope();
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const L = rope();
      const px = s.vx;
      if (s.drag) {
        // Follow the finger, but only as far as the strap will stretch.
        let nx = s.tx;
        let ny = s.ty;
        const d = Math.hypot(nx, ny);
        const max = L * 1.12;
        if (d > max) {
          nx = (nx / d) * max;
          ny = (ny / d) * max;
        }
        s.vx = (nx - s.x) / Math.max(dt, 0.001);
        s.vy = (ny - s.y) / Math.max(dt, 0.001);
        s.x = nx;
        s.y = ny;
      } else {
        s.vy += 1900 * dt;
        const damp = Math.max(0, 1 - 0.55 * dt);
        s.vx *= damp;
        s.vy *= damp;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const d = Math.hypot(s.x, s.y);
        if (d > L) {
          const nx = s.x / d;
          const ny = s.y / d;
          s.x = nx * L;
          s.y = ny * L;
          const vn = s.vx * nx + s.vy * ny;
          if (vn > 0) {
            s.vx -= nx * vn * 1.05;
            s.vy -= ny * vn * 1.05;
          }
        }
      }
      // The card itself swings on the clip: gravity straightens it, and it
      // lags behind whenever the clip is pushed sideways.
      const ax = dt > 0 ? (s.vx - px) / dt : 0;
      s.w += (-95 * s.a - 5.5 * s.w + Math.max(-60, Math.min(60, ax * 0.0045))) * dt;
      s.a = Math.max(-1.1, Math.min(1.1, s.a + s.w * dt));
      // A touch of 3D: it turns on its strap as it moves.
      s.ry += (Math.max(-38, Math.min(38, -s.vx * 0.035)) - s.ry) * Math.min(1, dt * 8);
      s.rx += (Math.max(-22, Math.min(22, s.vy * 0.012)) - s.rx) * Math.min(1, dt * 8);

      // on phones the strap hangs straight from the email button above the card
      const top = phone ? 0 : -420;
      const sx = s.x;
      const sy = s.y - top;
      if (strapRef.current) {
        strapRef.current.style.height = `${Math.hypot(sx, sy)}px`;
        strapRef.current.style.transform = `translate(-50%, ${top}px) rotate(${-Math.atan2(sx, sy)}rad)`;
      }
      if (tagRef.current) {
        tagRef.current.style.transform = `translate(${s.x}px, ${s.y}px) translateX(-50%) perspective(800px) rotate(${s.a}rad) rotateY(${s.ry}deg) rotateX(${s.rx}deg)`;
      }
      if (glareRef.current) glareRef.current.style.backgroundPosition = `${50 + s.ry * 2.2}% ${50 - s.rx * 2}%`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phone]);

  const toAnchor = (e: { clientX: number; clientY: number }) => {
    const r = anchorRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div ref={anchorRef} className={cn("pointer-events-none absolute transition-opacity duration-500", visible ? "opacity-100" : "opacity-0")} style={phone ? { left: "72%", top: 0 } : { left: `${HAND_X}vw`, top: 0 }}>
      {phone && <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full border border-foreground bg-background" />}
      {/* the strap */}
      <div ref={strapRef} className="absolute left-0 top-0 w-3.5 origin-top bg-foreground" style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 10px, rgb(255 255 255 / 0.12) 10px 12px)" }} />
      {/* the clip and the card, swinging together */}
      <div
        ref={tagRef}
        data-cursor=""
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const p = toAnchor(e);
          const s = sim.current;
          s.grabX = p.x - s.x;
          s.grabY = p.y - s.y;
          s.tx = s.x;
          s.ty = s.y;
          s.drag = true;
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const s = sim.current;
          if (!s.drag) return;
          const p = toAnchor(e);
          s.tx = p.x - s.grabX;
          s.ty = p.y - s.grabY;
        }}
        onPointerUp={() => {
          sim.current.drag = false;
          setDragging(false);
        }}
        onPointerCancel={() => {
          sim.current.drag = false;
          setDragging(false);
        }}
        className={cn("pointer-events-auto absolute left-0 top-0 touch-none select-none will-change-transform", dragging ? "cursor-grabbing" : "cursor-grab")}
        style={{ transformOrigin: "50% 0" }}
      >
        <div style={phone ? undefined : { zoom: CARD_S }}>
        <div className="relative mx-auto h-7 w-7 -mb-3.5 rounded-[5px] border border-foreground/40 bg-gradient-to-b from-neutral-100 via-neutral-300 to-neutral-400 shadow-sm" />
        <div className="relative mt-2 w-[15rem] overflow-hidden rounded-[1.1rem] border border-foreground/15 bg-white px-5 pb-4 pt-6 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.35)]">
          <div className="absolute left-1/2 top-2.5 h-2 w-12 -translate-x-1/2 rounded-full border border-foreground/20 bg-background" />
          <div className="aspect-[5/4] overflow-hidden rounded-xl bg-[#f4efe4]">
            <img src={profile} alt="sahithi, drawn as a doodle" draggable={false} className="h-full w-full object-cover mix-blend-multiply" />
          </div>
          <p className="mt-3 font-serif text-xl leading-none">Sahithi</p>
          <p className="mt-1 text-xs text-muted-foreground">software engineer · class of '26</p>
          <p className="mt-2 flex items-center gap-1.5 font-hand text-sm tracking-wide"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />open to work</p>
          <div className="mt-3 h-6 opacity-80" style={{ backgroundImage: "repeating-linear-gradient(90deg, #111 0 2px, transparent 2px 4px, #111 4px 5px, transparent 5px 8px, #111 8px 11px, transparent 11px 13px)" }} />
          <div ref={glareRef} className="pointer-events-none absolute inset-0 mix-blend-soft-light" style={{ backgroundImage: "linear-gradient(115deg, transparent 35%, rgb(255 255 255 / 0.85) 50%, transparent 65%)", backgroundSize: "250% 250%" }} />
        </div>
        </div>
      </div>
    </div>
  );
}

// A handwritten margin note, like scribbles on the page.
function Scribble({ className, rotate = -10, children }: { className?: string; rotate?: number; children: ReactNode }) {
  return (
    <p className={cn("font-hand text-[1.05rem] leading-[1.3] tracking-[0.08em] text-foreground/75", className)} style={{ rotate: `${rotate}deg` }}>
      {children}
    </p>
  );
}

// A small hand-drawn arrow. `d` is the stroke; the head is drawn at its end.
function ScribbleArrow({ d, head, className, style }: { d: string; head: string; className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 60" className={cn("absolute h-10 w-10 overflow-visible text-foreground/70", className)} style={style}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d={head} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const pill = "inline-flex items-center justify-between gap-10 rounded-xl px-5 text-[1.05rem] transition-colors";

// The end. "oh, hi. i'm sahithi." — and the thread leaves the "hi." and
// waves its way across into my raised hand. Margin notes scribbled around it.
function OhHi() {
  const ref = useRef<HTMLElement>(null);
  const deskSocketRef = useRef<HTMLDivElement>(null);
  const phoneSocketRef = useRef<HTMLDivElement>(null);
  const phoneCardRef = useRef<HTMLDivElement>(null);
  // Only the moments that change the layout go through React: the words
  // arriving, the cable reaching the plug (so the socket draws itself), and
  // the plug going home.
  const [stage, setStage] = useState({ seen: false, reached: false });
  const [plugged, setPlugged] = useState(false);
  const [funOpen, setFunOpen] = useState(false);
  const [cable, setCable] = useState<{ a: string; w: number; h: number; card: { x: number; y: number; w: number; h: number } | null } | null>(null);
  const seen = stage.seen;

  // The cable runs from the end of "oh, hi." over the socket and down round the
  // far side to the plug's cord. Everything is measured in pixels from the
  // laid-out page, so it follows whatever the screen does.
  useEffect(() => {
    const measure = () => {
      const section = ref.current;
      const phone = window.innerWidth < 768;
      const socket = (phone ? phoneSocketRef : deskSocketRef).current;
      if (!section || !socket) return;
      // Layout offsets rather than bounding rects, so the words still fading
      // in (and shifted a few px) don't throw the cable off.
      const box = (el: HTMLElement) => {
        let x = 0;
        let y = 0;
        for (let n: HTMLElement | null = el; n && n !== section; n = n.offsetParent as HTMLElement | null) {
          x += n.offsetLeft;
          y += n.offsetTop;
        }
        return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight, right: x + el.offsetWidth };
      };
      const q = { left: 0, top: 0, width: section.offsetWidth, height: section.offsetHeight };
      const k = box(socket);
      if (k.width === 0) return;
      const plug: [number, number] = [k.left - q.left + k.width * PLUG_CORD.x, k.top - q.top + k.height * PLUG_CORD.y];
      const w = q.width;
      // The thread starts at the corner of the ID card and droops across to the
      // plug, arriving from the right.
      let start: [number, number];
      let toPlug: Waypoint[];
      let card: { x: number; y: number; w: number; h: number } | null = null;
      if (phone) {
        // starts hidden behind the card and slips out of its left edge, so the
        // card's text stays clear
        const c = box(phoneCardRef.current ?? socket);
        const px = c.left + c.width * 0.72;
        const top = c.top + 96 + 22;
        start = [px - 20, top + 140];
        toPlug = [start, [px - 100, top + 190], [px - 128, top + 240], [px - 132, top + 290], [plug[0] + 70, plug[1] - 90], [plug[0] + 46, plug[1] - 22], [plug[0] + 14, plug[1] - 2], plug, [plug[0] - 9, plug[1] + 0.5]];
      } else {
        const rope = Math.min(300, Math.max(150, window.innerHeight * 0.25));
        // The path is sketched on a reference screenshot (strap centre x=222, card
        // top y=205, 1.8 css px per sketch px). From the top line of the section it
        // swings across the strap, round the far side, behind the card, out of its
        // right edge and back under it into the plug.
        const ax = (w * HAND_X) / 100;
        const cardTop = rope + 22 * CARD_S;
        const P = (x: number, y: number): [number, number] => [ax + (x - 222) * 1.8 * CARD_S, cardTop + (y - 205) * 1.8 * CARD_S];
        card = { x: ax - 120 * CARD_S, y: cardTop, w: 240 * CARD_S, h: 312 * CARD_S };
        start = [P(257, 0)[0], 0];
        toPlug = [
          start, P(262, 75), P(255, 98), P(225, 117), P(190, 130), P(166, 150), P(165, 178), P(185, 202), P(230, 235), P(275, 275), P(300, 312), P(308, 345), P(300, 385), P(275, 405),
          [plug[0] + 60, plug[1] - 6], [plug[0] + 26, plug[1] - 8], [plug[0] + 8, plug[1] - 5], plug,
        ];
      }
      setCable({ a: segmentsPath(threadSegments(toPlug, 1, 1)), w, h: q.height, card });
    };
    measure();
    void document.fonts?.ready.then(measure);
    // The words settle once they have faded in; measure again then.
    const settle = [window.setTimeout(measure, 900), window.setTimeout(measure, 2500)];
    // …and whenever anything above shifts the plug or the socket.
    const watch = new ResizeObserver(measure);
    [ref.current, deskSocketRef.current, phoneSocketRef.current].forEach((el) => el && watch.observe(el));
    window.addEventListener("resize", measure);
    return () => {
      settle.forEach((t) => window.clearTimeout(t));
      watch.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Arrive and the cable travels toward the plug; scroll back up and it
    // retraces its way out. It animates on its own rather than sticking to
    // the scrollbar, easing toward wherever it should be.
    let frame = 0;
    let current = 0;
    let connected = false;
    const tick = () => {
      const { top } = node.getBoundingClientRect();
      const target = top < window.innerHeight * 0.45 ? 1 : 0;
      const gap = target - current;
      current = Math.abs(gap) < 0.002 ? target : current + gap * 0.045 + Math.sign(gap) * 0.004;
      current = Math.min(1, Math.max(0, current));
      node.querySelectorAll<SVGPathElement>("[data-cable]").forEach((el) => (el.style.strokeDashoffset = `${1 - current}`));
      // The same thread goes on to draw the plug and then the socket, one
      // continuous line, in the last stretch of its journey.
      const part = (from: number, to: number) => `${1 - Math.min(1, Math.max(0, (current - from) / (to - from)))}`;
      node.querySelectorAll<SVGPathElement>("[data-draw]").forEach((el) => {
        el.style.strokeDashoffset = el.dataset["draw"] === "plug" ? part(0.7, 0.84) : part(0.84, 1);
      });
      // Latched: it plugs in once the thread has finished and only unplugs
      // after the thread has clearly retreated, so small scrolls never replay it.
      if (!connected && current >= 0.995) {
        connected = true;
        setPlugged(true);
      } else if (connected && current < 0.5) {
        connected = false;
        setPlugged(false);
      }
      setStage((s) => {
        const next = { seen: current > 0.3, reached: current >= 0.98 };
        return s.seen === next.seen && s.reached === next.reached ? s : next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Fade and sharpen something in, merged with its own classes and style.
  const arrive = (on: boolean, delay: string, className: string, style?: CSSProperties) => ({
    className: cn(className, "transition-all duration-700", on ? "translate-y-0 opacity-100 blur-0" : "translate-y-3 opacity-0 blur-sm"),
    style: { ...style, transitionDelay: on ? delay : "0s" },
  });

  return (
    <section id="hi" ref={ref} className="relative min-h-screen overflow-hidden border-t border-border px-5 pb-32 pt-28 sm:px-8 md:h-screen md:min-h-[720px] md:px-[4.5vw] md:pb-0 md:pt-[23vh]">
      {/* the cable: laptop → (the whole story) → "hi." → over the socket → plug */}
      {cable && (
        <>
          {/* behind the card: the whole thread, so the card hides it where they overlap */}
          <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-0" width={cable.w} height={cable.h} viewBox={`0 0 ${cable.w} ${cable.h}`}>
            <path data-cable d={cable.a} pathLength="1" strokeDasharray="1" style={{ strokeDashoffset: 1 }} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {/* in front of the strap and everything else, but cut out where the card rests */}
          <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-20 hidden md:block" width={cable.w} height={cable.h} viewBox={`0 0 ${cable.w} ${cable.h}`}>
            {cable.card && (
              <clipPath id="cable-front">
                <path clipRule="evenodd" d={`M0 0H${cable.w}V${cable.h}H0Z M${cable.card.x + 18} ${cable.card.y}H${cable.card.x + cable.card.w - 18}A18 18 0 0 1 ${cable.card.x + cable.card.w} ${cable.card.y + 18}V${cable.card.y + cable.card.h - 18}A18 18 0 0 1 ${cable.card.x + cable.card.w - 18} ${cable.card.y + cable.card.h}H${cable.card.x + 18}A18 18 0 0 1 ${cable.card.x} ${cable.card.y + cable.card.h - 18}V${cable.card.y + 18}A18 18 0 0 1 ${cable.card.x + 18} ${cable.card.y}Z`} />
              </clipPath>
            )}
            <g clipPath={cable.card ? "url(#cable-front)" : undefined}>
              <path data-cable d={cable.a} pathLength="1" strokeDasharray="1" style={{ strokeDashoffset: 1 }} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        </>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-10 hidden h-screen md:block">
        <LanyardCard visible={stage.seen} />
        {/* the socket sits on the plain space below the card, the battery under it */}
        <div ref={deskSocketRef} className="absolute z-10 w-[clamp(8.1rem,13.5vw,12.6rem)]" style={{ left: `calc(${HAND_X}vw - 8.5rem)`, top: "calc(clamp(150px, 25vh, 300px) + 358px)" }}>
          <SocketPlug plugged={plugged} className="block h-auto w-full" />
        </div>
        <div {...arrive(stage.reached, ".3s", "absolute", { left: `${HAND_X + 11.5}vw`, top: "32vh" })}>
          <Scribble className="w-36" rotate={-14}>yes, that's me.<br />go on,<br />give it a tug.</Scribble>
          <ScribbleArrow className="-left-2 top-24" d="M30 4 C32 20 22 32 6 36" head="M6 36 L16 29 M6 36 L15 42" />
        </div>
        <div {...arrive(stage.reached, ".6s", "absolute", { left: `${HAND_X + 11.5}vw`, top: "65vh" })}>
          <Scribble className="w-36" rotate={-14}>still figuring<br />this out...<br />and probably<br />always will.</Scribble>
          <ScribbleArrow className="-left-12 top-10" d="M40 18 C30 30 18 32 6 30" head="M6 30 L15 24 M6 30 L14 37" />
        </div>
      </div>

      <div {...arrive(seen, "0s", "relative md:max-w-[58vw]")}>
        <div className="relative w-fit">
          <Scribble className="absolute -left-1 -top-14 hidden md:block" rotate={-12}>who made this?</Scribble>
          <ScribbleArrow className="-left-8 -top-7 hidden md:block" d="M26 4 C12 10 6 22 10 36" head="M10 36 L4 27 M10 36 L16 29" />
          <h2 className="font-serif text-[clamp(3.5rem,6.6vw,7.5rem)] leading-[0.9] tracking-[-0.01em]">
            <span>oh, hi.</span>
            <br />
            i'm <em>sahithi</em>.
          </h2>
        </div>
        <p className="mt-4 text-[clamp(1.05rem,1.25vw,1.35rem)] leading-[1.2] text-muted-foreground">still curious.<br />still shipping.<br />still opening tabs.</p>
        <p className="mt-7 font-serif text-[clamp(1.75rem,2.75vw,3rem)] leading-[1.08]">looking for my first<br />full-time team. <em>is it yours?</em></p>
        <p className="mt-3 text-sm text-muted-foreground">ai or full-stack · hyderabad, bangalore, pune, chennai or remote</p>
        <div className="relative mt-7 flex w-fit flex-col items-start gap-3 max-md:flex-col-reverse">
          <a href={`mailto:${EMAIL}`} className={cn(pill, "min-w-64 bg-foreground py-3 text-background hover:bg-foreground/85")} data-cursor="hiring? i reply fast.">{EMAIL} <ArrowUpRight className="h-4 w-4" /></a>
          <div className="flex flex-wrap gap-3">
            <a href={LINKS.resume || "#"} target={LINKS.resume ? "_blank" : undefined} rel="noreferrer" className={cn(pill, "border border-foreground/50 py-2.5 hover:bg-foreground/5 max-md:bg-background")} data-cursor="the short version.">resume <ArrowUpRight className="h-4 w-4" /></a>
            <a href={LINKS.linkedin} target="_blank" rel="noreferrer" className={cn(pill, "border border-foreground/50 py-2.5 hover:bg-foreground/5 max-md:bg-background")} data-cursor="the professional version.">linkedin <ArrowUpRight className="h-4 w-4" /></a>
            <a href={LINKS.github} target="_blank" rel="noreferrer" className={cn(pill, "border border-foreground/50 py-2.5 hover:bg-foreground/5 max-md:bg-background")} data-cursor="where all the proof is stored.">github <ArrowUpRight className="h-4 w-4" /></a>
            {LINKS.x && <a href={LINKS.x} target="_blank" rel="noreferrer" className={cn(pill, "border border-foreground/50 py-2.5 hover:bg-foreground/5 max-md:bg-background")} data-cursor="unfiltered thoughts.">x <ArrowUpRight className="h-4 w-4" /></a>}
          </div>
        </div>
        <div ref={phoneCardRef} className="relative z-10 mt-1 h-[28rem] w-full md:hidden">
          <LanyardCard phone visible={stage.seen} />
        </div>
        {/* on phones the socket gets its own row under me, the cable looping in from the left */}
        <div className="relative z-10 mt-8 flex flex-col items-center md:hidden">
          <Scribble className="mb-1 text-center" rotate={-6}>aiming high.<br />one commit at a time.</Scribble>
          <div ref={phoneSocketRef} className="w-72">
            <SocketPlug plugged={plugged} className="block h-auto w-full" />
          </div>
        </div>
      </div>

      {/* the joystick takes over from the old "back to top" link */}
      <div className="absolute bottom-3 right-4 z-30 md:bottom-4 md:right-8">
        <Joystick onRewind={() => document.getElementById("brain")?.scrollIntoView({ behavior: "smooth" })} onFun={() => setFunOpen(true)} />
        {funOpen && <FunMode onExit={() => setFunOpen(false)} />}
      </div>
    </section>
  );
}

// Phones have no cursor, so the story's comments pop up as a little chat
// bubble in the bottom corner instead — typed out, then gone.
function PhoneComment() {
  const [comment, setComment] = useState<CursorComment | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const onComment = (event: Event) => {
      const next = (event as CustomEvent<CursorComment>).detail;
      if (next.id !== "hover" && window.innerWidth < 768) setComment(next);
    };
    const hush = (e: Event) => {
      if ((e as CustomEvent<number>).detail !== -1) setComment(null);
    };
    window.addEventListener("figure-open", hush);
    window.addEventListener("cursor-comment", onComment);
    // (fixed: the original only removed one of these two listeners)
    return () => {
      window.removeEventListener("figure-open", hush);
      window.removeEventListener("cursor-comment", onComment);
    };
  }, []);

  useEffect(() => {
    setTyped("");
    if (!comment) return;
    let index = 0;
    let fade = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(comment.text.slice(0, index));
      if (index >= comment.text.length) {
        window.clearInterval(timer);
        fade = window.setTimeout(() => setComment((c) => (c === comment ? null : c)), 3800);
      }
    }, 32);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(fade);
    };
  }, [comment]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed bottom-5 left-4 z-[90] md:hidden">
      <div
        className={cn(
          "origin-bottom-left whitespace-nowrap rounded-[24px_24px_24px_2px] border-2 border-cursor-border bg-cursor px-4 py-2 text-sm font-medium text-cursor-foreground transition-[opacity,scale] duration-300 [filter:drop-shadow(4px_4px_5px_rgb(46_144_250/0.16))]",
          comment ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
      >
        {typed || " "}
      </div>
    </div>
  );
}

// The cursor's comment bubble. It trails the pointer with a touch of easing
// and says nothing by default — it only speaks when the story or the thing
// under the pointer has something to say, types it out, and fades away.
function CuriousCursor({ visible }: { visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [comment, setComment] = useState<CursorComment | null>(null);
  const [typed, setTyped] = useState("");
  const [moved, setMoved] = useState(false);
  // Re-places the bubble without the pointer moving (e.g. as text types out).
  const reposition = useRef(() => {});

  useEffect(() => {
    const target = { x: -200, y: -200 };
    const pos = { x: -200, y: -200 };
    let frame = 0;
    const tick = () => {
      pos.x += (target.x - pos.x) * 0.28;
      pos.y += (target.y - pos.y) * 0.28;
      const el = ref.current;
      if (el) {
        // Near the right or bottom edge, the bubble flips to the other side of
        // the pointer so it never runs off screen.
        const bubble = el.firstElementChild as HTMLElement | null;
        const w = bubble?.offsetWidth ?? 0;
        const h = bubble?.offsetHeight ?? 0;
        const left = pos.x + 14 + w > window.innerWidth - 8;
        const up = pos.y + 16 + h > window.innerHeight - 8;
        const x = left ? pos.x - 14 - w : pos.x + 14;
        const y = up ? pos.y - 16 - h : pos.y + 16;
        el.style.transform = `translate3d(${Math.max(8, x)}px, ${Math.max(8, y)}px, 0)`;
        // the sharp corner always points back at the cursor
        if (bubble) {
          const r = ["24px", "24px", "24px", "24px"];
          r[up ? (left ? 2 : 3) : left ? 1 : 0] = "2px";
          bubble.style.borderRadius = r.join(" ");
          bubble.style.transformOrigin = `${up ? "bottom" : "top"} ${left ? "right" : "left"}`;
        }
      }
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    reposition.current = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const move = (event: PointerEvent) => {
      // The first move puts the bubble right at the pointer, no glide in.
      if (target.x === -200) {
        pos.x = event.clientX;
        pos.y = event.clientY;
      }
      target.x = event.clientX;
      target.y = event.clientY;
      setMoved(true);
      if (!frame) frame = requestAnimationFrame(tick);
    };
    // Hovering something with a comment says it; moving off it goes quiet.
    let hoverText = "";
    const over = (event: PointerEvent) => {
      const el = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-cursor]") : null;
      const text = el?.dataset["cursor"] ?? "";
      if (text === hoverText) return;
      hoverText = text;
      if (text) setComment({ id: "hover", text, fade: false });
      else setComment((c) => (c?.id === "hover" ? null : c));
    };
    const onComment = (event: Event) => setComment((event as CustomEvent<CursorComment>).detail);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    const hush = (e: Event) => {
      if ((e as CustomEvent<number>).detail !== -1) setComment(null);
    };
    window.addEventListener("figure-open", hush);
    window.addEventListener("cursor-comment", onComment);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("figure-open", hush);
      window.removeEventListener("cursor-comment", onComment);
    };
  }, []);

  // Type the comment out, then let story comments fade after a few seconds.
  // The bubble grows as it types, so keep checking it still fits on screen.
  useEffect(() => {
    reposition.current();
  }, [typed]);

  useEffect(() => {
    setTyped("");
    if (!comment) return;
    let index = 0;
    let fade = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(comment.text.slice(0, index));
      if (index >= comment.text.length) {
        window.clearInterval(timer);
        if (comment.fade) fade = window.setTimeout(() => setComment((c) => (c === comment ? null : c)), 4500);
      }
    }, 32);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(fade);
    };
  }, [comment]);

  const showing = visible && moved && comment !== null;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[600] hidden will-change-transform motion-reduce:hidden lg:block"
      style={{ transform: "translate3d(-200px, -200px, 0)" }}
    >
      <div
        className={cn(
          "origin-top-left whitespace-nowrap rounded-[2px_24px_24px_24px] border-2 border-cursor-border bg-cursor px-4 py-2 text-sm font-medium text-cursor-foreground transition-[opacity,scale] duration-300 [filter:drop-shadow(4px_4px_5px_rgb(46_144_250/0.16))]",
          showing ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
        style={{ transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
      >
        {typed || " "}
      </div>
    </div>
  );
}
