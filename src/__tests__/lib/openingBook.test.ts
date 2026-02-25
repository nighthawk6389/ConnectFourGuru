import { getOpeningBookMove } from "@/lib/openingBook";
import { emptyBoard, dropPiece } from "@/lib/game";
import { PLAYER, AI, COLS, ROWS } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Build a board by replaying an alternating sequence of column moves.
 *  Even-indexed moves are PLAYER, odd-indexed are AI (so player always goes first).
 */
function boardFromMoves(cols: number[]) {
  let board = emptyBoard();
  cols.forEach((col, i) => {
    board = dropPiece(board, col, i % 2 === 0 ? PLAYER : AI);
  });
  return board;
}

// ---------------------------------------------------------------------------
// Non-Guru difficulties — book should always return null
// ---------------------------------------------------------------------------

describe("getOpeningBookMove — non-Guru difficulties", () => {
  const DIFFICULTIES = ["easy", "medium", "hard"] as const;

  DIFFICULTIES.forEach((diff) => {
    it(`returns null for ${diff} difficulty (opening book disabled)`, () => {
      expect(getOpeningBookMove(emptyBoard(), diff)).toBeNull();
    });
  });

  it("returns null for easy on a board with 1 player piece", () => {
    const board = dropPiece(emptyBoard(), 3, PLAYER);
    expect(getOpeningBookMove(board, "easy")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Guru difficulty — early game
// ---------------------------------------------------------------------------

describe("getOpeningBookMove — Guru, early game", () => {
  it("returns a valid column for a board with 1 player piece", () => {
    const board = dropPiece(emptyBoard(), 0, PLAYER);
    const col = getOpeningBookMove(board, "guru");
    expect(col).not.toBeNull();
    expect(col).toBeGreaterThanOrEqual(0);
    expect(col).toBeLessThan(COLS);
  });

  it("always returns center (3) when center is free and 1 player piece exists", () => {
    // Player played any column except 3; AI should take center
    for (let playerCol = 0; playerCol < COLS; playerCol++) {
      if (playerCol === 3) continue; // skip when player occupies center
      const board = dropPiece(emptyBoard(), playerCol, PLAYER);
      const col = getOpeningBookMove(board, "guru");
      expect(col).toBe(3);
    }
  });

  it("returns center (3) even when player played center first (stack center)", () => {
    // Player played col 3 → bottom of col 3 is PLAYER; col 3 still has 5 empty slots
    const board = dropPiece(emptyBoard(), 3, PLAYER);
    // board[0][3] should still be EMPTY (player piece lands at row 5)
    const col = getOpeningBookMove(board, "guru");
    expect(col).toBe(3);
  });

  it("returns a valid column for a board with 3 pieces (AI second move)", () => {
    const board = boardFromMoves([1, 3, 0]); // player, AI, player
    const col = getOpeningBookMove(board, "guru");
    expect(col).not.toBeNull();
    if (col !== null) {
      expect(board[0][col]).toBe(0); // column must not be full at top
    }
  });

  it("never returns a full column", () => {
    // Fill column 3 completely, then check the book doesn't suggest it
    let board = emptyBoard();
    for (let i = 0; i < ROWS; i++) {
      board = dropPiece(board, 3, i % 2 === 0 ? PLAYER : AI);
    }
    // Add one player piece elsewhere so total pieces is odd (AI's turn)
    // Col 3 is now full; book should not return 3
    const col = getOpeningBookMove(board, "guru");
    if (col !== null) {
      expect(board[0][col]).toBe(0);
      expect(col).not.toBe(3);
    }
  });
});

// ---------------------------------------------------------------------------
// Guru difficulty — beyond opening
// ---------------------------------------------------------------------------

describe("getOpeningBookMove — Guru, beyond opening", () => {
  it("returns null when more than 6 pieces are on the board", () => {
    // 7 moves (4 player + 3 AI) = 7 pieces → outside the book
    const board = boardFromMoves([0, 1, 2, 3, 4, 5, 6]);
    expect(getOpeningBookMove(board, "guru")).toBeNull();
  });

  it("returns null on a nearly-full board (guru)", () => {
    let board = emptyBoard();
    // Fill most of the board
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        board = dropPiece(board, c, (c + r) % 2 === 0 ? PLAYER : AI);
        if (board[0][c] !== 0) break; // column full
      }
    }
    expect(getOpeningBookMove(board, "guru")).toBeNull();
  });
});
