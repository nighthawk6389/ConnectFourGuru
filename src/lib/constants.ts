export const ROWS = 6;
export const COLS = 7;

export const EMPTY = 0;
export const PLAYER = 1;
export const AI = 2;

export type Cell = 0 | 1 | 2;
export type Board = Cell[][];

// Move order: center-out for maximum alpha-beta pruning efficiency
export const MOVE_ORDER = [3, 2, 4, 1, 5, 0, 6];

// Evaluation weights
export const SCORE_WIN = 100_000;
export const SCORE_THREE = 5;
export const SCORE_TWO = 2;
export const SCORE_OPP_THREE = -4;
export const SCORE_CENTER = 3;

export type Difficulty = "easy" | "medium" | "hard" | "guru" | "victor";

export const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 3,
  medium: 5,
  hard: 10,
  guru: 14,
  victor: 14,
};

// Victor-rules evaluation weights (Allis's strategic rules)
// Weights are scaled to be significant relative to the base evaluation
// (SCORE_THREE=5 per window × many windows) so the strategic analysis
// reliably influences move selection at depth 8+.
export const VICTOR_CLAIMEVEN_3 = 100;
export const VICTOR_CLAIMEVEN_2 = 25;
export const VICTOR_CLAIMEVEN_1 = 8;
export const VICTOR_BEFORE_3 = 150;
export const VICTOR_BEFORE_2 = 50;
export const VICTOR_VERTICAL_3 = 50;
export const VICTOR_VERTICAL_2 = 20;
export const VICTOR_AFTEREVEN_3 = 60;
export const VICTOR_AFTEREVEN_2 = 20;
export const VICTOR_BASEINVERSE = 40;
export const VICTOR_LOWINVERSE = 30;
