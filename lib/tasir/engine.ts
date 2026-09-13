import type { TasirPlayer, TasirRoomState, TasirRpsChoice, TasirTile } from "./types";

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
function toBoard(values: TasirTile[]): TasirTile[][] {
  return Array.from({ length: BOARD_ROWS }, (_, row) => values.slice(row * BOARD_COLS, (row + 1) * BOARD_COLS));
}
function owns(seat: number, tile: TasirTile) {
  if (tile === "joker") return false;
  const [min, max] = OWN_RANGES[seat] ?? OWN_RANGES[0];
  return tile >= min && tile <= max;
}
function boardSolved(player: TasirPlayer) {
  return player.board.length === BOARD_ROWS && player.board.every((row) => row.length === BOARD_COLS && row.every((tile) => owns(player.seat, tile)));
}
function cloneBoard(board: TasirTile[][]) { return board.map((row) => [...row]); }
function playerList(room: TasirRoomState) { return Object.values(room.players).sort((a, b) => a.seat - b.seat); }

export function createTasirRoom(input: { code: string; hostUid: string; nickname: string }): TasirRoomState {
  const t = now();
  const host: TasirPlayer = { uid: input.hostUid, nickname: cleanName(input.nickname), seat: 0, board: [] };
  return {
    schemaVersion: 1, code: input.code.toUpperCase(), hostUid: input.hostUid, status: "lobby",
    createdAt: t, updatedAt: t, players: { [host.uid]: host }, randomSeed: hashText(`${input.code}:${input.hostUid}`),
    turnUid: null, heldTile: "joker", moveNumber: 0,
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
  let tiles = shuffledTiles(room.randomSeed);
  let first = toBoard(tiles.slice(0, 20));
  let second = toBoard(tiles.slice(20));
  // Aşırı nadir başlangıç zaferini engelle; aynı seed'den deterministik ikinci karıştırma.
  if (boardSolved({ ...players[0], board: first }) || boardSolved({ ...players[1], board: second })) {
    tiles = shuffledTiles(nextRandom(room.randomSeed)); first = toBoard(tiles.slice(0, 20)); second = toBoard(tiles.slice(20));
  }
  const nextPlayers = {
    ...room.players,
    [players[0].uid]: { ...players[0], board: first },
    [players[1].uid]: { ...players[1], board: second },
  };
  return { ...room, players: nextPlayers, status: "rps", turnUid: null, heldTile: "joker", rps: { round: 1, choices: {}, winnerUid: null }, updatedAt: now() };
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
  return { ...room, status: "playing", turnUid: winnerUid, rps: { ...room.rps, choices, winnerUid }, heldTile: "joker", updatedAt: now() };
}

function shiftColumn(board: TasirTile[][], column: number, incoming: TasirTile) {
  const next = cloneBoard(board);
  const columnValues = next.map((row) => row[column]);
  const overflow = columnValues[columnValues.length - 1];
  for (let row = BOARD_ROWS - 1; row > 0; row--) next[row][column] = next[row - 1][column];
  next[0][column] = incoming;
  return { board: next, overflow };
}

export function playTasirColumn(room: TasirRoomState, uid: string, column: number): TasirRoomState {
  if (room.status !== "playing") throw new Error("Oyun aktif değil.");
  if (room.turnUid !== uid) throw new Error("Sıra sende değil.");
  if (!Number.isInteger(column) || column < 0 || column >= BOARD_COLS) throw new Error("Geçersiz sütun.");
  const current = room.players[uid];
  if (!current) throw new Error("Oyuncu bulunamadı.");
  const opponent = playerList(room).find((player) => player.uid !== uid);
  if (!opponent) throw new Error("Rakip bulunamadı.");

  let board = cloneBoard(current.board);
  let incoming: TasirTile = room.heldTile;
  let overflow: TasirTile = incoming;
  let chain = 0;
  let passTurn = false;
  let neutralBreak = false;

  // Kendi sayın taşarsa aynı sütuna geri koyup zinciri sürdürür. Tam bir sütun turunda
  // hâlâ el değişmediyse sonsuz döngü yerine oyuncuya başka sütun seçme hakkı bırakılır.
  while (chain < BOARD_ROWS + 1) {
    chain++;
    const shifted = shiftColumn(board, column, incoming);
    board = shifted.board;
    overflow = shifted.overflow;
    incoming = overflow;
    if (overflow === "joker") { neutralBreak = true; break; }
    if (!owns(current.seat, overflow)) { passTurn = true; break; }
    const probe = { ...current, board };
    if (boardSolved(probe)) break;
  }

  const updatedCurrent: TasirPlayer = { ...current, board };
  const players = { ...room.players, [uid]: updatedCurrent };
  const won = boardSolved(updatedCurrent);
  const nextTurnUid = won ? uid : passTurn ? opponent.uid : uid;
  const message = won
    ? `${current.nickname} bütün sayılarını kendi alanında topladı!`
    : passTurn
      ? `${String(overflow).toUpperCase()} karşı tarafa geçti. El ${opponent.nickname}'de.`
      : neutralBreak
        ? "Joker taştı! Sıra sende kalıyor; yeni bir sütun seç."
        : "Kendi sayın geldi. Sıra sende kalıyor; başka bir sütun seçebilirsin.";

  return {
    ...room, players, heldTile: overflow, turnUid: nextTurnUid, moveNumber: room.moveNumber + 1,
    status: won ? "finished" : room.status, winnerUid: won ? uid : null,
    lastAction: { playerUid: uid, column, overflow, chain, message, at: now() }, updatedAt: now(),
  };
}

export function normalizeTasirState(raw: any): TasirRoomState {
  const players: Record<string, TasirPlayer> = {};
  for (const [uid, value] of Object.entries(raw?.players || {})) {
    const p: any = value || {};
    const boardRaw: any[] = Array.isArray(p.board) ? p.board : Object.values(p.board || {});
    const board = boardRaw.map((row: any) => (Array.isArray(row) ? row : Object.values(row || {})).map((tile: any) => tile === "joker" ? "joker" : Number(tile))) as TasirTile[][];
    players[uid] = { uid, nickname: String(p.nickname || "Oyuncu").slice(0, 20), seat: Number(p.seat) === 1 ? 1 : 0, board };
  }
  const choices: Record<string, TasirRpsChoice> = {};
  for (const [uid, choice] of Object.entries(raw?.rps?.choices || {})) if (choice === "rock" || choice === "paper" || choice === "scissors") choices[uid] = choice;
  return {
    schemaVersion: 1, code: String(raw?.code || "").toUpperCase(), hostUid: String(raw?.hostUid || ""),
    status: ["lobby", "rps", "playing", "finished"].includes(raw?.status) ? raw.status : "lobby",
    createdAt: Number(raw?.createdAt || 0), updatedAt: Number(raw?.updatedAt || 0), players,
    randomSeed: Number(raw?.randomSeed || 1), turnUid: raw?.turnUid ? String(raw.turnUid) : null,
    heldTile: raw?.heldTile === "joker" ? "joker" : Number(raw?.heldTile ?? 0), moveNumber: Number(raw?.moveNumber || 0),
    rps: { round: Math.max(1, Number(raw?.rps?.round || 1)), choices, winnerUid: raw?.rps?.winnerUid ? String(raw.rps.winnerUid) : null },
    winnerUid: raw?.winnerUid ? String(raw.winnerUid) : null,
    lastAction: raw?.lastAction ? { ...raw.lastAction, overflow: raw.lastAction.overflow === "joker" ? "joker" : Number(raw.lastAction.overflow) } : null,
  };
}

export function tasirOwnedRange(seat: number) { return OWN_RANGES[seat] ?? OWN_RANGES[0]; }
export function tasirBoardSolved(player: TasirPlayer) { return boardSolved(player); }
