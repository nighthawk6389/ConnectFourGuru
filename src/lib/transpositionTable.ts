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
 * Maximum number of entries before the table is cleared to reclaim memory.
 * 500 000 entries ≈ 15–20 MB in a typical JS engine — well within browser
 * limits while still providing significant cross-move cache benefit.
 */
export const MAX_TT_SIZE = 500_000;

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
   *
   * If the table exceeds MAX_TT_SIZE, it is cleared first to cap memory
   * usage.  Iterative deepening quickly repopulates the entries needed for
   * the current search.
   */
  set(hash: number, entry: TTEntry): void {
    const existing = this.table.get(hash);
    if (existing) {
      if (existing.depth <= entry.depth) {
        this.table.set(hash, entry);
      }
      return;
    }
    // New entry — enforce size cap
    if (this.table.size >= MAX_TT_SIZE) {
      this.table.clear();
    }
    this.table.set(hash, entry);
  }

  clear(): void {
    this.table.clear();
  }

  get size(): number {
    return this.table.size;
  }
}
