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

export type Difficulty = "easy" | "medium" | "hard" | "guru";

export const DEPTH_MAP: Record<Difficulty, number> = {
  easy: 3,
  medium: 6,
  hard: 10,
  guru: 14,
};
