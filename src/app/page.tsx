"use client";

import { useGame } from "@/hooks/useGame";
import Board from "@/components/Board";
import ScoreBoard from "@/components/ScoreBoard";
import GameControls from "@/components/GameControls";
import WinnerModal from "@/components/WinnerModal";
import VictorSidebar from "@/components/VictorSidebar";
import { isDraw } from "@/lib/game";

export default function Home() {
  const {
    board,
    phase,
    winResult,
    score,
    difficulty,
    hoverCol,
    newGame,
    setDifficulty,
    handleColClick,
    handleColHover,
  } = useGame();

  const draw = phase === "over" && winResult === null && isDraw(board);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-8 bg-slate-900">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Connect Four <span className="text-blue-400">Guru</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1 h-5">
          {phase === "player" && "Your turn — click a column"}
          {phase === "thinking" && (
            <span className="text-yellow-300">CPU is thinking…</span>
          )}
          {phase === "over" &&
            (winResult
              ? winResult.winner === 1
                ? "You won! 🎉"
                : "CPU wins! 🤖"
              : "It's a draw! 🤝")}
        </p>
      </div>

      {/* Score */}
      <ScoreBoard score={score} />

      {/* End-of-game banner — appears above the board */}
      <WinnerModal winResult={winResult} isDraw={draw} onNewGame={newGame} />

      {/* Board */}
      <Board
        board={board}
        winResult={winResult}
        hoverCol={hoverCol}
        phase={phase}
        onColClick={handleColClick}
        onColHover={handleColHover}
      />

      {/* Controls */}
      <GameControls
        difficulty={difficulty}
        onDifficultyChange={setDifficulty}
        onNewGame={newGame}
        thinking={phase === "thinking"}
      />

      {/* VICTOR collapsible sidebar */}
      <VictorSidebar />
    </main>
  );
}
