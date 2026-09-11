import type {
  CharacterSeed,
  GameCharacter,
  JudgeResult,
  RoomState,
  RoundPayload,
  RpsMove,
} from "./types";

export class GameRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameRuleError";
  }
}

const AUCTION_MS = 15_000;

export function normalizeRoomState(raw: any): RoomState {
  const room = structuredClone(raw ?? {});
  room.players = room.players ?? {};
  for (const player of Object.values(room.players) as any[]) {
    if (Array.isArray(player.team)) player.team = player.team.filter(Boolean);
    else if (player.team && typeof player.team === "object") player.team = Object.values(player.team).filter(Boolean);
    else player.team = [];
  }

  if (Array.isArray(room.characters)) room.characters = room.characters.filter(Boolean);
  else if (room.characters && typeof room.characters === "object") room.characters = Object.values(room.characters).filter(Boolean);
  else room.characters = [];

  room.auction = room.auction ?? {};
  room.auction.index = Number.isInteger(room.auction.index) ? room.auction.index : 0;
  room.auction.currentBid = Number(room.auction.currentBid) || 0;
  room.auction.bidderUid = room.auction.bidderUid ?? null;
  room.auction.endsAt = room.auction.endsAt ?? null;

  if (room.rps) {
    room.rps.contenders = Array.isArray(room.rps.contenders)
      ? room.rps.contenders.filter(Boolean)
      : Object.values(room.rps.contenders ?? {}).filter(Boolean);
    room.rps.choices = room.rps.choices ?? {};
    room.rps.round = Number(room.rps.round) || 1;
    room.rps.message = String(room.rps.message || "");
  } else {
    room.rps = null;
  }

  room.starterUid = room.starterUid ?? null;
  room.draftTurnUid = room.draftTurnUid ?? null;
  room.judge = room.judge ?? null;
  room.scenario = String(room.scenario || "");
  room.characterCategory = String(room.characterCategory || "");
  room.roundSource = room.roundSource === "groq" ? "groq" : "demo";
  room.rerollsLeft = Number.isFinite(Number(room.rerollsLeft)) ? Number(room.rerollsLeft) : 5;
  room.updatedAt = Number(room.updatedAt) || Date.now();
  room.createdAt = Number(room.createdAt) || room.updatedAt;

  return room as RoomState;
}

function cloneRoom(room: RoomState): RoomState {
  return normalizeRoomState(room);
}

function normalizedNickname(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 20);
}

function assertHost(room: RoomState, uid: string) {
  if (room.hostUid !== uid) throw new GameRuleError("Bu işlemi sadece host yapabilir.");
}

function assertPlayer(room: RoomState, uid: string) {
  const player = room.players[uid];
  if (!player) throw new GameRuleError("Bu odada değilsin.");
  return player;
}

function makeCharacterId(seed: CharacterSeed, index: number) {
  const slug = seed.name
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "karakter";
  return `c${index + 1}-${slug}`;
}

function materializeCharacters(characters: CharacterSeed[]): GameCharacter[] {
  const used = new Set<string>();
  return characters.map((character, index) => {
    const base = makeCharacterId(character, index);
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    return {
      id,
      name: character.name.trim().slice(0, 64),
      source: character.source.trim().slice(0, 64),
      status: "queued",
      winnerUid: null,
      winningBid: 0,
    };
  });
}

function resetPlayerForRound(room: RoomState) {
  for (const player of Object.values(room.players)) {
    player.balance = room.budget;
    player.team = [];
  }
}

function playerOrder(room: RoomState) {
  return Object.values(room.players).sort((a, b) => a.seat - b.seat);
}

function openSlotPlayers(room: RoomState) {
  return playerOrder(room).filter((player) => player.team.length < room.slots);
}

function availableLeftovers(room: RoomState) {
  return room.characters.filter((character) => character.status === "unsold");
}

function nextOpenPlayerUid(room: RoomState, afterUid: string | null) {
  const ordered = playerOrder(room);
  if (!ordered.length) return null;
  const startIndex = Math.max(0, ordered.findIndex((player) => player.uid === afterUid));
  for (let offset = 1; offset <= ordered.length; offset++) {
    const player = ordered[(startIndex + offset) % ordered.length];
    if (player.team.length < room.slots) return player.uid;
  }
  return null;
}

function beginPostAuction(room: RoomState) {
  const missing = openSlotPlayers(room);
  const leftovers = availableLeftovers(room);

  room.auction.endsAt = null;
  room.auction.currentBid = 0;
  room.auction.bidderUid = null;

  if (!missing.length || !leftovers.length) {
    room.status = "results";
    room.rps = null;
    room.draftTurnUid = null;
    return;
  }

  if (missing.length === 1) {
    room.status = "leftovers";
    room.starterUid = missing[0].uid;
    room.draftTurnUid = missing[0].uid;
    room.rps = null;
    return;
  }

  room.status = "rps";
  room.starterUid = null;
  room.draftTurnUid = null;
  room.rps = {
    round: 1,
    contenders: missing.map((player) => player.uid),
    choices: {},
    message: "Kalan karakterlerde ilk seçimi yapmak için taş-kağıt-makas!",
  };
}

function winningMove(a: RpsMove, b: RpsMove): RpsMove {
  if (a === b) return a;
  if (
    (a === "rock" && b === "scissors") ||
    (a === "scissors" && b === "paper") ||
    (a === "paper" && b === "rock")
  ) {
    return a;
  }
  return b;
}

export function createInitialRoom(input: {
  code: string;
  hostUid: string;
  nickname: string;
  budget: number;
  slots: number;
  now?: number;
}): RoomState {
  const nickname = normalizedNickname(input.nickname);
  if (!nickname) throw new GameRuleError("Bir nickname yazmalısın.");
  if (!/^[A-Z2-9]{5}$/.test(input.code)) throw new GameRuleError("Oda kodu geçersiz.");
  if (!Number.isInteger(input.budget) || input.budget < 20 || input.budget > 500) {
    throw new GameRuleError("Bütçe 20 ile 500 arasında olmalı.");
  }
  if (!Number.isInteger(input.slots) || input.slots < 3 || input.slots > 8) {
    throw new GameRuleError("Slot sayısı 3 ile 8 arasında olmalı.");
  }

  const now = input.now ?? Date.now();
  return {
    code: input.code,
    hostUid: input.hostUid,
    status: "lobby",
    budget: input.budget,
    slots: input.slots,
    createdAt: now,
    updatedAt: now,
    scenario: "",
    characterCategory: "",
    roundSource: "demo",
    rerollsLeft: 5,
    players: {
      [input.hostUid]: {
        uid: input.hostUid,
        nickname,
        seat: 0,
        balance: input.budget,
        team: [],
      },
    },
    characters: [],
    auction: { index: 0, currentBid: 0, bidderUid: null, endsAt: null },
    rps: null,
    starterUid: null,
    draftTurnUid: null,
    judge: null,
  };
}

export function joinPlayer(room: RoomState, input: { uid: string; nickname: string; now?: number }): RoomState {
  const next = cloneRoom(room);
  if (next.status !== "lobby") throw new GameRuleError("Bu oyun çoktan başlamış.");
  if (next.players[input.uid]) return next;
  if (Object.keys(next.players).length >= 8) throw new GameRuleError("Oda dolu.");

  const nickname = normalizedNickname(input.nickname);
  if (!nickname) throw new GameRuleError("Bir nickname yazmalısın.");
  if (Object.values(next.players).some((player) => player.nickname.toLocaleLowerCase("tr-TR") === nickname.toLocaleLowerCase("tr-TR"))) {
    throw new GameRuleError("Bu nickname odada kullanılıyor.");
  }

  next.players[input.uid] = {
    uid: input.uid,
    nickname,
    seat: Object.keys(next.players).length,
    balance: next.budget,
    team: [],
  };
  next.updatedAt = input.now ?? Date.now();
  return next;
}

export function applyRoundPreview(room: RoomState, actorUid: string, payload: RoundPayload, now = Date.now()): RoomState {
  const next = cloneRoom(room);
  assertHost(next, actorUid);
  if (Object.keys(next.players).length < 2) throw new GameRuleError("Oyunu başlatmak için en az 2 oyuncu lazım.");
  if (!payload.scenario.trim() || !payload.characterCategory.trim()) throw new GameRuleError("Tur içeriği eksik.");
  if (payload.characters.length < Object.keys(next.players).length * next.slots) {
    throw new GameRuleError("AI yeterli karakter üretmedi.");
  }

  next.status = "preview";
  next.scenario = payload.scenario.trim().slice(0, 90);
  next.characterCategory = payload.characterCategory.trim().slice(0, 80);
  next.roundSource = payload.source;
  next.characters = materializeCharacters(payload.characters);
  next.rerollsLeft = 5;
  next.auction = { index: 0, currentBid: 0, bidderUid: null, endsAt: null };
  next.rps = null;
  next.starterUid = null;
  next.draftTurnUid = null;
  next.judge = null;
  resetPlayerForRound(next);
  next.updatedAt = now;
  return next;
}

function spendReroll(room: RoomState) {
  if (room.status !== "preview") throw new GameRuleError("Zar sadece tur başlamadan kullanılabilir.");
  if (room.rerollsLeft <= 0) throw new GameRuleError("Bu turdaki zar hakları bitti.");
  room.rerollsLeft -= 1;
}

export function applyScenarioReroll(room: RoomState, actorUid: string, scenario: string, now = Date.now()): RoomState {
  const next = cloneRoom(room);
  assertHost(next, actorUid);
  spendReroll(next);
  const value = scenario.trim();
  if (!value) throw new GameRuleError("Yeni senaryo boş olamaz.");
  next.scenario = value.slice(0, 90);
  next.updatedAt = now;
  return next;
}

export function applyCategoryReroll(
  room: RoomState,
  actorUid: string,
  payload: Pick<RoundPayload, "characterCategory" | "characters" | "source">,
  now = Date.now(),
): RoomState {
  const next = cloneRoom(room);
  assertHost(next, actorUid);
  spendReroll(next);
  if (!payload.characterCategory.trim()) throw new GameRuleError("Yeni kategori boş olamaz.");
  if (payload.characters.length < Object.keys(next.players).length * next.slots) throw new GameRuleError("Yeni havuzda yeterli karakter yok.");
  next.characterCategory = payload.characterCategory.trim().slice(0, 80);
  next.characters = materializeCharacters(payload.characters);
  next.roundSource = payload.source;
  next.updatedAt = now;
  return next;
}

export function applyCharacterReroll(
  room: RoomState,
  actorUid: string,
  index: number,
  replacement: CharacterSeed,
  now = Date.now(),
): RoomState {
  const next = cloneRoom(room);
  assertHost(next, actorUid);
  spendReroll(next);
  if (!next.characters[index]) throw new GameRuleError("Karakter bulunamadı.");
  const name = replacement.name.trim();
  if (!name) throw new GameRuleError("Yeni karakter boş olamaz.");
  if (next.characters.some((character, i) => i !== index && character.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) {
    throw new GameRuleError("AI aynı karakteri tekrar verdi.");
  }
  const [materialized] = materializeCharacters([replacement]);
  materialized.id = next.characters[index].id;
  next.characters[index] = materialized;
  next.updatedAt = now;
  return next;
}

export function startAuction(room: RoomState, actorUid: string, now = Date.now()): RoomState {
  const next = cloneRoom(room);
  assertHost(next, actorUid);
  if (next.status !== "preview") throw new GameRuleError("Tur henüz açık artırmaya hazır değil.");
  if (!next.characters.length) throw new GameRuleError("Karakter havuzu boş.");

  next.status = "auction";
  next.characters = next.characters.map((character, index) => ({
    ...character,
    status: index === 0 ? "active" : "queued",
    winnerUid: null,
    winningBid: 0,
  }));
  next.auction = { index: 0, currentBid: 0, bidderUid: null, endsAt: now + AUCTION_MS };
  next.updatedAt = now;
  return next;
}

export function placeBid(room: RoomState, uid: string, amount: number, now = Date.now()): RoomState {
  const next = cloneRoom(room);
  const player = assertPlayer(next, uid);
  if (next.status !== "auction") throw new GameRuleError("Şu an açık artırma yok.");
  if (player.team.length >= next.slots) throw new GameRuleError("Kadron zaten dolu.");
  if (!Number.isInteger(amount) || amount <= next.auction.currentBid) throw new GameRuleError("Teklif mevcut tekliften daha yüksek olmalı.");
  if (amount > player.balance) throw new GameRuleError("Bakiye yetmiyor.");
  if (!next.characters[next.auction.index] || next.characters[next.auction.index].status !== "active") {
    throw new GameRuleError("Aktif karakter bulunamadı.");
  }

  next.auction.currentBid = amount;
  next.auction.bidderUid = uid;
  if (next.auction.endsAt && next.auction.endsAt - now < 3_000) {
    next.auction.endsAt = now + 3_000;
  }
  next.updatedAt = now;
  return next;
}

export function closeAuction(
  room: RoomState,
  actorUid: string,
  expectedCharacterId: string,
  now = Date.now(),
): RoomState {
  const next = cloneRoom(room);
  assertHost(next, actorUid);
  if (next.status !== "auction") throw new GameRuleError("Açık artırma zaten kapanmış.");

  const current = next.characters[next.auction.index];
  if (!current || current.id !== expectedCharacterId) throw new GameRuleError("Bu açık artırma artık aktif değil.");

  const bidder = next.auction.bidderUid ? next.players[next.auction.bidderUid] : null;
  if (bidder && next.auction.currentBid > 0 && bidder.team.length < next.slots && bidder.balance >= next.auction.currentBid) {
    bidder.balance -= next.auction.currentBid;
    bidder.team.push({
      characterId: current.id,
      name: current.name,
      source: current.source,
      acquisition: "auction",
      price: next.auction.currentBid,
    });
    current.status = "sold";
    current.winnerUid = bidder.uid;
    current.winningBid = next.auction.currentBid;
  } else {
    current.status = "unsold";
    current.winnerUid = null;
    current.winningBid = 0;
  }

  if (openSlotPlayers(next).length === 0) {
    next.auction.index += 1;
    next.status = "results";
    next.auction = { index: next.auction.index, currentBid: 0, bidderUid: null, endsAt: null };
    next.updatedAt = now;
    return next;
  }

  const nextIndex = next.auction.index + 1;
  if (nextIndex >= next.characters.length) {
    next.auction.index = nextIndex;
    beginPostAuction(next);
    next.updatedAt = now;
    return next;
  }

  next.auction = { index: nextIndex, currentBid: 0, bidderUid: null, endsAt: now + AUCTION_MS };
  next.characters[nextIndex].status = "active";
  next.updatedAt = now;
  return next;
}

export function submitRpsChoice(room: RoomState, uid: string, move: RpsMove, now = Date.now()): RoomState {
  const next = cloneRoom(room);
  assertPlayer(next, uid);
  if (next.status !== "rps" || !next.rps) throw new GameRuleError("Taş-kağıt-makas şu an aktif değil.");
  if (!next.rps.contenders.includes(uid)) throw new GameRuleError("Bu turda beklemedesin.");
  if (next.rps.choices[uid]) throw new GameRuleError("Seçimini zaten yaptın.");

  next.rps.choices[uid] = move;
  const allChosen = next.rps.contenders.every((contender) => Boolean(next.rps?.choices[contender]));
  if (!allChosen) {
    next.updatedAt = now;
    return next;
  }

  const moves = [...new Set(next.rps.contenders.map((contender) => next.rps!.choices[contender]))];
  if (moves.length === 1 || moves.length === 3) {
    next.rps = {
      ...next.rps,
      round: next.rps.round + 1,
      choices: {},
      message: "Berabere! Bir daha seçin.",
    };
    next.updatedAt = now;
    return next;
  }

  const winnerMove = winningMove(moves[0], moves[1]);
  const winners = next.rps.contenders.filter((contender) => next.rps!.choices[contender] === winnerMove);
  if (winners.length > 1) {
    next.rps = {
      round: next.rps.round + 1,
      contenders: winners,
      choices: {},
      message: `${winners.length} oyuncu kaldı. Devam!`,
    };
    next.updatedAt = now;
    return next;
  }

  next.starterUid = winners[0];
  next.draftTurnUid = winners[0];
  next.status = "leftovers";
  next.rps = null;
  next.updatedAt = now;
  return next;
}

export function pickLeftover(room: RoomState, uid: string, characterId: string, now = Date.now()): RoomState {
  const next = cloneRoom(room);
  const player = assertPlayer(next, uid);
  if (next.status !== "leftovers") throw new GameRuleError("Kalan karakter seçimi şu an aktif değil.");
  if (next.draftTurnUid !== uid) throw new GameRuleError("Sıra sende değil.");
  if (player.team.length >= next.slots) throw new GameRuleError("Kadron zaten dolu.");

  const character = next.characters.find((item) => item.id === characterId);
  if (!character || character.status !== "unsold") throw new GameRuleError("Bu karakter artık alınamaz.");

  character.status = "drafted";
  character.winnerUid = uid;
  character.winningBid = 0;
  player.team.push({
    characterId: character.id,
    name: character.name,
    source: character.source,
    acquisition: "leftover",
    price: 0,
  });

  const missing = openSlotPlayers(next);
  const leftovers = availableLeftovers(next);
  if (!missing.length || !leftovers.length) {
    next.status = "results";
    next.draftTurnUid = null;
  } else {
    next.draftTurnUid = nextOpenPlayerUid(next, uid);
  }
  next.updatedAt = now;
  return next;
}

export function saveJudge(room: RoomState, actorUid: string, judge: JudgeResult, now = Date.now()): RoomState {
  const next = cloneRoom(room);
  assertHost(next, actorUid);
  if (next.status !== "results") throw new GameRuleError("Jüri ancak kadrolar hazırken çalışır.");

  const playerIds = Object.keys(next.players).sort();
  const rankingIds = judge.rankings.map((ranking) => ranking.playerUid).sort();
  if (playerIds.join("|") !== rankingIds.join("|")) throw new GameRuleError("Jüri tüm oyuncuları puanlamadı.");
  if (!next.players[judge.winnerUid]) throw new GameRuleError("Jüri geçersiz kazanan döndürdü.");

  next.judge = {
    ...judge,
    rankings: judge.rankings.map((ranking) => ({
      ...ranking,
      score: Math.max(0, Math.min(100, Math.round(ranking.score))),
      comment: ranking.comment.trim().slice(0, 220),
    })),
    summary: judge.summary.trim().slice(0, 280),
  };
  next.updatedAt = now;
  return next;
}
