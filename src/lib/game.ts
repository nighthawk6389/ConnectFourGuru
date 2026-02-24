import { ROWS, COLS, EMPTY, Cell, Board } from "./constants";

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY) as Cell[]);
}

/** Returns the row index where a piece would land in `col`, or -1 if full. */
export function getDropRow(board: Board, col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === EMPTY) return row;
  }
  return -1;
}

/** Returns a new board with `piece` dropped into `col`. Does not mutate. */
export function dropPiece(board: Board, col: number, piece: Cell): Board {
  const row = getDropRow(board, col);
  if (row === -1) return board;
  const next = board.map((r) => [...r] as Cell[]);
  next[row][col] = piece;
  return next;
}

export type WinResult = { winner: Cell; cells: [number, number][] } | null;

/** Checks all four directions for a 4-in-a-row. Returns winner + winning cells, or null. */
export function checkWin(board: Board): WinResult {
  const directions: [number, number][] = [
    [0, 1],  // horizontal
    [1, 0],  // vertical
    [1, 1],  // diagonal ↘
    [1, -1], // diagonal ↙
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const piece = board[row][col];
      if (piece === EMPTY) continue;

      for (const [dr, dc] of directions) {
        const cells: [number, number][] = [[row, col]];
        for (let k = 1; k < 4; k++) {
          const r = row + dr * k;
          const c = col + dc * k;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
          if (board[r][c] !== piece) break;
          cells.push([r, c]);
        }
        if (cells.length === 4) return { winner: piece, cells };
      }
    }
  }
  return null;
}

/** Returns true if the board is full (draw). */
export function isDraw(board: Board): boolean {
  return board[0].every((cell) => cell !== EMPTY);
}

/** Returns list of valid columns (not full). */
export function validCols(board: Board): number[] {
  return Array.from({ length: COLS }, (_, c) => c).filter(
    (c) => board[0][c] === EMPTY
  );
}
