import { placementPoints } from "./judging";
import type { RoomState, SeriesState } from "./types";

export function initialSeries(id: string, totalRounds: 1 | 3 = 1): SeriesState {
  return { id, totalRounds, currentRound: 1, locked: false, completed: {} };
}
export function recordSeriesRound(room: RoomState): void {
  if (!room.series || !room.judge || !room.roundId) return;
  const key = `r${room.series.currentRound}`;
  if (room.series.completed[key]) return;
  room.series.completed[key] = {
    roundId: room.roundId, roundNumber: room.series.currentRound, scenario: room.scenario,
    rankings: structuredClone(room.judge.rankings), points: placementPoints(room.judge.rankings), source: room.judge.source,
  };
}
export function seriesStandings(room: RoomState) {
  const completed = Object.values(room.series?.completed ?? {});
  return Object.values(room.players).filter(p => p.uid !== room.moderator?.uid).map(p => ({
    uid: p.uid, nickname: p.nickname, seat: p.seat,
    points: completed.reduce((sum,r) => sum+(r.points?.[p.uid] ?? 0),0),
    rounds: completed.length,
  })).sort((a,b) => b.points-a.points || a.seat-b.seat);
}
export function seriesFinished(room: RoomState): boolean {
  return Boolean(room.series && room.judge && Object.keys(room.series.completed).length === room.series.totalRounds);
}
