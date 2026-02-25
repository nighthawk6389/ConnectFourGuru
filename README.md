# Connect Four Guru

A browser-based Connect Four game built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4.
Play against an AI opponent powered by **negamax search with alpha-beta pruning**.

---

## Features

- Classic 6×7 Connect Four board
- Four AI difficulty levels: **Easy · Medium · Hard · Guru**
- Piece drop animation and win-cell highlight
- Running score tracker (You / Draws / CPU) across games
- Win/draw modal with Play Again prompt

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
| `npm test` | Run the full Jest test suite once |
| `npm run test:watch` | Run Jest in interactive watch mode |
| `npm run test:coverage` | Run Jest and generate a coverage report |

---

## Running Tests

```bash
# Run all tests (94 tests across 8 suites)
npm test

# Watch mode — re-runs on file changes
npm run test:watch

# Generate an HTML/text coverage report
npm run test:coverage
```

Test files live under `src/__tests__/`:

```
src/__tests__/
├── lib/
│   ├── game.test.ts        # Pure game logic (emptyBoard, dropPiece, checkWin, …)
│   └── ai.test.ts          # AI win/block/column-selection behaviour
├── hooks/
│   └── useGame.test.ts     # Hook integration (state, player/AI turns, scoring)
└── components/
    ├── Cell.test.tsx
    ├── Board.test.tsx
    ├── ScoreBoard.test.tsx
    ├── GameControls.test.tsx
    └── WinnerModal.test.tsx
```

> **Note on hard/guru tests:** `hard` (depth 10) and `guru` (depth 14) are only
> tested on near-terminal board positions to keep the suite fast.

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
│   ├── globals.css        # Tailwind import, drop/modal animations
│   ├── layout.tsx         # Root HTML layout and metadata
│   └── page.tsx           # Main game page (client component)
├── components/
│   ├── Board.tsx          # 6×7 grid with click/hover handling
│   ├── Cell.tsx           # Individual disc with CSS drop animation
│   ├── GameControls.tsx   # Difficulty selector + New Game button
│   ├── ScoreBoard.tsx     # You / Draws / CPU score display
│   └── WinnerModal.tsx    # End-of-game overlay
├── hooks/
│   └── useGame.ts         # All game state; AI invoked via setTimeout
└── lib/
    ├── constants.ts       # Board dimensions, player IDs, depth map
    ├── game.ts            # Board operations and win/draw detection
    └── ai.ts              # Negamax + alpha-beta, evaluation, gift-avoidance
```

---

## AI Overview

The AI uses **negamax** (a symmetric formulation of minimax) with **alpha-beta pruning**.

| Difficulty | Search depth (plies) |
|---|---|
| Easy | 3 (+ 40 % random noise) |
| Medium | 6 |
| Hard | 10 |
| Guru | 14 |

Additional heuristics:
- **Center-out move ordering** `[3, 2, 4, 1, 5, 0, 6]` maximises pruning efficiency.
- **Immediate win/block** pass runs before the full search at all difficulties.
- **Gift-avoidance** (medium+): avoids moves that hand the opponent a free win on the next turn.
- **Sliding-window evaluation** scores all horizontal, vertical, and diagonal windows of 4.
