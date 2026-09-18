# Microgame Royale Milestone 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the reusable Microgame Royale room engine, local/Firebase stores, Test Mode UI, and the first two-device playable microgame: Bomba Kimde?.

**Architecture:** A reusable room engine owns players, scores, rounds and game registry. Firebase RTDB synchronizes authoritative shared state and server clock; each microgame implements only its own transition/UI behavior. Existing GameSocial is extended to the microgame room.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Firebase Anonymous Auth + Realtime Database, CSS Modules, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-15-microgame-royale-m1-design.md`

## Global Constraints

- 2–6 players.
- Mobile-first; primary controls work with touch and mouse.
- No player elimination.
- First milestone registers only `bomb-pass`.
- Host can start/restart the selected microgame in Test Mode.
- PC + phone Firebase testing must work without pushing the Git branch.
- Existing KADRO, Ludo and TAŞIR behavior must not regress.
- No new runtime dependencies.
- Firebase join flow must use a preflight `get()` before `runTransaction`.
- All production changes follow TDD.

---

### Task 1: Engine and registry

**Files:**
- Create: `lib/microgame/types.ts`
- Create: `lib/microgame/registry.ts`
- Create: `lib/microgame/engine.ts`
- Test: `tests/microgame-engine.test.mjs`

**Interfaces:**
- Produces `createMicrogameRoom`, `joinMicrogamePlayer`, `startBombPassTest`, `passBomb`, `settleBombRound`, `returnMicrogameLobby`, `normalizeMicrogameState`.
- Produces registry id `bomb-pass`.

- [ ] Write failing engine tests for 2–6 seats, start permissions, countdown, pass validation, idempotent settle and +100 scoring.
- [ ] Run `node --test tests/microgame-engine.test.mjs` and verify RED.
- [ ] Implement minimal types/registry/engine.
- [ ] Run test and verify GREEN.

### Task 2: Local + Firebase stores

**Files:**
- Create: `lib/microgame/store.ts`
- Create: `lib/microgame/firebase-store.ts`
- Create: `lib/microgame/local-store.ts`
- Test: `tests/microgame-store-contract.test.mjs`

**Interfaces:**
- `MicrogameStore.identity()`
- `createRoom(nickname)`
- `joinRoom(code,nickname)`
- `subscribeRoom(code,listener)`
- `mutate(code,transition)`
- `now()`

- [ ] Write failing store-contract test.
- [ ] Implement Firebase preflight join and server-time offset.
- [ ] Implement BroadcastChannel/localStorage fallback.
- [ ] Verify store tests.

### Task 3: Firebase and social rules

**Files:**
- Modify: `firebase/database.rules.json`
- Modify: `lib/social/types.ts`
- Test: `tests/microgame-firebase-rules.test.mjs`

**Interfaces:**
- Adds `microgameRooms`.
- Extends `SocialGame` with `"microgame"`.
- Adds participant-only `socialRooms/microgame`.

- [ ] Write rule/type tests first and verify RED.
- [ ] Add room and social rules.
- [ ] Verify GREEN.

### Task 4: Routes and lobby

**Files:**
- Create: `app/microgame/page.tsx`
- Create: `app/microgame/[code]/page.tsx`
- Create: `components/microgame/MicrogameHome.tsx`
- Create: `components/microgame/MicrogameRoom.tsx`
- Create: `app/microgame/microgame.module.css`
- Modify: `app/page.tsx`
- Test: `tests/microgame-ui-contract.test.mjs`

**Interfaces:**
- `/microgame`
- `/microgame/[code]`
- Host Test Mode panel.

- [ ] Write route/UI contract test and verify RED.
- [ ] Build create/join lobby.
- [ ] Add fourth game card to root hub.
- [ ] Verify responsive UI contract.

### Task 5: Bomba Kimde? UI

**Files:**
- Create: `components/microgame/games/BombPassGame.tsx`
- Modify: `components/microgame/MicrogameRoom.tsx`
- Modify: `app/microgame/microgame.module.css`
- Test: `tests/bomb-pass-ui.test.mjs`

**Interfaces:**
- `BombPassGame({room,uid,now,onPass})`
- Host start/restart actions use engine transitions.

- [ ] Write failing bomb UI contract.
- [ ] Implement 3-second countdown, holder state, touch targets, fuse feedback and results.
- [ ] Add idempotent client settle effect after `endsAt`.
- [ ] Verify UI test.

### Task 6: Shared chat/reactions

**Files:**
- Modify: `components/microgame/MicrogameRoom.tsx`
- Reuse: `components/social/GameSocial.tsx`
- Test: `tests/microgame-social.test.mjs`

- [ ] Write failing integration test.
- [ ] Mount `GameSocial game="microgame"` with player nickname/uid.
- [ ] Provide a safe mobile social dock outside bomb target controls.
- [ ] Verify test.

### Task 7: Release verification

- [ ] Run `npm test`.
- [ ] Run `npm run test:syntax`.
- [ ] Run `npm run build`.
- [ ] Deploy only Firebase database rules for local phone/PC synchronization.
- [ ] Run `npm run dev -- --hostname 0.0.0.0`.
- [ ] Open PC and phone with different anonymous sessions; create/join same room.
- [ ] Start Bomba Kimde? in Test Mode and verify pass/explosion/result/restart on both screens.
- [ ] Keep branch local; do not push.
