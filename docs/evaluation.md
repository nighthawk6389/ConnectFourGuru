# Evaluation Functions — Guru vs Victor

This document describes how the AI evaluates Connect Four board positions.
All difficulties share the same negamax search engine; only the **leaf-node
evaluation function** differs between Guru and Victor.

---

## Shared Search Engine

Every difficulty uses the same core algorithm:

1. **Negamax with alpha-beta pruning** — explores the game tree and prunes
   branches that cannot affect the result.
2. **Iterative deepening** — searches depth 1, then 2, … up to `maxDepth`.
   Each completed iteration primes the transposition table so deeper
   iterations prune more aggressively.
3. **Zobrist-hashed transposition table** — caches evaluated positions.
   Persists across moves within a game for cross-move benefit; cleared on
   new game or difficulty change.
4. **Center-out move ordering** — columns are explored in order
   `[3, 2, 4, 1, 5, 0, 6]` to maximise pruning.

Before the search starts, every difficulty also runs:

- **Immediate win check** — if a single move wins, play it.
- **Immediate block check** — if the opponent wins in one, block it.
- **Opening book** (Guru and Victor) — for the first few moves, return a
  pre-computed best column without searching.

After the search, medium+ difficulties apply **gift-avoidance** — if the
chosen move gives the opponent a winning reply on top of it, try a different
column.

---

## The Base Evaluation: `scoreBoard` (all difficulties)

When the search reaches its depth limit without finding a terminal state
(win/loss/draw), it evaluates the board with `scoreBoard(board, piece)`.

This function uses a **sliding-window approach**: it scans every possible
four-cell window (horizontal, vertical, and both diagonals — 69 windows
total on a 6x7 board) and scores each one:

| Pattern | Score |
|---|---|
| 4 of my pieces (win) | +100,000 |
| 3 of mine + 1 empty | +5 |
| 2 of mine + 2 empty | +2 |
| 3 of opponent + 1 empty | -4 |
| Center column piece | +3 per piece |

The total is the sum across all 69 windows plus the center bonus. This
evaluation is fast (O(69) windows) and captures basic tactical patterns
like three-in-a-rows and opponent threats.

**Used by:** Easy, Medium, Hard, Guru

---

## Victor's Evaluation: `scoreBoard + victorEvaluate`

Victor uses the same `scoreBoard` as a baseline, then **adds** a strategic
bonus computed by `victorEvaluate(board, piece)`. This implements six of the
nine rules from Victor Allis's 1988 M.Sc. thesis *"A Knowledge-Based
Approach of Connect-Four"*.

### How It Works

1. **Enumerate groups** — scan all 69 four-cell lines and collect "live"
   groups (lines containing pieces from at most one player).
2. **Determine first player** — count pieces to figure out who moved first
   (handles inverted boards correctly).
3. **Score each rule** — apply the six strategic rules and sum their
   contributions.

### The Six Rules

#### Rule 1: Claimeven (weight: 100 / 25 / 8)

The second player can claim any even-row square by always responding in the
same column. If all empty squares in a group sit on the owner's favorable
parity (even rows for second player, odd rows for first player), that group
is *secured* — it will eventually be completed.

```
         Col 3
Row 0 (even) ·  ← Second player controls this
Row 1 (odd)  ·  ← First player controls this
Row 2 (even) ·  ← Second player controls this
Row 3 (odd)  X  ← First player controls this
Row 4 (even) O
Row 5 (odd)  X
```

**Score:** +100 for a 3-filled secured group, +25 for 2-filled, +8 for 1-filled.
Opponent groups on their favorable parity are penalised symmetrically.

#### Rule 2: Baseinverse (weight: 40)

Two directly playable squares (bottom of their columns) in different columns.
The controller can guarantee claiming at least one. Any opponent group that
needs *both* squares is neutralised.

**Score:** +40 per neutralised opponent group.

#### Rule 3: Vertical (weight: 50 / 20)

Two empty squares stacked vertically where the upper square is on an odd row.
The first player benefits: the opponent must fill the lower square first
(gravity), handing the first player the odd (upper) square.

**Score:** +50 for 3-filled groups containing both squares, +20 for 2-filled.

#### Rule 4: Before (weight: 150 / 50)

A group whose lowest empty square is directly playable *at or below* an
opponent group's lowest empty square. Due to gravity, the owner's group
resolves first, making the opponent's group irrelevant.

**Score:** +150 for a 3-filled group completing before a 2+ filled opponent
group, +50 for 2-filled.

#### Rule 5: Aftereven (weight: 60 / 20)

A group where *all* empty squares can be claimed via Claimeven (all on
favorable parity, each with a square below). Completion is guaranteed — a
stronger signal than plain Claimeven.

**Score:** +60 for 3-filled groups, +20 for 2-filled.

#### Rule 6: Lowinverse (weight: 30)

Two columns each with 2+ empty squares where the lowest empty squares form
a pair. The controller can guarantee at least one of the two low squares.

**Score:** +30 per opponent group requiring both low squares.

### Why These Rules Help

The standard `scoreBoard` evaluation counts immediate threats (3-in-a-rows)
but doesn't understand the *parity structure* of Connect Four. Allis's rules
capture who will *eventually* claim contested squares based on the
alternating-move constraint, without needing to search deeper.

At search depth 8, the standard evaluation has enough look-ahead for basic
tactics but misses mid-game strategic positioning. Victor's rules provide
exactly this missing layer, allowing the search to favor positions that are
strategically winning even if the tactical advantage isn't visible within 8
plies.

### Dynamic Parity Detection

Allis's rules depend on knowing who is the first player (controls odd
squares) and who is the second player (controls even squares). Rather than
hardcoding `PLAYER=first, AI=second`, the evaluation counts pieces on the
board to determine who went first:

```typescript
function getFirstPlayer(board: Board): Cell {
  // First player always has >= pieces than second player
  let playerCount = 0, aiCount = 0;
  for (const row of board)
    for (const cell of row)
      if (cell === PLAYER) playerCount++;
      else if (cell === AI) aiCount++;
  return playerCount >= aiCount ? PLAYER : AI;
}
```

This makes the evaluation work correctly even on inverted boards (used by
the simulation to let either side go first).

---

## Victor's Move Ordering: `victorMoveOrder`

In addition to the evaluation, Victor uses **threat-based root-level move
ordering**. Before the iterative-deepening loop, candidate columns are
sorted by:

1. **Center preference** — same as the base `[3,2,4,1,5,0,6]` bias
2. **Parity preference** — moves landing on favorable parity score higher
3. **Threat analysis** — moves that advance own groups (+50 for near-wins,
   +8 for two-filled) or block opponent groups (+40 for near-wins) rank
   higher

Better root ordering means the first column explored is more likely to be
the best, giving alpha-beta more opportunities to prune in subsequent
columns.

---

## Simulation Results

The Guru-vs-Victor simulation (`npm run test:simulation`) plays 14 full
games at depth 8 — 7 with each side going first — to measure the impact of
Victor's additional evaluation.

```
Victor wins :  2     Victor score: 15 / 28 pts
Guru wins   :  1     Guru score  : 13 / 28 pts
Draws       : 11
```

Victor's strategic analysis provides a consistent edge over the base
evaluation when both sides search to the same depth.

---

## Weight Summary

| Constant | Guru | Victor |
|---|---|---|
| `SCORE_WIN` | 100,000 | 100,000 |
| `SCORE_THREE` | 5 | 5 |
| `SCORE_TWO` | 2 | 2 |
| `SCORE_OPP_THREE` | -4 | -4 |
| `SCORE_CENTER` | 3 | 3 |
| `VICTOR_CLAIMEVEN_3` | — | 100 |
| `VICTOR_CLAIMEVEN_2` | — | 25 |
| `VICTOR_CLAIMEVEN_1` | — | 8 |
| `VICTOR_BEFORE_3` | — | 150 |
| `VICTOR_BEFORE_2` | — | 50 |
| `VICTOR_VERTICAL_3` | — | 50 |
| `VICTOR_VERTICAL_2` | — | 20 |
| `VICTOR_AFTEREVEN_3` | — | 60 |
| `VICTOR_AFTEREVEN_2` | — | 20 |
| `VICTOR_BASEINVERSE` | — | 40 |
| `VICTOR_LOWINVERSE` | — | 30 |

---

## Source Files

| File | Role |
|---|---|
| `src/lib/ai.ts` | Negamax search, `scoreBoard`, `getBestMove` |
| `src/lib/victorRules.ts` | `victorEvaluate`, `victorMoveOrder`, rule scorers |
| `src/lib/constants.ts` | All evaluation weight constants |
| `src/lib/transpositionTable.ts` | Zobrist hashing and TT |
| `src/lib/openingBook.ts` | Pre-computed opening moves |
