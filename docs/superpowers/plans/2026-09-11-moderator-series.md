# Moderator Series Implementation Plan

> **For agentic workers:** Use executing-plans; keep scope on this patch. Work in the isolated patch02 branch.

**Goal:** Deliver a reviewable git patch for a nonplaying moderator, fair readable jury, quicker auctions, character profiles and three-round series.
**Architecture:** Pure deterministic transitions remain in the engine. Scoring/presentation/profiles are independent modules; React renders the shared room state, Firebase synchronizes it.
**Tech Stack:** Existing Next.js / TypeScript / Firebase / node:test. No new dependencies.
**Spec:** docs/superpowers/specs/2026-09-11-moderator-series.md

## Global Constraints
No secrets, no writes to user's remote, no captain/tactics, no forced history rewrites, no fabricated build or live-service results.

### 1. Moderator and series engine
- [x] Write tests in tests/moderator-series.test.mjs for zero-player creation, exclusion from bids/RPS/draft, locked join, reset and idempotent scoring.
- [x] Run `node --test tests/moderator-series.test.mjs` red.
- [x] Add createModeratedRoom/configureSeries/nextSeriesRound/resetSeries and typed series structures.
- [x] Switch both stores; maintain explicit legacy factory for old fixtures.
- [x] Run engine + store suites green.

### 2. Auction pacing and scoring
- [x] Add tests for withdraw, late actions, everyone poor, weighted rounding, invalid AI IDs and exact ties.
- [x] Run the tests red, add auctionCanClose/withdrawAuction and lib/judging.ts.
- [x] Add judge claim/save/release and round-ID checks; preserve single saved outcome.
- [x] Run all tests green.

### 3. Presentation and character profiles
- [x] Add profile/presentation tests: catalog coverage, no scalar strength, stage clamps, awards based on receipts.
- [x] Add lib/character-profiles.ts, lib/presentation.ts and dedicated UI components.
- [x] Integrate moderator bar, guide, profile cards, jury stages, series standings, opt-in sound/motion.
- [x] Run all unit tests and syntax check.

### 4. Firebase and delivery
- [x] Update rules for moderator-only empty rooms and moderation fields, forbid host-as-player in v2, preserve authorized join/reconnect.
- [x] Remove machine-specific TypeScript fallback from test tooling, add actionable dependency error.
- [x] Run typecheck, build attempt, patch apply/reverse check and credential scan.
- [x] Record exact results and deliver patch + setup commands, including rules deploy and new-room requirement.

## Execution record
The isolated code/test/documentation changes are implemented. 84 automated tests and 34-file syntax check passed; strict TypeScript checking passed for the engine, jury/content, presentation, profiles, guide, series and local-store modules. Dependency installation was attempted and failed with npm DNS EAI_AGAIN; the actual Next build command returned 127 (next not found). A full Next/React type check, browser checks, Firebase emulator/deploy, and real Groq calls are NOT verified by this delivery. Patch application/reversal and credential checks are recorded in the accompanying JSON verification report. No independent reviewer/subagent was available; review was local plus automated tests.
