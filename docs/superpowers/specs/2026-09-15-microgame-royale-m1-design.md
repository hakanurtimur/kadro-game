# Microgame Royale — Milestone 1 Design

## Goal

KADRO projesine 2–6 oyunculu, mobil-first bir **Microgame Royale** modu eklemek. İlk milestone; ortak microgame motorunu, lobby/join akışını, host için Test Mode'u ve ilk gerçek oyun olan **Bomba Kimde?**yi içerir.

## Product behavior

- Yeni ana rota: `/microgame`
- Oda rotası: `/microgame/[code]`
- 2–6 oyuncu.
- Host da normal oyuncudur.
- Kimse elenmez; skor oyuncuda kalır.
- İlk milestone'da yalnızca `bomb-pass` kayıtlıdır.
- Host lobby'de **Test Mode** üzerinden Bomba Kimde?'yi başlatabilir.
- Test Mode sonucu ekranda kalır; host `Tekrar oyna` veya `Lobiye dön` seçebilir.
- Sonraki microgame'ler registry'ye plugin gibi eklenir; room/store altyapısı yeniden yazılmaz.

## Architecture

### Shared room state

Firebase RTDB node:

`microgameRooms/{CODE}`

Room stores:
- schemaVersion
- code
- hostUid
- status: `lobby | playing | results`
- players
- roundNumber
- activeGameId
- round
- createdAt / updatedAt

Each player stores:
- uid
- nickname
- seat (0–5)
- score

### Registry

`lib/microgame/registry.ts`

Each game has:
- id
- title
- description
- minPlayers
- maxPlayers
- estimatedSeconds

First registered id: `bomb-pass`.

### Store strategy

Hybrid:
- Firebase RTDB owns room, timer anchors, bomb holder, passes, scores and results.
- Touch/click visual feedback stays client-local.
- Firebase `.info/serverTimeOffset` drives a shared clock.
- LocalStore remains available for same-browser development, but **PC + phone testing uses Firebase**.

### Bomba Kimde?

Host starts a test round.

Round fields:
- `gameId: "bomb-pass"`
- `startsAt`
- `endsAt`
- `holderUid`
- `passes`
- `lastPassAt`
- `loserUid`

Behavior:
- 3-second shared countdown.
- Fuse duration is deterministic within a bounded random-feeling window.
- Exact remaining milliseconds are not displayed.
- Current holder can tap another player to pass.
- Cannot pass to self.
- Passes before `startsAt` or after `endsAt` are rejected.
- Small pass cooldown blocks accidental double taps.
- Any connected player may attempt the idempotent settle transition after `endsAt`.
- Holder at explosion loses the round.
- Every other player gets +100.
- Nobody is removed from the room.

## UX

### Lobby

- Same pastel/kawaii visual language as existing games.
- Room code is easy to copy.
- 2–6 player seats.
- Host-only Test Mode panel.
- Bomba Kimde? card explains interaction in one sentence.
- Start disabled until at least 2 players.

### Bomb arena

- Large central bomb with soft animated fuse.
- Clear `Bomba sende!` state for holder.
- Holder sees other players as large touch targets.
- Non-holder sees who currently has the bomb.
- No keyboard-only controls; all primary interaction works with touch/mouse.
- Result card shows exploded player and scoreboard.
- 44px+ touch targets.
- Safe-area aware mobile layout.

## Social layer

Extend existing shared `GameSocial` to `microgame`.
- Chat
- standard reactions
- Hakö Baba pack
- social controls live outside the active bomb target area.

Firebase social rules validate membership against `microgameRooms/{code}/players/{uid}`.

## Firebase rules

Add `microgameRooms`.
- authenticated read (needed for preflight join)
- room creation only by host who exists as player
- existing players can update room through valid transitions
- new players can join only while status is lobby
- max seat index 5
- nickname <= 20
- score numeric and non-negative

Add `socialRooms/microgame`.

## Local two-device testing

Run:

`npm run dev -- --hostname 0.0.0.0`

Find Mac LAN IP:

`ipconfig getifaddr en0`

Phone and PC open `http://<LAN-IP>:3000`.
Firebase anonymous auth makes them separate users.

For real PC + phone synchronization, Firebase database rules for `microgameRooms` and `socialRooms/microgame` must be deployed. Git branch does not need to be pushed.

## Explicit non-goals for Milestone 1

- No full random 8-game match yet.
- No seasons.
- No matchmaking.
- No anti-cheat system.
- No spectator mode.
- No presence/disconnect elimination.
- No second microgame yet.

## Next planned games

After Bomba Kimde? is tested and accepted:
1. Alan Daralıyor
2. Sakın Kıpırdama
3. Taklitçi
4. Kör Nokta
5. Kırmızı Işık
6. Gölgeyi Yakala
7. Parmağını Çekme
8. Tahtı Kap
