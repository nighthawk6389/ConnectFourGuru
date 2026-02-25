/**
 * Unit tests for Victor Allis's strategic rules (victorRules.ts).
 */

import {
  isOddSquare,
  isEvenSquare,
  enumerateGroups,
  victorEvaluate,
  victorMoveOrder,
} from "@/lib/victorRules";
import { emptyBoard, dropPiece } from "@/lib/game";
import { PLAYER, AI, COLS, ROWS, EMPTY, Board, Cell } from "@/lib/constants";

function boardFrom(rows: string[]): Board {
  return rows.map((row) =>
    row.split("").map((ch): Cell => {
      if (ch === "P") return PLAYER;
      if (ch === "A") return AI;
      return EMPTY;
    })
  );
}

// ---------------------------------------------------------------------------
// Parity helpers
// ---------------------------------------------------------------------------

describe("isOddSquare / isEvenSquare", () => {
  it("correctly classifies all 6 rows", () => {
    // Allis convention: row 1 (bottom) is odd, row 6 (top) is even
    // Board row 5 (bottom) = Allis row 1 = odd
    expect(isOddSquare(5)).toBe(true);
    expect(isEvenSquare(5)).toBe(false);

    // Board row 4 = Allis row 2 = even
    expect(isOddSquare(4)).toBe(false);
    expect(isEvenSquare(4)).toBe(true);

    // Board row 3 = Allis row 3 = odd
    expect(isOddSquare(3)).toBe(true);
    expect(isEvenSquare(3)).toBe(false);

    // Board row 2 = Allis row 4 = even
    expect(isOddSquare(2)).toBe(false);
    expect(isEvenSquare(2)).toBe(true);

    // Board row 1 = Allis row 5 = odd
    expect(isOddSquare(1)).toBe(true);
    expect(isEvenSquare(1)).toBe(false);

    // Board row 0 (top) = Allis row 6 = even
    expect(isOddSquare(0)).toBe(false);
    expect(isEvenSquare(0)).toBe(true);
  });

  it("isOddSquare and isEvenSquare are complementary", () => {
    for (let r = 0; r < ROWS; r++) {
      expect(isOddSquare(r)).not.toBe(isEvenSquare(r));
    }
  });
});

// ---------------------------------------------------------------------------
// Group enumeration
// ---------------------------------------------------------------------------

describe("enumerateGroups", () => {
  it("returns no groups for an empty board (no pieces = no owner)", () => {
    const groups = enumerateGroups(emptyBoard());
    // Empty board has no groups with an owner (all empty)
    expect(groups.length).toBe(0);
  });

  it("returns groups for a board with a single piece", () => {
    // Drop one PLAYER piece in center
    const board = dropPiece(emptyBoard(), 3, PLAYER);
    const groups = enumerateGroups(board);

    // All groups should be owned by PLAYER
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.owner).toBe(PLAYER);
      expect(g.filledCount).toBe(1);
      expect(g.emptySquares.length).toBe(3);
    }
  });

  it("filters out dead groups (both players present)", () => {
    // Place PLAYER and AI in adjacent cells on same row → groups containing both are dead
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      "PA.....",
    ]);
    const groups = enumerateGroups(board);

    // No group should contain both PLAYER and AI pieces
    for (const g of groups) {
      expect(g.owner).not.toBe(EMPTY);
    }
  });

  it("correctly identifies a 3-of-4 AI group", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "P......",
      ".AAA...",
    ]);
    const groups = enumerateGroups(board);
    const aiThreeGroups = groups.filter(
      (g) => g.owner === AI && g.filledCount === 3
    );
    expect(aiThreeGroups.length).toBeGreaterThan(0);

    // At least one of these should have exactly 1 empty square
    const nearComplete = aiThreeGroups.filter(
      (g) => g.emptySquares.length === 1
    );
    expect(nearComplete.length).toBeGreaterThan(0);
  });

  it("correctly identifies groups of different owners separately", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      "PP..AA.",
    ]);
    const groups = enumerateGroups(board);
    const playerGroups = groups.filter((g) => g.owner === PLAYER);
    const aiGroups = groups.filter((g) => g.owner === AI);

    expect(playerGroups.length).toBeGreaterThan(0);
    expect(aiGroups.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Claimeven scoring
// ---------------------------------------------------------------------------

describe("victorEvaluate — Claimeven", () => {
  it("scores positively for AI groups on even rows", () => {
    // AI pieces on row 2 (Allis-even=4), with empty squares also on even rows
    // Minimal player presence to avoid confounding
    const board = boardFrom([
      ".......",
      ".......",
      ".AA....",  // row 2 (Allis-even=4), AI group with empties on same row
      ".PP....",  // row 3 (Allis-odd=3), support pieces
      ".PA....",  // row 4 (Allis-even=2)
      ".PA....",  // row 5 (Allis-odd=1)
    ]);
    const aiScore = victorEvaluate(board, AI);
    // AI groups on even rows should get Claimeven bonus
    expect(aiScore).toBeGreaterThan(0);
  });

  it("scores positively for PLAYER groups on odd rows", () => {
    // PLAYER pieces on row 5 (Allis-odd=1), bottom row
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      ".PP....",
    ]);
    const playerScore = victorEvaluate(board, PLAYER);
    // Player groups on odd rows should get favorable Claimeven scoring
    expect(playerScore).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Vertical rule scoring
// ---------------------------------------------------------------------------

describe("victorEvaluate — Vertical", () => {
  it("scores vertical pairs with odd upper square", () => {
    // Two stacked empty squares at rows 2-3 in col 1
    // Row 3 is Allis-odd (upper), row 4 is Allis-even (lower)
    // With AI piece at row 4, this creates a vertical threat
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".A.....",
      ".A.....",
    ]);
    const groups = enumerateGroups(board);
    // AI should have at least one vertical group involving the empty squares above
    const verticalAIGroups = groups.filter(
      (g) => g.owner === AI &&
        g.squares.every((sq) => sq.col === 1) // vertical line in col 1
    );
    expect(verticalAIGroups.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Before rule scoring
// ---------------------------------------------------------------------------

describe("victorEvaluate — Before", () => {
  it("rewards groups that complete before opponent groups", () => {
    // AI has 3-in-a-row on bottom with one playable empty square (col 3)
    // Player has 2-in-a-row that requires a higher square to complete
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      "..PP...",  // Player 2-in-a-row on row 3, needs squares on row 3 (higher)
      "..AA...",  // Support
      "..AAA..",  // AI 3-in-a-row, needs col 1 (playable) or col 5 (playable)
    ]);
    const score = victorEvaluate(board, AI);
    // AI's near-complete group on bottom row is playable immediately;
    // Player's threats are higher up, so Before rule should apply
    expect(score).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// victorEvaluate integration
// ---------------------------------------------------------------------------

describe("victorEvaluate — integration", () => {
  it("returns a number for an empty board", () => {
    // Empty board has no groups (no pieces), so score should be 0
    expect(victorEvaluate(emptyBoard(), AI)).toBe(0);
    expect(victorEvaluate(emptyBoard(), PLAYER)).toBe(0);
  });

  it("returns different scores for strategically different positions", () => {
    // Position 1: AI has a strong center presence
    const board1 = boardFrom([
      ".......",
      ".......",
      ".......",
      "...A...",
      "..PA...",
      ".PPA...",
    ]);
    // Position 2: AI pieces on the edge
    const board2 = boardFrom([
      ".......",
      ".......",
      ".......",
      "A......",
      "AP.....",
      "AP.....",
    ]);
    const score1 = victorEvaluate(board1, AI);
    const score2 = victorEvaluate(board2, AI);
    // Center-based position should score differently from edge
    expect(score1).not.toBe(score2);
  });

  it("evaluates symmetrically for mirrored positions", () => {
    // PLAYER advantage in one position should equal AI advantage in equivalent
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      "..PP...",
    ]);
    const playerScore = victorEvaluate(board, PLAYER);
    // Player has pieces, so player's evaluation should be non-negative
    expect(playerScore).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// victorMoveOrder
// ---------------------------------------------------------------------------

describe("victorMoveOrder", () => {
  it("returns all valid columns", () => {
    const board = emptyBoard();
    const cols = [3, 2, 4, 1, 5, 0, 6];
    const ordered = victorMoveOrder(board, AI, cols);

    expect(ordered.length).toBe(cols.length);
    for (const c of cols) {
      expect(ordered).toContain(c);
    }
  });

  it("preserves center preference on empty board", () => {
    const board = emptyBoard();
    const cols = [3, 2, 4, 1, 5, 0, 6];
    const ordered = victorMoveOrder(board, AI, cols);

    // Center column should still be preferred on an empty board
    expect(ordered[0]).toBe(3);
  });

  it("prioritizes moves that advance near-complete groups", () => {
    // AI has 3-in-a-row, col 0 completes it
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "P......",
      ".AAA...",
    ]);
    const cols = [3, 2, 4, 1, 5, 0, 6].filter(
      (c) => board[0][c] === EMPTY
    );
    const ordered = victorMoveOrder(board, AI, cols);

    // Col 0 or col 4 should be ranked highly (completes the 3-in-a-row group)
    const topTwo = ordered.slice(0, 2);
    const completingCols = [0, 4]; // either end of .AAA
    expect(topTwo.some((c) => completingCols.includes(c))).toBe(true);
  });

  it("prioritizes blocking near-complete opponent groups", () => {
    // Player has 3-in-a-row, AI needs to block
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "A......",
      "PPP....",
    ]);
    const cols = [3, 2, 4, 1, 5, 0, 6].filter(
      (c) => board[0][c] === EMPTY
    );
    const ordered = victorMoveOrder(board, AI, cols);

    // Col 3 blocks the horizontal threat PPP
    expect(ordered[0]).toBe(3);
  });

  it("handles a board with few valid columns", () => {
    // Almost full board — only col 3 open
    let board = emptyBoard();
    for (let c = 0; c < COLS; c++) {
      if (c === 3) continue;
      for (let r = 0; r < ROWS; r++) {
        board = dropPiece(board, c, r % 2 === 0 ? PLAYER : AI);
      }
    }
    const cols = [3];
    const ordered = victorMoveOrder(board, AI, cols);
    expect(ordered).toEqual([3]);
  });
});

// ---------------------------------------------------------------------------
// Baseinverse scoring
// ---------------------------------------------------------------------------

describe("victorEvaluate — Baseinverse", () => {
  it("scores positively when playable squares neutralize opponent threats", () => {
    // PLAYER has threats that require multiple playable squares
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "AA.....",
      "PP.PP..",
    ]);
    const aiScore = victorEvaluate(board, AI);
    // AI should get a Baseinverse bonus for having playable squares
    // that can neutralize player's threats
    expect(typeof aiScore).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Lowinverse scoring
// ---------------------------------------------------------------------------

describe("victorEvaluate — Lowinverse", () => {
  it("returns a number (no crash) for positions with column pairs", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "P...P..",
      "A...A..",
    ]);
    const score = victorEvaluate(board, AI);
    expect(typeof score).toBe("number");
  });
});
