import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

class MemoryStorage {
  map=new Map();
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
  removeItem(k){this.map.delete(k);}
}
globalThis.localStorage=new MemoryStorage();
globalThis.sessionStorage=new MemoryStorage();
const { LocalLudoStore }=await importTs('lib/ludo/local-store.ts');

test('local ludo store creates and joins a room with host as player',async()=>{
  const host=new LocalLudoStore();
  const created=await host.createRoom('Ada','chaos');
  assert.equal(created.room.players[created.uid].nickname,'Ada');
  globalThis.sessionStorage=new MemoryStorage();
  const guest=new LocalLudoStore();
  const joined=await guest.joinRoom(created.room.code,'Can');
  assert.equal(Object.keys(joined.room.players).length,2);
  assert.equal(joined.room.mode,'chaos');
});
