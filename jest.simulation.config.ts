import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  // Pure game-logic tests — no DOM APIs needed.
  testEnvironment: "node",

  // Reuse the same path alias as the main config.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Only picks up files under src/__tests__/simulation/.
  // This directory is intentionally excluded from the main jest.config.ts
  // testMatch so simulation tests never run during `npm test`.
  testMatch: ["<rootDir>/src/__tests__/simulation/**/*.test.ts"],

  // Per-test timeout: 2 minutes (depth-6 games finish in < 5 s each in
  // practice, but allow headroom for slower CI environments).
  testTimeout: 120_000,
};

export default createJestConfig(config);
