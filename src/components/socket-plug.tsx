import { cn } from "@/lib/utils";

// Traced from the one-line plug-and-socket reference. Coordinates are the
// drawing's own: the cable arrives at the plug's cord (405, 385) and leaves
// from behind the socket's right edge.
const VIEW = { x: 0, y: 190, w: 1030, h: 430 };
// The drawing is mirrored, so the socket sits next to the words and the cord
// trails off to the right.
export const PLUG_CORD = { x: 1 - (405 - VIEW.x) / VIEW.w, y: (385 - VIEW.y) / VIEW.h };

// The plug: a rounded body entered by the cord, its slanted end plate, and two
// long prongs whose tips just touch the socket's face.
const PLUG =
  "M405 385 C400 394 398 408 401 422 C405 442 424 458 452 466 C466 470 472 478 486 483 C508 489 532 491 553 490 " +
  "C547 482 546 472 549 462 L597 338 C601 331 613 331 620 339 L573 480 C569 488 561 491 553 490 " +
  "M597 338 L596 327 C560 324 500 322 468 326 C443 330 427 345 417 360 C411 369 408 378 405 385 " +
  "M604 345 C592 382 574 430 558 470 " +
  "M614 358 C640 354 668 357 684 362 C693 367 692 378 682 381 C660 383 636 381 616 379 " +
  "M569 447 C594 444 628 446 649 452 C659 457 659 466 649 469 C628 471 598 470 573 468";

// The socket: a box with its thickness showing on top and right, a round
// recess with two pin holes drawn as a crescent, and the notch above it.
const SOCKET =
  "M830 256 C880 258 930 262 962 266 C967 300 968 450 962 584 C900 591 800 575 712 563 C700 557 697 540 697 520 L695 272 C695 260 695 254 698 252 C740 250 800 253 830 256 " +
  "M703 242 C710 224 722 217 742 217 C830 221 930 233 990 241 C1000 244 1005 248 1006 254 C1011 300 1011 480 1001 576 C992 590 974 593 962 590 " +
  "M703 242 C760 244 900 252 968 263 M968 263 C984 259 998 255 1005 252 " +
  "M975 255 C985 250 998 250 1002 254 C998 260 982 260 975 255 " +
  "M830 256 C834 280 833 302 820 323 " +
  "M818 322 C770 324 722 360 722 422 C722 482 768 526 826 524 C876 522 912 496 920 458 " +
  "M818 324 C780 340 764 372 770 410 C776 456 806 494 850 500 C890 504 916 484 922 456 " +
  "M785 395 C785 384 812 382 818 392 C820 402 796 408 788 402 C786 400 785 398 785 395 " +
  "M886 404 C886 394 910 392 913 402 C914 411 892 414 887 408 C886 407 886 405 886 404 " +
  "M920 458 C918 490 928 545 960 588";

const ink = { fill: "none", stroke: "currentColor", strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round", pathLength: 1, strokeDasharray: 1 } as const;

// The thread draws these itself: the page sets each path's stroke-dashoffset
// (data-draw="plug" / "socket") from the same eased progress as the cable.
// Once it has, the plug slides home against the socket and a battery charges.
export function SocketPlug({ plugged, className }: { plugged: boolean; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} className={cn("overflow-visible text-foreground", className)}>
      <g transform={`translate(${VIEW.w} 0) scale(-1 1)`}>
        <path data-draw="socket" d={SOCKET} {...ink} style={{ strokeDashoffset: 1 }} />
        <g style={{ transform: plugged ? "translateX(0)" : "translateX(-50px)", transition: "transform .6s cubic-bezier(.5,0,.2,1)" }}>
          <path data-draw="plug" d={PLUG} {...ink} style={{ strokeDashoffset: 1 }} />
        </g>
      </g>
      {/* charging: a little battery below the socket whose bars fill up once the plug is home */}
      <g transform="translate(170 662) scale(1.4) translate(-170 -662)" style={{ opacity: plugged ? 1 : 0, transition: "opacity .4s .6s" }}>
        <rect x="95" y="626" width="150" height="72" rx="14" fill="none" stroke="currentColor" strokeWidth="6" />
        <rect x="245" y="645" width="14" height="34" rx="5" fill="currentColor" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={110 + i * 44} y="640" width="34" height="44" rx="6" fill="#4caf6a" className={plugged ? "animate-bar-charge" : undefined} style={{ animationDelay: `${1 + i * 0.5}s`, opacity: 0.12 }} />
        ))}
        {/* the thunder, popping in on the battery once it's charging */}
        <g className={plugged ? "animate-bolt-pop" : undefined} style={{ animationDelay: "1s", transformOrigin: "170px 662px", transformBox: "view-box" }}>
          <g className={plugged ? "animate-bolt-glow" : undefined} style={{ animationDelay: "1.6s" }}>
            <path d="M182 630 L146 668 L166 668 L156 696 L196 654 L174 654 Z" fill="#ffc933" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" />
          </g>
        </g>
      </g>
    </svg>
  );
}
