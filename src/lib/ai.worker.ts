/// <reference lib="webworker" />

/**
 * Web Worker that runs the AI search off the main thread.
 *
 * Messages IN:
 *   { type: "move";    board: Board; difficulty: Difficulty; moveId: number }
 *   { type: "clearTT" }
 *
 * Messages OUT (only for "move"):
 *   { col: number; moveId: number }
 *
 * The worker is kept alive between moves so the module-level transposition
 * table in ai.ts persists across searches, giving later moves a warm cache.
 */

import { getBestMove, clearTranspositionTable } from "./ai";
import type { Board, Difficulty } from "./constants";

interface MoveMessage {
  type: "move";
  board: Board;
  difficulty: Difficulty;
  moveId: number;
}

interface ClearTTMessage {
  type: "clearTT";
}

type WorkerMessage = MoveMessage | ClearTTMessage;

self.addEventListener(
  "message",
  (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data;

    if (msg.type === "clearTT") {
      clearTranspositionTable();
      return;
    }

    // type === "move"
    const { board, difficulty, moveId } = msg;
    const col = getBestMove(board, difficulty);
    (self as DedicatedWorkerGlobalScope).postMessage({ col, moveId });
  }
);
