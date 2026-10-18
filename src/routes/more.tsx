import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ThreadPlaneArrival, slideBack } from "@/components/thread-plane";
import { Spotlight, Thumb } from "@/routes/work";
import { pageMeta } from "@/lib/seo";
import { projects } from "@/lib/work-projects";

export const Route = createFileRoute("/more")({
  head: () =>
    pageMeta({
      title: "More projects — Sahithi Kanjarla",
      description: "The rest of Sahithi Kanjarla's projects.",
      path: "/more",
    }),
  component: MorePage,
});

// The thread slips out from behind the title and runs off the far edge.
const THREAD =
  "M500 80 C600 80 640 20 700 50 C760 80 700 130 750 120 C800 110 790 50 850 60 C910 70 930 100 1020 90";

function MorePage() {
  const navigate = useNavigate();
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    raf.current = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <main className="relative min-h-screen bg-white text-[#0b0b0d]">
      <ThreadPlaneArrival />
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
        <Link to="/" className="font-serif text-3xl font-medium">Sahithi</Link>
        <button onClick={() => slideBack(navigate)} className="text-sm font-medium text-black/60 hover:text-black">← back</button>
      </header>

      <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-24 h-[130px] w-screen sm:top-28" viewBox="0 0 1000 160" preserveAspectRatio="none">
          <path
            d={THREAD}
            pathLength="1"
            fill="none"
            stroke="#0b0b0d"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="1"
            style={{ strokeDashoffset: on ? 0 : 1, transition: "stroke-dashoffset 2200ms ease-in-out 400ms" }}
          />
        </svg>

      <section className="relative mx-auto max-w-[1300px] px-5 pb-10 pt-24 sm:px-8 sm:pt-28">
        <div className="relative text-center">
          <h1 className="inline-block bg-white px-4 font-serif text-[clamp(2.6rem,5vw,4.5rem)] leading-none">here's the rest.</h1>
          <p className="mt-3 font-hand text-xl text-black/60">i ran out of thread before i ran out of ideas.</p>
        </div>
        <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((p, i) => (
            <button
              key={p.title}
              onClick={() => setOpen(i)}
              className="group relative overflow-hidden rounded-2xl border border-black/10 bg-black/[0.03] text-left transition-all duration-300 hover:-translate-y-1 hover:border-black/30 hover:bg-black/[0.05]"
            >
              <Thumb p={p} light />
              <div className="min-w-0 p-4 pr-10 sm:p-5 sm:pr-10">
                <p className="text-lg font-medium">{p.title}</p>
                <p className="mt-1 text-sm leading-snug text-black/60">{p.blurb}</p>
              </div>
              <ArrowUpRight className="absolute bottom-5 right-4 h-4 w-4 text-black/40 transition-colors group-hover:text-black" />
            </button>
          ))}
        </div>
      </section>

      {open !== null && <Spotlight light index={open} onClose={() => setOpen(null)} onMove={(d) => setOpen((open + d + projects.length) % projects.length)} />}
    </main>
  );
}
