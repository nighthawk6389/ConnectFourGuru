# Plan: Add "Victor" Difficulty Level

## Overview

Add a fifth difficulty level — **Victor** — that implements strategic rules from Victor Allis's 1988 M.Sc. thesis *"A Knowledge-Based Approach of Connect-Four"*. Victor uses the same search depth as Guru (14-ply) but augments the standard window-based evaluation with a threat-based analysis derived from Allis's nine strategic rules, plus threat-aware move ordering at the root for better alpha-beta pruning.

---

## Background

Connect Four was solved by Victor Allis in 1988. His program VICTOR used nine strategic rules to reason about threats and counter-threats without exhaustive search. These rules exploit **parity** (odd/even row control) and **gravity** (pieces must stack) to prove that certain groups (potential four-in-a-rows) are guaranteed to complete or guaranteed to be blocked.

Key insight: the first player controls **odd** squares (Allis row numbering, 1-indexed from bottom), the second player controls **even** squares. By responding in the same column, the even-row player can always "claim" the even square.

---

## Implementation Steps

### Step 1: Add Constants

**File: `src/lib/constants.ts`**

- Add `"victor"` to the `Difficulty` union type
- Add `victor: 14` to `DEPTH_MAP` (same depth as Guru — strength comes from better evaluation, not deeper search)
- Add evaluation weight constants for each rule:
  - `VICTOR_CLAIMEVEN_3/2/1` — bonuses for secured groups via parity
  - `VICTOR_BEFORE_3/2` — bonuses for groups completable before opponent's
  - `VICTOR_VERTICAL_3/2` — bonuses for vertical pair control
  - `VICTOR_AFTEREVEN_3/2` — bonuses for groups guaranteed via Claimeven chains
  - `VICTOR_BASEINVERSE` — bonus for playable-square pair control
  - `VICTOR_LOWINVERSE` — bonus for low-square pair control

### Step 2: Implement Victor Rules Module

**File: `src/lib/victorRules.ts`** (new file)

Implement 6 of Allis's 9 strategic rules:

1. **Claimeven** — Second player (AI) controls even-row squares by always responding in the same column. If all empty squares in a group are on the favorable parity for the group's owner, the group is "secured." Score bonus/penalty based on filled count (3, 2, or 1).

2. **Baseinverse** — Two directly playable squares in different columns. The controller guarantees getting at least one. Scores a bonus when opponent groups require both playable squares (neutralized).

3. **Vertical** — Two consecutive empty squares in the same column where the upper square is on an odd row. The first player benefits because the opponent must fill the lower square first, granting the first player the odd (upper) square.

4. **Before** — A group G is completable "before" an opponent group H if G's lowest empty square is playable at or below H's empty squares. Due to gravity, G resolves first. Scores based on both groups' fill counts.

5. **Aftereven** — If all empty squares in a group can be claimed via Claimeven (all on the owner's favorable parity) and each has a square below it, the group will eventually complete. Stronger bonus than plain Claimeven because completion is guaranteed.

6. **Lowinverse** — Two columns each with 2+ empty squares where the lowest empty squares form a pair. The controller guarantees at least one of the two low squares, neutralizing opponent groups that need both.

**Exports:**

- `victorEvaluate(board, piece)` — returns combined score from all 6 rules (added to standard `scoreBoard`, not replacing it)
- `victorMoveOrder(board, piece, cols)` — reorders columns by threat-based priority (center preference + parity preference + group advancement/blocking) for better alpha-beta pruning at the root

**Helper exports (for testing):**

- `isOddSquare(row)` / `isEvenSquare(row)` — Allis parity checks
- `enumerateGroups(board)` — finds all live groups (potential four-in-a-rows with pieces from at most one player)

### Step 3: Integrate into AI Engine

**File: `src/lib/ai.ts`**

- Import `victorEvaluate` and `victorMoveOrder` from `./victorRules`
- In `getBestMove`, when `difficulty === "victor"`:
  - Use a combined score function: `scoreBoard(b, p) + victorEvaluate(b, p)`
  - Use `victorMoveOrder(board, AI, cols)` for root-level column ordering instead of the default center-out `MOVE_ORDER`
- Opening book (`getOpeningBookMove`) already supports `"guru" | "victor"` — no changes needed
- Gift-avoidance (`avoidGift`) already applies at medium+ — no changes needed

### Step 4: Update UI Components

**File: `src/components/GameControls.tsx`**

- Add a "Victor" difficulty button alongside Easy/Medium/Hard/Guru
- Style it distinctly (e.g., amber/gold theme) to signal it's the ultimate difficulty

**File: `src/hooks/useGame.ts`**

- No structural changes needed — `Difficulty` type already includes `"victor"`, and `DEPTH_MAP` already maps it

### Step 5: Add Tests

**File: `src/__tests__/lib/victorRules.test.ts`** (new file)

- Test `isOddSquare` / `isEvenSquare` parity helpers
- Test `enumerateGroups` — verify correct group enumeration, dead group filtering
- Test `scoreClaimeven` — groups with all empties on favorable parity get bonuses
- Test `scoreBaseinverse` — playable square pairs neutralize opponent groups
- Test `scoreVertical` — consecutive empty pairs with odd upper square
- Test `scoreBefore` — groups with lower playable empties score higher
- Test `scoreAftereven` — fully claimable groups get guaranteed-completion bonus
- Test `scoreLowinverse` — low-square pairs in different columns
- Test `victorEvaluate` — integration test returning nonzero on non-trivial boards
- Test `victorMoveOrder` — columns reordered by threat priority

**Existing test updates:**

- `src/__tests__/lib/ai.test.ts` — add Victor difficulty cases (win detection, block detection)
- `src/__tests__/components/GameControls.test.tsx` — verify Victor button renders and fires callback
- `src/__tests__/hooks/useGame.test.ts` — verify Victor difficulty is selectable

### Step 6: Update Documentation

- Update `CLAUDE.md` depth map table to include Victor
- Update `PLAN.md` difficulty table to include Victor

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Same depth as Guru (14) | Depth 14 | Strength comes from the enhanced evaluation, not deeper search. Keeps response time comparable to Guru. |
| Additive evaluation | `scoreBoard + victorEvaluate` | Victor rules complement (not replace) the window-based heuristic. The standard eval handles tactical patterns; Victor rules handle strategic/positional patterns. |
| 6 of 9 rules | Claimeven, Baseinverse, Vertical, Before, Aftereven, Lowinverse | These 6 cover the core parity and gravity reasoning. The remaining 3 (Specialbefore, Oddthreat, ThreatCombination) are more complex to implement and yield diminishing returns in a search-based AI. |
| Threat-based move ordering | `victorMoveOrder` at root only | Full threat analysis at every node would be too expensive. At the root, it improves pruning by trying the most promising moves first. Interior nodes still use the fast center-out ordering. |
| Separate module | `victorRules.ts` | Keeps the core `ai.ts` clean. Victor rules are conceptually distinct from the standard negamax infrastructure. |

---

## Files Modified/Created

| File | Action |
|---|---|
| `src/lib/constants.ts` | Modified — add Victor type, depth, weights |
| `src/lib/victorRules.ts` | **Created** — 6 strategic rules + evaluation + move ordering |
| `src/lib/ai.ts` | Modified — integrate Victor evaluation and move ordering |
| `src/components/GameControls.tsx` | Modified — add Victor button |
| `src/__tests__/lib/victorRules.test.ts` | **Created** — full test coverage for rules module |
| `src/__tests__/lib/ai.test.ts` | Modified — add Victor test cases |
| `src/__tests__/components/GameControls.test.tsx` | Modified — add Victor button test |
| `src/__tests__/hooks/useGame.test.ts` | Modified — add Victor difficulty test |
