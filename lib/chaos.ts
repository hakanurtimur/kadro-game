import type { ChaosEvent, ChaosEventKind, RoomState } from "./types";

export const CHAOS_EVERY = 3;
export const CHAOS_PAUSE_MS = 5_000;
const DECK: ChaosEventKind[] = ["crisis", "inheritance", "swap", "scenario"];
const SCENARIOS = [
  "Zombi İstilasından Sağ Çık", "En Kaotik Düğünü Organize Et", "Issız Adada 30 Gün",
  "Holdingin Başına Geç", "Pavyonu Batırmadan İşlet", "Hapishaneden Kaçış Planı",
];

export function chaosSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

/** Mutates the game engine's already-cloned transaction state; never calls AI/random/time itself. */
export function applyScheduledChaos(room: RoomState, afterAuction: number, now: number): boolean {
  if (room.mode !== "chaos" || !room.chaos || afterAuction < CHAOS_EVERY || afterAuction % CHAOS_EVERY !== 0) return false;
  if (room.chaos.history.some((event) => event.afterAuction === afterAuction)) return false;
  const sequence = Math.floor(afterAuction / CHAOS_EVERY) - 1;
  let kind = DECK[(room.chaos.seed + sequence) % DECK.length];
  const players = Object.values(room.players).sort((a, b) => a.seat - b.seat);
  if (!players.length) return false;
  const swappers = players.filter((player) => player.team.length > 0);
  if (kind === "swap" && swappers.length < 2) kind = "inheritance";

  let title: string;
  let description: string;
  if (kind === "crisis") {
    title = "Ekonomik kriz!";
    for (const player of players) player.balance -= Math.floor(player.balance * 0.2);
    description = "Herkes kalan parasının %20’sini kaybetti. Kesinti aşağı yuvarlandı; kadrolara dokunulmadı.";
  } else if (kind === "inheritance") {
    title = "Sürpriz miras!";
    const minimum = Math.min(...players.map((player) => player.balance));
    const recipients = players.filter((player) => player.balance === minimum);
    for (const player of recipients) player.balance = Math.min(500, player.balance + 15);
    description = `En az parası olan ${recipients.map((player) => player.nickname).join(", ")} için +₺15! Eşitlikte hepsi kazanır; bakiye üst sınırı ₺500.`;
  } else if (kind === "swap") {
    title = "Takas gecesi!";
    // Snapshot first so no recipient can accidentally pass on a newly received card.
    const outgoing = swappers.map((player) => structuredClone(player.team[player.team.length - 1]));
    for (let i = 0; i < swappers.length; i++) {
      const recipient = swappers[(i + 1) % swappers.length];
      const member = outgoing[i];
      recipient.team[recipient.team.length - 1] = { ...member, transferred: true };
      const character = room.characters.find((card) => card.id === member.characterId);
      if (character) character.winnerUid = recipient.uid;
    }
    description = "Kadrosu olan oyuncuların son karakteri, koltuk sırasındaki bir sonraki oyuncuya geçti. Yeni ödeme yok; herkesin slot sayısı aynı.";
  } else {
    title = "Senaryo ters köşe!";
    const candidates = SCENARIOS.filter((scenario) => scenario !== room.scenario);
    const previous = room.scenario;
    room.scenario = candidates[(room.chaos.seed + sequence) % candidates.length];
    description = `“${previous}” bitti. Yeni görev: “${room.scenario}”. AI jüri artık bu göreve göre puanlayacak!`;
  }
  const event: ChaosEvent = { id: `${room.chaos.seed}:${afterAuction}`, kind, title, description, afterAuction, occurredAt: now };
  room.chaos.history.push(event);
  return true;
}
