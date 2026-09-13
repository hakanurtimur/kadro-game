# TAŞIR — Design

TAŞIR is a two-player hidden-tile value-routing game added as the third game in the KADRO browser party hub.

## Locked rules

- Exactly 2 players; the host is also a normal player.
- Seat 0 owns target lanes 0–4. Seat 1 owns target lanes 5–9.
- The set contains four copies of every value 0–9 (40 numbered/symbol tiles) plus one Joker.
- Each player receives a face-down 4×5 board (20 tiles): five vertical target lanes, four slots per lane.
- Seat 0's five columns are labelled 0,1,2,3,4. Seat 1's five columns are labelled 5,6,7,8,9.
- Simultaneous rock-paper-scissors decides who starts; a tie repeats.
- The Joker begins visible in the middle. With Joker in hand, the active player may choose any one of their own five target lanes.
- A move inserts the visible held tile at the top of the chosen target lane, shifts that column down one slot, and ejects the bottom tile.
- The inserted tile stays face-up. An ejected face-down tile flips open as it leaves the board. Once a board tile is open, it never closes again.
- Every opened numbered tile routes by VALUE, not by the column it came from: 5 always goes to the owner of lane 5, 2 always goes to the owner of lane 2, etc.
- If the ejected value belongs to the same player, that player keeps the hand but must next shift the lane matching that exact value. Example: a 1 ejected from lane 4 routes next to lane 1.
- If the ejected value belongs to the opponent, the hand changes to that opponent and the opponent must shift the lane matching that exact value. Example: opening 7 routes to seat 1's 7 lane.
- If Joker comes back out, the same player keeps the hand and may again choose any of their five lanes.
- Each click resolves one physical column shift so slide/flip/pop animations remain visible instead of skipping an entire chain in one transaction.
- A lane is complete only when all four slots are revealed and all four values match that lane's label.
- The first player to complete all five of their target lanes (each 4/4 correct) wins.
- Both players can see every tile that has already been opened; only unopened board tiles remain hidden.

## Symbols / visual language

Numbers remain visible as tiny labels for learnability, but every value also has a stable symbol: ● ▲ ◆ ★ ♥ ☀ ☾ ✿ ⚡ ✦. The symbol is the primary visual mark on tiles and lane headers. This avoids needing image assets while still making the board feel like a physical symbol-matching game.

## Product / UX

Mobile-first, portrait-friendly, no horizontal overflow, 44px+ actionable lane targets, safe-area aware. Every shift gets a downward movement animation, newly inserted/opened tiles use a 3D flip, and the ejected tile pops into the public held-tile area. Firebase Anonymous Auth and the existing room-code model are reused. Hidden values are UI-hidden only; this friend-group MVP is not cryptographically cheat-proof because clients can inspect realtime state.
