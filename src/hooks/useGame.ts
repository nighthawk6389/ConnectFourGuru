"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Board, Difficulty, PLAYER, AI } from "@/lib/constants";
import { emptyBoard, dropPiece, checkWin, isDraw, WinResult } from "@/lib/game";
import { getBestMove } from "@/lib/ai";

export type GamePhase = "idle" | "player" | "thinking" | "over";

export interface Score {
  player: number;
  ai: number;
  draws: number;
}

export interface GameState {
  board: Board;
  phase: GamePhase;
  winResult: WinResult;
  score: Score;
  difficulty: Difficulty;
  hoverCol: number | null;
  newGame: () => void;
  setDifficulty: (d: Difficulty) => void;
  handleColClick: (col: number) => void;
  handleColHover: (col: number | null) => void;
}

export function useGame(): GameState {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [phase, setPhase] = useState<GamePhase>("player");
  const [winResult, setWinResult] = useState<WinResult>(null);
  const [score, setScore] = useState<Score>({ player: 0, ai: 0, draws: 0 });
  const [difficulty, setDifficultyState] = useState<Difficulty>("medium");
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  // Keep a ref to difficulty so the AI timeout closure always sees current value
  const difficultyRef = useRef<Difficulty>(difficulty);
  difficultyRef.current = difficulty;

  const endGame = useCallback((result: WinResult, currentBoard: Board) => {
    setWinResult(result);
    setPhase("over");
    if (result === null) {
      // Draw — only update score if board truly full
      if (isDraw(currentBoard)) {
        setScore((s) => ({ ...s, draws: s.draws + 1 }));
      }
    } else if (result.winner === PLAYER) {
      setScore((s) => ({ ...s, player: s.player + 1 }));
    } else {
      setScore((s) => ({ ...s, ai: s.ai + 1 }));
    }
  }, []);

  // AI move — runs whenever phase becomes "thinking"
  useEffect(() => {
    if (phase !== "thinking") return;

    const id = setTimeout(() => {
      const col = getBestMove(board, difficultyRef.current);
      const next = dropPiece(board, col, AI);
      setBoard(next);

      const win = checkWin(next);
      if (win || isDraw(next)) {
        endGame(win, next);
      } else {
        setPhase("player");
      }
    }, 300); // short delay so "thinking" indicator is visible

    return () => clearTimeout(id);
  }, [phase, board, endGame]);

  const handleColClick = useCallback(
    (col: number) => {
      if (phase !== "player") return;
      if (board[0][col] !== 0) return; // column full

      const next = dropPiece(board, col, PLAYER);
      setBoard(next);

      const win = checkWin(next);
      if (win || isDraw(next)) {
        endGame(win, next);
      } else {
        setPhase("thinking");
      }
    },
    [phase, board, endGame]
  );

  const handleColHover = useCallback((col: number | null) => {
    setHoverCol(col);
  }, []);

  const newGame = useCallback(() => {
    setBoard(emptyBoard());
    setPhase("player");
    setWinResult(null);
    setHoverCol(null);
  }, []);

  const setDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d);
    difficultyRef.current = d;
  }, []);

  return {
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
  };
}
