# TAŞIR — Design

TAŞIR is a two-player hidden-tile column-shifting game added as the third game in the KADRO browser party hub.

## Locked rules

- Exactly 2 players; the host is also a normal player.
- Seat 0 owns digits 0–4. Seat 1 owns digits 5–9.
- The set contains four copies of every digit 0–9 (40 numbered tiles) plus one Joker.
- Each player receives a hidden 4×5 board (20 tiles). The Joker starts in the middle as the first held tile.
- Simultaneous rock-paper-scissors decides who starts; a tie repeats.
- On a turn, the player chooses one of the five columns. The held tile enters the top, every tile shifts down, and the bottom tile overflows.
- If the overflow belongs to the active player's number group, it is inserted into that same column and the chain continues automatically.
- If the overflow belongs to the opponent, that tile is passed to the opponent and the turn changes.
- If the Joker overflows, the active player keeps the turn and may choose a new column.
- To avoid an endless all-owned column rotation, automatic chaining stops after one full column cycle and lets the same player choose another column.
- First player whose 20 board tiles are all from their own number group wins.
- Board faces stay hidden in normal UI. The latest overflow/held tile is public. Boards reveal at game end.

## Product / UX

Mobile-first, portrait-friendly, no horizontal overflow, 44px+ actionable column targets, safe-area aware. Firebase Anonymous Auth and the existing room-code model are reused. Hidden values are UI-hidden only; this friend-group MVP is not cryptographically cheat-proof because clients can inspect realtime state.
