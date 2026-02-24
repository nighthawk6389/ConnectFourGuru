import {
  ROWS,
  COLS,
  EMPTY,
  PLAYER,
  AI,
  MOVE_ORDER,
  SCORE_WIN,
  SCORE_THREE,
  SCORE_TWO,
  SCORE_OPP_THREE,
  SCORE_CENTER,
  DEPTH_MAP,
  Difficulty,
  Cell,
  Board,
} from "./constants";
import { dropPiece, checkWin, validCols, getDropRow } from "./game";

// ---------------------------------------------------------------------------
// Evaluation helpers
// ---------------------------------------------------------------------------

function scoreWindow(window: Cell[], piece: Cell): number {
  const opp = piece === AI ? PLAYER : AI;
  const mine = window.filter((c) => c === piece).length;
  const theirs = window.filter((c) => c === opp).length;
  const empty = window.filter((c) => c === EMPTY).length;

  if (mine === 4) return SCORE_WIN;
  if (mine === 3 && empty === 1) return SCORE_THREE;
  if (mine === 2 && empty === 2) return SCORE_TWO;
  if (theirs === 3 && empty === 1) return SCORE_OPP_THREE;
  return 0;
}

function scoreBoard(board: Board, piece: Cell): number {
  let score = 0;

  // Center column bonus
  const centerCol = board.map((r) => r[Math.floor(COLS / 2)]);
  score += centerCol.filter((c) => c === piece).length * SCORE_CENTER;

  // Horizontal windows
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindow(board[r].slice(c, c + 4), piece);
    }
  }

  // Vertical windows
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      const window: Cell[] = [
        board[r][c],
        board[r + 1][c],
        board[r + 2][c],
        board[r + 3][c],
      ];
      score += scoreWindow(window, piece);
    }
  }

  // Diagonal ↘
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      const window: Cell[] = [
        board[r][c],
        board[r + 1][c + 1],
        board[r + 2][c + 2],
        board[r + 3][c + 3],
      ];
      score += scoreWindow(window, piece);
    }
  }

  // Diagonal ↙
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      const window: Cell[] = [
        board[r][c],
        board[r + 1][c - 1],
        board[r + 2][c - 2],
        board[r + 3][c - 3],
      ];
      score += scoreWindow(window, piece);
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Negamax with alpha-beta pruning
// ---------------------------------------------------------------------------

function isTerminal(board: Board): boolean {
  return (
    checkWin(board) !== null || validCols(board).length === 0
  );
}

function negamax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  piece: Cell
): number {
  if (depth === 0 || isTerminal(board)) {
    const win = checkWin(board);
    if (win) {
      // Prefer faster wins: scale score by depth so shallower wins score higher
      return win.winner === AI
        ? SCORE_WIN * 100 + depth
        : -(SCORE_WIN * 100 + depth);
    }
    if (validCols(board).length === 0) return 0; // draw
    return scoreBoard(board, piece);
  }

  const cols = MOVE_ORDER.filter((c) => board[0][c] === EMPTY);
  const opp: Cell = piece === AI ? PLAYER : AI;

  let best = -Infinity;
  for (const col of cols) {
    const next = dropPiece(board, col, piece);
    const val = -negamax(next, depth - 1, -beta, -alpha, opp);
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // prune
  }
  return best;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the column index the AI chooses to play. */
export function getBestMove(board: Board, difficulty: Difficulty): number {
  const depth = DEPTH_MAP[difficulty];
  const cols = MOVE_ORDER.filter((c) => board[0][c] === EMPTY);

  // 1. Play winning move immediately (all difficulties)
  for (const col of cols) {
    const next = dropPiece(board, col, AI);
    if (checkWin(next)?.winner === AI) return col;
  }

  // 2. Block opponent's immediate win (all difficulties)
  for (const col of cols) {
    const next = dropPiece(board, col, PLAYER);
    if (checkWin(next)?.winner === PLAYER) return col;
  }

  // 3. For easy mode, add random noise so the AI occasionally blunders
  if (difficulty === "easy" && Math.random() < 0.4) {
    const valid = validCols(board);
    return valid[Math.floor(Math.random() * valid.length)];
  }

  // 4. Full negamax search
  let bestCol = cols[0];
  let bestScore = -Infinity;

  for (const col of cols) {
    const next = dropPiece(board, col, AI);
    const score = -negamax(next, depth - 1, -Infinity, Infinity, PLAYER);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  // 5. Avoid creating a position where the opponent wins on the next drop
  //    (i.e., don't set up the opponent by filling a column whose next slot
  //     above would let them win). Only apply at medium+ difficulty.
  if (difficulty !== "easy") {
    const safeCol = avoidGift(board, bestCol, cols);
    if (safeCol !== null) return safeCol;
  }

  return bestCol;
}

/**
 * If dropping in `col` would allow the opponent to win by dropping on top of it
 * next turn, try to find a different column that doesn't have this problem.
 * Returns the safe column, or null if bestCol is already safe (or no safe move exists).
 */
function avoidGift(board: Board, bestCol: number, cols: number[]): number | null {
  const afterDrop = dropPiece(board, bestCol, AI);
  const row = getDropRow(afterDrop, bestCol);
  if (row > 0) {
    // Check if opponent placing on top of our move wins
    const above = dropPiece(afterDrop, bestCol, PLAYER);
    if (checkWin(above)?.winner === PLAYER) {
      // Try to find any other column that doesn't gift a win
      for (const col of cols) {
        if (col === bestCol) continue;
        const alt = dropPiece(board, col, AI);
        const altRow = getDropRow(alt, col);
        if (altRow <= 0) continue; // column now full, skip
        const altAbove = dropPiece(alt, col, PLAYER);
        if (checkWin(altAbove)?.winner !== PLAYER) return col;
      }
      // All alternatives also gift a win — return null (play bestCol anyway)
      return null;
    }
  }
  return null; // bestCol is safe
}
