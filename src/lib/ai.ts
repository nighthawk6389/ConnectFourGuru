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
// Fast win detection — O(1) check around last move instead of full board scan
// ---------------------------------------------------------------------------

/**
 * Check if the piece at (row, col) forms a 4-in-a-row.
 * Only checks the four directions radiating from the given cell.
 * Much faster than scanning the entire board.
 */
function checkWinAround(board: Board, row: number, col: number): boolean {
  const piece = board[row][col];
  if (piece === EMPTY) return false;

  // Four directions: horizontal, vertical, diagonal ↘, diagonal ↙
  const directions: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    let count = 1;
    // Positive direction
    for (let k = 1; k < 4; k++) {
      const r = row + dr * k;
      const c = col + dc * k;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== piece)
        break;
      count++;
    }
    // Negative direction
    for (let k = 1; k < 4; k++) {
      const r = row - dr * k;
      const c = col - dc * k;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== piece)
        break;
      count++;
    }
    if (count >= 4) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Evaluation helpers — allocation-free hot path
// ---------------------------------------------------------------------------

/**
 * Score a 4-cell window defined by start (r, c) and direction (dr, dc).
 * Uses direct board indexing — no slice() or filter() allocations.
 */
function scoreWindowDirect(
  board: Board,
  r: number,
  c: number,
  dr: number,
  dc: number,
  piece: Cell
): number {
  const opp: Cell = piece === AI ? PLAYER : AI;
  let mine = 0;
  let theirs = 0;
  let empty = 0;

  for (let k = 0; k < 4; k++) {
    const cell = board[r + dr * k][c + dc * k];
    if (cell === piece) mine++;
    else if (cell === opp) theirs++;
    else empty++;
  }

  if (mine === 4) return SCORE_WIN;
  if (mine === 3 && empty === 1) return SCORE_THREE;
  if (mine === 2 && empty === 2) return SCORE_TWO;
  if (theirs === 3 && empty === 1) return SCORE_OPP_THREE;
  return 0;
}

function scoreBoard(board: Board, piece: Cell): number {
  let score = 0;

  // Center column bonus — direct indexing, no map/filter
  const center = Math.floor(COLS / 2);
  for (let r = 0; r < ROWS; r++) {
    if (board[r][center] === piece) score += SCORE_CENTER;
  }

  // Horizontal windows (dr=0, dc=1)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindowDirect(board, r, c, 0, 1, piece);
    }
  }

  // Vertical windows (dr=1, dc=0)
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      score += scoreWindowDirect(board, r, c, 1, 0, piece);
    }
  }

  // Diagonal ↘ (dr=1, dc=1)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      score += scoreWindowDirect(board, r, c, 1, 1, piece);
    }
  }

  // Diagonal ↙ (dr=1, dc=-1)
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 3; c < COLS; c++) {
      score += scoreWindowDirect(board, r, c, 1, -1, piece);
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Negamax with alpha-beta pruning + transposition table
// ---------------------------------------------------------------------------

type ScoreFn = (board: Board, piece: Cell) => number;

/**
 * Negamax search with alpha-beta pruning, transposition table, and
 * make/unmake moves (mutates board in-place, restores on backtrack).
 *
 * @param lastRow  Row of the most recent move (for fast win detection)
 * @param lastCol  Column of the most recent move
 */
function negamax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  piece: Cell,
  hash: number,
  tt: TranspositionTable,
  scoreFn: ScoreFn,
  lastRow: number,
  lastCol: number
): number {
  // 1. Terminal: last move created a win — always bad for current mover
  //    (the opponent just completed 4-in-a-row).
  if (checkWinAround(board, lastRow, lastCol)) {
    return -(SCORE_WIN * 100 + depth);
  }

  // 2. Leaf evaluation
  if (depth === 0) {
    return scoreFn(board, piece);
  }

  // 3. Transposition-table lookup
  const origAlpha = alpha;
  const ttEntry = tt.get(hash);
  let ttBestMove = -1;
  if (ttEntry !== undefined) {
    if (ttEntry.depth >= depth) {
      if (ttEntry.flag === "exact") return ttEntry.score;
      if (ttEntry.flag === "lower") alpha = Math.max(alpha, ttEntry.score);
      if (ttEntry.flag === "upper") beta = Math.min(beta, ttEntry.score);
      if (alpha >= beta) return ttEntry.score;
    }
    // Use the TT best move for ordering even if depth is insufficient
    ttBestMove = ttEntry.bestMove;
  }

  // 4. Generate moves — TT best move first, then center-out
  const cols: number[] = [];
  if (ttBestMove >= 0 && board[0][ttBestMove] === EMPTY) {
    cols.push(ttBestMove);
  }
  for (let i = 0; i < MOVE_ORDER.length; i++) {
    const c = MOVE_ORDER[i];
    if (c !== ttBestMove && board[0][c] === EMPTY) {
      cols.push(c);
    }
  }

  // No moves → draw
  if (cols.length === 0) return 0;

  const opp: Cell = piece === AI ? PLAYER : AI;
  let best = -Infinity;
  let bestMove = cols[0];

  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const row = getDropRow(board, col);

    // Make move (mutate in-place)
    board[row][col] = piece;
    const newHash = hash ^ ZOBRIST[row][col][piece - 1];

    const val = -negamax(
      board,
      depth - 1,
      -beta,
      -alpha,
      opp,
      newHash,
      tt,
      scoreFn,
      row,
      col
    );

    // Unmake move (restore)
    board[row][col] = EMPTY;

    if (val > best) {
      best = val;
      bestMove = col;
    }
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // prune
  }

  // 5. Store result in transposition table (with best move for ordering)
  const flag: TTFlag =
    best <= origAlpha ? "upper" : best >= beta ? "lower" : "exact";
  tt.set(hash, { depth, score: best, flag, bestMove });

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
  //    Easy: 40% chance·
  const blunderChance = difficulty === "easy" ? 0.4 : 0;
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

  // Create a mutable copy for the search (make/unmake modifies in-place)
  const searchBoard: Board = board.map((r) => [...r] as Cell[]);

  let bestCol = rootCols[0];
  let prevBestCol = -1;

  for (let depth = 1; depth <= maxDepth; depth++) {
    let bestScore = -Infinity;
    let currentBestCol = rootCols[0];

    // Reorder root moves: previous iteration's best first
    const orderedCols =
      prevBestCol >= 0
        ? [prevBestCol, ...rootCols.filter((c) => c !== prevBestCol)]
        : rootCols;

    for (const col of orderedCols) {
      const row = getDropRow(searchBoard, col);

      // Make move on search board
      searchBoard[row][col] = AI;
      const newHash = startHash ^ ZOBRIST[row][col][AI - 1];

      const score = -negamax(
        searchBoard,
        depth - 1,
        -Infinity,
        Infinity,
        PLAYER,
        newHash,
        globalTT,
        scoreFn,
        row,
        col
      );

      // Unmake move
      searchBoard[row][col] = EMPTY;

      if (score > bestScore) {
        bestScore = score;
        currentBestCol = col;
      }
    }

    bestCol = currentBestCol;
    prevBestCol = currentBestCol;
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
// Public: clear / inspect the persistent transposition table
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

/** Return the number of entries in the persistent transposition table. */
export function getTranspositionTableSize(): number {
  return globalTT.size;
}
