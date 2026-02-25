# Next Steps

Potential improvements and features beyond the current MVP.

---

## Gameplay

### Two-Player Mode
Add a local two-player mode so two people can play on the same device.
- Add a `mode: "vs-ai" | "vs-human"` field to `useGame`.
- Skip the AI `useEffect` and alternate PLAYER/AI constants between turns when `mode === "vs-human"`.

### Choose Who Goes First
Let the player decide whether they move first or second (i.e., swap PLAYER ↔ AI).
- Add a `firstMove: "player" | "cpu"` setting.
- When `firstMove === "cpu"`, start `phase` as `"thinking"` in `useGame`.

### Move History / Undo
Track the sequence of moves as a stack so the player can undo their last move.
- Store `history: Board[]` alongside `board` in state.
- Expose an `undo()` function that pops the last two boards (player + AI).

### Hint System
Add a "Hint" button that runs the AI at a capped depth and highlights the recommended column.

---

## AI

### Opening Book
For the first several moves, use a pre-computed opening book (e.g., Victor Allis' solution)
to make the Guru level truly unbeatable and instant on early moves.

### Iterative Deepening
Replace fixed-depth negamax with iterative deepening so the AI always uses its full
time budget, improving play quality especially on faster hardware.

### Web Worker Offload
Move the AI search into a `Web Worker` so it never blocks the main thread.
This eliminates any jank during the "thinking" phase at higher depths.

### Transposition Table
Add a hash map (Zobrist hashing) to cache previously evaluated board positions.
This can cut search time by 30–50 % for medium and hard difficulties.

---

## UI / UX

### Responsive Mobile Layout
The board currently uses fixed `w-12/w-14` sizing. Replace with `vw`-based sizing or
CSS container queries so the board fills the screen on small phones.

### Animations
- Animate winning cells with a pulse/glow effect after a win is detected.
- Add a "confetti" burst when the player wins using a lightweight library (e.g., `canvas-confetti`).

### Accessibility
- Add `aria-label` attributes to each cell and column button.
- Announce turn changes and game outcomes via an `aria-live` region for screen readers.
- Ensure keyboard navigation: arrow keys to move column selection, Enter/Space to drop.

### Sound Effects
Add optional sound effects (disc drop, win fanfare) using the Web Audio API.

### Theme / Dark Mode Toggle
The app is currently always dark. Add a light mode and a toggle button stored in `localStorage`.

---

## Infrastructure

### Persistent Score
Save the score to `localStorage` so it persists across page refreshes.

### Online Multiplayer
Integrate a real-time backend (e.g., Supabase Realtime or Partykit) so two players
can compete over the network.

### Analytics
Track game outcomes, difficulty distribution, and average game length with a lightweight
analytics service (Plausible, PostHog) to inform future design decisions.

### CI / CD
- Add a GitHub Actions workflow that runs `npm test` and `npm run build` on every pull request.
- Deploy to Vercel or Cloudflare Pages automatically on merge to `main`.

### End-to-End Tests
Add Playwright or Cypress E2E tests that simulate a full game from the browser:
- Player wins by clicking the correct columns.
- CPU wins and modal appears.
- New Game resets the board.

---

## Code Quality

### Memoisation
Wrap `Cell` with `React.memo` to avoid unnecessary re-renders when only one cell changes per turn.

### Strict Null Checks Audit
Review every `?.` optional chain in the codebase and replace with explicit null guards
where the value is guaranteed to be non-null, to surface bugs earlier.

### Storybook
Add Storybook stories for each component so designers and reviewers can browse
all visual states (empty cell, player piece, AI piece, win highlight, modal variants)
without running a full game.
