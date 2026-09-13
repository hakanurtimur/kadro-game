import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();

const { LocalGameStore } = await importTs('lib/local-store.ts');

test('local store creates a room and a second session can join it', async () => {
  const hostStore = new LocalGameStore();
  const created = await hostStore.createRoom('Hakan', 100, 5);
  assert.equal(created.room.moderator.nickname, 'Hakan');
  assert.deepEqual(created.room.players, {});

  globalThis.sessionStorage = new MemoryStorage();
  const guestStore = new LocalGameStore();
  const joined = await guestStore.joinRoom(created.room.code, 'Can');
  assert.equal(Object.keys(joined.room.players).length, 1);
  assert.equal(joined.room.players[joined.uid].nickname, 'Can');
});

test('local mutation persists a game-engine transition', async () => {
  globalThis.sessionStorage = new MemoryStorage();
  const store = new LocalGameStore();
  const created = await store.createRoom('Ada', 80, 3);
  await store.mutate(created.room.code, (room) => ({ ...room, scenario: 'Entrika', updatedAt: room.updatedAt + 1 }));
  const reread = await store.getRoom(created.room.code);
  assert.equal(reread.scenario, 'Entrika');
});
