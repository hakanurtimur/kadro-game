# Kızma Birader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add classic Ludo/Kızma Birader with optional mixed Chaos mode beside KADRO.

**Architecture:** Pure deterministic Ludo engine + separate Firebase/local room store + dedicated `/ludo` UI. Root `/` becomes a game chooser; KADRO home moves to `/kadro` while existing KADRO room URLs remain unchanged.

**Tech Stack:** Next.js 15, React 19, TypeScript, Firebase Realtime Database + Anonymous Auth, CSS animations, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-13-kizma-birader-design.md`

## Global Constraints
- Host is a normal Ludo player.
- 2–4 players, four pawns each.
- Classic Ludo rules remain authoritative in both modes.
- Chaos is optional and deterministic.
- Existing KADRO game behavior must not regress.

---

### Task 1: Ludo engine
**Files:** Create `lib/ludo/types.ts`, `lib/ludo/engine.ts`; Test `tests/ludo-engine.test.mjs`.
- [ ] Write failing tests for room creation/join, six-to-exit, exact home, capture/safe squares, winner, extra roll, deterministic dice and chaos.
- [ ] Run the Ludo engine tests and verify RED.
- [ ] Implement minimal deterministic engine.
- [ ] Run tests and verify GREEN.

### Task 2: Stores and Firebase security
**Files:** Create `lib/ludo/local-store.ts`, `lib/ludo/firebase-store.ts`, `lib/ludo/store.ts`; Modify `firebase/database.rules.json`; Test `tests/ludo-store.test.mjs`, `tests/ludo-firebase-rules.test.mjs`.
- [ ] Write failing local-store and rule contract tests.
- [ ] Implement local/Firebase adapters and `ludoRooms` rules.
- [ ] Verify tests.

### Task 3: Game chooser and Ludo UI
**Files:** Move KADRO home UI to `app/kadro/page.tsx`; replace `app/page.tsx`; create `app/ludo/page.tsx`, `app/ludo/[code]/page.tsx`, `components/ludo/LudoClient.tsx`, `components/ludo/LudoBoard.tsx`, `components/ludo/LudoGuide.tsx`; modify `app/globals.css` and KADRO return navigation.
- [ ] Add static UI contract test first.
- [ ] Build chooser, lobby, board, dice, pawn selection, chaos banner, winner state, animations.
- [ ] Run syntax/tests.

### Task 4: Docs and full verification
**Files:** Modify `README.md`; add Kızma rules documentation.
- [ ] Document routes/rules/chaos/Firebase rules deploy.
- [ ] Run full `npm test` and `npm run test:syntax`.
- [ ] Run `npm run build` when installed dependencies are available.
- [ ] Export Patch 03 against the Patch 02 baseline.
