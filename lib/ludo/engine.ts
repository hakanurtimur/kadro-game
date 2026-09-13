import type {
  LudoChaosEvent,
  LudoChaosKind,
  LudoChaosScope,
  LudoColor,
  LudoMode,
  LudoPawn,
  LudoRoomState,
} from "./types";

export class LudoRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LudoRuleError";
  }
}

const COLORS: LudoColor[] = ["red", "green", "yellow", "blue"];
const START_OFFSETS = [0, 13, 26, 39];
const SAFE_GLOBAL_CELLS = new Set(START_OFFSETS);
const FINISH_PROGRESS = 57;

const CHAOS_CARDS: Array<{ kind: LudoChaosKind; scope: LudoChaosScope; title: string; description: string }> = [
  { kind: "double", scope: "active", title: "Çifte Zar", description: "İki zar at; bu tur kullanacağın zarı sen seç." },
  { kind: "reverse", scope: "active", title: "Ters Köşe", description: "Bu tur zar 1↔6, 2↔5, 3↔4 olarak tersine döner." },
  { kind: "portal", scope: "active", title: "Portal", description: "Seçtiğin taş uygunsa normal hareketine +2 kare bonus alır." },
  { kind: "shield", scope: "active", title: "Kalkan", description: "Bu tur hareket ettirdiğin taş bir masa turu boyunca korunur." },
  { kind: "peace", scope: "global", title: "Barış Turu", description: "Bir masa turu boyunca hiçbir taş yenemez." },
  { kind: "quake", scope: "global", title: "Deprem", description: "Ortak parkurdaki tüm taşlar bir kare geri gider." },
];

function clone<T>(value: T): T {
  return structuredClone(value);
}

function nickname(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 20);
}

function seedFrom(code: string) {
  let hash = 2166136261;
  for (const char of code) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(seed: number, seq: number) {
  let x = (seed ^ Math.imul(seq + 1, 0x9e3779b1)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 0x100000000;
}

function nextDie(room: LudoRoomState) {
  const value = 1 + Math.floor(randomUnit(room.randomSeed, room.randomSeq) * 6);
  room.randomSeq += 1;
  return value;
}

function playerOrder(room: LudoRoomState) {
  return Object.values(room.players).sort((a, b) => a.seat - b.seat);
}

function assertHost(room: LudoRoomState, uid: string) {
  if (room.hostUid !== uid) throw new LudoRuleError("Bu ayarı yalnız oda sahibi değiştirebilir.");
}

function assertPlayer(room: LudoRoomState, uid: string) {
  const player = room.players[uid];
  if (!player) throw new LudoRuleError("Bu odada oyuncu değilsin.");
  return player;
}

function assertTurn(room: LudoRoomState, uid: string) {
  assertPlayer(room, uid);
  if (room.status !== "playing") throw new LudoRuleError("Oyun başlamadı.");
  if (room.turnUid !== uid) throw new LudoRuleError("Sıra sende değil.");
}

function makePawns(uid: string): LudoPawn[] {
  return Array.from({ length: 4 }, (_, index) => ({ id: `${uid}-p${index + 1}`, progress: -1, shieldUntilTurn: -1 }));
}

export function normalizeLudoState(raw: any): LudoRoomState {
  const room = clone(raw ?? {});
  room.schemaVersion = 1;
  room.mode = room.mode === "chaos" ? "chaos" : "classic";
  room.status = ["lobby", "playing", "finished"].includes(room.status) ? room.status : "lobby";
  room.phase = ["awaiting-roll", "choose-die", "awaiting-move"].includes(room.phase) ? room.phase : "awaiting-roll";
  room.players = room.players ?? {};
  for (const player of Object.values(room.players) as any[]) {
    if (Array.isArray(player.pawns)) player.pawns = player.pawns.filter(Boolean);
    else player.pawns = Object.values(player.pawns ?? {}).filter(Boolean);
    player.pawns = player.pawns.map((pawn: any, index: number) => ({
      id: String(pawn?.id || `${player.uid}-p${index + 1}`),
      progress: Number.isInteger(Number(pawn?.progress)) ? Number(pawn.progress) : -1,
      shieldUntilTurn: Number.isInteger(Number(pawn?.shieldUntilTurn)) ? Number(pawn.shieldUntilTurn) : -1,
    }));
    while (player.pawns.length < 4) player.pawns.push({ id: `${player.uid}-p${player.pawns.length + 1}`, progress: -1, shieldUntilTurn: -1 });
  }
  room.dice = Array.isArray(room.dice) ? room.dice.filter((v: unknown) => Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 6).map(Number) : [];
  room.selectedDie = Number.isInteger(room.selectedDie) ? room.selectedDie : null;
  room.turnUid = room.turnUid ?? null;
  room.turnNumber = Number.isInteger(Number(room.turnNumber)) ? Number(room.turnNumber) : 0;
  room.randomSeed = Number.isInteger(Number(room.randomSeed)) ? Number(room.randomSeed) >>> 0 : seedFrom(String(room.code || "LUDO"));
  room.randomSeq = Number.isInteger(Number(room.randomSeq)) ? Number(room.randomSeq) : 0;
  room.winnerUid = room.winnerUid ?? null;
  room.chaos = room.chaos ?? {};
  room.chaos.current = room.chaos.current ?? null;
  room.chaos.history = Array.isArray(room.chaos.history) ? room.chaos.history.filter(Boolean) : Object.values(room.chaos.history ?? {}).filter(Boolean);
  room.chaos.peaceUntilTurn = Number.isInteger(Number(room.chaos.peaceUntilTurn)) ? Number(room.chaos.peaceUntilTurn) : -1;
  room.lastAction = room.lastAction ?? null;
  room.createdAt = Number(room.createdAt) || Date.now();
  room.updatedAt = Number(room.updatedAt) || room.createdAt;
  return room as LudoRoomState;
}

export function createLudoRoom(input: { code: string; hostUid: string; nickname: string; mode?: LudoMode; now?: number }): LudoRoomState {
  const name = nickname(input.nickname);
  if (!name) throw new LudoRuleError("Bir nickname yazmalısın.");
  if (!/^[A-Z2-9]{5}$/.test(input.code)) throw new LudoRuleError("Oda kodu geçersiz.");
  const now = input.now ?? Date.now();
  return {
    schemaVersion: 1,
    code: input.code,
    hostUid: input.hostUid,
    mode: input.mode === "chaos" ? "chaos" : "classic",
    status: "lobby",
    phase: "awaiting-roll",
    createdAt: now,
    updatedAt: now,
    players: {
      [input.hostUid]: { uid: input.hostUid, nickname: name, seat: 0, color: "red", pawns: makePawns(input.hostUid) },
    },
    turnUid: null,
    turnNumber: 0,
    randomSeed: seedFrom(input.code),
    randomSeq: 0,
    dice: [],
    selectedDie: null,
    winnerUid: null,
    chaos: { current: null, history: [], peaceUntilTurn: -1 },
    lastAction: null,
  };
}

export function joinLudoPlayer(room: LudoRoomState, input: { uid: string; nickname: string; now?: number }): LudoRoomState {
  const next = normalizeLudoState(room);
  if (next.players[input.uid]) return next;
  if (next.status !== "lobby") throw new LudoRuleError("Bu oyun çoktan başladı.");
  const order = playerOrder(next);
  if (order.length >= 4) throw new LudoRuleError("Oda dolu; Kızma Birader en fazla 4 kişi.");
  const name = nickname(input.nickname);
  if (!name) throw new LudoRuleError("Bir nickname yazmalısın.");
  if (order.some((player) => player.nickname.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) throw new LudoRuleError("Bu nickname odada kullanılıyor.");
  const seat = order.length;
  next.players[input.uid] = { uid: input.uid, nickname: name, seat, color: COLORS[seat], pawns: makePawns(input.uid) };
  next.updatedAt = input.now ?? Date.now();
  return next;
}

export function setLudoMode(room: LudoRoomState, uid: string, mode: LudoMode, now = Date.now()): LudoRoomState {
  const next = normalizeLudoState(room);
  assertHost(next, uid);
  if (next.status !== "lobby") throw new LudoRuleError("Mod yalnız lobby'de değişir.");
  next.mode = mode;
  next.updatedAt = now;
  return next;
}

export function startLudoGame(room: LudoRoomState, uid: string, now = Date.now()): LudoRoomState {
  const next = normalizeLudoState(room);
  assertHost(next, uid);
  const order = playerOrder(next);
  if (order.length < 2) throw new LudoRuleError("Başlamak için en az 2 oyuncu gerekiyor.");
  if (order.length > 4) throw new LudoRuleError("En fazla 4 oyuncu oynayabilir.");
  next.status = "playing";
  next.phase = "awaiting-roll";
  next.turnUid = order[0].uid;
  next.turnNumber = 0;
  next.dice = [];
  next.selectedDie = null;
  next.winnerUid = null;
  next.chaos = { current: null, history: [], peaceUntilTurn: -1 };
  next.lastAction = { type: "move", message: `${order[0].nickname} başlıyor!`, at: now };
  next.updatedAt = now;
  return next;
}

function seatOf(room: LudoRoomState, uid: string) {
  return assertPlayer(room, uid).seat;
}

export function globalTrackCell(room: LudoRoomState, uid: string, progress: number) {
  if (progress < 0 || progress >= 52) return null;
  return (START_OFFSETS[seatOf(room, uid)] + progress) % 52;
}

function reverseDie(value: number) {
  return 7 - value;
}

function chaosTitle(kind: LudoChaosKind) {
  return CHAOS_CARDS.find((card) => card.kind === kind)!;
}

function eventFor(room: LudoRoomState, card: typeof CHAOS_CARDS[number]): LudoChaosEvent {
  return {
    id: `c${room.turnNumber}-${card.kind}-${room.chaos.history.length + 1}`,
    kind: card.kind,
    scope: card.scope,
    title: card.title,
    description: card.description,
    turnNumber: room.turnNumber,
  };
}

function applyQuake(room: LudoRoomState) {
  for (const player of Object.values(room.players)) {
    for (const pawn of player.pawns) {
      if (pawn.progress >= 1 && pawn.progress < 52) pawn.progress -= 1;
    }
  }
}

function triggerChaosIfNeeded(room: LudoRoomState, now: number) {
  room.chaos.current = null;
  if (room.mode !== "chaos" || room.turnNumber <= 0 || room.turnNumber % 4 !== 0) return;
  const index = Math.floor(randomUnit(room.randomSeed ^ 0xa11ce, room.turnNumber + room.chaos.history.length) * CHAOS_CARDS.length);
  const event = eventFor(room, CHAOS_CARDS[index]);
  room.chaos.current = event;
  room.chaos.history.push(event);
  if (event.kind === "peace") room.chaos.peaceUntilTurn = room.turnNumber + playerOrder(room).length;
  if (event.kind === "quake") applyQuake(room);
  room.lastAction = { type: "chaos", message: `${event.title}: ${event.description}`, at: now };
}

function nextPlayerUid(room: LudoRoomState, uid: string) {
  const order = playerOrder(room);
  const index = order.findIndex((player) => player.uid === uid);
  return order[(index + 1) % order.length].uid;
}

function advanceTurn(room: LudoRoomState, now: number) {
  const previous = room.turnUid;
  room.turnUid = previous ? nextPlayerUid(room, previous) : playerOrder(room)[0]?.uid ?? null;
  room.turnNumber += 1;
  room.phase = "awaiting-roll";
  room.dice = [];
  room.selectedDie = null;
  triggerChaosIfNeeded(room, now);
  room.updatedAt = now;
  return room;
}

export function advanceTurnForTest(room: LudoRoomState, now = Date.now()) {
  return advanceTurn(normalizeLudoState(room), now);
}

function applyRolledValues(room: LudoRoomState, uid: string, values: number[], now: number) {
  assertTurn(room, uid);
  if (room.phase !== "awaiting-roll") throw new LudoRuleError("Önce mevcut hamleyi tamamla.");
  const current = room.chaos.current;
  const dice = current?.kind === "reverse" ? values.map(reverseDie) : values;
  room.dice = dice;
  room.selectedDie = dice.length === 1 ? dice[0] : null;
  room.phase = dice.length > 1 ? "choose-die" : "awaiting-move";
  room.lastAction = { type: "roll", message: `${assertPlayer(room, uid).nickname} ${dice.join(" / ")} attı.`, at: now };
  room.updatedAt = now;
  return room;
}

export function rollLudoDice(room: LudoRoomState, uid: string, now = Date.now()): LudoRoomState {
  const next = normalizeLudoState(room);
  assertTurn(next, uid);
  if (next.phase !== "awaiting-roll") throw new LudoRuleError("Bu tur zar zaten atıldı.");
  const count = next.chaos.current?.kind === "double" ? 2 : 1;
  const values = Array.from({ length: count }, () => nextDie(next));
  return applyRolledValues(next, uid, values, now);
}

export function forceRollForTest(room: LudoRoomState, uid: string, values: number[], now = Date.now()) {
  const next = normalizeLudoState(room);
  return applyRolledValues(next, uid, values, now);
}

export function chooseLudoDie(room: LudoRoomState, uid: string, value: number, now = Date.now()): LudoRoomState {
  const next = normalizeLudoState(room);
  assertTurn(next, uid);
  if (next.phase !== "choose-die") throw new LudoRuleError("Seçilecek iki zar yok.");
  if (!next.dice.includes(value)) throw new LudoRuleError("Bu zar seçilemez.");
  next.selectedDie = value;
  next.phase = "awaiting-move";
  next.updatedAt = now;
  return next;
}

function targetProgress(room: LudoRoomState, uid: string, pawn: LudoPawn, die: number) {
  if (pawn.progress === -1) return die === 6 ? 0 : null;
  if (pawn.progress >= FINISH_PROGRESS) return null;
  let target = pawn.progress + die;
  if (target > FINISH_PROGRESS) return null;
  if (room.chaos.current?.kind === "portal" && target < FINISH_PROGRESS && target + 2 <= FINISH_PROGRESS) target += 2;
  return target;
}

function targetForPawn(room: LudoRoomState, uid: string, pawnIndex: number) {
  const player = assertPlayer(room, uid);
  const pawn = player.pawns[pawnIndex];
  if (!pawn || !room.selectedDie) return null;
  const target = targetProgress(room, uid, pawn, room.selectedDie);
  if (target === null) return null;
  if (target !== FINISH_PROGRESS && player.pawns.some((other, index) => index !== pawnIndex && other.progress === target)) return null;
  return target;
}

export function previewLudoPawnMove(room: LudoRoomState, uid: string, pawnIndex: number): number | null {
  const normalized = normalizeLudoState(room);
  if (normalized.turnUid !== uid || normalized.phase !== "awaiting-move" || !normalized.selectedDie) return null;
  return targetForPawn(normalized, uid, pawnIndex);
}

export function legalPawnMoves(room: LudoRoomState, uid: string): number[] {
  const normalized = normalizeLudoState(room);
  const player = assertPlayer(normalized, uid);
  if (normalized.turnUid !== uid || normalized.phase !== "awaiting-move" || !normalized.selectedDie) return [];
  return player.pawns.map((_, index) => targetForPawn(normalized, uid, index) !== null ? index : -1).filter((index) => index >= 0);
}

function captureAt(room: LudoRoomState, uid: string, pawn: LudoPawn) {
  const cell = globalTrackCell(room, uid, pawn.progress);
  if (cell === null || SAFE_GLOBAL_CELLS.has(cell) || room.chaos.peaceUntilTurn >= room.turnNumber) return null;
  for (const opponent of Object.values(room.players)) {
    if (opponent.uid === uid) continue;
    for (const other of opponent.pawns) {
      if (other.progress < 0 || other.progress >= 52) continue;
      if (other.shieldUntilTurn >= room.turnNumber) continue;
      if (globalTrackCell(room, opponent.uid, other.progress) === cell) {
        other.progress = -1;
        other.shieldUntilTurn = -1;
        return other.id;
      }
    }
  }
  return null;
}

export function recomputeLudoWinner(room: LudoRoomState, now = Date.now()): LudoRoomState {
  const next = normalizeLudoState(room);
  const winner = Object.values(next.players).find((player) => player.pawns.every((pawn) => pawn.progress === FINISH_PROGRESS));
  if (winner) {
    next.winnerUid = winner.uid;
    next.status = "finished";
    next.turnUid = null;
    next.dice = [];
    next.selectedDie = null;
    next.lastAction = { type: "home", message: `${winner.nickname} bütün taşlarını eve getirdi!`, at: now };
    next.updatedAt = now;
  }
  return next;
}

export function moveLudoPawn(room: LudoRoomState, uid: string, pawnIndex: number, now = Date.now()): LudoRoomState {
  let next = normalizeLudoState(room);
  assertTurn(next, uid);
  if (next.phase !== "awaiting-move" || !next.selectedDie) throw new LudoRuleError("Önce zar atmalısın.");
  const player = assertPlayer(next, uid);
  const pawn = player.pawns[pawnIndex];
  if (!pawn) throw new LudoRuleError("Taş bulunamadı.");
  const rawTarget = targetProgress(next, uid, pawn, next.selectedDie);
  if (rawTarget === null) throw new LudoRuleError("Bu taş bu zarla oynayamaz.");
  const target = targetForPawn(next, uid, pawnIndex);
  if (target === null) throw new LudoRuleError("Hedef kare kendi taşın tarafından dolu.");
  const die = next.selectedDie;
  pawn.progress = target;
  if (next.chaos.current?.kind === "shield") pawn.shieldUntilTurn = next.turnNumber + playerOrder(next).length;
  const captured = captureAt(next, uid, pawn);
  next.lastAction = captured
    ? { type: "capture", message: `${player.nickname} rakip taşı avluya yolladı!`, pawnId: pawn.id, capturedPawnId: captured, at: now }
    : target === FINISH_PROGRESS
      ? { type: "home", message: `${player.nickname} bir taşını eve getirdi ✨`, pawnId: pawn.id, at: now }
      : { type: "move", message: `${player.nickname} taşını ilerletti.`, pawnId: pawn.id, at: now };
  next.chaos.current = null;
  next.dice = [];
  next.selectedDie = null;
  next.phase = "awaiting-roll";
  next.updatedAt = now;
  next = recomputeLudoWinner(next, now);
  if (next.status === "finished") return next;
  if (die === 6) return next;
  return advanceTurn(next, now);
}

export function finishNoMove(room: LudoRoomState, uid: string, now = Date.now()): LudoRoomState {
  const next = normalizeLudoState(room);
  assertTurn(next, uid);
  if (next.phase !== "awaiting-move" || !next.selectedDie) throw new LudoRuleError("Tamamlanacak zar yok.");
  if (legalPawnMoves(next, uid).length) throw new LudoRuleError("Oynayabileceğin bir taş var.");
  const die = next.selectedDie;
  next.chaos.current = null;
  next.dice = [];
  next.selectedDie = null;
  next.phase = "awaiting-roll";
  next.updatedAt = now;
  if (die === 6) return next;
  return advanceTurn(next, now);
}

export function forceChaosForTest(room: LudoRoomState, input: { kind: LudoChaosKind; scope: LudoChaosScope }, uid: string, now = Date.now()): LudoRoomState {
  const next = normalizeLudoState(room);
  assertPlayer(next, uid);
  const base = chaosTitle(input.kind);
  const event = eventFor(next, { ...base, scope: input.scope });
  next.chaos.current = event;
  if (input.kind === "peace") next.chaos.peaceUntilTurn = next.turnNumber + playerOrder(next).length;
  if (input.kind === "quake") applyQuake(next);
  next.updatedAt = now;
  return next;
}
