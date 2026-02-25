"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { PLAYER } from "@/lib/constants";
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

  // Fire confetti when the human player wins
  useEffect(() => {
    if (winResult?.winner === PLAYER) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#ef4444", "#f87171", "#ffffff", "#fbbf24"],
      });
    }
  }, [winResult]);

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
    <div className="bg-gray-900 border border-white/10 rounded-2xl px-8 py-5 flex flex-row items-center gap-6 shadow-2xl w-full max-w-md mx-4 animate-pop">
      <span className="text-5xl">{emoji}</span>
      <div className="flex-1 text-center">
        <h2 className={`text-2xl font-bold ${accentColor}`}>{headline}</h2>
        <p className="text-gray-400 text-sm mt-0.5">{subline}</p>
      </div>
      <button
        onClick={onNewGame}
        className="px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-semibold text-base transition-all shadow-lg shrink-0"
      >
        Play Again
      </button>
    </div>
  );
}
