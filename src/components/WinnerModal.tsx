"use client";

import { PLAYER, AI } from "@/lib/constants";
import { WinResult } from "@/lib/game";

interface WinnerModalProps {
  winResult: WinResult;
  isDraw: boolean;
  onNewGame: () => void;
}

export default function WinnerModal({
  winResult,
  isDraw,
  onNewGame,
}: WinnerModalProps) {
  const show = winResult !== null || isDraw;
  if (!show) return null;

  let emoji: string;
  let headline: string;
  let subline: string;
  let accentColor: string;

  if (isDraw) {
    emoji = "🤝";
    headline = "It's a Draw!";
    subline = "Nobody wins this time.";
    accentColor = "text-gray-300";
  } else if (winResult?.winner === PLAYER) {
    emoji = "🎉";
    headline = "You Win!";
    subline = "Amazing — you beat the AI!";
    accentColor = "text-red-400";
  } else {
    emoji = "🤖";
    headline = "CPU Wins!";
    subline = "Better luck next time.";
    accentColor = "text-yellow-400";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 flex flex-col items-center gap-5 shadow-2xl max-w-xs w-full mx-4 animate-pop">
        <span className="text-6xl">{emoji}</span>
        <div className="text-center">
          <h2 className={`text-3xl font-bold ${accentColor}`}>{headline}</h2>
          <p className="text-gray-400 mt-1">{subline}</p>
        </div>
        <button
          onClick={onNewGame}
          className="px-8 py-3 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-semibold text-lg transition-all shadow-lg"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
