import { Board, ROWS, COLS, EMPTY, AI, PLAYER, Difficulty } from "./constants";

// ---------------------------------------------------------------------------
// Opening book
// ---------------------------------------------------------------------------

/**
 * Returns the best known column for early-game positions, or `null` if the
 * position is outside the book.
 *
 * Currently applies only to Guru difficulty to make the first few AI moves
 * instant and optimal without running a full negamax search.
 *
 * Strategy: In Connect Four the centre column (col 3) is objectively strongest
 * for both players. The book therefore always directs the AI toward the centre
 * during the first three AI turns (i.e., while fewer than 6 pieces are on
 * the board total).
 *
 * Specific overrides are stored in BOOK_MAP as a map from a compact board
 * encoding to the best column.  The compact encoding is the concatenation of
 * each cell's value across all rows/columns (top-to-bottom, left-to-right).
 */

/** Compact board → best column for the most critical early positions. */
const BOOK_MAP: Map<string, number> = (() => {
  const m = new Map<string, number>();

  /**
   * Encode a board as a flat string of cell values (0/1/2).
   * Only used internally by buildBoard() to seed BOOK_MAP.
   */
  function encode(board: Board): string {
    return board.flat().join("");
  }

  /** Build an empty 6×7 board. */
  function empty(): Board {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY) as Board[0]);
  }

  /** Immutably drop a piece into a column and return the new board. */
  function drop(board: Board, col: number, piece: 1 | 2): Board {
    const next = board.map((r) => [...r] as Board[0]);
    for (let row = ROWS - 1; row >= 0; row--) {
      if (next[row][col] === EMPTY) {
        next[row][col] = piece;
        return next;
      }
    }
    return board; // column full — shouldn't happen in book positions
  }

  // -------------------------------------------------------------------------
  // Seed the book: AI is always the second mover so the board has an ODD
  // number of pieces when it is the AI's turn (player already moved).
  // -------------------------------------------------------------------------

  // AI turn 1 — player has made exactly 1 move
  for (let playerCol = 0; playerCol < COLS; playerCol++) {
    const b = drop(empty(), playerCol, PLAYER);
    // Best response: always take the centre if available, otherwise col 2/4
    const best = b[ROWS - 1][3] === EMPTY || b[0][3] === EMPTY ? 3
      : playerCol <= 2 ? 4
      : 2;
    m.set(encode(b), best);
  }

  // AI turn 2 — player has made 2 moves, AI 1 move (3 pieces total)
  // Seed the most common second-player positions: player occupies two cells
  // and AI holds the centre.
  for (let p1 = 0; p1 < COLS; p1++) {
    for (let p2 = 0; p2 < COLS; p2++) {
      let b = drop(empty(), p1, PLAYER);
      // AI's first response was col 3 (centre)
      b = drop(b, 3, AI);
      b = drop(b, p2, PLAYER);
      // If centre stack is still available keep building it; otherwise go
      // to the column closest to centre that is free.
      let best = 3;
      if (b[0][3] !== EMPTY) {
        for (const c of [2, 4, 1, 5, 0, 6]) {
          if (b[0][c] === EMPTY) { best = c; break; }
        }
      }
      m.set(encode(b), best);
    }
  }

  return m;
})();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up the current position in the opening book.
 *
 * @param board     The current board state.
 * @param difficulty  Only Guru uses the opening book.
 * @returns The best column index, or `null` if the position is not in the book.
 */
export function getOpeningBookMove(board: Board, difficulty: Difficulty): number | null {
  if (difficulty !== "guru") return null;

  // Count pieces to decide whether we're still in the opening
  let totalPieces = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] !== EMPTY) totalPieces++;
    }
  }

  // Beyond 6 pieces the book doesn't cover the position
  if (totalPieces > 6) return null;

  // Try exact match in the book
  const key = board.flat().join("");
  const bookCol = BOOK_MAP.get(key);
  if (bookCol !== undefined && board[0][bookCol] === EMPTY) return bookCol;

  // Fallback for early game: centre-first heuristic (instant, no search)
  for (const col of [3, 2, 4, 1, 5, 0, 6]) {
    if (board[0][col] === EMPTY) return col;
  }

  return null;
}
