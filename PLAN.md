# Connect Four Guru — Implementation Plan

## Research Summary

Connect Four is a **fully solved game** (first proven by James D. Allen and independently by Victor Allis, both in October 1988). With perfect play, **the first player always wins** by opening in the center column. Allis's M.Sc. thesis ("A Knowledge-Based Approach of Connect Four") described a program called VICTOR using nine strategic rules. The modern approach to a strong AI uses **negamax with alpha-beta pruning**, move ordering, and a position evaluation function.

Key references:
- Victor Allis, "A Knowledge-Based Approach of Connect Four", Vrije Universiteit, 1988
- Pascal Pons, "Solving Connect Four" — blog.gamesolver.org (brute-force perfect solver)
- 4,531,985,219,092 possible game states; standard real-time AI uses ~10-ply search depth

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | First-class Vercel support, React |
| Language | **TypeScript** | Type safety for game state |
| Styling | **Tailwind CSS** | Utility-first, no extra build steps |
| Animation | **CSS transitions** | Drop animation for pieces |
| State | **React hooks** | No external state library needed |
| Deployment | **Vercel** | Zero-config with Next.js |

---

## Architecture

```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout, metadata
│   │   ├── page.tsx            # Main game page
│   │   └── globals.css         # Tailwind + custom CSS
│   ├── components/
│   │   ├── Board.tsx           # 6×7 grid render
│   │   ├── Cell.tsx            # Individual cell + piece
│   │   ├── ColumnHover.tsx     # Column hover indicator
│   │   ├── GameControls.tsx    # New game, difficulty, color
│   │   ├── ScoreBoard.tsx      # Win/draw/loss tracker
│   │   └── WinnerModal.tsx     # End-of-game overlay
│   ├── lib/
│   │   ├── constants.ts        # ROWS=6, COLS=7, players
│   │   ├── game.ts             # Board logic: drop, win check, draw
│   │   └── ai.ts               # Negamax + alpha-beta + evaluation
│   └── hooks/
│       └── useGame.ts          # All game state in one hook
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## AI Strategy — Negamax with Alpha-Beta Pruning

### Algorithm

The AI uses **negamax** (a simplified variant of minimax for zero-sum games) with **alpha-beta pruning** to search the game tree.

```
negamax(board, depth, alpha, beta, player):
  if terminal or depth == 0:
    return evaluate(board, player)
  for each move in orderedMoves(board):
    score = -negamax(apply(board, move), depth-1, -beta, -alpha, -player)
    alpha = max(alpha, score)
    if alpha >= beta: break  // prune
  return alpha
```

### Move Ordering

Moves are explored center-out: `[3, 2, 4, 1, 5, 0, 6]`. Center columns statistically lead to stronger positions and maximize pruning efficiency.

### Evaluation Function

When depth limit is reached without a terminal state, a heuristic evaluates the board:

- **+100,000** for AI winning 4-in-a-row
- **-100,000** for opponent winning 4-in-a-row
- **Sliding window** across all rows, columns, and diagonals:
  - Count windows of 4 cells
  - Score each window based on piece counts (3-in-a-row, 2-in-a-row with empties)
  - Center column pieces get a bonus weight

### Difficulty Levels

| Level | Search Depth | Character |
|---|---|---|
| Easy | 3 | Makes blunders |
| Medium | 6 | Plays reasonably |
| Hard | 10 | Near-perfect play |
| Guru | 13+ | Essentially solves the game |

### Immediate Win/Block Detection

Before the full search, the AI always:
1. Checks if it can win in one move → plays it
2. Checks if the opponent wins in one move → blocks it

This happens at all difficulty levels as a pre-pass.

---

## Game Features

### Gameplay
- Player vs Computer (one mode, the focus)
- Player always goes first as Red; computer plays Yellow
- Drop animation: pieces fall with CSS transition
- Column hover preview: shows ghost piece in the column
- Win detection highlights the 4 winning cells
- Draw detection when board is full

### UI / UX
- Classic blue board with red and yellow pieces
- Responsive design (mobile + desktop)
- Score tracker (Player wins / Computer wins / Draws)
- New Game button resets board
- Difficulty selector (Easy / Medium / Hard / Guru)
- Smooth end-of-game modal with result and replay option
- "Computer is thinking" visual indicator during AI turn

### Vercel Deployment
- `vercel.json` (if needed) for config
- All computation client-side, no serverless functions required
- Static export compatible

---

## Implementation Steps

1. **Scaffold Next.js project** (`create-next-app` with TypeScript + Tailwind)
2. **Implement `lib/constants.ts`** — board dimensions, player enums, score weights
3. **Implement `lib/game.ts`** — drop piece, check win (horizontal/vertical/diagonal), check draw
4. **Implement `lib/ai.ts`** — negamax + alpha-beta, move ordering, evaluation function
5. **Implement `hooks/useGame.ts`** — board state, turn management, score, AI invocation
6. **Build `components/Cell.tsx`** — renders empty/red/yellow disc, win highlight
7. **Build `components/Board.tsx`** — 6×7 grid, column click handlers, hover state
8. **Build `components/GameControls.tsx`** — difficulty picker, new game button
9. **Build `components/ScoreBoard.tsx`** — running score display
10. **Build `components/WinnerModal.tsx`** — overlay for win/draw/loss
11. **Wire up `app/page.tsx`** — compose all components
12. **Style + animations** — drop transition, board chrome, responsive layout
13. **Test all difficulty levels and edge cases** (draws, diagonal wins, etc.)
14. **Commit and push** to `claude/connect-four-game-wfLVO`
