import {
  MicrogameRuleError, normalizeMicrogameState, startBombPassTest, startShrinkArenaTest,
  settleBombRound, settleShrinkArenaRound,
} from "./engine";
import { MICROGAMES } from "./registry";
import { isSkillGameId, seedFor, SETTLE_GRACE_MS } from "./skill-model";
import { startSkillTest, settleSkillRound, settleCrownRound } from "./skill-engine";
import { MATCH_ROUNDS, INTERMISSION_MS } from "./match-state";
import type { ArenaPosition, MicrogameId, MicrogameRoomState } from "./types";
export { MATCH_ROUNDS, INTERMISSION_MS } from "./match-state";

function requireMember(room: MicrogameRoomState, uid: string, at: number) {
  if (!room.players[uid]) throw new MicrogameRuleError("Bu odada oyuncu değilsin.");
  if (!Number.isFinite(at) || at < 0) throw new MicrogameRuleError("Oyun saati geçersiz.");
}
function requireHost(room: MicrogameRoomState, uid: string, at: number) {
  requireMember(room, uid, at);
  if (uid !== room.hostUid) throw new MicrogameRuleError("Bu işlemi yalnız oda sahibi yapabilir.");
}
function totals(room: MicrogameRoomState) {
  return Object.fromEntries(Object.values(room.players).map(player => [player.uid, player.score]));
}
function orderFor(seed: string): MicrogameId[] {
  const ids = MICROGAMES.map(game => game.id);
  let a = seedFor(seed);
  for (let i = ids.length - 1; i > 0; i--) {
    a = (a + 0x6d2b79f5) | 0;
    let n = Math.imul(a ^ (a >>> 15), 1 | a);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    const j = Math.floor(((n ^ (n >>> 14)) >>> 0) / 4294967296 * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, MATCH_ROUNDS);
}
function beginRound(room: MicrogameRoomState, gameId: MicrogameId, now: number) {
  // The match coordinator validates member, expected round and scheduled deadline
  // before reaching here. Existing game constructors retain their rule behavior.
  if (gameId === "bomb-pass") return startBombPassTest(room, room.hostUid, now);
  if (gameId === "shrink-arena") return startShrinkArenaTest(room, room.hostUid, now);
  return startSkillTest(room, room.hostUid, gameId, now);
}

/** Capture expectedRound/now once per user intent, outside the RTDB retry callback. */
export function startMicrogameMatch(room: MicrogameRoomState, uid: string, expectedRound: number, now = Date.now()): MicrogameRoomState {
  let next = normalizeMicrogameState(room);
  requireHost(next, uid, now);
  if (next.roundNumber !== expectedRound) return next;
  if (next.status === "playing" || next.match?.status === "active") throw new MicrogameRuleError("Mevcut maç henüz bitmedi.");
  const count = Object.keys(next.players).length;
  if (count < 2 || count > 6) throw new MicrogameRuleError("Başlamak için 2–6 oyuncu gerekiyor.");
  for (const player of Object.values(next.players)) player.score = 0;
  const baseRoundNumber = next.roundNumber;
  const id = `${next.code}-${baseRoundNumber + 1}-${Math.trunc(now)}`;
  next.match = {
    version: 1, id, status: "active", order: orderFor(id), index: 0,
    baseRoundNumber, startedAt: now, nextAt: 0, finishedAt: 0,
    roundBaseScores: totals(next), history: {},
  };
  next = beginRound(next, next.match.order[0], now);
  return next;
}

export function matchSettleAt(room: MicrogameRoomState) {
  if (!room.round) return Infinity;
  return room.round.endsAt + (isSkillGameId(room.round.gameId) ? SETTLE_GRACE_MS : 0);
}

/** Idempotent: points, recap and intermission anchor are committed together. */
export function settleMicrogameMatchRound(
  room: MicrogameRoomState, uid: string, expectedRound: number,
  positions: Record<string, ArenaPosition> = {}, now = Date.now(),
): MicrogameRoomState {
  let next = normalizeMicrogameState(room);
  requireMember(next, uid, now);
  if (next.roundNumber !== expectedRound) return next;
  if (!next.round) throw new MicrogameRuleError("Aktif tur bulunamadı.");
  const match = next.match;
  if (match && (match.order[match.index] !== next.activeGameId || expectedRound !== match.baseRoundNumber + match.index + 1))
    throw new MicrogameRuleError("Maç ile tur bilgisi eşleşmiyor.");
  if (match && Object.hasOwn(match.history, String(match.index))) return next;
  const gameId = next.round.gameId;
  if (gameId === "bomb-pass") next = settleBombRound(next, uid, now);
  else if (gameId === "shrink-arena") next = settleShrinkArenaRound(next, uid, now);
  else if (gameId === "crown-control") next = settleCrownRound(next, uid, expectedRound, positions, now);
  else next = settleSkillRound(next, uid, expectedRound, now);
  if (!next.match) return next; // Legacy single-game rooms can finish without migration.
  const state = next.match;
  state.history[String(state.index)] = {
    gameId, roundNumber: expectedRound, endedAt: now, totals: totals(next),
    gains: Object.fromEntries(Object.values(next.players).map(player => [player.uid,
      Math.max(0, Math.min(100, player.score - (state.roundBaseScores[player.uid] ?? 0))),
    ])),
  };
  if (state.index === MATCH_ROUNDS - 1) {
    state.status = "finished"; state.finishedAt = now; state.nextAt = 0;
  } else state.nextAt = now + INTERMISSION_MS;
  return next;
}

/** Any member can progress; backgrounding the host cannot freeze the series. */
export function advanceMicrogameMatch(room: MicrogameRoomState, uid: string, expectedRound: number, now = Date.now()): MicrogameRoomState {
  let next = normalizeMicrogameState(room);
  requireMember(next, uid, now);
  if (next.roundNumber !== expectedRound) return next;
  const match = next.match;
  if (!match || match.status !== "active" || next.status !== "results" || !match.nextAt || now < match.nextAt) return next;
  if (!Object.hasOwn(match.history, String(match.index)) || match.index >= MATCH_ROUNDS - 1) return next;
  match.index++; match.nextAt = 0; match.roundBaseScores = totals(next);
  next = beginRound(next, match.order[match.index], now);
  return next;
}

export function openMicrogameLobby(room: MicrogameRoomState, uid: string, expectedRound: number, now = Date.now()): MicrogameRoomState {
  const next = normalizeMicrogameState(room);
  requireHost(next, uid, now);
  if (next.roundNumber !== expectedRound) return next;
  if (next.status === "playing" || next.match?.status === "active") throw new MicrogameRuleError("Maç sürerken lobiye dönemezsin.");
  next.status = "lobby"; next.match = null; next.round = null; next.activeGameId = null; next.updatedAt = now;
  for (const player of Object.values(next.players)) player.score = 0;
  return next;
}

export function microgameStandings(room: MicrogameRoomState) {
  const players = Object.values(room.players).sort((a, b) => b.score - a.score || a.seat - b.seat);
  return players.map(player => ({ ...player, rank: 1 + players.filter(other => other.score > player.score).length }));
}
