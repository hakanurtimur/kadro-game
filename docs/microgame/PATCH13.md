# Patch 13 — nine playable microgames

## Scope approved in chat
Keep Bomba Kimde? and Alan Daralıyor, including the optional Patch 12c push fix. Add Sakın Kıpırdama, Taklitçi, Kör Nokta, Kırmızı Işık, Gölgeyi Yakala, Parmağını Çekme and Tahtı Kap. Every game is individually selectable/restartable in Test Mode. Keep 2–6 participants and persistent cumulative scores. No Git push, no public deployment of application code.

## Implementation checkpoints
- [x] Seeded game definitions, timing/evidence evaluation, typed round serialization.
- [x] Membership/round/window checks, bounded evidence, idempotent submissions and settlement.
- [x] Seven touch/mouse game UIs; instructions + countdown + result in each.
- [x] Registry and room switch integration; no changes to Bomb/Shrink game implementations.
- [x] Firebase validation extended to seven new discriminants; existing game rules preserved.
- [x] Actual engine regression tests, source TypeScript checks, responsive browser harness.
- [x] Full-file generated patch, applying to uncommitted/untracked Patch 12 states.

## Mechanics
Sakın Kıpırdama: drag to dance during MOVE, stop during DON; movement earns points, inactivity does not. Taklitçi: watch four gestures then reproduce tap/hold/swipe in sequence. Kör Nokta: memorize six symbol positions then tap the requested location once. Kırmızı Işık: hold to run, release at red, moving through red loses ground; live opponent progress. Gölgeyi Yakala: memorize a silhouette then choose one of six shapes. Parmağını Çekme: hold before GO, ignore decoys and release at the actual ŞİMDİ BIRAK cue; cancellation never counts as a win. Tahtı Kap: steer and collide with other participants; nearest eligible player inside the throne at time expiry takes +100; exact ties share points.

## Synchronization and limits
All game schedules are derived from one seed and server-clock timestamps in the room. Inputs stay local until a bounded evidence submission; movement games also use the existing self-writable position channel. Scoring is computed from the evidence by pure shared evaluators, not a caller-provided score. Late/previous-round input and repeated submissions are rejected or no-ops. Result settlement waits 2.2s for in-flight reports, then treats missing reports as zero. Cumulative scores apply once in a room transaction. This follows the existing friend-room client-trust model, not a competitive anti-cheat backend. A malicious participant can inspect seeds or alter local evidence; do not present it as server-authoritative tournament scoring.

## Manual acceptance
Run on port 3003 with Firebase mode. PC and phone join the same room. Test each game, repeat same game, switch games, check score consistency, refresh/rejoin, compare 320/375/430px layouts. Touch controls must not scroll the page while actively playing. No assumed support for vibration, device sensors or keyboard-only input. Firebase rules must be deployed separately from Git push.

## Verification scope
78 targeted Node tests cover the two existing microgames, arena push physics and all seven new game evaluators/rules. Chromium exercises the actual new React components at 320, 375, 430, 768 and 1200 CSS pixels with mouse and touch events. Two independent browser contexts exchange room/position updates through a local test adapter. These are not real Firebase or physical-device tests. Pure engines were strict-typechecked; React integration was strict-typechecked against isolated dependency interfaces. Full Next.js build and the complete original project suite must still be run in the user's repository. No runtime dependency was added.
