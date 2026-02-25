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
import {
  ZOBRIST,
  computeBoardHash,
  TranspositionTable,
  TTFlag,
} from "./transpositionTable";

// ---------------------------------------------------------------------------
// Module-level transposition table — persists across getBestMove calls so
// positions explored on move N benefit move N+1.  Cleared on new game or
// difficulty change (evaluation function may differ).
// ---------------------------------------------------------------------------

const globalTT = new TranspositionTable();
import { getOpeningBookMove } from "./openingBook";
import { victorEvaluate, victorMoveOrder } from "./victorRules";

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
// Negamax with alpha-beta pruning + transposition table
// ---------------------------------------------------------------------------

type ScoreFn = (board: Board, piece: Cell) => number;

function isTerminal(board: Board): boolean {
  return checkWin(board) !== null || validCols(board).length === 0;
}

function negamax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  piece: Cell,
  hash: number,
  tt: TranspositionTable,
  scoreFn: ScoreFn
): number {
  const origAlpha = alpha;

  // Transposition-table lookup
  const ttEntry = tt.get(hash);
  if (ttEntry !== undefined && ttEntry.depth >= depth) {
    if (ttEntry.flag === "exact") return ttEntry.score;
    if (ttEntry.flag === "lower") alpha = Math.max(alpha, ttEntry.score);
    if (ttEntry.flag === "upper") beta = Math.min(beta, ttEntry.score);
    if (alpha >= beta) return ttEntry.score;
  }

  if (depth === 0 || isTerminal(board)) {
    const win = checkWin(board);
    if (win) {
      // Prefer faster wins: scale score by depth so shallower wins score higher
      return win.winner === AI
        ? SCORE_WIN * 100 + depth
        : -(SCORE_WIN * 100 + depth);
    }
    if (validCols(board).length === 0) return 0; // draw
    return scoreFn(board, piece);
  }

  const cols = MOVE_ORDER.filter((c) => board[0][c] === EMPTY);
  const opp: Cell = piece === AI ? PLAYER : AI;

  let best = -Infinity;
  for (const col of cols) {
    const row = getDropRow(board, col);
    const next = dropPiece(board, col, piece);
    // Incrementally update the Zobrist hash for this move
    const newHash = hash ^ ZOBRIST[row][col][piece - 1];
    const val = -negamax(
      next,
      depth - 1,
      -beta,
      -alpha,
      opp,
      newHash,
      tt,
      scoreFn
    );
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // prune
  }

  // Store result in transposition table
  const flag: TTFlag =
    best <= origAlpha ? "upper" : best >= beta ? "lower" : "exact";
  tt.set(hash, { depth, score: best, flag });

  return best;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns the column index the AI chooses to play. */
export function getBestMove(board: Board, difficulty: Difficulty): number {
  const maxDepth = DEPTH_MAP[difficulty];
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

  // 3. Opening book (Guru + Victor — instant, no search needed for early game)
  const bookMove = getOpeningBookMove(board, difficulty);
  if (bookMove !== null) return bookMove;

  // 4. Add random noise so the AI occasionally blunders
  //    Easy: 40% chance · Medium: 15% chance
  const blunderChance = difficulty === "easy" ? 0.4 : difficulty === "medium" ? 0.15 : 0;
  if (blunderChance > 0 && Math.random() < blunderChance) {
    const valid = validCols(board);
    return valid[Math.floor(Math.random() * valid.length)];
  }

  // 5. Iterative-deepening negamax with transposition table
  //    Search depth 1…maxDepth.  Each completed depth primes the TT so the
  //    next depth benefits from better move ordering.
  //    The globalTT persists across moves for cross-move cache benefit.
  const startHash = computeBoardHash(board);

  // Victor difficulty: combine standard evaluation with threat-based analysis
  const scoreFn: ScoreFn =
    difficulty === "victor"
      ? (b, p) => scoreBoard(b, p) + victorEvaluate(b, p)
      : scoreBoard;

  // Victor difficulty: use threat-based move ordering at root for better pruning
  const rootCols =
    difficulty === "victor" ? victorMoveOrder(board, AI, cols) : cols;

  let bestCol = rootCols[0];

  for (let depth = 1; depth <= maxDepth; depth++) {
    let bestScore = -Infinity;
    let currentBestCol = rootCols[0];

    for (const col of rootCols) {
      const row = getDropRow(board, col);
      const next = dropPiece(board, col, AI);
      const newHash = startHash ^ ZOBRIST[row][col][AI - 1];
      const score = -negamax(
        next,
        depth - 1,
        -Infinity,
        Infinity,
        PLAYER,
        newHash,
        globalTT,
        scoreFn
      );
      if (score > bestScore) {
        bestScore = score;
        currentBestCol = col;
      }
    }

    bestCol = currentBestCol;
  }

  // 6. Avoid creating a position where the opponent wins on the next drop
  //    (gift-avoidance). Only apply at medium+ difficulty.
  if (difficulty !== "easy") {
    const safeCol = avoidGift(board, bestCol, rootCols);
    if (safeCol !== null) return safeCol;
  }

  return bestCol;
}

/**
 * If dropping in `col` would allow the opponent to win by dropping on top of
 * it next turn, try to find a different column that doesn't have this problem.
 * Returns the safe column, or null if bestCol is already safe (or no safe
 * move exists).
 */
function avoidGift(board: Board, bestCol: number, cols: number[]): number | null {
  const afterDrop = dropPiece(board, bestCol, AI);
  const row = getDropRow(afterDrop, bestCol);
  if (row >= 0) {
    // Check if opponent placing on top of our move wins
    const above = dropPiece(afterDrop, bestCol, PLAYER);
    if (checkWin(above)?.winner === PLAYER) {
      // Try to find any other column that doesn't gift a win
      for (const col of cols) {
        if (col === bestCol) continue;
        const alt = dropPiece(board, col, AI);
        const altRow = getDropRow(alt, col);
        if (altRow < 0) continue; // column now full after AI drop, skip
        const altAbove = dropPiece(alt, col, PLAYER);
        if (checkWin(altAbove)?.winner !== PLAYER) return col;
      }
      // All alternatives also gift a win — return null (play bestCol anyway)
      return null;
    }
  }
  return null; // bestCol is safe
}

// ---------------------------------------------------------------------------
// Public: clear the persistent transposition table
// ---------------------------------------------------------------------------

/**
 * Clear the module-level transposition table.  Call this on:
 * - New game (board resets, old entries are irrelevant)
 * - Difficulty change (evaluation function may differ between difficulties,
 *   so cached scores could be wrong)
 */
export function clearTranspositionTable(): void {
  globalTT.clear();
}
