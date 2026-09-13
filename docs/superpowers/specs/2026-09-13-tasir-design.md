# TAŞIR — Design

TAŞIR is a two-player hidden-tile column-shifting game added as the third game in the KADRO browser party hub.

## Locked rules

- Exactly 2 players; the host is also a normal player.
- Seat 0 owns digits 0–4. Seat 1 owns digits 5–9.
- The set contains four copies of every digit 0–9 (40 numbered tiles) plus one Joker.
- Each player receives a face-down 4×5 board (20 tiles). The Joker starts in the middle as the first visible held tile.
- Simultaneous rock-paper-scissors decides who starts; a tie repeats.
- With Joker in hand, the player may choose any of their five columns.
- A move inserts the visible held tile at the top of the chosen column, shifts that column down by one cell, and ejects the bottom tile.
- The inserted tile stays face-up. An ejected face-down tile flips open as it leaves the board. Once a board tile is open, it never closes again.
- If the ejected number belongs to the same player, the turn stays with that player and the same column continues. After one full four-tile column cycle, the player is released to choose another column so play cannot get trapped in an endless visible loop.
- If the ejected number belongs to the opponent, the visible tile passes to the opponent, the hand changes, and the opponent gets a fresh column choice.
- If Joker comes back out, the same player keeps the hand and may again choose any column.
- Each click resolves one physical column shift so slide/flip animations remain visible instead of skipping an entire chain in one transaction.
- The first player whose complete 4×5 board is face-up wins, regardless of which numbers are currently on those open tiles.
- Both players can see every tile that has already been opened; only unopened board tiles remain hidden.

## Product / UX

Mobile-first, portrait-friendly, no horizontal overflow, 44px+ actionable column targets, safe-area aware. Every shift gets a downward movement animation, newly inserted/opened tiles use a 3D flip, and the ejected tile pops into the public held-tile area. Firebase Anonymous Auth and the existing room-code model are reused. Hidden values are UI-hidden only; this friend-group MVP is not cryptographically cheat-proof because clients can inspect realtime state.
