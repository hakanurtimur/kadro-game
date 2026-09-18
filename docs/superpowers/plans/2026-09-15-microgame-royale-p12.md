# Microgame Royale Patch 12 Implementation Plan

**Goal:** Refine Bomba Kimde? onboarding/fuse behavior and add Alan Daralıyor as the second Test Mode microgame.

**Architecture:** Keep room lifecycle/scoring in `microgameRooms`; add `microgameLive` for high-frequency arena positions. Both games continue to use the shared registry/store/result shell.

**Verification:** Run new Patch 12 tests, then full `npm test`, `npm run test:syntax`, and `npm run build`. Redeploy Firebase database rules before two-device testing.
