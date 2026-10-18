import { useEffect, useRef } from "react";

import ballUrl from "@/assets/fun-mode/basketball.webp";

const SIZE_PX = 150;
const GRAVITY = 2400; // px/s²
const BOUNCE = 0.62;
const AIR = 0.9995;
const FLOOR_INSET = 6; // sits just above the bottom edge

// A draggable basketball: pick it up, let go, it bounces and settles. Isolated
// from the page: it only captures pointers that start on the ball itself.
export function Ball() {
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = window.innerWidth;
    let h = window.innerHeight;
    const r = SIZE_PX / 2;
    // start resting on the floor, a little in from the right
    let x = w - r - 28;
    let y = h - r - FLOOR_INSET;
    let vx = 0;
    let vy = 0;
    let rot = 0;
    let squash = 0; // 0..1, along the impact axis
    let squashAxis: "x" | "y" = "y";
    let dragging = false;
    let pid = -1;
    let ox = 0;
    let oy = 0;
    const trail: { x: number; y: number; t: number }[] = [];
    let last = performance.now();
    let frame = 0;
    let asleep = false;

    const place = () => {
      const sx = squashAxis === "y" ? 1 + squash * 0.25 : 1 - squash * 0.3;
      const sy = squashAxis === "y" ? 1 - squash * 0.3 : 1 + squash * 0.25;
      el.style.transform = `translate3d(${x - r}px, ${y - r}px, 0) rotate(${rot}rad) scale(${sx}, ${sy})`;
    };
    const wake = () => {
      if (asleep) {
        asleep = false;
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      if (!dragging) {
        vy += GRAVITY * dt;
        vx *= AIR;
        x += vx * dt;
        y += vy * dt;
        rot += (vx / r) * dt;
        const floor = h - r - FLOOR_INSET;
        if (y > floor) {
          y = floor;
          if (Math.abs(vy) > 90) {
            squash = Math.min(1, Math.abs(vy) / 1400);
            squashAxis = "y";
          }
          vy = Math.abs(vy) > 90 ? -vy * BOUNCE : 0;
          vx *= 0.96; // rolling friction on the ground
        }
        if (x < r) {
          x = r;
          if (Math.abs(vx) > 90) {
            squash = Math.min(1, Math.abs(vx) / 1400);
            squashAxis = "x";
          }
          vx = -vx * BOUNCE;
        } else if (x > w - r) {
          x = w - r;
          if (Math.abs(vx) > 90) {
            squash = Math.min(1, Math.abs(vx) / 1400);
            squashAxis = "x";
          }
          vx = -vx * BOUNCE;
        }
        if (y < r) {
          y = r;
          vy = Math.abs(vy) * BOUNCE;
        }
      }
      squash *= Math.pow(0.0008, dt); // springs back quickly
      if (squash < 0.01) squash = 0;
      place();
      const atRest = !dragging && y >= h - r - FLOOR_INSET - 0.5 && Math.abs(vx) < 4 && Math.abs(vy) < 4 && squash === 0;
      if (atRest) {
        vx = 0;
        vy = 0;
        asleep = true;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      if (dragging) return;
      dragging = true;
      pid = e.pointerId;
      el.setPointerCapture(pid);
      ox = e.clientX - x;
      oy = e.clientY - y;
      vx = 0;
      vy = 0;
      trail.length = 0;
      el.style.cursor = "grabbing";
      wake();
      e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pid) return;
      x = Math.min(w - r, Math.max(r, e.clientX - ox));
      y = Math.min(h - r - FLOOR_INSET, Math.max(r, e.clientY - oy));
      trail.push({ x, y, t: performance.now() });
      while (trail.length > 2 && trail[0]!.t < performance.now() - 90) trail.shift();
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false;
      el.style.cursor = "grab";
      const a = trail[0];
      const b = trail[trail.length - 1];
      if (a && b && b.t > a.t) {
        vx = Math.max(-3000, Math.min(3000, ((b.x - a.x) / (b.t - a.t)) * 1000));
        vy = Math.max(-3000, Math.min(3000, ((b.y - a.y) / (b.t - a.t)) * 1000));
      }
      wake();
    };
    const onResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      x = Math.min(w - r, x);
      y = Math.min(h - r - FLOOR_INSET, y);
      wake();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", onResize);
    place();
    // a small drop-in when motion is welcome
    if (!reduced) {
      y = -r;
      vy = 200;
      frame = requestAnimationFrame(tick);
    } else {
      asleep = true;
    }

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <img
      ref={ref}
      src={ballUrl}
      alt="A basketball you can drag and toss"
      draggable={false}
      width={SIZE_PX}
      height={SIZE_PX}
      className="fixed left-0 top-0 z-30 cursor-grab select-none"
      style={{ width: SIZE_PX, height: SIZE_PX, touchAction: "none", willChange: "transform" }}
    />
  );
}
