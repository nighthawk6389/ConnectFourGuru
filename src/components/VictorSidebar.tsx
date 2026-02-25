"use client";

import { useState } from "react";

export default function VictorSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button — fixed in top-right corner */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Learn about VICTOR"
        className="fixed top-4 right-4 z-40 flex items-center gap-1.5 rounded-lg border border-blue-500/50 bg-slate-800/90 px-3 py-2 text-sm font-semibold text-blue-300 shadow-lg backdrop-blur-sm transition hover:border-blue-400 hover:bg-slate-700 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="text-base leading-none">♟</span>
        VICTOR
      </button>

      {/* Overlay — only mounted when open */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="VICTOR — Connect Four theory"
            className="relative z-10 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-slate-900 shadow-2xl ring-1 ring-white/10"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700 bg-slate-900/95 px-5 py-4 backdrop-blur-sm">
              <h2 className="text-lg font-bold tracking-tight text-white">
                ♟ VICTOR
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close VICTOR panel"
                className="rounded-md p-1 text-slate-400 transition hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col gap-6 px-5 py-6 text-sm text-slate-300">

              {/* What is VICTOR */}
              <section>
                <h3 className="mb-2 text-base font-semibold text-white">What is VICTOR?</h3>
                <p className="leading-relaxed">
                  <strong className="text-blue-300">VICTOR</strong> is the Connect Four
                  AI program developed by <em>Victor Allis</em> in his 1988 master&apos;s
                  thesis at Vrije Universiteit Amsterdam. It was the first program to
                  completely <strong className="text-green-400">solve</strong> Connect
                  Four — proving which player wins with optimal play on the standard
                  6&nbsp;×&nbsp;7 board.
                </p>
              </section>

              {/* Key Result */}
              <section className="rounded-lg border border-green-500/30 bg-green-900/20 px-4 py-3">
                <h3 className="mb-1 text-base font-semibold text-green-300">The Solved Result</h3>
                <p className="leading-relaxed">
                  With optimal play, the <strong className="text-white">first player always wins</strong>.
                  Connect Four is therefore a <em>first-player win</em> — whoever drops the opening
                  piece can force a four-in-a-row if they play perfectly.
                </p>
              </section>

              {/* VICTOR's Rules */}
              <section>
                <h3 className="mb-3 text-base font-semibold text-white">VICTOR&apos;s Strategic Rules</h3>
                <p className="mb-3 leading-relaxed">
                  VICTOR uses a set of combinatorial rules to evaluate who controls a position.
                  Each rule describes a pattern that guarantees one side can prevent the other
                  from winning through that region of the board.
                </p>
                <ol className="flex flex-col gap-3">
                  {RULES.map(({ name, description }) => (
                    <li key={name} className="flex flex-col gap-0.5">
                      <span className="font-semibold text-blue-300">{name}</span>
                      <span className="leading-relaxed text-slate-400">{description}</span>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Odd/Even Threat Parity */}
              <section>
                <h3 className="mb-2 text-base font-semibold text-white">Odd / Even Parity</h3>
                <p className="leading-relaxed">
                  The board has 6 rows (rows 1–6 from the bottom). Threats on{" "}
                  <strong className="text-yellow-300">odd rows</strong> (1, 3, 5) tend to favour
                  the <em>first player</em> because the first player fills odd-row squares first.
                  Threats on <strong className="text-red-300">even rows</strong> (2, 4, 6) tend to
                  favour the <em>second player</em>. Much of VICTOR&apos;s strategy revolves around
                  steering threats onto favourable rows.
                </p>
              </section>

              {/* How it relates to this game */}
              <section className="rounded-lg border border-blue-500/30 bg-blue-900/20 px-4 py-3">
                <h3 className="mb-1 text-base font-semibold text-blue-300">In This Game</h3>
                <p className="leading-relaxed">
                  The <strong className="text-white">Guru</strong> difficulty uses{" "}
                  <strong>negamax with alpha-beta pruning</strong>, iterative deepening, a Zobrist
                  transposition table, and an opening book — all techniques inspired by VICTOR&apos;s
                  approach. At lower depths the AI may miss forced wins, but at Guru level it plays
                  very close to the theoretically optimal line.
                </p>
              </section>

            </div>
          </aside>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// VICTOR rule descriptions
// ---------------------------------------------------------------------------

const RULES: { name: string; description: string }[] = [
  {
    name: "Claimeven",
    description:
      "If every empty square directly above an opponent's threat lies on an even row, " +
      "the second player can always respond to that column and neutralise the threat.",
  },
  {
    name: "Baseinverse",
    description:
      "Two threats that share a common base square cannot both be fulfilled; " +
      "the defender can block one by occupying the base.",
  },
  {
    name: "Vertical",
    description:
      "A vertical group of four squares that spans both odd and even rows gives the " +
      "second player a natural counter whenever the first player tries to fill it.",
  },
  {
    name: "Aftereven",
    description:
      "An extension of Claimeven: after all even squares in a column above a threat " +
      "are filled, the resulting position still leaves the second player in control.",
  },
  {
    name: "Lowinverse",
    description:
      "If two threats share the two lowest squares of an inverse pair (odd over even), " +
      "the second player can mirror the first player's moves to negate both threats.",
  },
  {
    name: "Highinverse",
    description:
      "Like Lowinverse but applied to the upper pair of the inverse group; " +
      "gives the second player control over high-row threats.",
  },
  {
    name: "Baseclaim",
    description:
      "A combination of Claimeven and Baseinverse that lets the second player claim " +
      "multiple columns simultaneously with a single strategic plan.",
  },
  {
    name: "Before",
    description:
      "A zugzwang pattern: the first player can force the opponent to fill a " +
      "preparatory square before a threat becomes live, making the win inevitable.",
  },
  {
    name: "Specialbefore",
    description:
      "A variant of Before in which an additional Claimeven or Vertical rule is " +
      "needed to complete the zugzwang, covering edge-case board positions.",
  },
];
