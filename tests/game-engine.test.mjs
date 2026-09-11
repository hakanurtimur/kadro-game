import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

const engine = await importTs('lib/game-engine.ts');

function roomWithTwoPlayers() {
  let room = engine.createInitialRoom({ code: 'ABCDE', hostUid: 'host', nickname: 'Hakan', budget: 20, slots: 3, now: 1 });
  room = engine.joinPlayer(room, { uid: 'guest', nickname: 'Can' });
  room = engine.applyRoundPreview(room, 'host', {
    scenario: 'Entrika',
    characterCategory: 'Türk Dizileri',
    source: 'demo',
    characters: [
      { name: 'Hürrem Sultan', source: 'Muhteşem Yüzyıl' },
      { name: 'Ramiz Dayı', source: 'Ezel' },
      { name: 'Bihter Ziyagil', source: 'Aşk-ı Memnu' },
      { name: 'Erdal Bakkal', source: 'Leyla ile Mecnun' },
      { name: 'Sümbül Ağa', source: 'Muhteşem Yüzyıl' },
      { name: 'Memati Baş', source: 'Kurtlar Vadisi' },
      { name: 'Polat Alemdar', source: 'Kurtlar Vadisi' },
      { name: 'Bahar', source: 'Bahar' },
    ],
  });
  return engine.startAuction(room, 'host', 1000);
}

test('a bid must beat the current bid and fit the bidder balance', () => {
  let room = roomWithTwoPlayers();
  room = engine.placeBid(room, 'guest', 5, 1100);
  assert.equal(room.auction.currentBid, 5);
  assert.equal(room.auction.bidderUid, 'guest');
  assert.throws(() => engine.placeBid(room, 'host', 5, 1200), /yüksek/i);
  assert.throws(() => engine.placeBid(room, 'host', 21, 1200), /bakiye/i);
});

test('winner pays only when the auction closes and receives the character', () => {
  let room = roomWithTwoPlayers();
  room = engine.placeBid(room, 'guest', 7, 1100);
  assert.equal(room.players.guest.balance, 20);
  const currentId = room.characters[0].id;
  room = engine.closeAuction(room, 'host', currentId, 2000);
  assert.equal(room.players.guest.balance, 13);
  assert.equal(room.players.guest.team.length, 1);
  assert.equal(room.players.guest.team[0].name, 'Hürrem Sultan');
  assert.equal(room.characters[0].status, 'sold');
});

test('RPS repeats on a tie and narrows contenders when one move beats another', () => {
  let room = roomWithTwoPlayers();
  room.status = 'rps';
  room.rps = { round: 1, contenders: ['host', 'guest'], choices: {}, message: '' };
  room = engine.submitRpsChoice(room, 'host', 'rock');
  room = engine.submitRpsChoice(room, 'guest', 'rock');
  assert.equal(room.status, 'rps');
  assert.equal(room.rps.round, 2);
  assert.deepEqual(room.rps.choices, {});

  room = engine.submitRpsChoice(room, 'host', 'rock');
  room = engine.submitRpsChoice(room, 'guest', 'scissors');
  assert.equal(room.status, 'leftovers');
  assert.equal(room.starterUid, 'host');
  assert.equal(room.draftTurnUid, 'host');
});

test('leftover picks rotate through players that still have open slots', () => {
  let room = roomWithTwoPlayers();
  room.status = 'leftovers';
  room.starterUid = 'guest';
  room.draftTurnUid = 'guest';
  room.characters[0].status = 'unsold';
  room.characters[1].status = 'unsold';
  room.characters[2].status = 'unsold';
  room.auction.index = room.characters.length;

  room = engine.pickLeftover(room, 'guest', room.characters[0].id);
  assert.equal(room.players.guest.team.length, 1);
  assert.equal(room.draftTurnUid, 'host');

  room = engine.pickLeftover(room, 'host', room.characters[1].id);
  assert.equal(room.players.host.team.length, 1);
  assert.equal(room.draftTurnUid, 'guest');
});

test('normalizes Firebase-shaped room data with omitted empty arrays and nullable fields', () => {
  const room = engine.createInitialRoom({ code: 'FGHJK', hostUid: 'host', nickname: 'Hakan', budget: 100, slots: 5, now: 1 });
  const firebaseShape = structuredClone(room);
  delete firebaseShape.players.host.team;
  delete firebaseShape.characters;
  delete firebaseShape.rps;
  delete firebaseShape.auction.bidderUid;
  delete firebaseShape.auction.endsAt;

  const normalized = engine.normalizeRoomState(firebaseShape);
  assert.deepEqual(normalized.players.host.team, []);
  assert.deepEqual(normalized.characters, []);
  assert.equal(normalized.rps, null);
  assert.equal(normalized.auction.bidderUid, null);
  assert.equal(normalized.auction.endsAt, null);
});
