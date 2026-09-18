# Microgame Royale — Patch 12 Design

## Scope

Patch 12 assumes Patch 11 is already applied on the local `feat/microgame-royale` branch.

It adds:
1. Clear pre-round instruction phase for **Bomba Kimde?**
2. Hidden fuse feedback and variable initial bomb holder
3. Second microgame: **Alan Daralıyor**
4. Dedicated realtime arena-position channel for PC + phone play

## Bomba Kimde? refinements

- 2.6s instruction card
- 3s countdown
- hidden fuse duration: 7–10.5 seconds
- initial holder includes start-time entropy and avoids immediately repeating the previous holder when possible
- qualitative fuse states only: calm / speeding up / very hot
- exact milliseconds are never shown

## Alan Daralıyor

- 2.4s instruction card
- 3s countdown
- 11s active round
- shared normalized 0–100 arena
- safe circle shrinks from radius 42 to 18
- player steers with pointer/touch target
- avatar moves toward target at bounded speed; no teleporting
- nearby players generate soft repulsion
- own position publishes about every 90ms through `microgameLive/{code}/positions/{uid}`
- outside safe circle continuously for 650ms => out for this round
- survivors receive +100
- out players receive partial score based on survival duration
- nobody is removed from the room/match

## Realtime architecture

Room state remains under `microgameRooms`.
High-frequency arena positions live separately under `microgameLive` to avoid whole-room RTDB transactions for pointer movement.
Only the authenticated player can write their own position.
Only room members can read live positions.

## Test Mode

Lobby now lists both registered games.
Host chooses either game and can restart the active result.
No Git push is needed for LAN testing, but Firebase database rules must be redeployed.
