export type LudoMode = "classic" | "chaos";
export type LudoColor = "red" | "green" | "yellow" | "blue";
export type LudoStatus = "lobby" | "playing" | "finished";
export type LudoPhase = "awaiting-roll" | "choose-die" | "awaiting-move";
export type LudoChaosScope = "active" | "global";
export type LudoChaosKind = "double" | "reverse" | "portal" | "shield" | "peace" | "quake";

export type LudoPawn = {
  id: string;
  progress: number;
  shieldUntilTurn: number;
};

export type LudoPlayer = {
  uid: string;
  nickname: string;
  seat: number;
  color: LudoColor;
  pawns: LudoPawn[];
};

export type LudoChaosEvent = {
  id: string;
  kind: LudoChaosKind;
  scope: LudoChaosScope;
  title: string;
  description: string;
  turnNumber: number;
};

export type LudoChaosState = {
  current: LudoChaosEvent | null;
  history: LudoChaosEvent[];
  peaceUntilTurn: number;
};

export type LudoLastAction = {
  type: "roll" | "move" | "capture" | "home" | "chaos" | "leave";
  message: string;
  pawnId?: string;
  capturedPawnId?: string;
  at: number;
} | null;

export type LudoRoomState = {
  schemaVersion: 1;
  code: string;
  hostUid: string;
  mode: LudoMode;
  status: LudoStatus;
  phase: LudoPhase;
  createdAt: number;
  updatedAt: number;
  players: Record<string, LudoPlayer>;
  turnUid: string | null;
  turnNumber: number;
  randomSeed: number;
  randomSeq: number;
  dice: number[];
  selectedDie: number | null;
  winnerUid: string | null;
  finishReason?: "all-home" | "last-player" | "empty";
  chaos: LudoChaosState;
  lastAction: LudoLastAction;
};
