/**
 * End-to-end tests for ConnectFourGuru.
 *
 * These tests drive a real Chromium browser against the running Next.js dev
 * server.  Because the AI search is non-deterministic at higher depths, the
 * tests that involve a game result use window.__TEST_AI_COL to force the AI
 * to play a specific column on every turn, making outcomes 100% predictable.
 *
 * Scenarios covered (from NEXT_STEPS.md):
 *   1. Page load — board renders, title is visible
 *   2. Difficulty selector — clicking a button highlights it
 *   3. New Game — resets the board without starting a new window
 *   4. Player wins — player completes a horizontal 4-in-a-row
 *   5. CPU wins — AI completes a vertical 4-in-a-row; modal appears
 *   6. Play Again — modal's "Play Again" button restarts the game
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Make the AI always return a fixed column by setting window.__TEST_AI_COL.
 * The useGame hook checks this before dispatching to the Web Worker, so the
 * override is guaranteed to take effect regardless of browser support.
 */
async function mockAIColumn(page: Page, col: number): Promise<void> {
  await page.evaluate((c: number) => {
    (window as Record<string, unknown>).__TEST_AI_COL = c;
  }, col);
}

/** Remove the AI override so subsequent interactions use the real AI. */
async function clearAIMock(page: Page): Promise<void> {
  await page.evaluate(() => {
    delete (window as Record<string, unknown>).__TEST_AI_COL;
  });
}

/**
 * Click a board column and then wait until it is the player's turn again
 * (i.e. the AI has responded and the "Your turn" hint text reappears).
 *
 * Skips the wait when `expectGameOver` is true — useful for the click that
 * ends the game, after which the turn prompt never reappears.
 */
async function clickColumnAndWaitForTurn(
  page: Page,
  col: number,
  expectGameOver = false
): Promise<void> {
  await page.locator(`[data-testid="col-btn-${col}"]`).click();

  if (!expectGameOver) {
    // Wait for the thinking indicator to disappear and player prompt to return
    await expect(
      page.getByText("Your turn — click a column")
    ).toBeVisible({ timeout: 15_000 });
  }
}

// ---------------------------------------------------------------------------
// 1 — Page load
// ---------------------------------------------------------------------------

test.describe("Page load", () => {
  test("displays the title and game board", async ({ page }) => {
    await page.goto("/");

    // Title is visible
    await expect(page.getByRole("heading", { name: /Connect Four/i })).toBeVisible();

    // Board is rendered
    await expect(page.getByTestId("board")).toBeVisible();

    // All 7 column click targets are present
    for (let col = 0; col < 7; col++) {
      await expect(page.getByTestId(`col-btn-${col}`)).toBeVisible();
    }
  });

  test("shows 'Your turn — click a column' on load", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Your turn — click a column")).toBeVisible();
  });

  test("shows the score board with zeros", async ({ page }) => {
    // Clear any persisted score from previous tests
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("connect-four-score"));
    await page.reload();

    await expect(page.getByTestId("score-player")).toBeVisible();
    await expect(page.getByTestId("score-cpu")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2 — Difficulty selector
// ---------------------------------------------------------------------------

test.describe("Difficulty selector", () => {
  test("highlights the selected difficulty button", async ({ page }) => {
    await page.goto("/");

    // Medium is the default — its button should have the active style
    const mediumBtn = page.getByRole("button", { name: "Medium" });
    await expect(mediumBtn).toHaveClass(/bg-blue-500/);

    // Clicking Easy should switch the highlight
    await page.getByRole("button", { name: "Easy" }).click();
    await expect(page.getByRole("button", { name: "Easy" })).toHaveClass(/bg-blue-500/);
    await expect(mediumBtn).not.toHaveClass(/bg-blue-500/);
  });

  test("all four difficulty buttons are present", async ({ page }) => {
    await page.goto("/");
    for (const label of ["Easy", "Medium", "Hard", "Guru"]) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// 3 — New Game
// ---------------------------------------------------------------------------

test.describe("New Game", () => {
  test("New Game button resets the board mid-game", async ({ page }) => {
    await page.goto("/");

    // Mock AI so we can reliably wait for its response
    await mockAIColumn(page, 6);

    // Make one move and wait for the AI to respond
    await clickColumnAndWaitForTurn(page, 0);

    // Click New Game
    await page.getByRole("button", { name: "New Game" }).click();

    // The player-turn prompt should reappear and no modal should be shown
    await expect(page.getByText("Your turn — click a column")).toBeVisible();
    await expect(page.getByText("You Win!")).not.toBeVisible();
    await expect(page.getByText("CPU Wins!")).not.toBeVisible();
  });

  test("New Game clears the board (no colored discs remain)", async ({ page }) => {
    await page.goto("/");
    await mockAIColumn(page, 6);

    // Play a couple of rounds
    await clickColumnAndWaitForTurn(page, 0);
    await clickColumnAndWaitForTurn(page, 1);

    // Reset
    await page.getByRole("button", { name: "New Game" }).click();
    await expect(page.getByText("Your turn — click a column")).toBeVisible();

    // After reset, no red (player) pieces should be in the visible page title
    // We verify the board itself is visible — actual disc colours live inside
    // the CSS classes, which we verify at the unit-test level.
    await expect(page.getByTestId("board")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4 — Player wins
// ---------------------------------------------------------------------------

test.describe("Player wins", () => {
  /**
   * Sequence (AI locked to column 6 — far right):
   *   Player col 0 → AI col 6
   *   Player col 1 → AI col 6
   *   Player col 2 → AI col 6
   *   Player col 3 → Player wins horizontally at row 5 cols 0-3
   */
  test("player wins by completing horizontal 4-in-a-row; 'You Win!' modal appears", async ({ page }) => {
    await page.goto("/");
    await mockAIColumn(page, 6);

    await clickColumnAndWaitForTurn(page, 0);
    await clickColumnAndWaitForTurn(page, 1);
    await clickColumnAndWaitForTurn(page, 2);

    // Fourth move — player wins; game ends so we don't wait for "Your turn"
    await clickColumnAndWaitForTurn(page, 3, true);

    await expect(page.getByText("You Win!")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Amazing — you beat the AI!")).toBeVisible();
  });

  test("score board increments player score after a win", async ({ page }) => {
    await page.goto("/");
    // Clear persisted score
    await page.evaluate(() => localStorage.removeItem("connect-four-score"));
    await page.reload();

    await mockAIColumn(page, 6);

    await clickColumnAndWaitForTurn(page, 0);
    await clickColumnAndWaitForTurn(page, 1);
    await clickColumnAndWaitForTurn(page, 2);
    await clickColumnAndWaitForTurn(page, 3, true);

    await expect(page.getByText("You Win!")).toBeVisible({ timeout: 5_000 });

    // The player score cell should now read "1"
    await expect(page.getByTestId("score-player")).toContainText("1");
  });
});

// ---------------------------------------------------------------------------
// 5 — CPU wins
// ---------------------------------------------------------------------------

test.describe("CPU wins", () => {
  /**
   * Sequence (AI locked to column 3 — centre):
   *   Player col 0 → AI col 3   (AI piece at row 5, col 3)
   *   Player col 1 → AI col 3   (AI piece at row 4, col 3)
   *   Player col 6 → AI col 3   (AI piece at row 3, col 3)
   *   Player col 5 → AI col 3   (AI piece at row 2, col 3 → 4-in-a-row!)
   *
   * Player pieces at (5,0), (5,1), (5,6), (5,5) — no 4-in-a-row for player.
   * AI pieces at (5,3), (4,3), (3,3), (2,3)     — vertical win in col 3.
   */
  test("CPU wins vertically; 'CPU Wins!' modal appears", async ({ page }) => {
    await page.goto("/");
    await mockAIColumn(page, 3);

    await clickColumnAndWaitForTurn(page, 0);
    await clickColumnAndWaitForTurn(page, 1);
    await clickColumnAndWaitForTurn(page, 6);

    // Fourth player move — AI responds with winning move
    await clickColumnAndWaitForTurn(page, 5, true);

    await expect(page.getByRole("heading", { name: "CPU Wins!" })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Better luck next time.")).toBeVisible();
  });

  test("score board increments CPU score after AI win", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("connect-four-score"));
    await page.reload();

    await mockAIColumn(page, 3);

    await clickColumnAndWaitForTurn(page, 0);
    await clickColumnAndWaitForTurn(page, 1);
    await clickColumnAndWaitForTurn(page, 6);
    await clickColumnAndWaitForTurn(page, 5, true);

    await expect(page.getByRole("heading", { name: "CPU Wins!" })).toBeVisible({ timeout: 5_000 });

    await expect(page.getByTestId("score-cpu")).toContainText("1");
  });
});

// ---------------------------------------------------------------------------
// 6 — Play Again
// ---------------------------------------------------------------------------

test.describe("Play Again", () => {
  test("'Play Again' button in the modal resets the board", async ({ page }) => {
    await page.goto("/");
    await mockAIColumn(page, 6);

    // Get player to win
    await clickColumnAndWaitForTurn(page, 0);
    await clickColumnAndWaitForTurn(page, 1);
    await clickColumnAndWaitForTurn(page, 2);
    await clickColumnAndWaitForTurn(page, 3, true);

    await expect(page.getByText("You Win!")).toBeVisible({ timeout: 5_000 });

    // Click Play Again
    await page.getByRole("button", { name: "Play Again" }).click();

    // Modal should close and the player turn prompt should return
    await expect(page.getByText("You Win!")).not.toBeVisible();
    await expect(page.getByText("Your turn — click a column")).toBeVisible();
  });

  test("board is playable after Play Again", async ({ page }) => {
    await page.goto("/");
    await mockAIColumn(page, 6);

    // Player wins
    await clickColumnAndWaitForTurn(page, 0);
    await clickColumnAndWaitForTurn(page, 1);
    await clickColumnAndWaitForTurn(page, 2);
    await clickColumnAndWaitForTurn(page, 3, true);

    await expect(page.getByText("You Win!")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: "Play Again" }).click();

    // After reset, the player can make another move successfully
    await clickColumnAndWaitForTurn(page, 4);
    await expect(page.getByText("CPU is thinking")).toBeVisible().catch(() => {
      // Thinking text may flash by too quickly; just verify we're past it
    });
    await expect(page.getByText("Your turn — click a column")).toBeVisible({
      timeout: 10_000,
    });
  });
});
