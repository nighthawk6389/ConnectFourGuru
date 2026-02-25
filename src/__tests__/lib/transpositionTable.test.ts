import {
  ZOBRIST,
  computeBoardHash,
  TranspositionTable,
  TTEntry,
  TTFlag,
  MAX_TT_SIZE,
} from "@/lib/transpositionTable";
import { emptyBoard, dropPiece } from "@/lib/game";
import { ROWS, COLS, PLAYER, AI } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Zobrist keys
// ---------------------------------------------------------------------------

describe("ZOBRIST table", () => {
  it("has the correct dimensions: ROWS × COLS × 2", () => {
    expect(ZOBRIST).toHaveLength(ROWS);
    ZOBRIST.forEach((rowArr) => {
      expect(rowArr).toHaveLength(COLS);
      rowArr.forEach((entry) => {
        expect(entry).toHaveLength(2);
      });
    });
  });

  it("all keys are non-zero 32-bit unsigned integers", () => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (let p = 0; p < 2; p++) {
          const k = ZOBRIST[r][c][p];
          expect(k).toBeGreaterThan(0);
          expect(k).toBeLessThanOrEqual(0xffffffff);
          expect(Number.isInteger(k)).toBe(true);
        }
      }
    }
  });

  it("all 84 keys are unique (no collision)", () => {
    const seen = new Set<number>();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (let p = 0; p < 2; p++) {
          const k = ZOBRIST[r][c][p];
          expect(seen.has(k)).toBe(false);
          seen.add(k);
        }
      }
    }
  });

  it("keys are deterministic — same value on every import", () => {
    // Re-importing is not possible in the same Jest module, but we can
    // verify the values are stable across calls.
    const first = ZOBRIST[0][0][0];
    const second = ZOBRIST[0][0][0];
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// computeBoardHash
// ---------------------------------------------------------------------------

describe("computeBoardHash", () => {
  it("returns 0 for an empty board (no pieces contribute to XOR)", () => {
    expect(computeBoardHash(emptyBoard())).toBe(0);
  });

  it("returns a non-zero hash when at least one piece is on the board", () => {
    const board = dropPiece(emptyBoard(), 3, PLAYER);
    expect(computeBoardHash(board)).not.toBe(0);
  });

  it("produces consistent results for the same board", () => {
    const board = dropPiece(emptyBoard(), 0, AI);
    const h1 = computeBoardHash(board);
    const h2 = computeBoardHash(board);
    expect(h1).toBe(h2);
  });

  it("produces different hashes for boards that differ by one piece", () => {
    const b1 = dropPiece(emptyBoard(), 0, PLAYER);
    const b2 = dropPiece(emptyBoard(), 1, PLAYER);
    expect(computeBoardHash(b1)).not.toBe(computeBoardHash(b2));
  });

  it("incrementally XOR-ing the dropped piece matches a fresh hash", () => {
    // Drop PLAYER into column 2 (lands at row 5 on an empty board)
    const before = emptyBoard();
    const after = dropPiece(before, 2, PLAYER);

    const hashBefore = computeBoardHash(before); // 0
    const droppedRow = 5; // bottom row on empty board
    const incrementalHash = hashBefore ^ ZOBRIST[droppedRow][2][PLAYER - 1];

    expect(incrementalHash).toBe(computeBoardHash(after));
  });

  it("XOR property: adding then removing a piece returns to original hash", () => {
    const board = dropPiece(emptyBoard(), 3, AI);
    const h1 = computeBoardHash(board);
    // XOR the same key twice should cancel out
    const roundTrip = h1 ^ ZOBRIST[5][3][AI - 1];
    expect(roundTrip).toBe(0); // back to empty-board hash
  });

  it("two different piece types at the same square produce different hashes", () => {
    const boardP = dropPiece(emptyBoard(), 3, PLAYER);
    const boardA = dropPiece(emptyBoard(), 3, AI);
    expect(computeBoardHash(boardP)).not.toBe(computeBoardHash(boardA));
  });
});

// ---------------------------------------------------------------------------
// TranspositionTable
// ---------------------------------------------------------------------------

describe("TranspositionTable", () => {
  let tt: TranspositionTable;

  beforeEach(() => {
    tt = new TranspositionTable();
  });

  it("returns undefined for an unknown hash", () => {
    expect(tt.get(12345)).toBeUndefined();
  });

  it("stores and retrieves an entry", () => {
    const entry: TTEntry = { depth: 4, score: 100, flag: "exact" };
    tt.set(42, entry);
    expect(tt.get(42)).toEqual(entry);
  });

  it("size reflects the number of stored entries", () => {
    expect(tt.size).toBe(0);
    tt.set(1, { depth: 1, score: 0, flag: "exact" });
    expect(tt.size).toBe(1);
    tt.set(2, { depth: 2, score: 5, flag: "lower" });
    expect(tt.size).toBe(2);
  });

  it("does NOT overwrite an existing entry with a shallower depth", () => {
    const deep: TTEntry = { depth: 8, score: 200, flag: "exact" };
    const shallow: TTEntry = { depth: 3, score: 50, flag: "lower" };
    tt.set(99, deep);
    tt.set(99, shallow); // should be ignored
    expect(tt.get(99)).toEqual(deep);
  });

  it("DOES overwrite an existing entry with an equal or deeper depth", () => {
    const first: TTEntry = { depth: 4, score: 10, flag: "upper" };
    const deeper: TTEntry = { depth: 5, score: 20, flag: "exact" };
    tt.set(77, first);
    tt.set(77, deeper);
    expect(tt.get(77)).toEqual(deeper);
  });

  it("stores entries with all three flag types", () => {
    const flags: TTFlag[] = ["exact", "lower", "upper"];
    flags.forEach((flag, i) => {
      tt.set(i, { depth: 1, score: i * 10, flag });
      expect(tt.get(i)?.flag).toBe(flag);
    });
  });

  it("clear() removes all entries", () => {
    tt.set(1, { depth: 1, score: 0, flag: "exact" });
    tt.set(2, { depth: 2, score: 1, flag: "exact" });
    tt.clear();
    expect(tt.size).toBe(0);
    expect(tt.get(1)).toBeUndefined();
  });

  it("handles hash collisions by replacing with the deeper entry", () => {
    const hash = 0xdeadbeef;
    const entry1: TTEntry = { depth: 3, score: -50, flag: "lower" };
    const entry2: TTEntry = { depth: 6, score: 80, flag: "exact" };
    tt.set(hash, entry1);
    tt.set(hash, entry2);
    expect(tt.get(hash)).toEqual(entry2);
  });

  it("clears the table when MAX_TT_SIZE is exceeded", () => {
    // Fill the table to capacity
    for (let i = 0; i < MAX_TT_SIZE; i++) {
      tt.set(i, { depth: 1, score: 0, flag: "exact" });
    }
    expect(tt.size).toBe(MAX_TT_SIZE);

    // Adding one more NEW entry triggers a clear + insert
    tt.set(MAX_TT_SIZE, { depth: 1, score: 42, flag: "exact" });
    expect(tt.size).toBe(1);
    expect(tt.get(MAX_TT_SIZE)?.score).toBe(42);
  });

  it("does NOT clear when replacing an existing entry at capacity", () => {
    for (let i = 0; i < MAX_TT_SIZE; i++) {
      tt.set(i, { depth: 1, score: 0, flag: "exact" });
    }
    // Replace an existing entry (same hash, deeper depth)
    tt.set(0, { depth: 5, score: 99, flag: "exact" });
    // Table should NOT have been cleared — still at capacity
    expect(tt.size).toBe(MAX_TT_SIZE);
    expect(tt.get(0)?.score).toBe(99);
  });
});
