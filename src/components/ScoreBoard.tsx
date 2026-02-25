"use client";

import { Score } from "@/hooks/useGame";

interface ScoreBoardProps {
  score: Score;
}

export default function ScoreBoard({ score }: ScoreBoardProps) {
  return (
    <div className="flex gap-4 justify-center text-center">
      <div data-testid="score-player" className="flex flex-col items-center bg-white/10 rounded-xl px-5 py-3 min-w-[80px]">
        <span className="text-2xl font-bold text-red-400">{score.player}</span>
        <span className="text-xs text-gray-300 mt-1 uppercase tracking-wide">You</span>
      </div>
      <div data-testid="score-draws" className="flex flex-col items-center bg-white/10 rounded-xl px-5 py-3 min-w-[80px]">
        <span className="text-2xl font-bold text-gray-400">{score.draws}</span>
        <span className="text-xs text-gray-300 mt-1 uppercase tracking-wide">Draws</span>
      </div>
      <div data-testid="score-cpu" className="flex flex-col items-center bg-white/10 rounded-xl px-5 py-3 min-w-[80px]">
        <span className="text-2xl font-bold text-yellow-400">{score.ai}</span>
        <span className="text-xs text-gray-300 mt-1 uppercase tracking-wide">CPU</span>
      </div>
    </div>
  );
}
