"use client";

import { useMemo } from "react";

const W = 1600;
const CENTER_Y = 190;
const AMPLITUDE = 52;
const PERIOD = 260;
const STEP = 16;
/** Rungs are skipped near a crossing, where the two strands nearly touch. */
const MIN_RUNG = 8;

const strandY = (x: number, phase: number) =>
  CENTER_Y + AMPLITUDE * Math.sin((2 * Math.PI * x) / PERIOD + phase);

const strandPath = (phase: number) => {
  let d = `M0 ${strandY(0, phase).toFixed(1)}`;
  for (let x = STEP; x <= W; x += STEP) {
    d += ` L${x} ${strandY(x, phase).toFixed(1)}`;
  }
  return d;
};

/**
 * The faint line-art wash behind the homepage hero — a DNA double helix with a
 * couple of ring structures. Purely decorative: no text, no interaction, and
 * hidden from assistive tech.
 */
export function BioBackdrop() {
  const { strandA, strandB, rungs } = useMemo(() => {
    const out: { x: number; y1: number; y2: number }[] = [];
    for (let x = 26; x <= W - 26; x += 26) {
      const y1 = strandY(x, 0);
      const y2 = strandY(x, Math.PI);
      if (Math.abs(y1 - y2) < MIN_RUNG) continue;
      out.push({ x, y1, y2 });
    }
    return {
      strandA: strandPath(0),
      strandB: strandPath(Math.PI),
      rungs: out,
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 select-none overflow-hidden"
    >
      <svg
        viewBox={`0 0 ${W} 300`}
        className="h-[260px] w-full text-gray-900 opacity-[0.035] dark:text-gray-100 dark:opacity-[0.06]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        preserveAspectRatio="xMidYMax slice"
      >
        <path d={strandA} />
        <path d={strandB} />
        {rungs.map((r) => (
          <line key={r.x} x1={r.x} y1={r.y1} x2={r.x} y2={r.y2} strokeWidth={1} />
        ))}

        {/* Benzene-ish rings + a cell, scattered above the helix */}
        <g strokeWidth={1.25}>
          <polygon points="210,74 234,60 258,74 258,102 234,116 210,102" />
          <polygon points="258,74 282,60 306,74 306,102 282,116 258,102" />
          <line x1="306" y1="88" x2="342" y2="88" />
          <circle cx="352" cy="88" r="9" />

          <circle cx="1180" cy="86" r="34" />
          <circle cx="1180" cy="86" r="13" />
          <circle cx="1268" cy="70" r="7" />
          <circle cx="1300" cy="96" r="11" />
          <line x1="1214" y1="82" x2="1261" y2="72" />
          <line x1="1214" y1="92" x2="1290" y2="95" />

          <polygon points="700,66 724,52 748,66 748,94 724,108 700,94" />
          <line x1="748" y1="80" x2="784" y2="66" />
          <circle cx="794" cy="62" r="8" />
          <line x1="700" y1="80" x2="664" y2="94" />
          <circle cx="654" cy="98" r="8" />
        </g>
      </svg>
    </div>
  );
}
