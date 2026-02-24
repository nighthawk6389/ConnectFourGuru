"use client";

import { Difficulty } from "@/lib/constants";

interface GameControlsProps {
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  onNewGame: () => void;
  thinking: boolean;
}

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "guru", label: "Guru" },
];

export default function GameControls({
  difficulty,
  onDifficultyChange,
  onNewGame,
  thinking,
}: GameControlsProps) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Thinking indicator */}
      <div className="h-6 flex items-center">
        {thinking && (
          <span className="text-yellow-300 text-sm font-medium animate-pulse">
            CPU is thinking…
          </span>
        )}
      </div>

      {/* Difficulty selector */}
      <div className="flex gap-2 flex-wrap justify-center">
        {DIFFICULTIES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onDifficultyChange(value)}
            className={[
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              difficulty === value
                ? "bg-blue-500 text-white shadow-lg scale-105"
                : "bg-white/10 text-gray-300 hover:bg-white/20",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* New Game button */}
      <button
        onClick={onNewGame}
        className="px-8 py-2.5 rounded-full bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-semibold transition-all shadow-lg"
      >
        New Game
      </button>
    </div>
  );
}
