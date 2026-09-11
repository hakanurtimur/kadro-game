# KADRO Firebase Party Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a playable KADRO MVP with Firebase realtime multiplayer, zero-config local demo mode, Groq-powered round/reroll/judging, auction, RPS, leftover draft, and a low-poly anime UI.

**Architecture:** Pure room-state transitions live in `lib/game-engine.ts`; storage adapters apply them atomically in Firebase RTDB or localStorage. Client screens subscribe to the aggregate room state. Server-only AI routes use a shared Groq JSON helper and fallbacks.

**Tech Stack:** Next.js 15, React 19, TypeScript, Firebase Web SDK, Vitest, Lucide React, CSS/SVG.

**Spec:** `docs/superpowers/specs/2026-09-10-kadro-firebase-game-design.md`

## Global Constraints
- No visible account/login/signup UI; Firebase Anonymous Auth is invisible.
- 2–8 players, budget 20–500, slots 3–8.
- Default Groq model is `openai/gpt-oss-20b`.
- Five shared rerolls per round preview.
- AI keys remain server-only.
- Missing Firebase config must fall back to a two-tab local demo.
- Visual direction is low-poly anime / cozy indie party game.

---

### Task 1: Pure game engine and tests

**Files:**
- Create: `lib/game-engine.ts`
- Replace: `lib/types.ts`
- Create: `tests/game-engine.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `createInitialRoom`, `joinPlayer`, `applyRoundPreview`, `applyScenarioReroll`, `applyCategoryReroll`, `applyCharacterReroll`, `startAuction`, `placeBid`, `closeAuction`, `submitRpsChoice`, `pickLeftover`, `saveJudge`.
- All mutation functions accept a `RoomState` and return the next `RoomState`; rule violations throw `GameRuleError`.

- [ ] Write failing Vitest cases for valid/invalid bids, payment on close, RPS ties/winners, and rotating leftover picks.
- [ ] Run `npm test -- tests/game-engine.test.ts` and confirm missing engine exports fail.
- [ ] Implement the minimal engine and room types.
- [ ] Run the focused test and full test suite until green.

### Task 2: Local/Firebase realtime store

**Files:**
- Create: `lib/firebase-client.ts`
- Create: `lib/game-store.ts`
- Create: `lib/local-store.ts`
- Create: `lib/firebase-store.ts`
- Create: `firebase/database.rules.json`
- Create: `firebase.json`
- Delete: `lib/supabase.ts`
- Delete: `supabase/schema.sql`
- Create: `tests/local-store.test.ts`

**Interfaces:**
- `getGameStore(): GameStore`
- `GameStore` exposes `identity`, `createRoom`, `joinRoom`, `subscribeRoom`, and `mutate(code, transition)`.

- [ ] Write failing local-store tests using a memory storage shim.
- [ ] Run focused tests and confirm failure.
- [ ] Implement identity, local transaction/update notification behavior, then Firebase anonymous auth + RTDB transaction adapter.
- [ ] Run tests until green.

### Task 3: Groq AI routes and fallbacks

**Files:**
- Create: `lib/ai/groq.ts`
- Replace: `lib/fallback.ts`
- Replace: `app/api/round/route.ts`
- Create: `app/api/reroll/route.ts`
- Replace: `app/api/judge/route.ts`
- Create: `tests/fallback.test.ts`

**Interfaces:**
- `generateFallbackRound`, `rerollFallbackScenario`, `rerollFallbackCategory`, `rerollFallbackCharacter`, `fallbackJudge`.
- API responses always include `source: "groq" | "demo"`.

- [ ] Write failing fallback shape/uniqueness/judge ranking tests.
- [ ] Run focused tests and confirm failure.
- [ ] Implement fallback generators and shared Groq JSON request helper.
- [ ] Implement round, reroll, and judge routes with validation/normalization.
- [ ] Run tests until green.

### Task 4: Home, lobby, preview and auction UI

**Files:**
- Replace: `app/page.tsx`
- Replace: `components/RoomClient.tsx`
- Create: `components/PolyAvatar.tsx`
- Create: `components/DiceButton.tsx`
- Replace: `app/globals.css`

**Interfaces:**
- Home uses `getGameStore()` for create/join.
- Room client subscribes once by room code and calls engine transitions through store mutations.
- Preview calls `/api/round` and `/api/reroll`; auction uses countdown and host close fallback.

- [ ] Implement zero-login create/join and connection mode badge.
- [ ] Implement lobby and AI preview with five rerolls.
- [ ] Implement realtime auction UI, bid controls, timer, rosters, and host advance.
- [ ] Apply low-poly anime visual system and responsive states.
- [ ] Run `npm run build` and fix type/integration errors.

### Task 5: RPS, leftover draft, AI results and handoff

**Files:**
- Modify: `components/RoomClient.tsx`
- Modify: `app/globals.css`
- Replace: `.env.example`
- Replace: `README.md`

**Interfaces:**
- RPS uses `submitRpsChoice` through store mutation.
- Leftover cards use `pickLeftover`.
- Judge POST response is persisted with `saveJudge` so all players see the same results.

- [ ] Implement simultaneous RPS screen including tie/repeat and elimination copy.
- [ ] Implement zero-cost leftover draft with active-picker indicator.
- [ ] Implement AI judge loading/results/winner/new-round flow.
- [ ] Document Firebase and Groq setup, local demo behavior, and run commands.
- [ ] Run `npm test` and `npm run build`; resolve all failures.
- [ ] Package the finished project as `/mnt/data/kadro-firebase-party-game.zip`.
