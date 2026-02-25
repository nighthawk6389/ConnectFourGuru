# Connect Four Guru

A browser-based Connect Four game built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4.
Play against an AI opponent powered by **negamax search with alpha-beta pruning**, **iterative deepening**, and a **Zobrist-hashed transposition table**.

---

## Features

- Classic 6x7 Connect Four board
- Five AI difficulty levels: **Easy - Medium - Hard - Guru - Victor**
- Piece drop animation, win-cell pulse highlight, and confetti on player win
- Running score tracker (You / Draws / CPU) persisted to localStorage
- Win/draw modal with Play Again prompt
- AI runs in a **Web Worker** so the UI never freezes

---

## Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later (bundled with Node.js)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js development server with hot reload |
| `npm run build` | Create an optimised production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint across all source files |
| `npm test` | Run the full Jest test suite (180 tests) |
| `npm run test:watch` | Run Jest in interactive watch mode |
| `npm run test:coverage` | Run Jest and generate a coverage report |
| `npm run test:simulation` | Run Guru vs Victor AI simulation (14 games at depth 8) |
| `npm run test:e2e` | Run Playwright end-to-end tests |

---

## Running Tests

```bash
# Unit + component tests (180 tests across 11 suites)
npm test

# Guru vs Victor simulation — 14 full games at depth 8 (~95 s)
npm run test:simulation

# Playwright E2E tests
npm run test:e2e
```

Test files live under `src/__tests__/`:

```
src/__tests__/
├── lib/
│   ├── game.test.ts              # Pure game logic
│   ├── ai.test.ts                # AI win/block/determinism + opening book
│   ├── transpositionTable.test.ts # Zobrist hashing + TT CRUD
│   ├── openingBook.test.ts       # Early-game move selection
│   └── victorRules.test.ts       # Allis's strategic rules
├── hooks/
│   └── useGame.test.ts           # Hook state, turns, localStorage
├── components/
│   ├── Board.test.tsx
│   ├── Cell.test.tsx
│   ├── ScoreBoard.test.tsx
│   ├── GameControls.test.tsx
│   └── WinnerModal.test.tsx
└── simulation/
    └── guru-vs-victor.test.ts    # 14-game AI tournament
```

---

## Building for Production

```bash
npm run build   # outputs to .next/
npm run start   # serves on http://localhost:3000
```

The app is statically pre-rendered (Next.js `○` route) and can be deployed to
any static host or a Node.js server.

---

## Project Structure

```
src/
├── app/
│   ├── globals.css            # Tailwind import, drop/modal/win animations
│   ├── layout.tsx             # Root HTML layout and metadata
│   └── page.tsx               # Main game page (client component)
├── components/
│   ├── Board.tsx              # 6×7 grid with click/hover handling
│   ├── Cell.tsx               # Individual disc with CSS drop animation (React.memo)
│   ├── GameControls.tsx       # Difficulty selector + New Game button
│   ├── ScoreBoard.tsx         # You / Draws / CPU score display
│   └── WinnerModal.tsx        # End-of-game overlay + confetti
├── hooks/
│   └── useGame.ts             # All game state; AI invoked via Web Worker
└── lib/
    ├── constants.ts           # Board dimensions, player IDs, depth map, eval weights
    ├── game.ts                # Board operations and win/draw detection
    ├── ai.ts                  # Negamax + alpha-beta, iterative deepening, gift-avoidance
    ├── transpositionTable.ts  # Zobrist hashing + TranspositionTable class
    ├── openingBook.ts         # Pre-computed first moves for Guru/Victor
    ├── victorRules.ts         # Allis's 6 strategic rules (Victor difficulty)
    └── ai.worker.ts           # Web Worker wrapper for off-thread AI
```

---

## AI Overview

The AI uses **negamax** (a symmetric formulation of minimax) with **alpha-beta pruning** and **iterative deepening**. A **Zobrist-hashed transposition table** caches positions across iterations and across moves for faster search.

### Difficulty Levels

| Difficulty | Search Depth | Evaluation | Extras |
|---|---|---|---|
| Easy | 3 | Window-based | 40% random blunders |
| Medium | 5 | Window-based | 15% random blunders |
| Hard | 10 | Window-based | — |
| Guru | 14 | Window-based | Opening book |
| **Victor** | **14** | **Window + Allis rules** | **Opening book, threat-based move ordering** |

### Common Heuristics (all levels)

- **Center-out move ordering** `[3, 2, 4, 1, 5, 0, 6]` maximises pruning efficiency
- **Immediate win/block** pass runs before the full search
- **Gift-avoidance** (medium+): avoids moves that hand the opponent a free win on the next turn

### Victor's Allis-Rule Evaluation

Victor augments the standard sliding-window evaluation with six strategic rules from Victor Allis's 1988 thesis *"A Knowledge-Based Approach of Connect-Four"*:

1. **Claimeven** — second player secures even-row squares
2. **Baseinverse** — paired playable squares guarantee at least one
3. **Vertical** — stacked empties with odd upper square
4. **Before** — gravity ensures a group completes before the opponent's
5. **Aftereven** — groups fully secured via Claimeven
6. **Lowinverse** — paired column low squares

See [docs/evaluation.md](docs/evaluation.md) for a detailed comparison of the Guru and Victor evaluation functions.

---

## Guru vs Victor Simulation

A 14-game tournament (`npm run test:simulation`) pits Guru against Victor at depth 8, with each side playing 7 games as first player and 7 as second player, across all 7 opening columns.

**Latest results (depth 8):**

```
╔══════════════════════════════════════════════╗
║   Guru vs Victor — Simulation Results        ║
║   (depth 8, 14 games — 7 per role)           ║
╠══════════════════════════════════════════════╣
║  Victor wins :  2                            ║
║  Guru wins   :  1                            ║
║  Draws       : 11                            ║
╠══════════════════════════════════════════════╣
║  Victor score: 15 / 28 pts                   ║
║  Guru score  : 13 / 28 pts                   ║
╚══════════════════════════════════════════════╝
```

Victor's Allis-rule heuristic provides a measurable edge: it wins more games and scores higher overall than Guru at the same search depth.

---

## Documentation

Additional docs live in the [`docs/`](docs/) folder:

| File | Description |
|---|---|
| [docs/evaluation.md](docs/evaluation.md) | How the Guru and Victor evaluation functions work |
| [docs/VICTOR.md](docs/VICTOR.md) | Implementation plan for the Victor difficulty |
| [docs/PLAN.md](docs/PLAN.md) | Original project implementation plan |
| [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) | Ideas for future improvements |
