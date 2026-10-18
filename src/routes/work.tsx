import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import { useEffect, useState } from "react";

import brain from "@/assets/obj3d-brain.webp";
import climber from "@/assets/obj3d-climber.webp";
import earth from "@/assets/rabbit-hole/earth.webp";
import astronautFalling from "@/assets/rabbit-hole/astronaut-falling.webp";
import console_ from "@/assets/rabbit-hole/console.webp";
import headphones from "@/assets/rabbit-hole/headphones.webp";
import { ArrivalFade, ClimbBackButton } from "@/components/rabbit-hole";
import { jsonLd, pageMeta, SITE_URL } from "@/lib/seo";
import { projects, type Project } from "@/lib/work-projects";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/work")({
  head: () => ({
    ...pageMeta({
      title: "Projects — Sahithi Kanjarla",
      description:
        "All of Sahithi Kanjarla's projects: agentic AI (GreenSwap), real-time and full-stack apps (Doodle Dance, Together Flow), computer vision (VisionVoice AI) and data analytics dashboards.",
      path: "/work",
    }),
    scripts: [
      jsonLd({
        "@type": "CollectionPage",
        url: `${SITE_URL}/work`,
        name: "Projects by Sahithi Kanjarla",
        author: { "@id": `${SITE_URL}/#person` },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: projects.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "SoftwareApplication",
              name: p.title,
              description: p.long,
              applicationCategory: "DeveloperApplication",
              ...(p.live ? { url: p.live } : {}),
              ...(p.code ? { codeRepository: p.code } : {}),
              author: { "@type": "Person", name: "Sahithi Kanjarla", url: SITE_URL },
            },
          })),
        },
      }),
    ],
  }),
  component: WorkPage,
});

const filters = ["All", "AI agents", "Web3", "Open source", "Experiments"];

// A fixed scatter of stars, so the sky looks the same on server and client.
// (A proper hash, so the stars scatter instead of lining up in little rows.)
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const stars = Array.from({ length: 32 }, (_, i) => ({
  x: hash(i * 4 + 1) * 100,
  y: hash(i * 4 + 2) * 100,
  s: 1 + hash(i * 4 + 3) * 2,
  d: hash(i * 4 + 4) * 4,
}));

function Sky({ count = stars.length }: { count?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.slice(0, count).map((st, i) => (
        <span key={i} className="animate-twinkle-rare absolute rounded-full bg-white" style={{ left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, animationDelay: `${st.d * 2}s`, animationDuration: `${6 + st.d * 1.5}s` }} />
      ))}
    </div>
  );
}

// A little four-point sparkle, drawn like the doodles on the rest of the site.
function Spark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("absolute h-5 w-5 text-white/80", className)}>
      <path d="M12 1 C13 9 15 11 23 12 C15 13 13 15 12 23 C11 15 9 13 1 12 C9 11 11 9 12 1Z" fill="currentColor" />
    </svg>
  );
}

function WorkPage() {
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const shown = projects.map((p, i) => ({ p, i })).filter(({ p }) => filter === "All" || p.tags.includes(filter));

  useEffect(() => {
    window.scrollTo(0, 0);
    // the page around the work is space too, not paper
    const body = document.body.style.background;
    document.body.style.background = "#0b0b0d";
    return () => {
      document.body.style.background = body;
    };
  }, []);

  return (
    <main className="dark-page relative min-h-screen select-none overflow-hidden bg-[#0b0b0d] text-white">
      <ArrivalFade />
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <Link to="/" className="font-serif text-3xl font-medium">Sahithi</Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 md:flex">
          <Link to="/" className="hover:text-white">home</Link>
          <span className="text-white underline underline-offset-8">work</span>
          <a href="https://www.linkedin.com/in/sahithi-kanjarla-569025289/" target="_blank" rel="noreferrer" className="hover:text-white">linkedin</a>
          <a href="mailto:sahithikanjarla4082@gmail.com" className="hover:text-white">let's talk</a>
        </nav>
        <ClimbBackButton className="text-sm font-medium text-white/80 hover:text-white md:hidden">climb out ↑</ClimbBackButton>
      </header>

      {/* 8. arrival — you fell in. */}
      <section className="relative grid min-h-[100svh] place-items-center px-5">
        <Sky />
        <img src={earth} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute bottom-0 right-0 w-[110vw] max-w-none translate-x-[8%] translate-y-[38%] md:w-[52vw] md:translate-x-[6%] md:translate-y-[30%] [mask-image:linear-gradient(to_top,black_60%,transparent)]" />
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M-20 300 C120 200 180 420 260 470 C340 520 300 640 420 680 C560 730 700 620 780 700 C860 780 900 860 1020 820" fill="none" stroke="white" strokeOpacity=".55" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        </svg>
        <img src={astronautFalling} alt="an astronaut drifting through space" draggable={false} className="animate-float-object absolute left-[6%] top-[14%] w-[38vw] max-w-[360px] md:left-[8%] md:top-[30%] md:w-[24vw]" />
        {/* the words sit up in the dark sky, clear of the earth */}
        <div className="absolute left-6 top-[44%] md:left-[36vw] md:top-[20vh]">
          <h1 className="font-serif text-[clamp(3.2rem,6.5vw,6.5rem)] leading-none">you fell in.</h1>
          <p className="mt-4 font-hand text-[clamp(1.3rem,1.9vw,1.8rem)] tracking-wide text-white/80">don't worry, it's nice down here.</p>
        </div>
        <p className="absolute bottom-[12%] left-[30%] hidden -rotate-6 font-hand text-xl leading-snug tracking-wide text-white/80 md:block">
          the projects<br />that happened when<br />"i wonder if…" turned<br />into "okay, let's build it."
        </p>
        <Spark className="left-[12%] top-[18%]" />
        <Spark className="right-[30%] top-[24%] h-4 w-4" />
        <Spark className="bottom-[26%] right-[44%] h-3 w-3" />
        <Spark className="left-[46%] top-[70%] h-4 w-4" />
      </section>

      {/* 9. all work. */}
      <section className="relative mx-auto max-w-[1300px] px-5 pb-28 pt-24 sm:px-8">
        <Sky />
        <div className="relative flex items-end gap-4">
          <h2 className="font-serif text-[clamp(3rem,6vw,5.5rem)] leading-none">all work.</h2>
          <svg aria-hidden="true" viewBox="0 0 60 60" className="animate-spin-slow mb-3 h-14 w-14 text-white/70">
            <path d="M30 30 m0 -2 a2 2 0 1 1 -2 3 a6 6 0 1 1 9 -6 a11 11 0 1 1 -18 6 a17 17 0 1 1 28 -12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <div className="relative mt-8 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("rounded-full border px-4 py-2 text-sm transition-colors", filter === f ? "border-white bg-white text-[#0b0b0d]" : "border-white/20 text-white/80 hover:border-white/60")}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map(({ p, i }) => (
            <button
              key={p.title}
              onClick={() => setOpen(i)}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.07]"
            >
              <Thumb p={p} />
              <div className="min-w-0 p-4 pr-10 sm:p-5 sm:pr-10">
                <p className="text-lg font-medium">{p.title}</p>
                <p className="mt-1 text-sm leading-snug text-white/60">{p.blurb}</p>
              </div>
              <ArrowUpRight className="absolute bottom-5 right-4 h-4 w-4 text-white/50 transition-colors group-hover:text-white" />
            </button>
          ))}
        </div>
      </section>

      <footer className="relative mx-auto flex max-w-[1300px] flex-wrap items-center justify-between gap-6 border-t border-white/10 px-5 py-10 sm:px-8">
        <p className="font-serif text-3xl">
          still more on <a href="https://github.com/SomehowLiving" target="_blank" rel="noreferrer" className="italic underline-offset-8 hover:underline">github ↗</a>
        </p>
        <ClimbBackButton className="rounded-full border border-white/60 px-6 py-3 text-white transition-colors hover:bg-white hover:text-[#0b0b0d]">climb back out ↑</ClimbBackButton>
      </footer>

      {open !== null && <Spotlight index={open} onClose={() => setOpen(null)} onMove={(d) => setOpen((open + d + projects.length) % projects.length)} />}
    </main>
  );
}

// A project's picture: its site screenshot, or — if it has no page to show —
// its name over a loose hand-drawn thread.
export function Thumb({ p, big = false, light = false }: { p: Project; big?: boolean; light?: boolean }) {
  if (p.shot) {
    return <img src={p.shot} alt={`${p.title} website`} draggable={false} className="aspect-[16/10] w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]" />;
  }
  return (
    <div className={cn("relative grid aspect-[16/10] w-full place-items-center overflow-hidden", light ? "bg-black/[0.03]" : "bg-white/[0.03]")}>
      <svg aria-hidden="true" viewBox="0 0 200 125" className={cn("absolute inset-0 h-full w-full transition-colors duration-500", light ? "text-black/20 group-hover:text-black/40" : "text-white/15 group-hover:text-white/30")}>
        <path d="M-10 95 C40 15 70 120 100 60 C120 20 160 35 130 78 C110 105 70 70 110 52 C150 35 170 105 215 50" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className={cn("relative font-serif", big ? "text-6xl" : "text-3xl")}>{p.title}</span>
    </div>
  );
}

// 11. a project, up close.
export function Spotlight({ index, onClose, onMove, light = false }: { index: number; onClose: () => void; onMove: (d: number) => void; light?: boolean }) {
  const p = projects[index]!;
  // light: the same page on white paper, for /more
  const L = (dark: string, lite: string) => (light ? lite : dark);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onMove(1);
      if (e.key === "ArrowLeft") onMove(-1);
    };
    window.addEventListener("keydown", key);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.documentElement.style.overflow = "";
    };
  }, [onClose, onMove]);

  return (
    <div className={cn("fixed inset-0 z-[150] overflow-y-auto backdrop-blur-sm", L("bg-[#0b0b0d]/95 text-white", "bg-white/95 text-[#0b0b0d]"))} onClick={onClose}>
      {!light && <Sky count={0} />}
      <div key={index} className="animate-reveal relative mx-auto grid min-h-full max-w-[1300px] items-center gap-10 px-5 py-24 sm:px-8 md:grid-cols-[1fr_1.1fr]" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className={cn("text-xs tracking-wide", L("text-white/50", "text-black/50"))}>{String(index + 1).padStart(2, "0")} / {p.tags.join(" · ")}</p>
          <h3 className="mt-2 font-serif text-[clamp(3rem,6vw,5.5rem)] leading-none">{p.title}</h3>
          <p className={cn("mt-5 max-w-md text-lg leading-relaxed", L("text-white/75", "text-black/75"))}>{p.long}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {p.live && (
              <a href={p.live} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-2 rounded-full px-5 py-2.5 transition-opacity hover:opacity-85", L("bg-white text-[#0b0b0d]", "bg-[#0b0b0d] text-white"))}>
                view project <ArrowRight className="h-4 w-4" />
              </a>
            )}
            {p.code && (
              <a href={p.code} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-2 rounded-full border px-5 py-2.5 transition-colors", L("border-white/40 hover:bg-white/10", "border-black/40 hover:bg-black/5"))}>
                code <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
            {p.npm && (
              <a href={p.npm} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-2 rounded-full border px-5 py-2.5 transition-colors", L("border-white/40 hover:bg-white/10", "border-black/40 hover:bg-black/5"))}>
                npm <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <span key={t} className={cn("rounded-full border px-3 py-1 text-xs", L("border-white/15 text-white/60", "border-black/15 text-black/60"))}>{t}</span>
            ))}
          </div>
        </div>
        <div className="relative">
          <div className={cn("overflow-hidden rounded-xl border shadow-2xl", L("border-white/10", "border-black/10"))}>
            <Thumb p={p} big light={light} />
          </div>
          <Spark className={cn("-right-2 -top-6", light && "text-black/70")} />
        </div>
      </div>
      <button onClick={onClose} aria-label="Close" className={cn("fixed right-5 top-5 grid h-11 w-11 place-items-center rounded-full border sm:right-8 sm:top-7", L("border-white/20 text-white hover:bg-white/10", "border-black/20 text-black hover:bg-black/5"))}>
        <X className="h-5 w-5" />
      </button>
      <div className="fixed inset-x-0 bottom-6 flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onMove(-1)} className={cn("rounded-full border px-4 py-2 text-sm", L("border-white/20 text-white/80 hover:bg-white/10", "border-black/20 text-black/70 hover:bg-black/5"))}>← prev</button>
        <button onClick={() => onMove(1)} className={cn("rounded-full border px-4 py-2 text-sm", L("border-white/20 text-white/80 hover:bg-white/10", "border-black/20 text-black/70 hover:bg-black/5"))}>next →</button>
      </div>
    </div>
  );
}
