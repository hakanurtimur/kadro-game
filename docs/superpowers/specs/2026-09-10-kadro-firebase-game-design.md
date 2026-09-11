# KADRO Firebase Party Game Design

## Goal
Build a browser-based multiplayer party game where 2–8 players enter with only a nickname and room code, receive a shared AI-generated scenario and character pool, bid on characters with a fixed budget, use a playable rock-paper-scissors decider for leftover draft order, draft remaining characters, and receive AI scoring at the end.

## Product flow
1. Home: nickname, create room or join by five-character code. Host chooses budget and team slot count.
2. Lobby: room code, players, host controls start.
3. Round preview: AI generates scenario, character category, and enough characters for every roster plus leftovers. Host has five shared dice rerolls and can reroll the scenario, the entire category/pool, or one character.
4. Auction: characters appear one-by-one. Players bid from their remaining balance. A 15-second countdown runs per character. Host may advance manually if needed. Winning bid is deducted only when the auction closes.
5. RPS: if multiple players still have empty slots, all eligible players submit rock/paper/scissors simultaneously. Same choices or all three choices tie and repeat; with two move types, only players on the winning move advance until one starter remains.
6. Leftover draft: unsold characters are shown as selectable cards. Starting from the RPS winner, players with open slots pick in rotating seat order until teams are full.
7. Results: all rosters display together. Host asks AI judge to score every roster 0–100 against the scenario, explain each score briefly, choose a winner, and provide a one-line summary. Host can start a new round.

## Architecture
- Next.js 15 App Router + TypeScript + React 19.
- A pure `game-engine` owns room transitions and validation. It receives immutable-ish room snapshots and returns the next state or throws a user-facing rule error.
- A storage adapter runs those same transitions atomically. Firebase Realtime Database uses `runTransaction`; a localStorage + BroadcastChannel adapter provides a zero-config two-tab demo when Firebase variables are absent.
- Firebase Anonymous Auth is invisible to players and only supplies a stable uid for realtime access/security. There is no sign-up, login screen, profile, email, or password.
- AI runs only through Next.js server routes so `GROQ_API_KEY` never reaches the browser. Groq `openai/gpt-oss-20b` is the default model. Routes validate the JSON shape and fall back to local demo content if no key is configured.

## Realtime data model
`rooms/{CODE}` stores a single room aggregate:
- room metadata: code, hostUid, status, budget, slots, rerollsLeft, scenario, characterCategory
- players keyed by uid: nickname, seat, balance, team
- characters: ordered list with id/name/source/status/winner/winningBid
- auction: current index, current bid, bidder, endsAt
- rps: round, contenders, choices, starterUid
- judge: rankings, winner, summary, source

A single aggregate makes each game mutation atomic in both Firebase and local demo mode. This is intentionally optimized for small rooms rather than large-scale matchmaking.

## Game rules
- 2–8 players.
- Budget 20–500; roster slots 3–8.
- AI creates `players * slots + max(players, 4)` characters so leftovers exist.
- A player with a full roster cannot bid.
- A bid must be greater than the current bid and no greater than the bidder's current balance.
- No money is reserved while bidding; the winner pays when the character closes.
- An unsold character remains available for the leftover draft.
- RPS is only required when two or more players still need characters. One remaining player becomes starter automatically.
- Leftover picks cost 0.
- Results begin when all rosters are full or no leftover character remains.

## AI behavior
- `/api/round`: scenario + category + unique character pool.
- `/api/reroll`: one of scenario, category/pool, or individual character; previous values are supplied as exclusions.
- `/api/judge`: stable JSON containing every player exactly once, 0–100 score, short Turkish comment, winner uid, summary.
- The server validates and normalizes outputs. Invalid or unavailable AI results use deterministic/demo fallbacks rather than breaking the game.

## Visual direction
Low-poly anime / cozy indie party game. Warm cream background, peach/coral, mint, lavender and sky-blue surfaces; dark plum text; chunky rounded typography; soft 3D shadows; polygon facets; sparkles and floating low-poly blobs. Player avatars are original abstract SVG low-poly anime mascots generated from uid/seat, not likenesses of the named characters. Character cards use colorful faceted silhouettes and typography rather than copyrighted character artwork.

Interactions should feel tactile: dice buttons wobble, auction cards float slightly, coins pop on bids, RPS choices lift on hover, winner cards glow. Motion remains CSS-first and lightweight.

## Error handling
- Missing Firebase config: automatically use local demo mode; show a small `LOCAL DEMO` badge.
- Missing Groq key: server uses local round/reroll/judge fallbacks and labels the source as demo.
- Invalid room code or room already started: show clear inline message.
- Illegal transitions/bids/picks: game engine throws a short Turkish rule message surfaced as a toast.
- Host leaving is not migrated in MVP; existing local state remains but host-only controls require the original host.

## Testing
Vitest covers pure engine behavior: room creation/join, bidding, auction close, RPS resolution including ties and elimination, leftover rotation, and result readiness. API helper/fallback output shapes are covered separately. `npm run build` is the final integration check.

## Explicitly out of scope for MVP
Accounts, email/password, persistence across devices for a named identity, public matchmaking, chat/voice, payments, admin CMS, anti-cheat hardening, host migration, spectator mode, moderation, character images sourced from third parties, and mobile native apps.
