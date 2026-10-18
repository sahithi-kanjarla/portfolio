import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import folder from "@/assets/more-projects/folder.webp";
import github from "@/assets/more-projects/github.webp";
import laptop from "@/assets/more-projects/laptop.webp";
import robot from "@/assets/more-projects/robot.webp";
import terminal from "@/assets/more-projects/terminal.webp";
// ORIGINAL rabbit-hole imports (to revert, restore these and the old items below):
// astronaut, camera, code, console, folder, headphones, laptop, phone from "@/assets/rabbit-hole/*.webp"
import { cn } from "@/lib/utils";

// A test alternative to the rabbit hole: a white plane slides in from the
// right, a thread draws across it through the same objects, "here's the rest."
// sits in the middle, and we land on /more.

// The thread, in a 1000x1000 box stretched over the plane.
const THREAD =
  "M-20 520 C150 300 250 300 330 450 S480 700 560 520 S760 260 840 420 S960 600 1020 520";

// Objects hang off the thread. x/y are percentages of the plane.
const items = [
  { src: laptop, x: 12, y: 34, size: 160 },
  { src: folder, x: 30, y: 70, size: 150 },
  { src: github, x: 50, y: 28, size: 150 },
  { src: robot, x: 70, y: 68, size: 160 },
  { src: terminal, x: 88, y: 34, size: 160 },
];
// ORIGINAL items:
// phone 10/34/105, astronaut 22/22/150, folder 33/70/130, console 62/28/120,
// camera 66/68/130, headphones 78/34/140, laptop 86/70/160, code 92/46/110

const SLIDE_MS = 700;
const DRAW_START = 500;
const DRAW_MS = 2200;
const TEXT_AT = 1800;
const DONE_MS = 3600;

export const THREAD_PLANE_CURTAIN = "thread-plane-curtain";

export function ThreadPlaneButton() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        data-cursor="here's the rest."
        className={cn(
          "inline-flex min-w-[13.5rem] items-center justify-center gap-3 rounded-full border border-foreground px-6 py-3 text-lg transition-all duration-300",
          open ? "bg-background" : hovered ? "-rotate-2 scale-105 bg-foreground text-background" : "",
        )}
      >
        {open ? "one sec…" : "more projects"}
        <span className={cn("transition-transform duration-300", hovered && !open && "translate-x-1")}>→</span>
      </button>
      {open && (
        <Plane
          onDone={() => {
            const curtain = document.createElement("div");
            curtain.id = THREAD_PLANE_CURTAIN;
            curtain.style.cssText = "position:fixed;inset:0;z-index:300;background:#fff;pointer-events:none;transition:opacity 700ms";
            document.body.appendChild(curtain);
            void navigate({ to: "/more" });
          }}
        />
      )}
    </>
  );
}

function Plane({ onDone }: { onDone: () => void }) {
  const [on, setOn] = useState(false);
  const [small, setSmall] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      done.current();
      return;
    }
    setSmall(window.innerWidth < 768);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    const end = window.setTimeout(() => done.current(), DONE_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(end);
    };
  }, []);

  const k = small ? 0.62 : 1;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[200] overflow-hidden bg-white shadow-[-30px_0_60px_rgba(0,0,0,0.18)]"
      style={{ transform: on ? "none" : "translateX(100%)", transition: `transform ${SLIDE_MS}ms cubic-bezier(.7,0,.2,1)` }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <path
          d={THREAD}
          pathLength="1"
          fill="none"
          stroke="#0b0b0d"
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="1"
          style={{ strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset ${DRAW_MS}ms ease-in-out ${DRAW_START}ms` }}
        />
      </svg>

      {items.map((it, i) => (
        <img
          key={i}
          src={it.src}
          alt=""
          draggable={false}
          className="absolute"
          style={{
            left: `${it.x}%`,
            top: `${it.y}%`,
            width: it.size * k,
            transform: `translate(-50%,-50%) scale(${on ? 1 : 0.3}) rotate(${on ? (i % 2 ? 6 : -6) : 0}deg)`,
            opacity: on ? 1 : 0,
            transition: "transform 600ms cubic-bezier(.3,1.5,.5,1), opacity 400ms",
            // pop in as the thread reaches it
            transitionDelay: `${DRAW_START + (it.x / 100) * DRAW_MS * 0.85}ms`,
          }}
        />
      ))}

      <p
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-white px-5 py-1 font-hand text-[clamp(2rem,4.5vw,4rem)] text-[#0b0b0d]"
        style={{ opacity: on ? 1 : 0, transition: `opacity 600ms ease ${TEXT_AT}ms` }}
      >
        here's the rest.
      </p>
    </div>
  );
}

// Mounted on /more: fades out the white curtain the plane left behind.
export function ThreadPlaneArrival() {
  useEffect(() => {
    const curtain = document.getElementById(THREAD_PLANE_CURTAIN);
    if (!curtain) return;
    const fade = window.setTimeout(() => (curtain.style.opacity = "0"), 150);
    const gone = window.setTimeout(() => curtain.remove(), 1000);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(gone);
    };
  }, []);
  return null;
}

// Going back from /more: land on the home page's work section and slide the
// white plane away to the right, the way it came in.
export function slideBack(navigate: (o: { to: "/"; hash: string }) => unknown) {
  try {
    sessionStorage.setItem("climbed-out-of-the-rabbit-hole", "1");
  } catch {
    // fine, we just land without the shortcut
  }
  const plane = document.createElement("div");
  plane.style.cssText = `position:fixed;inset:0;z-index:300;background:#fff;pointer-events:none;box-shadow:30px 0 60px rgba(0,0,0,.18);transition:transform ${SLIDE_MS}ms cubic-bezier(.7,0,.2,1)`;
  document.body.appendChild(plane);
  void navigate({ to: "/", hash: "work" });
  window.setTimeout(() => {
    plane.style.transform = "translateX(100%)";
    window.setTimeout(() => plane.remove(), SLIDE_MS + 100);
  }, 150);
}
