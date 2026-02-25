/**
 * Victor Allis's strategic rules for Connect Four.
 *
 * Implements 6 of the 9 rules from Allis's 1988 thesis
 * "A Knowledge-Based Approach of Connect-Four":
 *   1. Claimeven   — second player controls even-row squares
 *   2. Baseinverse — two playable squares guarantee one
 *   3. Vertical    — stacked empties with odd upper square
 *   4. Before      — gravity ensures a group completes first
 *   5. Aftereven   — groups secured entirely via Claimeven
 *   6. Lowinverse  — paired column low squares
 *
 * Used by the "Victor" difficulty to augment the standard
 * window-based evaluation with threat-based strategic analysis.
 */

import {
  ROWS,
  COLS,
  EMPTY,
  PLAYER,
  AI,
  VICTOR_CLAIMEVEN_3,
  VICTOR_CLAIMEVEN_2,
  VICTOR_CLAIMEVEN_1,
  VICTOR_BEFORE_3,
  VICTOR_BEFORE_2,
  VICTOR_VERTICAL_3,
  VICTOR_VERTICAL_2,
  VICTOR_AFTEREVEN_3,
  VICTOR_AFTEREVEN_2,
  VICTOR_BASEINVERSE,
  VICTOR_LOWINVERSE,
  Board,
  Cell,
} from "./constants";
import { getDropRow } from "./game";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Square {
  row: number;
  col: number;
}

/**
 * A "group" is a potential four-in-a-row that is still live
 * (contains pieces from at most one player).
 */
interface Group {
  squares: [Square, Square, Square, Square];
  owner: Cell; // PLAYER or AI — whoever has pieces in this group
  emptySquares: Square[];
  filledCount: number;
}

// ---------------------------------------------------------------------------
// Parity helpers
// ---------------------------------------------------------------------------

/**
 * Allis row numbering: 1-indexed from the bottom.
 *   board[5] = Allis row 1 (odd)
 *   board[4] = Allis row 2 (even)
 *   board[3] = Allis row 3 (odd)
 *   board[2] = Allis row 4 (even)
 *   board[1] = Allis row 5 (odd)
 *   board[0] = Allis row 6 (even)
 *
 * First player controls odd squares, second player controls even squares.
 * Use getFirstPlayer() to determine who went first — this handles inverted
 * boards correctly (the simulation swaps PLAYER↔AI to let either side go first).
 */
export function isOddSquare(row: number): boolean {
  return (ROWS - row) % 2 === 1;
}

export function isEvenSquare(row: number): boolean {
  return (ROWS - row) % 2 === 0;
}

/**
 * Determine who is the first player by counting pieces on the board.
 * The first player always has equal or more pieces than the second player.
 */
export function getFirstPlayer(board: Board): Cell {
  let playerCount = 0;
  let aiCount = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === PLAYER) playerCount++;
      else if (board[r][c] === AI) aiCount++;
    }
  }
  return playerCount >= aiCount ? PLAYER : AI;
}

/**
 * Check if a square is on favorable parity for the given piece.
 * First player controls odd squares, second player controls even squares.
 */
function isFavorableParity(row: number, piece: Cell, firstPlayer: Cell): boolean {
  if (piece === firstPlayer) {
    return isOddSquare(row);
  }
  return isEvenSquare(row);
}

/** A square is directly playable if it is empty and sits on the bottom row or on a filled square. */
function isPlayable(board: Board, row: number, col: number): boolean {
  if (board[row][col] !== EMPTY) return false;
  return row === ROWS - 1 || board[row + 1][col] !== EMPTY;
}

// ---------------------------------------------------------------------------
// Group enumeration
// ---------------------------------------------------------------------------

/** All 69 possible four-in-a-row lines on a 6×7 board, pre-computed. */
const ALL_LINES: [Square, Square, Square, Square][] = (() => {
  const lines: [Square, Square, Square, Square][] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Horizontal →
      if (c + 3 < COLS) {
        lines.push([
          { row: r, col: c },
          { row: r, col: c + 1 },
          { row: r, col: c + 2 },
          { row: r, col: c + 3 },
        ]);
      }
      // Vertical ↓
      if (r + 3 < ROWS) {
        lines.push([
          { row: r, col: c },
          { row: r + 1, col: c },
          { row: r + 2, col: c },
          { row: r + 3, col: c },
        ]);
      }
      // Diagonal ↘
      if (r + 3 < ROWS && c + 3 < COLS) {
        lines.push([
          { row: r, col: c },
          { row: r + 1, col: c + 1 },
          { row: r + 2, col: c + 2 },
          { row: r + 3, col: c + 3 },
        ]);
      }
      // Diagonal ↙
      if (r + 3 < ROWS && c - 3 >= 0) {
        lines.push([
          { row: r, col: c },
          { row: r + 1, col: c - 1 },
          { row: r + 2, col: c - 2 },
          { row: r + 3, col: c - 3 },
        ]);
      }
    }
  }
  return lines;
})();

/**
 * Enumerate all live groups on the board.
 * A group is "live" if it contains pieces from at most one player.
 */
export function enumerateGroups(board: Board): Group[] {
  const groups: Group[] = [];

  for (const line of ALL_LINES) {
    let playerCount = 0;
    let aiCount = 0;
    const emptySquares: Square[] = [];

    for (const sq of line) {
      const cell = board[sq.row][sq.col];
      if (cell === PLAYER) playerCount++;
      else if (cell === AI) aiCount++;
      else emptySquares.push(sq);
    }

    // Dead group — both players have pieces in it
    if (playerCount > 0 && aiCount > 0) continue;

    // Empty group — no owner yet, not useful for scoring
    if (playerCount === 0 && aiCount === 0) continue;

    const owner: Cell = playerCount > 0 ? PLAYER : AI;
    const filledCount = owner === PLAYER ? playerCount : aiCount;

    groups.push({
      squares: line,
      owner,
      emptySquares,
      filledCount,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Rule 1: Claimeven
// ---------------------------------------------------------------------------

/**
 * Claimeven: The second player can claim even-row squares by always
 * responding in the same column. If all empty squares in a group are on
 * the favorable parity for the group's owner, the group is "secured."
 *
 * Parity is determined dynamically via `firstPlayer` so this works
 * correctly even when the board has been inverted.
 */
function scoreClaimeven(groups: Group[], piece: Cell, firstPlayer: Cell): number {
  let score = 0;
  const opp: Cell = piece === AI ? PLAYER : AI;

  for (const g of groups) {
    if (g.emptySquares.length === 0) continue;

    if (g.owner === piece) {
      // Our group: check if all empties are on our parity
      const allFavorable = g.emptySquares.every((sq) =>
        isFavorableParity(sq.row, piece, firstPlayer)
      );
      if (allFavorable) {
        if (g.filledCount === 3) score += VICTOR_CLAIMEVEN_3;
        else if (g.filledCount === 2) score += VICTOR_CLAIMEVEN_2;
        else score += VICTOR_CLAIMEVEN_1;
      }
    } else {
      // Opponent's group: penalize if all empties are on their favorable parity
      const allFavorableForOpp = g.emptySquares.every((sq) =>
        isFavorableParity(sq.row, opp, firstPlayer)
      );
      if (allFavorableForOpp) {
        if (g.filledCount === 3) score -= VICTOR_CLAIMEVEN_3;
        else if (g.filledCount === 2) score -= VICTOR_CLAIMEVEN_2;
        else score -= VICTOR_CLAIMEVEN_1;
      }
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Rule 2: Baseinverse
// ---------------------------------------------------------------------------

/**
 * Baseinverse: Two directly playable squares in different columns.
 * The controller guarantees getting at least one.
 * Solves opponent groups that require BOTH squares.
 */
function scoreBaseinverse(board: Board, groups: Group[], piece: Cell): number {
  const opp: Cell = piece === AI ? PLAYER : AI;

  // Find all directly playable empty squares
  const playableSquares: Square[] = [];
  for (let c = 0; c < COLS; c++) {
    const r = getDropRow(board, c);
    if (r >= 0) playableSquares.push({ row: r, col: c });
  }

  if (playableSquares.length < 2) return 0;

  let score = 0;

  // For each opponent group, check if its empty squares are a subset of playable squares
  // that form a baseinverse pair (exactly 2 playable empties in different columns)
  for (const g of groups) {
    if (g.owner !== opp) continue;
    if (g.filledCount < 2) continue; // Only care about 2-of-4 or 3-of-4

    // Check if at least 2 empty squares are directly playable
    const playableEmpties = g.emptySquares.filter((sq) =>
      playableSquares.some((ps) => ps.row === sq.row && ps.col === sq.col)
    );

    if (playableEmpties.length >= 2) {
      // Controller can guarantee getting at least one of these squares,
      // partially disrupting the opponent's group
      score += VICTOR_BASEINVERSE;
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Rule 3: Vertical
// ---------------------------------------------------------------------------

/**
 * Vertical: Two empty squares directly above each other in the same column
 * where the upper square is on an odd row (Allis-odd).
 * Solves groups containing both squares (must be vertical groups).
 *
 * Key insight: the first player (who controls odd rows) benefits because
 * the opponent must fill the lower square first, giving the first player
 * the odd (upper) square.
 */
function scoreVertical(board: Board, groups: Group[], piece: Cell, firstPlayer: Cell): number {
  let score = 0;
  const opp: Cell = piece === AI ? PLAYER : AI;

  // Find vertical pairs: two consecutive empties where upper is odd
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 1; r++) {
      if (board[r][c] !== EMPTY || board[r + 1][c] !== EMPTY) continue;
      // r is upper, r+1 is lower
      if (!isOddSquare(r)) continue;

      // The first player benefits from this vertical pair
      // because they control odd squares
      const beneficiary = firstPlayer;

      // Find groups containing both squares
      for (const g of groups) {
        if (g.owner === opp && g.owner !== beneficiary) {
          // Opponent group needing both squares is neutralized
          const hasBoth = g.squares.some(
            (sq) => sq.row === r && sq.col === c
          ) && g.squares.some(
            (sq) => sq.row === r + 1 && sq.col === c
          );
          if (hasBoth) {
            if (g.filledCount === 3) score += VICTOR_VERTICAL_3;
            else if (g.filledCount === 2) score += VICTOR_VERTICAL_2;
          }
        }

        // Own group containing both squares: the beneficiary gets the odd square
        if (g.owner === piece && piece === beneficiary) {
          const hasBoth = g.squares.some(
            (sq) => sq.row === r && sq.col === c
          ) && g.squares.some(
            (sq) => sq.row === r + 1 && sq.col === c
          );
          if (hasBoth) {
            if (g.filledCount === 3) score += VICTOR_VERTICAL_3;
            else if (g.filledCount === 2) score += VICTOR_VERTICAL_2;
          }
        }
      }
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Rule 4: Before
// ---------------------------------------------------------------------------

/**
 * Before: A group G is completable "before" an opponent group H if
 * G's lowest empty square is playable at or below H's empty squares.
 * Due to gravity, G resolves first.
 */
function scoreBefore(board: Board, groups: Group[], piece: Cell): number {
  let score = 0;
  const opp: Cell = piece === AI ? PLAYER : AI;

  const myGroups = groups.filter((g) => g.owner === piece && g.filledCount >= 2);
  const oppGroups = groups.filter((g) => g.owner === opp && g.filledCount >= 2);

  for (const mine of myGroups) {
    if (mine.emptySquares.length === 0) continue;

    // Find the lowest empty square of my group (highest row index = lowest on board)
    const myLowest = mine.emptySquares.reduce((best, sq) =>
      sq.row > best.row ? sq : best
    );

    // Check if the lowest empty square is directly playable
    if (!isPlayable(board, myLowest.row, myLowest.col)) continue;

    for (const their of oppGroups) {
      if (their.emptySquares.length === 0) continue;

      // Find the lowest empty square of opponent group
      const theirLowest = their.emptySquares.reduce((best, sq) =>
        sq.row > best.row ? sq : best
      );

      // My group's playable square is at or below opponent's lowest empty
      // → my group can be completed before theirs
      if (myLowest.row >= theirLowest.row) {
        // Bonus based on how dangerous both groups are
        const myStrength = mine.filledCount;
        const theirStrength = their.filledCount;

        if (myStrength === 3 && theirStrength >= 2) {
          score += VICTOR_BEFORE_3;
        } else if (myStrength === 2 && theirStrength >= 2) {
          score += VICTOR_BEFORE_2;
        }
      }
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Rule 5: Aftereven
// ---------------------------------------------------------------------------

/**
 * Aftereven: If all empty squares in a group can be claimed via Claimeven
 * (all on favorable parity), then the group will eventually be completed.
 * This grants a stronger bonus than plain Claimeven because completion is
 * guaranteed.
 */
function scoreAftereven(groups: Group[], piece: Cell, firstPlayer: Cell): number {
  let score = 0;

  for (const g of groups) {
    if (g.owner !== piece) continue;
    if (g.emptySquares.length === 0) continue;

    // Check if ALL empty squares are on favorable parity
    const allClaimable = g.emptySquares.every((sq) =>
      isFavorableParity(sq.row, piece, firstPlayer)
    );

    if (!allClaimable) continue;

    // Additionally, each empty square must have a square below it (the odd/even pair)
    // for Claimeven to actually apply (the column isn't full below)
    const allHavePartner = g.emptySquares.every((sq) => {
      if (sq.row === ROWS - 1) return false; // Bottom row can't have claimeven partner below
      return true; // Square above bottom has a square below
    });

    if (!allHavePartner) continue;

    // This group will eventually be completed via Claimeven chain
    if (g.filledCount === 3) score += VICTOR_AFTEREVEN_3;
    else if (g.filledCount === 2) score += VICTOR_AFTEREVEN_2;
  }

  return score;
}

// ---------------------------------------------------------------------------
// Rule 6: Lowinverse
// ---------------------------------------------------------------------------

/**
 * Lowinverse: Two columns each with 2+ empty squares where the lowest
 * empty squares form a pair. The controller guarantees at least one
 * of the two low squares.
 */
function scoreLowinverse(board: Board, groups: Group[], piece: Cell): number {
  const opp: Cell = piece === AI ? PLAYER : AI;

  // Find columns with 2+ empty squares and their lowest empty square
  const columnsWithLowSquare: { col: number; lowRow: number; emptyCount: number }[] = [];

  for (let c = 0; c < COLS; c++) {
    let emptyCount = 0;
    let lowRow = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] === EMPTY) {
        emptyCount++;
        if (lowRow === -1) lowRow = r;
      }
    }
    if (emptyCount >= 2 && lowRow >= 0) {
      columnsWithLowSquare.push({ col: c, lowRow, emptyCount });
    }
  }

  if (columnsWithLowSquare.length < 2) return 0;

  let score = 0;

  // For each pair of qualifying columns, check if opponent groups
  // require both low squares
  for (let i = 0; i < columnsWithLowSquare.length; i++) {
    for (let j = i + 1; j < columnsWithLowSquare.length; j++) {
      const colA = columnsWithLowSquare[i];
      const colB = columnsWithLowSquare[j];

      // Check if any opponent group needs both low squares
      for (const g of groups) {
        if (g.owner !== opp) continue;
        if (g.filledCount < 2) continue;

        const needsA = g.emptySquares.some(
          (sq) => sq.row === colA.lowRow && sq.col === colA.col
        );
        const needsB = g.emptySquares.some(
          (sq) => sq.row === colB.lowRow && sq.col === colB.col
        );

        if (needsA && needsB) {
          score += VICTOR_LOWINVERSE;
        }
      }
    }
  }

  return score;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a Victor-rules-based evaluation score for the given board
 * from the perspective of `piece`.
 *
 * This is added to (not replaces) the standard window-based scoreBoard.
 */
export function victorEvaluate(board: Board, piece: Cell): number {
  const groups = enumerateGroups(board);
  const firstPlayer = getFirstPlayer(board);

  return (
    scoreClaimeven(groups, piece, firstPlayer) +
    scoreBaseinverse(board, groups, piece) +
    scoreVertical(board, groups, piece, firstPlayer) +
    scoreBefore(board, groups, piece) +
    scoreAftereven(groups, piece, firstPlayer) +
    scoreLowinverse(board, groups, piece)
  );
}

/**
 * Reorder columns by threat-based priority for better alpha-beta pruning.
 * Returns columns sorted by estimated value (best first).
 */
export function victorMoveOrder(
  board: Board,
  piece: Cell,
  cols: number[]
): number[] {
  const firstPlayer = getFirstPlayer(board);
  const scored = cols.map((col) => {
    const row = getDropRow(board, col);
    if (row < 0) return { col, score: -Infinity };

    let moveScore = 0;

    // Center preference (retain existing heuristic)
    moveScore += (3 - Math.abs(col - 3)) * 2;

    // Parity: prefer moves that land on our favorable parity
    if (isFavorableParity(row, piece, firstPlayer)) moveScore += 4;

    // Threat analysis: count how many of our groups this move advances
    // and how many opponent groups it blocks
    const groups = enumerateGroups(board);
    const opp: Cell = piece === AI ? PLAYER : AI;

    for (const g of groups) {
      const touchesMove = g.emptySquares.some(
        (sq) => sq.row === row && sq.col === col
      );
      if (!touchesMove) continue;

      if (g.owner === piece) {
        // This move advances our group
        if (g.filledCount === 3) moveScore += 50; // Near-complete our group
        else if (g.filledCount === 2) moveScore += 8;
        else moveScore += 2;
      } else if (g.owner === opp) {
        // This move blocks opponent group
        if (g.filledCount === 3) moveScore += 40; // Block near-complete threat
        else if (g.filledCount === 2) moveScore += 5;
      }
    }

    return { col, score: moveScore };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.col);
}
