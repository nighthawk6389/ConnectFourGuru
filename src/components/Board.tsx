"use client";

import { Board as BoardType } from "@/lib/constants";
import { ROWS, COLS } from "@/lib/constants";
import Cell from "./Cell";
import { WinResult } from "@/lib/game";
import { GamePhase } from "@/hooks/useGame";

interface BoardProps {
  board: BoardType;
  winResult: WinResult;
  hoverCol: number | null;
  phase: GamePhase;
  onColClick: (col: number) => void;
  onColHover: (col: number | null) => void;
}

function isWinCell(
  winResult: WinResult,
  row: number,
  col: number
): boolean {
  if (!winResult) return false;
  return winResult.cells.some(([r, c]) => r === row && c === col);
}

export default function Board({
  board,
  winResult,
  hoverCol,
  phase,
  onColClick,
  onColHover,
}: BoardProps) {
  const clickable = phase === "player";

  return (
    <div
      data-testid="board"
      className="bg-blue-600 rounded-2xl p-3 shadow-2xl select-none"
      onMouseLeave={() => onColHover(null)}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {/* Column click targets — invisible row above the board */}
        {Array.from({ length: COLS }, (_, col) => (
          <div
            key={`btn-${col}`}
            data-testid={`col-btn-${col}`}
            className={[
              "h-6 flex items-center justify-center transition-colors",
              clickable ? "cursor-pointer" : "cursor-default",
            ].join(" ")}
            onClick={() => clickable && onColClick(col)}
            onMouseEnter={() => clickable && onColHover(col)}
          >
            {hoverCol === col && clickable && (
              <div className="w-4 h-4 rounded-full bg-red-400 opacity-80 animate-bounce" />
            )}
          </div>
        ))}

        {/* Board cells */}
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLS }, (_, col) => (
            <div
              key={`${row}-${col}`}
              onClick={() => clickable && onColClick(col)}
              onMouseEnter={() => clickable && onColHover(col)}
              className={clickable ? "cursor-pointer" : "cursor-default"}
            >
              <Cell
                value={board[row][col]}
                isWinCell={isWinCell(winResult, row, col)}
                isHovered={hoverCol === col && board[row][col] === 0}
                row={row}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
