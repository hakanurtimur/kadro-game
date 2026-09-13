export type GameMode = "classic" | "chaos";
export type ChaosEventKind = "crisis" | "inheritance" | "swap" | "scenario";
export type ChaosEvent = {
  id: string;
  kind: ChaosEventKind;
  title: string;
  description: string;
  afterAuction: number;
  occurredAt: number;
};
export type ChaosState = { seed: number; history: ChaosEvent[] };

export type GameStatus = "lobby" | "preview" | "auction" | "rps" | "leftovers" | "results";
export type RoundSource = "groq" | "demo";
export type CharacterStatus = "queued" | "active" | "sold" | "unsold" | "drafted";
export type Acquisition = "auction" | "leftover";
export type RpsMove = "rock" | "paper" | "scissors";

export type CharacterSeed = {
  name: string;
  source: string;
};

export type GameCharacter = CharacterSeed & {
  id: string;
  status: CharacterStatus;
  winnerUid: string | null;
  winningBid: number;
};

export type TeamMember = CharacterSeed & {
  characterId: string;
  acquisition: Acquisition;
  price: number;
  transferred?: boolean;
};

export type PlayerState = {
  uid: string;
  nickname: string;
  seat: number;
  balance: number;
  team: TeamMember[];
};

export type AuctionState = {
  withdrawn?: Record<string, boolean>;
  startsAt?: number | null;
  index: number;
  currentBid: number;
  bidderUid: string | null;
  endsAt: number | null;
};

export type RpsState = {
  round: number;
  contenders: string[];
  choices: Record<string, RpsMove>;
  message: string;
};

export type JudgeRanking = {
  criteria?: JudgeCriteria;
  strength?: string;
  weakness?: string;
  starCharacterId?: string;
  starReason?: string;
  playerUid: string;
  score: number;
  comment: string;
};

export type JudgeResult = {
  scoringVersion?: "rubric-v1";
  winnerUids?: string[];
  winnerUid: string;
  rankings: JudgeRanking[];
  summary: string;
  source: RoundSource;
};

export type RoomState = {
  schemaVersion?: 2;
  moderator?: { uid: string; nickname: string };
  series?: SeriesState;
  roundId?: string;
  sales?: AuctionSale[];
  presentationStep?: number;
  judgeRequest?: { id: string; expiresAt: number } | null;
  mode?: GameMode;
  chaos?: ChaosState | null;
  code: string;
  hostUid: string;
  status: GameStatus;
  budget: number;
  slots: number;
  createdAt: number;
  updatedAt: number;
  scenario: string;
  characterCategory: string;
  roundSource: RoundSource;
  rerollsLeft: number;
  players: Record<string, PlayerState>;
  characters: GameCharacter[];
  auction: AuctionState;
  rps: RpsState | null;
  starterUid: string | null;
  draftTurnUid: string | null;
  judge: JudgeResult | null;
};

export type RoundPayload = {
  scenario: string;
  characterCategory: string;
  characters: CharacterSeed[];
  source: RoundSource;
};

export type GameStoreMode = "firebase" | "local";

export type JudgeCriteria = { fit: number; synergy: number; versatility: number };
export type AuctionSale = { characterId: string; name: string; buyerUid: string; price: number };
export type SeriesRound = {
  roundId: string;
  roundNumber: number;
  scenario: string;
  rankings: JudgeRanking[];
  points: Record<string, number>;
  source: RoundSource;
};
export type SeriesState = {
  id: string;
  totalRounds: 1 | 3;
  currentRound: number;
  locked: boolean;
  completed: Record<string, SeriesRound>;
};
