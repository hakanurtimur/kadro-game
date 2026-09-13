export type TasirTile = number | "joker";
export type TasirStatus = "lobby" | "rps" | "playing" | "finished";
export type TasirRpsChoice = "rock" | "paper" | "scissors";

export type TasirBoardTile = {
  value: TasirTile;
  revealed: boolean;
};

export type TasirPlayer = {
  uid: string;
  nickname: string;
  seat: 0 | 1;
  board: TasirBoardTile[][];
};

export type TasirRpsState = {
  round: number;
  choices: Record<string, TasirRpsChoice>;
  winnerUid: string | null;
};

export type TasirLastAction = {
  playerUid: string;
  column: number;
  incoming: TasirTile;
  overflow: TasirTile;
  overflowWasRevealed: boolean;
  chain: 1;
  message: string;
  at: number;
} | null;

export type TasirRoomState = {
  schemaVersion: 1;
  code: string;
  hostUid: string;
  status: TasirStatus;
  createdAt: number;
  updatedAt: number;
  players: Record<string, TasirPlayer>;
  randomSeed: number;
  turnUid: string | null;
  heldTile: TasirTile;
  forcedColumn: number | null;
  columnChainCount: number;
  moveNumber: number;
  rps: TasirRpsState;
  winnerUid: string | null;
  lastAction: TasirLastAction;
};
