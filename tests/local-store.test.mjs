import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
let ts;
try {
  const mod = await import('typescript');
  ts = mod.default ?? mod;
} catch {
  const mod = await import('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
  ts = mod.default ?? mod;
}

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
  clear() { this.map.clear(); }
}

globalThis.localStorage = new MemoryStorage();
globalThis.sessionStorage = new MemoryStorage();

async function compileCjs(sourcePath, outPath) {
  const source = await fs.readFile(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, output);
}

await compileCjs('lib/game-engine.ts', '.test-cjs/lib/game-engine.js');
await compileCjs('lib/local-store.ts', '.test-cjs/lib/local-store.js');
const require = createRequire(import.meta.url);
const { LocalGameStore } = require('../.test-cjs/lib/local-store.js');

test('local store creates a room and a second session can join it', async () => {
  const hostStore = new LocalGameStore();
  const created = await hostStore.createRoom('Hakan', 100, 5);
  assert.equal(created.room.players[created.uid].nickname, 'Hakan');

  globalThis.sessionStorage = new MemoryStorage();
  const guestStore = new LocalGameStore();
  const joined = await guestStore.joinRoom(created.room.code, 'Can');
  assert.equal(Object.keys(joined.room.players).length, 2);
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
