import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';
const engine = await importTs('lib/game-engine.ts');
const catalog = await importTs('lib/character-catalog.ts');

function lobby(mode = 'chaos', playerCount = 2, slots = 3) {
  let room = engine.createInitialRoom({ code: 'ABCDE', hostUid: 'p0', nickname: 'Oyuncu 0', budget: 100, slots, now: 1, mode });
  for (let i = 1; i < playerCount; i++) room = engine.joinPlayer(room, { uid: `p${i}`, nickname: `Oyuncu ${i}`, now: i + 1 });
  return room;
}
function auction(mode = 'chaos', playerCount = 2, slots = 3) {
  const room = engine.applyRoundPreview(lobby(mode, playerCount, slots), 'p0', { scenario: 'Entrika', characterCategory: 'Türk Dizi Evreni', characters: catalog.catalogCharacters('Türk Dizi Evreni').slice(0, playerCount * slots + 4), source: 'demo' }, 100);
  return engine.startAuction(room, 'p0', 1000);
}
function close(room) {
  return engine.closeAuction(room, 'p0', room.characters[room.auction.index].id, room.auction.endsAt + 1);
}
function threeAuctions(mode = 'chaos') {
  let room = auction(mode);
  for (let i = 0; i < 3; i++) room = close(room);
  return room;
}

 test('new rooms default to classic and older Firebase rooms stay classic', () => {
  const initial = lobby('classic');
  assert.equal(initial.mode, 'classic');
  delete initial.mode; delete initial.chaos;
  const normalized = engine.normalizeRoomState(initial);
  assert.equal(normalized.mode, 'classic');
  assert.equal(normalized.chaos, null);
});

test('chaos mode applies one event after three auctions and gives a five-second read pause', () => {
  const room = threeAuctions();
  assert.equal(room.mode, 'chaos');
  assert.equal(room.chaos.history.length, 1);
  assert.equal(room.chaos.history[0].afterAuction, 3);
  assert.equal(room.auction.startsAt, room.updatedAt + 5000);
  assert.equal(room.auction.endsAt, room.auction.startsAt + 15000);
});

test('classic mode never adds chaos events or pauses', () => {
  const room = threeAuctions('classic');
  assert.equal(room.chaos, null);
  assert.equal(room.auction.startsAt, room.updatedAt);
});

test('only the host can select mode, and not during a running round', () => {
  let room = lobby('classic');
  assert.throws(() => engine.setGameMode(room, 'p1', 'chaos'), /host/i);
  room = engine.setGameMode(room, 'p0', 'chaos');
  assert.equal(room.mode, 'chaos');
  assert.throws(() => engine.setGameMode(auction(), 'p0', 'classic'), /mod|tur/i);
});

test('bids and manual skips are rejected while reading a chaos event', () => {
  const room = threeAuctions();
  assert.throws(() => engine.placeBid(room, 'p1', 1, room.updatedAt + 1), /kart|kaos/i);
  assert.throws(() => engine.closeAuction(room, 'p0', room.characters[room.auction.index].id, room.updatedAt + 1), /kart|kaos/i);
  assert.equal(engine.placeBid(room, 'p1', 1, room.auction.startsAt).auction.currentBid, 1);
});

test('expired auction cannot accept a late bid or extend the deadline', () => {
  const room = auction('classic');
  assert.throws(() => engine.placeBid(room, 'p1', 1, room.auction.endsAt), /süre|bitti/i);
});

test('transaction retry produces identical state and never applies an event twice', () => {
  let before = auction();
  before = close(close(before));
  const id = before.characters[before.auction.index].id;
  const time = before.auction.endsAt + 1;
  const first = engine.closeAuction(before, 'p0', id, time);
  const retry = engine.closeAuction(before, 'p0', id, time);
  assert.deepEqual(first, retry);
  assert.equal(first.chaos.history.length, 1);
  assert.throws(() => engine.closeAuction(first, 'p0', id, time), /aktif|kart|kaos/i);
  assert.equal(before.auction.index, 2);
});

test('empty Firebase history and array-shaped records normalize safely', () => {
  const room = auction();
  room.chaos = { seed: 1 };
  const normalized = engine.normalizeRoomState(room);
  assert.deepEqual(normalized.chaos.history, []);
});

test('complete classic and chaos rounds preserve uniqueness, budgets, RPS and free draft', () => {
  for (const mode of ['classic', 'chaos']) {
    for (const playerCount of [2, 3, 8]) {
      let room = auction(mode, playerCount);
      let guard = 0;
      while (room.status === 'auction' && guard++ < 100) room = close(room);
      assert.equal(room.status, 'rps');
      assert.equal(room.rps.contenders.length, playerCount);
      for (const uid of [...room.rps.contenders]) room = engine.submitRpsChoice(room, uid, uid === 'p0' ? 'rock' : 'scissors');
      assert.equal(room.status, 'leftovers');
      assert.equal(room.draftTurnUid, 'p0');
      while (room.status === 'leftovers' && guard++ < 150) {
        const card = room.characters.find((c) => c.status === 'unsold');
        room = engine.pickLeftover(room, room.draftTurnUid, card.id);
      }
      assert.equal(room.status, 'results');
      assert.ok(Object.values(room.players).every((p) => p.team.length === room.slots && p.balance >= 0 && p.balance <= 500));
      const ids = Object.values(room.players).flatMap((p) => p.team.map((m) => m.characterId));
      assert.equal(new Set(ids).size, playerCount * room.slots);
    }
  }
});

test('reroll rejects foreign character without spending the reroll', () => {
  let room = lobby();
  room = engine.applyRoundPreview(room, 'p0', { scenario: 'Entrika', characterCategory: 'Muhteşem Yüzyıl', characters: catalog.catalogCharacters('Muhteşem Yüzyıl').slice(0, 10), source: 'demo' });
  const previous = structuredClone(room);
  assert.throws(() => engine.applyCharacterReroll(room, 'p0', 0, { name: 'Erdal Bakkal', source: 'Muhteşem Yüzyıl' }), /evren|karakter/i);
  assert.deepEqual(room, previous);
});

test('new rounds reset the chaos history but preserve selected mode', () => {
  const room = threeAuctions();
  room.status = 'results';
  const next = engine.applyRoundPreview(room, 'p0', { scenario: 'Issız ada', characterCategory: 'Türk Dizi Evreni', characters: catalog.catalogCharacters('Türk Dizi Evreni').slice(0, 10), source: 'demo' });
  assert.equal(next.mode, 'chaos');
  assert.equal(next.chaos, null);
});

async function applyKind(kind, room) {
  const chaos = await importTs('lib/chaos.ts');
  room.mode = 'chaos';
  room.chaos = { seed: ['crisis', 'inheritance', 'swap', 'scenario'].indexOf(kind), history: [] };
  const applied = chaos.applyScheduledChaos(room, 3, 10000);
  assert.equal(applied, true);
  return room;
}

test('economic crisis never produces negative or fractional balances', async () => {
  const room = lobby(); room.players.p0.balance = 3; room.players.p1.balance = 91;
  await applyKind('crisis', room);
  assert.equal(room.players.p0.balance, 3);
  assert.equal(room.players.p1.balance, 73);
});

test('inheritance treats tied poorest players equally and respects the 500 ceiling', async () => {
  const room = lobby(); room.players.p0.balance = 497; room.players.p1.balance = 497;
  await applyKind('inheritance', room);
  assert.equal(room.players.p0.balance, 500);
  assert.equal(room.players.p1.balance, 500);
});

test('swap transfers ownership once, with no payment, duplicate, or slot change', async () => {
  let room = auction();
  room = engine.placeBid(room, 'p0', 10, room.auction.startsAt + 1); room = close(room);
  room = engine.placeBid(room, 'p1', 15, room.auction.startsAt + 1); room = close(room);
  const p0Card = room.players.p0.team[0].characterId;
  const p1Card = room.players.p1.team[0].characterId;
  await applyKind('swap', room);
  assert.equal(room.players.p0.team[0].characterId, p1Card);
  assert.equal(room.players.p1.team[0].characterId, p0Card);
  assert.equal(room.players.p0.balance, 90);
  assert.equal(room.players.p1.balance, 85);
  assert.equal(room.characters.find((c) => c.id === p0Card).winnerUid, 'p1');
  assert.equal(room.characters.find((c) => c.id === p1Card).winnerUid, 'p0');
  assert.equal(room.players.p0.team[0].transferred, true);
});

test('scenario card changes the scoring scenario without changing the universe', async () => {
  const room = auction(); const before = room.scenario; const category = room.characterCategory;
  await applyKind('scenario', room);
  assert.notEqual(room.scenario, before);
  assert.equal(room.characterCategory, category);
  assert.ok(room.chaos.history[0].description.includes(room.scenario));
});

test('sixty deterministic mixed-bid games preserve ownership and finish without slot/budget corruption', () => {
  for (let seed = 1; seed <= 20; seed++) {
    for (const playerCount of [2, 4, 8]) {
      let room = auction('chaos', playerCount);
      room.chaos.seed = seed;
      let steps = 0;
      while (room.status === 'auction' && steps++ < 100) {
        const candidates = Object.values(room.players).filter((p) => p.team.length < room.slots && p.balance > 0);
        if (candidates.length && (seed + steps) % 4 !== 0) {
          const player = candidates[(seed + steps) % candidates.length];
          const amount = steps % 5 === 0 ? player.balance : Math.min(player.balance, 1 + seed % 7);
          room = engine.placeBid(room, player.uid, amount, room.auction.startsAt + 1);
        }
        room = close(room);
        const members = Object.values(room.players).flatMap((p) => p.team.map((m) => ({ ...m, owner: p.uid })));
        assert.equal(new Set(members.map((m) => m.characterId)).size, members.length);
        for (const member of members) assert.equal(room.characters.find((c) => c.id === member.characterId).winnerUid, member.owner);
        assert.ok(Object.values(room.players).every((p) => p.team.length <= room.slots && Number.isInteger(p.balance) && p.balance >= 0 && p.balance <= 500));
      }
      if (room.status === 'rps') {
        const contenders = [...room.rps.contenders];
        for (const uid of contenders) room = engine.submitRpsChoice(room, uid, uid === contenders[0] ? 'rock' : 'scissors');
      }
      while (room.status === 'leftovers' && steps++ < 150) {
        const card = room.characters.find((c) => c.status === 'unsold');
        assert.ok(card);
        room = engine.pickLeftover(room, room.draftTurnUid, card.id);
      }
      assert.equal(room.status, 'results');
      assert.ok(Object.values(room.players).every((p) => p.team.length === room.slots));
    }
  }
});
