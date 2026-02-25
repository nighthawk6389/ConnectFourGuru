Plan: Add "Victor" Difficulty Level
Context
The project's PLAN.md references Victor Allis's 1988 thesis "A Knowledge-Based Approach of Connect-Four," which solved Connect Four using nine strategic rules implemented in a program called VICTOR. The user wants these rules implemented as a new "Victor" difficulty level — the strongest tier, positioned after Guru: Easy / Medium / Hard / Guru / Victor.
Currently the AI uses negamax with alpha-beta pruning at varying depths per difficulty. Victor will augment this with threat-based strategic analysis from Allis's rules, combined with deeper search (depth 16 vs Guru's 14).
Allis's Rules — What We'll Implement
Allis's thesis defines 9 strategic rules for analyzing Connect Four positions based on threats (potential four-in-a-rows called "groups"), odd/even row parity, and Zugzwang control. Key insight: the first player naturally controls odd-row squares; the second player controls even-row squares.
Implement (6 rules — high impact, well-understood):
#
Rule
What It Does
1
Claimeven
Second player guarantees all even-row empty squares by responding on top. Groups with all empty squares on favorable parity are "secured."
2
Baseinverse
Two directly playable squares in different columns — controller gets at least one. Neutralizes groups needing both.
3
Vertical
Two stacked empty squares where upper is odd-row. Solves groups containing both squares.
4
Before
A group completable before the opponent's due to gravity — the lower threat resolves first.
5
Aftereven
Side-effect of Claimeven: if all empty squares in a group are Claimeven-secured, that group will eventually be completed.
6
Lowinverse
Two columns with 2+ empty squares, paired at lowest empties. Controller gets at least one low square.
Omit (3 rules — diminishing returns, high complexity):
Highinverse — Complex variant of Lowinverse
Baseclaim — Combination of Baseinverse + Claimeven, rarely decisive
Specialbefore — Even the Rust reimplementation couldn't get this working
Files to Modify
File
Changes
src/lib/constants.ts
Add "victor" to Difficulty type, add victor: 16 to DEPTH_MAP, add Victor scoring weight constants
src/lib/ai.ts
Add scoreFn parameter to negamax; in getBestMove, construct Victor-enhanced score function and apply victorMoveOrder at root level
src/lib/openingBook.ts
Allow Victor to use the opening book (change guard from !== "guru" to !== "guru" && !== "victor")
src/components/GameControls.tsx
Add { value: "victor", label: "Victor" } to DIFFICULTIES array
New Files
File
Purpose
src/lib/victorRules.ts
Core module: group enumeration, parity helpers, 6 rule scorers, victorEvaluate(), victorMoveOrder()
src/__tests__/lib/victorRules.test.ts
Unit tests for all Victor rule functions
Architecture: src/lib/victorRules.ts
Key Types
interface Square { row: number; col: number; }

interface Group {
  squares: [Square, Square, Square, Square];  // The 4 positions
  owner: Cell;           // PLAYER or AI (who has pieces in it)
  emptySquares: Square[];
  filledCount: number;
}
Parity Helpers
Row parity in our 0-indexed top-down board (board[0]=top, board[5]=bottom):
Allis row = ROWS - boardRow (1-indexed from bottom)
Odd squares: board rows 5, 3, 1 (Allis rows 1, 3, 5) — controlled by first player (PLAYER)
Even squares: board rows 4, 2, 0 (Allis rows 2, 4, 6) — controlled by second player (AI)
function isOddSquare(row: number): boolean { return (ROWS - row) % 2 === 1; }
function isEvenSquare(row: number): boolean { return (ROWS - row) % 2 === 0; }
Group Enumeration
enumerateGroups(board) — Scans all 69 possible four-in-a-row lines (24 horizontal + 21 vertical + 12 diagonal-right + 12 diagonal-left). Filters to "live" groups (pieces from at most one player). Fixed cost: ~69 groups per call.
Rule Scoring Functions
Each rule returns a numeric score contribution:
scoreClaimeven(board, groups, piece) — Bonus for groups with all empty squares on favorable parity
scoreBaseinverse(board, groups, piece) — Bonus for neutralizing opponent groups via playable square pairs
scoreVertical(board, groups, piece) — Bonus for vertical pairs with odd-row upper square
scoreBefore(board, groups, piece) — Bonus when own groups complete before opponent's (gravity)
scoreAftereven(board, groups, piece) — Bonus for groups entirely secured by Claimeven
scoreLowinverse(board, groups, piece) — Bonus for paired column low squares
Public API
export function victorEvaluate(board: Board, piece: Cell): number
// Composes all 6 rules into a single score. Added to scoreBoard, not replacing it.

export function victorMoveOrder(board: Board, piece: Cell, cols: number[]): number[]
// Reorders candidate columns by threat value for better alpha-beta pruning.
Integration into src/lib/ai.ts
1. negamax — Add scoreFn parameter
type ScoreFn = (board: Board, piece: Cell) => number;

function negamax(board, depth, alpha, beta, piece, hash, tt, scoreFn: ScoreFn): number {
  // ... at leaf node evaluation:
  return scoreFn(board, piece);  // Instead of hardcoded scoreBoard(board, piece)
}
All existing difficulties pass scoreBoard directly. Victor passes a combined function:
const scoreFn = difficulty === "victor"
  ? (b: Board, p: Cell) => scoreBoard(b, p) + victorEvaluate(b, p)
  : scoreBoard;
2. getBestMove — Victor-specific enhancements
Root-level move ordering: For Victor, use victorMoveOrder instead of static MOVE_ORDER to pick the best column first
Opening book: Victor uses the same opening book as Guru
Gift avoidance: Victor uses gift avoidance (same as medium+)
No random blunders: Victor never blunders (same as medium+)
3. Why scoreFn approach?
Clean: no boolean threading through negamax
Backward compatible: all other difficulties unchanged (pass scoreBoard)
Extensible: future difficulties could define their own scoring
Type-safe: TypeScript enforces the function signature
UI Changes: src/components/GameControls.tsx
Add Victor to the DIFFICULTIES array:
const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "guru", label: "Guru" },
  { value: "victor", label: "Victor" },
];
No other UI changes needed. The existing button rendering and difficulty state management in useGame.ts and ai.worker.ts handle the new value automatically since they're typed on Difficulty.
Test Strategy
New: src/__tests__/lib/victorRules.test.ts
Using boardFrom() helper (same pattern as ai.test.ts):
Group enumeration: Empty board = 69 groups; board with mixed pieces = dead groups filtered
Parity helpers: Verify isOddSquare/isEvenSquare for all 6 rows
Claimeven: Board with AI group on all-even empty squares scores positive
Baseinverse: Two playable squares neutralize opponent group
Vertical: Stacked empty squares with odd upper square identified
Before: AI group completable before player's group scores positive
victorEvaluate: Integration test — known positions score as expected
victorMoveOrder: Threat-creating columns ordered first; center fallback preserved
Updates to existing tests
ai.test.ts: Add describe("getBestMove — Victor difficulty") — valid column output, win/block detection, determinism (use constrained boards for speed)
openingBook.test.ts: Add tests for getOpeningBookMove(board, "victor") returning center column
GameControls.test.tsx: Update "renders all four difficulty buttons" → five buttons, add Victor assertions
useGame.test.ts: Test setDifficulty("victor") updates state
Implementation Sequence
Constants — Update Difficulty type, DEPTH_MAP, add scoring weight constants in constants.ts
Victor rules module — Create victorRules.ts with types, helpers, group enumeration, 6 rule scorers, victorEvaluate, victorMoveOrder
AI integration — Add scoreFn to negamax, update getBestMove for Victor
Opening book — Update guard in openingBook.ts
UI — Add Victor button in GameControls.tsx
Tests — Create victorRules.test.ts, update ai.test.ts, openingBook.test.ts, GameControls.test.tsx, useGame.test.ts
Verification
npm test            # All tests pass (existing + new Victor tests)
npm run lint        # No ESLint errors
npm run build       # TypeScript strict mode + production build passes
Manual verification: Play against Victor difficulty and confirm:
Moves are computed in < 3 seconds (Web Worker keeps UI responsive)
Victor uses opening book for early moves
Victor plays noticeably stronger than Guru
All 5 difficulty buttons render and switch correctly
Performance Notes
Group enumeration: Fixed 69 groups, ~400-500 ops per victorEvaluate call (comparable to scoreBoard)
victorMoveOrder: Applied at root only (not recursive), costs ~7 * victorEvaluate = ~3500 ops
Depth 16 vs 14: ~2x more nodes, offset by better evaluation producing tighter pruning bounds
Fallback: If depth 16 proves too slow, reduce to 15 (one constant change)
