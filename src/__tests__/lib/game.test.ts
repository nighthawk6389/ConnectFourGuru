import {
  emptyBoard,
  getDropRow,
  dropPiece,
  checkWin,
  isDraw,
  validCols,
} from "@/lib/game";
import { ROWS, COLS, EMPTY, PLAYER, AI, Board, Cell } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a board from a string representation (easier to read in tests).
 *  '.' = empty, 'P' = player, 'A' = AI
 *  Rows top-to-bottom, columns left-to-right, separated by '|'.
 */
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
// emptyBoard
// ---------------------------------------------------------------------------

describe("emptyBoard", () => {
  it("returns a 6×7 grid of zeros", () => {
    const board = emptyBoard();
    expect(board).toHaveLength(ROWS);
    board.forEach((row) => {
      expect(row).toHaveLength(COLS);
      row.forEach((cell) => expect(cell).toBe(EMPTY));
    });
  });

  it("each call returns a fresh array (no shared references)", () => {
    const a = emptyBoard();
    const b = emptyBoard();
    a[0][0] = PLAYER;
    expect(b[0][0]).toBe(EMPTY);
  });
});

// ---------------------------------------------------------------------------
// getDropRow
// ---------------------------------------------------------------------------

describe("getDropRow", () => {
  it("returns the bottom row for an empty column", () => {
    expect(getDropRow(emptyBoard(), 0)).toBe(ROWS - 1);
  });

  it("returns the correct row after some pieces are in the column", () => {
    const board = emptyBoard();
    const b1 = dropPiece(board, 3, PLAYER);
    expect(getDropRow(b1, 3)).toBe(ROWS - 2);
  });

  it("returns -1 for a full column", () => {
    let board = emptyBoard();
    for (let i = 0; i < ROWS; i++) {
      board = dropPiece(board, 0, PLAYER);
    }
    expect(getDropRow(board, 0)).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// dropPiece
// ---------------------------------------------------------------------------

describe("dropPiece", () => {
  it("places a piece at the bottom of an empty column", () => {
    const board = dropPiece(emptyBoard(), 0, PLAYER);
    expect(board[ROWS - 1][0]).toBe(PLAYER);
  });

  it("stacks pieces correctly", () => {
    let board = emptyBoard();
    board = dropPiece(board, 0, PLAYER);
    board = dropPiece(board, 0, AI);
    expect(board[ROWS - 1][0]).toBe(PLAYER);
    expect(board[ROWS - 2][0]).toBe(AI);
  });

  it("does not mutate the original board", () => {
    const original = emptyBoard();
    dropPiece(original, 0, PLAYER);
    expect(original[ROWS - 1][0]).toBe(EMPTY);
  });

  it("returns the same reference when column is full", () => {
    let board = emptyBoard();
    for (let i = 0; i < ROWS; i++) {
      board = dropPiece(board, 0, PLAYER);
    }
    const before = board;
    const after = dropPiece(board, 0, AI);
    expect(after).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// checkWin
// ---------------------------------------------------------------------------

describe("checkWin", () => {
  it("returns null for an empty board", () => {
    expect(checkWin(emptyBoard())).toBeNull();
  });

  it("detects a horizontal win", () => {
    // Row 5: P P P P . . .
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      "PPPP...",
    ]);
    const result = checkWin(board);
    expect(result?.winner).toBe(PLAYER);
    expect(result?.cells).toHaveLength(4);
    expect(result?.cells).toContainEqual([5, 0]);
    expect(result?.cells).toContainEqual([5, 3]);
  });

  it("detects a vertical win", () => {
    const board = boardFrom([
      ".......",
      ".......",
      "A......",
      "A......",
      "A......",
      "A......",
    ]);
    const result = checkWin(board);
    expect(result?.winner).toBe(AI);
    expect(result?.cells).toHaveLength(4);
  });

  it("detects a diagonal ↘ win", () => {
    const board = boardFrom([
      ".......",
      ".......",
      "P......",
      ".P.....",
      "..P....",
      "...P...",
    ]);
    const result = checkWin(board);
    expect(result?.winner).toBe(PLAYER);
  });

  it("detects a diagonal ↙ win", () => {
    const board = boardFrom([
      ".......",
      ".......",
      "...A...",
      "..A....",
      ".A.....",
      "A......",
    ]);
    const result = checkWin(board);
    expect(result?.winner).toBe(AI);
  });

  it("returns null when no four-in-a-row exists", () => {
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      "PPP....",
      "AAA....",
    ]);
    expect(checkWin(board)).toBeNull();
  });

  it("returns null when pieces of both players mix in a row", () => {
    // P P A P — not a win
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      "PPAP...",
    ]);
    expect(checkWin(board)).toBeNull();
  });

  it("returns the winning cells in the correct positions", () => {
    // Horizontal: AI wins in columns 3-6 of row 5
    const board = boardFrom([
      ".......",
      ".......",
      ".......",
      ".......",
      ".......",
      "...AAAA",
    ]);
    const result = checkWin(board);
    expect(result?.winner).toBe(AI);
    expect(result?.cells).toContainEqual([5, 3]);
    expect(result?.cells).toContainEqual([5, 6]);
  });
});

// ---------------------------------------------------------------------------
// isDraw
// ---------------------------------------------------------------------------

describe("isDraw", () => {
  it("returns false for an empty board", () => {
    expect(isDraw(emptyBoard())).toBe(false);
  });

  it("returns false when only some cells are filled", () => {
    const board = dropPiece(emptyBoard(), 0, PLAYER);
    expect(isDraw(board)).toBe(false);
  });

  it("returns true only when the top row is completely full", () => {
    // Fill all columns to the brim (alternating so no win is detected)
    let board = emptyBoard();
    // Build a full board without triggering a win:
    // Alternate pattern across rows to avoid 4-in-a-row
    const pattern: Cell[][] = [
      [1,2,1,2,1,2,1],
      [2,1,2,1,2,1,2],
      [1,2,1,2,1,2,1],
      [2,1,2,1,2,1,2],
      [1,2,1,2,1,2,1],
      [2,1,2,1,2,1,2],
    ];
    board = pattern as Board;
    // Top row is full
    expect(isDraw(board)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validCols
// ---------------------------------------------------------------------------

describe("validCols", () => {
  it("returns all 7 columns for an empty board", () => {
    expect(validCols(emptyBoard())).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("excludes full columns", () => {
    let board = emptyBoard();
    for (let i = 0; i < ROWS; i++) {
      board = dropPiece(board, 0, PLAYER);
    }
    const cols = validCols(board);
    expect(cols).not.toContain(0);
    expect(cols).toContain(1);
  });

  it("returns an empty array when all columns are full", () => {
    const pattern: Cell[][] = [
      [1,2,1,2,1,2,1],
      [2,1,2,1,2,1,2],
      [1,2,1,2,1,2,1],
      [2,1,2,1,2,1,2],
      [1,2,1,2,1,2,1],
      [2,1,2,1,2,1,2],
    ];
    expect(validCols(pattern as Board)).toEqual([]);
  });
});
