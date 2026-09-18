import type { MicrogameMatch } from "./match-state";
import type { SkillGameId, SkillRound } from "./skill-types";

export type MicrogameId = "bomb-pass" | "shrink-arena" | SkillGameId;
export type MicrogameStatus = "lobby" | "playing" | "results";

export type MicrogamePlayer = {
  uid: string;
  nickname: string;
  seat: number;
  score: number;
};

export type BombPassRound = {
  gameId: "bomb-pass";
  instructionsUntil: number;
  startsAt: number;
  endsAt: number;
  holderUid: string;
  passes: number;
  lastPassAt: number;
  loserUid: string | null;
};

export type ShrinkArenaRound = {
  gameId: "shrink-arena";
  instructionsUntil: number;
  startsAt: number;
  endsAt: number;
  out: Record<string, number>;
};

export type MicrogameRound = BombPassRound | ShrinkArenaRound | SkillRound;

export type ArenaPosition = {
  uid: string;
  roundNumber: number;
  x: number;
  y: number;
  updatedAt: number;
};

export type MicrogameRoomState = {
  match?: MicrogameMatch | null;
  schemaVersion: 1;
  code: string;
  hostUid: string;
  status: MicrogameStatus;
  createdAt: number;
  updatedAt: number;
  players: Record<string, MicrogamePlayer>;
  roundNumber: number;
  activeGameId: MicrogameId | null;
  round: MicrogameRound | null;
};
