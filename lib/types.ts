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
};

export type PlayerState = {
  uid: string;
  nickname: string;
  seat: number;
  balance: number;
  team: TeamMember[];
};

export type AuctionState = {
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
  playerUid: string;
  score: number;
  comment: string;
};

export type JudgeResult = {
  winnerUid: string;
  rankings: JudgeRanking[];
  summary: string;
  source: RoundSource;
};

export type RoomState = {
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
