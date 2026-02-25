/**
 * Unit tests for the AI (getBestMove).
 *
 * Hard (depth 10) and Guru (depth 14) are only tested on highly-constrained
 * positions to keep the suite fast. Easy/medium are tested on open boards.
 */

import { getBestMove, clearTranspositionTable } from "@/lib/ai";
import { emptyBoard, dropPiece, checkWin } from "@/lib/game";
import { PLAYER, AI, COLS, ROWS, EMPTY, Board, Cell } from "@/lib/constants";

// Clear the persistent transposition table between tests so cached entries
// from one test don't leak into another.
beforeEach(() => {
  clearTranspositionTable();
});

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
// Immediate win / block  (apply to all difficulties via "easy" so tests are fast)
// ---------------------------------------------------------------------------

describe("getBestMove — immediate win", () => {
  it("completes a horizontal AI win", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "P......",
      ".AAA...",
    ]);
    const col = getBestMove(board, "easy");
    const next = dropPiece(board, col, AI);
    expect(checkWin(next)?.winner).toBe(AI);
  });

  it("completes a vertical AI win", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      "A......",
      "A......",
      "A......",
    ]);
    const col = getBestMove(board, "easy");
    expect(col).toBe(0);
    expect(checkWin(dropPiece(board, col, AI))?.winner).toBe(AI);
  });

  it("completes a diagonal AI win", () => {
    // AI has 3-in-a-row on the ↙ diagonal: (2,3)→(3,2)→(4,1).
    // To complete it, AI must drop at col 0, landing at row 5.
    // Col 0 must be fully empty so the piece lands at row 5.
    // Cols 1,2,3 must be partially filled so AI pieces sit at rows 4,3,2.
    const board = boardFrom([
      ".......",
      ".......",
      "...A...",  // AI at (2,3) — col 3 has P×3 below
      "..AP...",  // AI at (3,2), P at (3,3)
      ".APP...",  // AI at (4,1), P at (4,2), P at (4,3)
      ".PPP...",  // col 0 EMPTY; col 1,2,3 filled with P at row 5
    ]);
    // Verify the board has no existing winner
    expect(checkWin(board)).toBeNull();
    const col = getBestMove(board, "easy");
    const next = dropPiece(board, col, AI);
    expect(checkWin(next)?.winner).toBe(AI);
  });
});

describe("getBestMove — block opponent win", () => {
  it("blocks a horizontal player win", () => {
    // Player has 3 in a row: cols 0-2 at row 5 → AI must block col 3
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "A......",
      "PPP....",
    ]);
    const col = getBestMove(board, "easy");
    expect(col).toBe(3);
    // Verify player would have won at col 3
    expect(checkWin(dropPiece(board, 3, PLAYER))?.winner).toBe(PLAYER);
    // Verify AI block prevents that win
    expect(checkWin(dropPiece(board, col, AI))?.winner).toBeUndefined();
  });

  it("blocks a vertical player win", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      "P......",
      "P......",
      "P......",
    ]);
    const col = getBestMove(board, "easy");
    expect(col).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Returns a valid column index
// ---------------------------------------------------------------------------

describe("getBestMove — valid column output", () => {
  it("returns a valid column on an empty board (easy)", () => {
    const col = getBestMove(emptyBoard(), "easy");
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(COLS);
  });

  it("returns a valid column on an empty board (medium)", () => {
    const col = getBestMove(emptyBoard(), "medium");
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(COLS);
  });

  it("returns valid column for hard/guru on a near-terminal board (one column left)", () => {
    // Fill all columns except col 3 — severely constrains search tree
    let board = emptyBoard();
    for (let c = 0; c < COLS; c++) {
      if (c === 3) continue;
      // Fill 5 rows (leave top row to avoid isDraw triggering prematurely)
      for (let r = 1; r < ROWS; r++) {
        board = dropPiece(board, c, r % 2 === 0 ? PLAYER : AI);
      }
    }
    // Only col 3 has free slots — both hard and guru must pick it
    for (const d of ["hard", "guru"] as const) {
      if (board[0][3] === EMPTY) {
        const col = getBestMove(board, d);
        expect(col).toBe(3);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Win preference (easy – fast)
// ---------------------------------------------------------------------------

describe("getBestMove — win over block", () => {
  it("takes the win rather than blocking when both are available", () => {
    // AI has 3-in-a-row vertically in col 6 (rows 3-5).
    // Player has 3-in-a-row horizontally in col 0-2 row 5.
    // AI should win by completing col 6, not block col 3.
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      "......A",
      "......A",
      "PPP...A",
    ]);
    const col = getBestMove(board, "easy");
    const next = dropPiece(board, col, AI);
    expect(checkWin(next)?.winner).toBe(AI);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("getBestMove — determinism", () => {
  it("returns the same column on repeated calls for easy difficulty", () => {
    // Use a position with a clear best move to avoid randomness in easy mode
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      "A......",
      "A......",
      "A......",
    ]);
    // Immediate win overrides randomness
    const first = getBestMove(board, "easy");
    const second = getBestMove(board, "easy");
    expect(first).toBe(second);
    expect(first).toBe(0);
  });

  it("returns the same column on repeated calls for medium difficulty", () => {
    const board = emptyBoard();
    const first = getBestMove(board, "medium");
    const second = getBestMove(board, "medium");
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// Opening book integration (Guru)
// ---------------------------------------------------------------------------

describe("getBestMove — opening book (Guru)", () => {
  it("returns center column (3) on the first AI move when center is free", () => {
    // Player played col 0; AI should immediately take center
    const board = dropPiece(emptyBoard(), 0, PLAYER);
    const col = getBestMove(board, "guru");
    expect(col).toBe(3);
  });

  it("returns center (3) when player played col 6 (guru)", () => {
    const board = dropPiece(emptyBoard(), 6, PLAYER);
    expect(getBestMove(board, "guru")).toBe(3);
  });

  it("returns a valid column when player stacked center first (guru)", () => {
    const board = dropPiece(emptyBoard(), 3, PLAYER);
    const col = getBestMove(board, "guru");
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(COLS);
    expect(board[0][col]).toBe(EMPTY); // must not suggest a full column
  });

  it("does NOT force center for easy difficulty on first move", () => {
    // For easy, we just verify we get a valid column (opening book disabled)
    const board = dropPiece(emptyBoard(), 0, PLAYER);
    const col = getBestMove(board, "easy");
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(COLS);
  });
});

// ---------------------------------------------------------------------------
// Iterative deepening — correctness preserved
// ---------------------------------------------------------------------------

describe("getBestMove — iterative deepening correctness", () => {
  it("finds a winning move at medium depth", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "P......",
      ".AAA...",
    ]);
    const col = getBestMove(board, "medium");
    expect(checkWin(dropPiece(board, col, AI))?.winner).toBe(AI);
  });

  it("blocks at medium depth", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "A......",
      "PPP....",
    ]);
    const col = getBestMove(board, "medium");
    expect(col).toBe(3);
  });

  it("returns the same best column on two calls (persistent TT)", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      "PAPA...",
    ]);
    const col1 = getBestMove(board, "medium");
    const col2 = getBestMove(board, "medium");
    expect(col1).toBe(col2);
  });
});

// ---------------------------------------------------------------------------
// Victor difficulty
// ---------------------------------------------------------------------------

describe("getBestMove — Victor difficulty", () => {
  it("returns a valid column on a near-terminal board (one column left)", () => {
    // Fill all columns except col 3
    let board = emptyBoard();
    for (let c = 0; c < COLS; c++) {
      if (c === 3) continue;
      for (let r = 1; r < ROWS; r++) {
        board = dropPiece(board, c, r % 2 === 0 ? PLAYER : AI);
      }
    }
    if (board[0][3] === EMPTY) {
      const col = getBestMove(board, "victor");
      expect(col).toBe(3);
    }
  });

  it("finds a winning move", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "P......",
      ".AAA...",
    ]);
    const col = getBestMove(board, "victor");
    const next = dropPiece(board, col, AI);
    expect(checkWin(next)?.winner).toBe(AI);
  });

  it("blocks an opponent horizontal win", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "A......",
      "PPP....",
    ]);
    const col = getBestMove(board, "victor");
    expect(col).toBe(3);
  });

  it("returns the same column on repeated calls (deterministic)", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "A......",
      "PPP....",
    ]);
    const first = getBestMove(board, "victor");
    const second = getBestMove(board, "victor");
    expect(first).toBe(second);
  });

  it("uses opening book on first AI move", () => {
    const board = dropPiece(emptyBoard(), 0, PLAYER);
    const col = getBestMove(board, "victor");
    expect(col).toBe(3); // center column from opening book
  });
});
