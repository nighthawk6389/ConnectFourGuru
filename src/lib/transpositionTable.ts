import { Board, ROWS, COLS, EMPTY } from "./constants";

// ---------------------------------------------------------------------------
// Zobrist hashing
// ---------------------------------------------------------------------------

/**
 * Linear-congruential PRNG used to generate deterministic Zobrist keys.
 * Using fixed seeds makes the hash values reproducible across environments
 * and test runs.
 */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    // Knuth's multiplicative hash (32-bit)
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };
}

const rand = lcg(0xdeadbeef);

/**
 * ZOBRIST[row][col][pieceIndex]
 * pieceIndex = piece - 1  (PLAYER=1 → 0, AI=2 → 1)
 * All values generated deterministically from the same seed.
 */
export const ZOBRIST: number[][][] = Array.from({ length: ROWS }, () =>
  Array.from({ length: COLS }, () => [rand(), rand()])
);

/** Compute the Zobrist hash for a full board from scratch. */
export function computeBoardHash(board: Board): number {
  let hash = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (cell !== EMPTY) {
        hash ^= ZOBRIST[r][c][cell - 1];
      }
    }
  }
  return hash;
}

// ---------------------------------------------------------------------------
// Transposition table
// ---------------------------------------------------------------------------

/** Alpha-beta bound type stored alongside each TT entry. */
export type TTFlag = "exact" | "lower" | "upper";

export interface TTEntry {
  depth: number;
  score: number;
  flag: TTFlag;
}

/**
 * Hash map from Zobrist hash → search result.
 * Stores the best score found for a position plus the bound type so that
 * alpha-beta cutoffs can be applied on a cache hit.
 */
export class TranspositionTable {
  private readonly table = new Map<number, TTEntry>();

  get(hash: number): TTEntry | undefined {
    return this.table.get(hash);
  }

  /**
   * Store an entry, but only overwrite an existing entry if the new search
   * was at least as deep (deeper results are more accurate).
   */
  set(hash: number, entry: TTEntry): void {
    const existing = this.table.get(hash);
    if (!existing || existing.depth <= entry.depth) {
      this.table.set(hash, entry);
    }
  }

  clear(): void {
    this.table.clear();
  }

  get size(): number {
    return this.table.size;
  }
}
