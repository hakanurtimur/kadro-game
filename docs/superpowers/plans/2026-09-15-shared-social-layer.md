# Shared Social Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship shared chat, live reactions, the Hakö Baba sticker pack and reliable first-click room joins across all three games.

**Architecture:** Social data lives under a dedicated Firebase `socialRooms` subtree and is consumed by one reusable `GameSocial` component. Game room schemas remain unchanged; each room client only supplies game, code and participant identity.

**Tech Stack:** Next.js App Router, TypeScript, Firebase Realtime Database, CSS Modules, lucide-react.

**Spec:** `docs/superpowers/specs/2026-09-15-shared-social-layer-design.md`

## Global Constraints

- Mobile first.
- Last 50 chat messages.
- Message length max 160 characters.
- Reaction cooldown 850 ms.
- KADRO moderator can chat/react and is marked MOD.
- Social data must never mutate game-state transactions.
- Firebase rules must restrict access to current room participants.

---

### Task 1: Social contracts and reaction catalog

**Files:**
- Create `lib/social/types.ts`
- Create `lib/social/reactions.ts`
- Test `tests/social-layer.test.mjs`

- [ ] Add failing catalog/contracts test.
- [ ] Add shared types and standard + Hakö reaction definitions.
- [ ] Verify test passes.

### Task 2: Realtime social stores

**Files:**
- Create `lib/social/store.ts`
- Create `lib/social/firebase-store.ts`
- Create `lib/social/local-store.ts`
- Modify `firebase/database.rules.json`
- Test `tests/social-firebase-rules.test.mjs`

- [ ] Add failing Firebase/rules tests.
- [ ] Implement last-50 message subscriptions and latest-per-user reaction events.
- [ ] Add participant-only Firebase rules.
- [ ] Verify tests pass.

### Task 3: Mobile-first social UI

**Files:**
- Create `components/social/GameSocial.tsx`
- Create `components/social/GameSocial.module.css`
- Add `public/reactions/hako/*.png`
- Test `tests/social-layer.test.mjs`

- [ ] Add failing UI integration expectations.
- [ ] Implement right-side quick reaction rail, reaction picker, burst stream and chat sheet.
- [ ] Verify 44 px touch targets, safe areas and reduced motion.

### Task 4: Integrate every room

**Files:**
- Modify `components/RoomClient.tsx`
- Modify `components/ludo/LudoClient.tsx`
- Modify `components/tasir/TasirClient.tsx`

- [ ] Render shared social layer for KADRO player/moderator.
- [ ] Render for Ludo players.
- [ ] Render for TAŞIR players.
- [ ] Verify all room clients compile.

### Task 5: First-click room join regression

**Files:**
- Modify `lib/firebase-store.ts`
- Modify `lib/ludo/firebase-store.ts`
- Modify `lib/tasir/firebase-store.ts`
- Test `tests/join-room-preflight.test.mjs`

- [ ] Write failing preflight regression test.
- [ ] Add authoritative `get()` before transaction and `applyLocally:false`.
- [ ] Verify all three stores satisfy the regression.

### Task 6: Full verification

- [ ] Run `npm test`.
- [ ] Run `npm run test:syntax`.
- [ ] Run `npm run build`.
- [ ] Deploy Firebase database rules.
- [ ] Test chat/reactions on at least two real mobile clients.
