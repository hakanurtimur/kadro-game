import { MICROGAME_REGISTRY } from "./registry";
import type { MicrogameId } from "./types";

export const MATCH_ROUNDS = 8;
export const INTERMISSION_MS = 5000;

export type MatchRoundRecap = {
  gameId: MicrogameId;
  roundNumber: number;
  endedAt: number;
  gains: Record<string, number>;
  totals: Record<string, number>;
};

export type MicrogameMatch = {
  version: 1;
  id: string;
  status: "active" | "finished";
  order: MicrogameId[];
  index: number;
  baseRoundNumber: number;
  startedAt: number;
  finishedAt: number;
  nextAt: number;
  roundBaseScores: Record<string, number>;
  history: Record<string, MatchRoundRecap>;
};

/** RTDB may omit empty objects or deserialize numeric keys as an array. */
export function normalizeMatchState(raw: unknown): MicrogameMatch | null {
  if (!raw || typeof raw !== "object") return null;
  const match = raw as Record<string, unknown>;
  const source = match.order;
  const order = Array.isArray(source) ? [...source] : source && typeof source === "object"
    ? Object.entries(source).sort(([a], [b]) => Number(a) - Number(b)).map(([, value]) => value) : [];
  if (match.version !== 1 || typeof match.id !== "string" || !match.id ||
      !["active", "finished"].includes(String(match.status)) ||
      order.length !== MATCH_ROUNDS || new Set(order).size !== MATCH_ROUNDS ||
      order.some(id => typeof id !== "string" || !Object.hasOwn(MICROGAME_REGISTRY, id)) ||
      !Number.isInteger(match.index) || Number(match.index) < 0 || Number(match.index) >= MATCH_ROUNDS ||
      !Number.isInteger(match.baseRoundNumber) || Number(match.baseRoundNumber) < 0 ||
      !Number.isFinite(match.startedAt) || !Number.isFinite(match.nextAt) || !Number.isFinite(match.finishedAt)) return null;
  return {
    version: 1,
    id: match.id,
    status: match.status as MicrogameMatch["status"],
    order: order as MicrogameId[],
    index: Number(match.index),
    baseRoundNumber: Number(match.baseRoundNumber),
    startedAt: Number(match.startedAt), finishedAt: Number(match.finishedAt), nextAt: Number(match.nextAt),
    roundBaseScores: { ...(match.roundBaseScores as Record<string, number> ?? {}) },
    history: Object.fromEntries(Object.entries(match.history ?? {})) as Record<string, MatchRoundRecap>,
  };
}
