import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

// Two lines, one at a time, in the rabbit hole's arrival font: "You made it!"
// goes away, then "Welcome to the fun side." comes.
export function Welcome({ reduced, onDone, paper = false }: { reduced: boolean; onDone: () => void; paper?: boolean }) {
  const [stage, setStage] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const first = paper ? 0 : reduced ? 700 : 900;
    const second = reduced ? 900 : 1100;
    const timers = [
      window.setTimeout(() => setStage(paper ? 2 : 1), 80),
      ...(paper ? [] : [window.setTimeout(() => setStage(2), 80 + first)]),
      window.setTimeout(() => done.current(), 80 + first + second),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduced, paper]);

  const show = (n: number) => cn("absolute px-6 transition-opacity duration-300 ease-out", stage === n ? "opacity-100" : "opacity-0");
  return (
    <div className={cn("absolute inset-0 z-10 flex items-center justify-center text-center", paper ? "text-neutral-900" : "text-white")} role="status" aria-live="polite">
      <p className={cn(show(1), "font-serif text-[clamp(2.75rem,8vw,3.75rem)] leading-tight")}>You made it!</p>
      <p className={cn(show(2), "font-serif text-[clamp(2.25rem,6.5vw,3.75rem)] leading-tight")}>Welcome to the fun side.</p>
    </div>
  );
}
