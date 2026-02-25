# CLAUDE.md — ConnectFourGuru

Quick reference for working in this codebase with Claude Code.

---

## Project Overview

Browser-based Connect Four game with an AI opponent built on Next.js 15 + React 19 + TypeScript + Tailwind CSS 4.

The AI uses **negamax with alpha-beta pruning**, **iterative deepening**, a **Zobrist-hashed transposition table**, and a **Guru-level opening book**. Heavy computation runs in a **Web Worker** to keep the UI thread responsive.

---

## Essential Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm test             # Run full test suite (Jest)
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
npm run build        # Production build
npm run lint         # ESLint check
```

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx       # Root layout + metadata
│   ├── page.tsx         # Main game page (composes all components)
│   └── globals.css      # Tailwind + CSS animations (pieceDrop, popIn, winPulse)
├── components/
│   ├── Board.tsx        # 6×7 grid with click/hover handlers
│   ├── Cell.tsx         # Individual disc — memoised with React.memo
│   ├── GameControls.tsx # Difficulty buttons + New Game button
│   ├── ScoreBoard.tsx   # Player / Draws / CPU score display
│   └── WinnerModal.tsx  # End-of-game overlay + confetti on player win
├── hooks/
│   └── useGame.ts       # All game state; persists score to localStorage
└── lib/
    ├── constants.ts     # Board dimensions, player IDs, eval weights, depths
    ├── game.ts          # Pure game logic (dropPiece, checkWin, isDraw, …)
    ├── ai.ts            # Negamax + alpha-beta, iterative deepening, opening book
    ├── transpositionTable.ts  # Zobrist hashing + TranspositionTable class
    ├── openingBook.ts   # Pre-computed first moves for Guru difficulty
    └── ai.worker.ts     # Web Worker wrapper — runs getBestMove off the main thread
```

---

## Key Design Decisions

### AI Algorithm
- **Negamax** (symmetric minimax) with **alpha-beta pruning**
- **Iterative deepening**: searches depth 1 → maxDepth; each iteration primes the TT so later iterations prune more aggressively
- **Transposition table**: Zobrist-hashed `Map<hash, TTEntry>` with exact/lower/upper bounds; cleared at the start of each top-level `getBestMove` call
- **Opening book**: Guru-only; for the first few AI moves returns a known-good column instantly without running the search
- **Move ordering**: center-out `[3,2,4,1,5,0,6]` for maximum alpha-beta efficiency
- **Gift-avoidance**: prevents handing the opponent a free win on the very next move (medium+)
- **Depth map**: Easy=3 (+40% random), Medium=6, Hard=10, Guru=14

### Web Worker
`ai.worker.ts` wraps `getBestMove` in a `DedicatedWorkerGlobalScope` so the search never blocks the UI thread. `useGame.ts` falls back to the synchronous `setTimeout` path if `typeof Worker === 'undefined'` (e.g., in Jest/jsdom).

### Persistent Score
`useGame.ts` reads the score from `localStorage` on mount and writes it after every change. Tests clear `localStorage` in `beforeEach` to isolate state.

### Animations
- **`pieceDrop`**: CSS keyframe, ~0.25 s cubic-bezier, controlled by `--drop-rows` CSS variable
- **`winPulse`**: CSS keyframe applied to winning cells — infinite scale + glow pulse
- **`popIn`**: modal entrance animation
- **Confetti**: `canvas-confetti` fires from `WinnerModal` when the human player wins

### Memoisation
`Cell` is wrapped with `React.memo` so only the one cell that changed re-renders each turn.

---

## Test Suite

| Suite | File | Tests |
|-------|------|-------|
| Game logic | `src/__tests__/lib/game.test.ts` | Pure function coverage |
| AI | `src/__tests__/lib/ai.test.ts` | Win/block/determin. + opening book |
| Transposition Table | `src/__tests__/lib/transpositionTable.test.ts` | Hashing + TT CRUD |
| Opening Book | `src/__tests__/lib/openingBook.test.ts` | Early-game move selection |
| useGame hook | `src/__tests__/hooks/useGame.test.ts` | State, turns, localStorage |
| Board | `src/__tests__/components/Board.test.tsx` | Render + interactions |
| Cell | `src/__tests__/components/Cell.test.tsx` | Classes + win-pulse |
| GameControls | `src/__tests__/components/GameControls.test.tsx` | Difficulty + new game |
| ScoreBoard | `src/__tests__/components/ScoreBoard.test.tsx` | Score display |
| WinnerModal | `src/__tests__/components/WinnerModal.test.tsx` | Win/loss/draw + confetti |

All tests run with `npm test`. The AI mock (`jest.mock('@/lib/ai', ...)`) keeps hook and component tests fast. `canvas-confetti` is mocked globally in the winner-modal tests.

---

## Adding New Features

1. **New AI heuristic** → modify `src/lib/ai.ts` (`scoreBoard` or `negamax`)
2. **New difficulty** → add to `DEPTH_MAP` in `src/lib/constants.ts`
3. **New UI state** → extend `GameState` interface in `src/hooks/useGame.ts`
4. **New animation** → add `@keyframes` to `globals.css`, apply the class in the component
5. **Tests** → add files under `src/__tests__/<category>/`

---

## Environment

- Node.js ≥ 18, npm ≥ 9
- TypeScript strict mode — no `any`, no implicit null
- Tailwind CSS 4 (JIT, no config file needed)
- Next.js App Router, all components are `"use client"` (stateful game)
