# Shared Social Layer Design

**Date:** 2026-09-15

## Goal

Add one shared, mobile-first social layer to KADRO, Kızma Birader and TAŞIR. Every room participant can chat and send reactions without opening chat; KADRO's moderator participates with a visible MOD badge.

## Experience

- A fixed reaction rail stays visible at the right edge of every room.
- Four quick reactions are one tap away; a smile button opens the complete reaction picker.
- Standard emoji reactions and the Hakö Baba reaction pack are available together.
- Reactions animate upward on the right side without blocking the board or game controls.
- A separate chat button opens a bottom sheet on phones and a compact right panel on larger screens.
- The chat keeps the latest 50 messages, limits messages to 160 characters, and shows unread count while closed.
- Reaction sending has an 850 ms client cooldown to reduce accidental spam.

## Hakö Baba Pack

The uploaded reaction poster is the source asset. The pack is cropped into ten transparent PNG assets:

- Hakö Baba
- İyi oynadın
- Helal
- Rahat
- Ne alaka
- Hahaha
- Vay be
- Aslanım
- Düşüncemdeyim
- Hakö Baba 👑

No newly generated substitute characters are used.

## Realtime Architecture

Social state is separate from game state:

`socialRooms/{game}/{code}/messages/{messageId}`

`socialRooms/{game}/{code}/reactions/{uid}`

Keeping social data outside game room transactions prevents chat/reactions from racing auctions, dice rolls, pawn movement or TAŞIR shifts.

Messages use a last-50 query. Reactions are latest-per-user records; Firebase child-added/child-changed events become short-lived local reaction bursts.

## Authorization

Firebase rules permit social reads/writes only to actual participants:

- `kadro`: room player OR room moderator
- `ludo`: room player
- `tasir`: room player

Message/reaction sender uid must equal `auth.uid`. KADRO moderator records must match the room moderator nickname and role.

## Room-code Reliability Fix

Firebase join flows currently throw from inside the first transaction callback when the local transaction cache is still empty. All three Firebase room stores will:

1. perform an authoritative `get(roomRef)` preflight,
2. report “Oda bulunamadı” only if that read confirms absence,
3. run the join transaction with `applyLocally: false`,
4. avoid treating an initial local null transaction value as an immediate missing-room error.

This removes the false first-click “Oda bulunamadı” flash.

## Mobile Constraints

- 42–44 px reaction/chat controls.
- Safe-area aware right edge and bottom sheet.
- Chat covers about 60–64dvh, leaving the game visible behind it.
- Reaction stream is pointer-events-none.
- Reduced-motion users do not get float/sheet animations.
- No reaction UI may resize or reflow the board.

## Local Mode

A localStorage-backed social store mirrors the same interface for local/demo mode and supports same-tab plus storage-event updates.

## Verification

- Contract tests for all three integrations.
- Reaction catalog/assets existence tests.
- Firebase social rules tests.
- Join preflight regression tests for all three Firebase stores.
- TypeScript syntax checks and full `npm test`, `npm run test:syntax`, `npm run build` on the user's project.
