"use client";

import { PLAYER, AI } from "@/lib/constants";
import { Cell as CellValue } from "@/lib/constants";

interface CellProps {
  value: CellValue;
  isWinCell: boolean;
  isHovered: boolean;
  row: number;
}

const PIECE_COLOR: Record<number, string> = {
  [PLAYER]: "bg-red-500",
  [AI]: "bg-yellow-400",
};

const WIN_RING: Record<number, string> = {
  [PLAYER]: "ring-4 ring-white ring-offset-2 ring-offset-red-500",
  [AI]: "ring-4 ring-white ring-offset-2 ring-offset-yellow-400",
};

export default function Cell({ value, isWinCell, isHovered, row }: CellProps) {
  const hasPiece = value !== 0;

  return (
    <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
      <div
        className={[
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-100",
          hasPiece
            ? `${PIECE_COLOR[value]} ${isWinCell ? WIN_RING[value] + " scale-110" : ""}`
            : isHovered
            ? "bg-red-200 opacity-60"
            : "bg-blue-950",
          hasPiece ? "piece-drop" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          hasPiece
            ? ({ "--drop-rows": row } as React.CSSProperties)
            : undefined
        }
      />
    </div>
  );
}
