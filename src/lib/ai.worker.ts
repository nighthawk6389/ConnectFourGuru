/// <reference lib="webworker" />

/**
 * Web Worker that runs the AI search off the main thread.
 *
 * Messages IN:  { board: Board; difficulty: Difficulty }
 * Messages OUT: { col: number }
 *
 * This keeps the UI responsive during the "thinking" phase, especially
 * at higher search depths (Hard / Guru).
 */

import { getBestMove } from "./ai";
import type { Board, Difficulty } from "./constants";

self.addEventListener(
  "message",
  (e: MessageEvent<{ board: Board; difficulty: Difficulty }>) => {
    const { board, difficulty } = e.data;
    const col = getBestMove(board, difficulty);
    (self as DedicatedWorkerGlobalScope).postMessage({ col });
  }
);
