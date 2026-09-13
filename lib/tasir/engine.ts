import type { TasirBoardTile, TasirPlayer, TasirRoomState, TasirRpsChoice, TasirTile } from "./types";

const BOARD_ROWS = 4;
const BOARD_COLS = 5;
const OWN_RANGES: Array<[number, number]> = [[0, 4], [5, 9]];
const RPS_BEATS: Record<TasirRpsChoice, TasirRpsChoice> = { rock: "scissors", paper: "rock", scissors: "paper" };

function now() { return Date.now(); }
function cleanName(value: string) { return value.trim().slice(0, 20) || "Oyuncu"; }
function hashText(value: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h || 1;
}
function nextRandom(seed: number) {
  let x = seed >>> 0 || 1;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}
function shuffledTiles(seed: number) {
  const tiles: number[] = [];
  for (let digit = 0; digit <= 9; digit++) for (let copy = 0; copy < 4; copy++) tiles.push(digit);
  let state = seed >>> 0 || 1;
  for (let i = tiles.length - 1; i > 0; i--) {
    state = nextRandom(state);
    const j = state % (i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}
function toBoard(values: number[]): TasirBoardTile[][] {
  return Array.from({ length: BOARD_ROWS }, (_, row) => values.slice(row * BOARD_COLS, (row + 1) * BOARD_COLS).map((value) => ({ value, revealed: false })));
}
function owns(seat: number, tile: TasirTile) {
  if (tile === "joker") return false;
  const [min, max] = OWN_RANGES[seat] ?? OWN_RANGES[0];
  return tile >= min && tile <= max;
}
function ownerSeat(tile: TasirTile): 0 | 1 | null {
  if (tile === "joker") return null;
  return tile <= 4 ? 0 : 1;
}
function targetColumn(seat: number, tile: TasirTile) {
  if (tile === "joker") return null;
  const [min, max] = OWN_RANGES[seat] ?? OWN_RANGES[0];
  if (tile < min || tile > max) return null;
  return tile - min;
}
function columnSolved(player: TasirPlayer, column: number) {
  const target = (OWN_RANGES[player.seat] ?? OWN_RANGES[0])[0] + column;
  return player.board.length === BOARD_ROWS && player.board.every((row) => {
    const tile = row[column];
    return row.length === BOARD_COLS && !!tile && tile.revealed && tile.value === target;
  });
}
function boardSolved(player: TasirPlayer) {
  return Array.from({ length: BOARD_COLS }, (_, column) => columnSolved(player, column)).every(Boolean);
}
function cloneBoard(board: TasirBoardTile[][]) { return board.map((row) => row.map((tile) => ({ ...tile }))); }
function playerList(room: TasirRoomState) { return Object.values(room.players).sort((a, b) => a.seat - b.seat); }

export function createTasirRoom(input: { code: string; hostUid: string; nickname: string }): TasirRoomState {
  const t = now();
  const host: TasirPlayer = { uid: input.hostUid, nickname: cleanName(input.nickname), seat: 0, board: [] };
  return {
    schemaVersion: 1, code: input.code.toUpperCase(), hostUid: input.hostUid, status: "lobby",
    createdAt: t, updatedAt: t, players: { [host.uid]: host }, randomSeed: hashText(`${input.code}:${input.hostUid}`),
    turnUid: null, heldTile: "joker", forcedColumn: null, columnChainCount: 0, moveNumber: 0,
    rps: { round: 1, choices: {}, winnerUid: null }, winnerUid: null, lastAction: null,
  };
}

export function joinTasirPlayer(room: TasirRoomState, input: { uid: string; nickname: string }): TasirRoomState {
  if (room.players[input.uid]) return room;
  if (room.status !== "lobby") throw new Error("Oyun başladı; yeni oyuncu giremez.");
  const players = playerList(room);
  if (players.length >= 2) throw new Error("TAŞIR yalnızca 2 kişilik.");
  const player: TasirPlayer = { uid: input.uid, nickname: cleanName(input.nickname), seat: 1, board: [] };
  return { ...room, players: { ...room.players, [player.uid]: player }, updatedAt: now() };
}

export function startTasirRps(room: TasirRoomState, actorUid: string): TasirRoomState {
  if (actorUid !== room.hostUid) throw new Error("Oyunu yalnızca odayı kuran başlatabilir.");
  if (room.status !== "lobby") throw new Error("Oyun zaten başladı.");
  const players = playerList(room);
  if (players.length !== 2) throw new Error("Başlamak için 2 oyuncu gerekiyor.");
  const tiles = shuffledTiles(room.randomSeed);
  const first = toBoard(tiles.slice(0, 20));
  const second = toBoard(tiles.slice(20));
  const nextPlayers = {
    ...room.players,
    [players[0].uid]: { ...players[0], board: first },
    [players[1].uid]: { ...players[1], board: second },
  };
  return { ...room, players: nextPlayers, status: "rps", turnUid: null, heldTile: "joker", forcedColumn: null, columnChainCount: 0, rps: { round: 1, choices: {}, winnerUid: null }, updatedAt: now() };
}

export function chooseTasirRps(room: TasirRoomState, uid: string, choice: TasirRpsChoice): TasirRoomState {
  if (room.status !== "rps") throw new Error("Taş-kağıt-makas aşaması aktif değil.");
  if (!room.players[uid]) throw new Error("Bu oyuncu odada değil.");
  if (room.rps.choices[uid]) return room;
  const choices = { ...room.rps.choices, [uid]: choice };
  const players = playerList(room);
  if (players.some((player) => !choices[player.uid])) return { ...room, rps: { ...room.rps, choices }, updatedAt: now() };
  const a = players[0], b = players[1], ca = choices[a.uid], cb = choices[b.uid];
  if (ca === cb) return { ...room, rps: { round: room.rps.round + 1, choices: {}, winnerUid: null }, updatedAt: now() };
  const winnerUid = RPS_BEATS[ca] === cb ? a.uid : b.uid;
  return { ...room, status: "playing", turnUid: winnerUid, rps: { ...room.rps, choices, winnerUid }, heldTile: "joker", forcedColumn: null, columnChainCount: 0, updatedAt: now() };
}

function shiftColumn(board: TasirBoardTile[][], column: number, incoming: TasirTile) {
  const next = cloneBoard(board);
  const overflow = { ...next[BOARD_ROWS - 1][column] };
  for (let row = BOARD_ROWS - 1; row > 0; row--) next[row][column] = { ...next[row - 1][column] };
  next[0][column] = { value: incoming, revealed: true };
  return { board: next, overflow };
}

export function tasirLegalColumns(room: TasirRoomState, uid: string) {
  const player = room.players[uid];
  if (!player || room.status !== "playing" || room.turnUid !== uid) return [];
  if (room.heldTile === "joker") return [0, 1, 2, 3, 4];
  const column = targetColumn(player.seat, room.heldTile);
  return column === null ? [] : [column];
}

export function playTasirColumn(room: TasirRoomState, uid: string, column: number): TasirRoomState {
  if (room.status !== "playing") throw new Error("Oyun aktif değil.");
  if (room.turnUid !== uid) throw new Error("Sıra sende değil.");
  if (!Number.isInteger(column) || column < 0 || column >= BOARD_COLS) throw new Error("Geçersiz sütun.");
  const current = room.players[uid];
  if (!current) throw new Error("Oyuncu bulunamadı.");
  const legal = tasirLegalColumns(room, uid);
  if (!legal.includes(column)) {
    const expected = room.heldTile === "joker" ? "Joker ile istediğin hattı seçebilirsin." : `${room.heldTile} taşı yalnız ${room.heldTile} hattına girebilir.`;
    throw new Error(expected);
  }

  const incoming = room.heldTile;
  const shifted = shiftColumn(current.board, column, incoming);
  const overflow = shifted.overflow.value;
  const updatedCurrent: TasirPlayer = { ...current, board: shifted.board };
  const players = { ...room.players, [uid]: updatedCurrent };
  const won = boardSolved(updatedCurrent);

  let nextTurnUid: string | null = uid;
  let forcedColumn: number | null = null;
  let message: string;

  if (won) {
    message = `${current.nickname} beş hattını da doğru taşlarla tamamladı!`;
  } else if (overflow === "joker") {
    message = "Joker geri çıktı! İstediğin hattı seçebilirsin.";
  } else {
    const seat = ownerSeat(overflow);
    const owner = playerList(room).find((player) => player.seat === seat);
    if (!owner || seat === null) throw new Error("Açılan taşın sahibi bulunamadı.");
    const nextColumn = targetColumn(owner.seat, overflow);
    if (nextColumn === null) throw new Error("Açılan taş hedef hattına yönlendirilemedi.");
    nextTurnUid = owner.uid;
    forcedColumn = nextColumn;
    message = `${overflow} açıldı → ${owner.nickname} ${overflow} hattını kaydıracak.`;
  }

  return {
    ...room, players, heldTile: overflow, turnUid: won ? uid : nextTurnUid, forcedColumn, columnChainCount: 0, moveNumber: room.moveNumber + 1,
    status: won ? "finished" : room.status, winnerUid: won ? uid : null,
    lastAction: { playerUid: uid, column, incoming, overflow, overflowWasRevealed: shifted.overflow.revealed, chain: 1, message, at: now() }, updatedAt: now(),
  };
}

function normalizeTile(raw: any): TasirBoardTile {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "value" in raw) {
    const value = raw.value === "joker" ? "joker" : Number(raw.value);
    return { value, revealed: raw.revealed === true };
  }
  // Patch 04 odalarını güvenli biçimde taşı: eski sayısal taşlar kapalı kabul edilir.
  return { value: raw === "joker" ? "joker" : Number(raw), revealed: false };
}

export function normalizeTasirState(raw: any): TasirRoomState {
  const players: Record<string, TasirPlayer> = {};
  for (const [uid, value] of Object.entries(raw?.players || {})) {
    const p: any = value || {};
    const boardRaw: any[] = Array.isArray(p.board) ? p.board : Object.values(p.board || {});
    const board = boardRaw.map((row: any) => (Array.isArray(row) ? row : Object.values(row || {})).map(normalizeTile)) as TasirBoardTile[][];
    players[uid] = { uid, nickname: String(p.nickname || "Oyuncu").slice(0, 20), seat: Number(p.seat) === 1 ? 1 : 0, board };
  }
  const choices: Record<string, TasirRpsChoice> = {};
  for (const [uid, choice] of Object.entries(raw?.rps?.choices || {})) if (choice === "rock" || choice === "paper" || choice === "scissors") choices[uid] = choice;
  const normalizeValue = (value: any): TasirTile => value === "joker" ? "joker" : Number(value ?? 0);
  const action = raw?.lastAction ? {
    ...raw.lastAction,
    incoming: normalizeValue(raw.lastAction.incoming ?? "joker"),
    overflow: normalizeValue(raw.lastAction.overflow),
    overflowWasRevealed: raw.lastAction.overflowWasRevealed === true,
    chain: 1 as const,
  } : null;
  return {
    schemaVersion: 1, code: String(raw?.code || "").toUpperCase(), hostUid: String(raw?.hostUid || ""),
    status: ["lobby", "rps", "playing", "finished"].includes(raw?.status) ? raw.status : "lobby",
    createdAt: Number(raw?.createdAt || 0), updatedAt: Number(raw?.updatedAt || 0), players,
    randomSeed: Number(raw?.randomSeed || 1), turnUid: raw?.turnUid ? String(raw.turnUid) : null,
    heldTile: normalizeValue(raw?.heldTile ?? "joker"), forcedColumn: (() => {
      const held = normalizeValue(raw?.heldTile ?? "joker");
      const turn = raw?.turnUid ? players[String(raw.turnUid)] : undefined;
      return held === "joker" || !turn ? null : targetColumn(turn.seat, held);
    })(), columnChainCount: 0, moveNumber: Number(raw?.moveNumber || 0),
    rps: { round: Math.max(1, Number(raw?.rps?.round || 1)), choices, winnerUid: raw?.rps?.winnerUid ? String(raw.rps.winnerUid) : null },
    winnerUid: raw?.winnerUid ? String(raw.winnerUid) : null,
    lastAction: action,
  };
}

export function tasirOwnedRange(seat: number) { return OWN_RANGES[seat] ?? OWN_RANGES[0]; }
export function tasirTargetForColumn(seat: number, column: number) {
  const [min] = OWN_RANGES[seat] ?? OWN_RANGES[0];
  return min + column;
}
export function tasirOwnerSeat(tile: TasirTile) { return ownerSeat(tile); }
export function tasirCompletedColumns(player: TasirPlayer) {
  return Array.from({ length: BOARD_COLS }, (_, column) => columnSolved(player, column)).filter(Boolean).length;
}
export function tasirBoardSolved(player: TasirPlayer) { return boardSolved(player); }
export function tasirRevealCount(player: TasirPlayer) { return player.board.flat().filter((tile) => tile.revealed).length; }
