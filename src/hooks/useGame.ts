"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Board, Difficulty, PLAYER, AI } from "@/lib/constants";
import { emptyBoard, dropPiece, checkWin, isDraw, WinResult } from "@/lib/game";
import { getBestMove } from "@/lib/ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Persistent score — localStorage helpers
// ---------------------------------------------------------------------------

const SCORE_KEY = "connect-four-score";

function loadScore(): Score {
  try {
    if (typeof window === "undefined") return { player: 0, ai: 0, draws: 0 };
    const saved = localStorage.getItem(SCORE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        "player" in parsed &&
        "ai" in parsed &&
        "draws" in parsed &&
        typeof (parsed as Record<string, unknown>).player === "number" &&
        typeof (parsed as Record<string, unknown>).ai === "number" &&
        typeof (parsed as Record<string, unknown>).draws === "number"
      ) {
        return parsed as Score;
      }
    }
  } catch {
    // Ignore storage errors (private mode, quota exceeded, etc.)
  }
  return { player: 0, ai: 0, draws: 0 };
}

function saveScore(score: Score): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(SCORE_KEY, JSON.stringify(score));
  } catch {
    // Ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame(): GameState {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [phase, setPhase] = useState<GamePhase>("player");
  const [winResult, setWinResult] = useState<WinResult>(null);
  // Initialise score from localStorage so it persists across page refreshes
  const [score, setScore] = useState<Score>(loadScore);
  const [difficulty, setDifficultyState] = useState<Difficulty>("medium");
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  // Keep a ref to difficulty so the AI timeout/worker closure always sees current value
  const difficultyRef = useRef<Difficulty>(difficulty);
  useEffect(() => {
    difficultyRef.current = difficulty;
  });

  // Persist score to localStorage whenever it changes
  useEffect(() => {
    saveScore(score);
  }, [score]);

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

  // AI move — runs whenever phase becomes "thinking".
  // Uses a Web Worker when available so the search never blocks the main thread.
  // Falls back to a synchronous setTimeout call (also used in Jest/jsdom where
  // Worker is undefined).
  useEffect(() => {
    if (phase !== "thinking") return;

    // Capture board & difficulty at the moment this effect fires
    const currentBoard = board;
    const currentDifficulty = difficultyRef.current;

    const processAIMove = (col: number) => {
      const next = dropPiece(currentBoard, col, AI);
      setBoard(next);
      const win = checkWin(next);
      if (win || isDraw(next)) {
        endGame(win, next);
      } else {
        setPhase("player");
      }
    };

    // E2E test hook — Playwright tests can set window.__TEST_AI_COL to force
    // a specific column, bypassing the real AI and the Web Worker.
    // This runs in the main thread so the window variable is always reachable.
    if (typeof window !== "undefined") {
      const e2eCol = (window as unknown as Record<string, unknown>).__TEST_AI_COL;
      if (typeof e2eCol === "number") {
        const id = setTimeout(() => processAIMove(e2eCol), 300);
        return () => clearTimeout(id);
      }
    }

    // Try Web Worker path (non-blocking)
    if (typeof Worker !== "undefined") {
      let worker: Worker | null = null;
      try {
        worker = new Worker(
          new URL("../lib/ai.worker.ts", import.meta.url)
        );

        worker.onmessage = (e: MessageEvent<{ col: number }>) => {
          processAIMove(e.data.col);
        };

        worker.onerror = () => {
          // Worker failed mid-flight — fall back to synchronous
          worker?.terminate();
          const col = getBestMove(currentBoard, currentDifficulty);
          processAIMove(col);
        };

        worker.postMessage({ board: currentBoard, difficulty: currentDifficulty });

        return () => {
          worker?.terminate();
        };
      } catch {
        // Worker construction failed (e.g. CSP or bundler issue) — fall through
        worker?.terminate();
      }
    }

    // Synchronous fallback with short delay so "thinking" indicator is visible
    const id = setTimeout(() => {
      const col = getBestMove(currentBoard, currentDifficulty);
      processAIMove(col);
    }, 300);

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
