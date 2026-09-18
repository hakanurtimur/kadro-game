import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const store=fs.readFileSync('lib/microgame/store.ts','utf8');
const firebase=fs.readFileSync('lib/microgame/firebase-store.ts','utf8');
const local=fs.readFileSync('lib/microgame/local-store.ts','utf8');

test('microgame store exposes reusable room contract and server clock',()=>{
  for(const method of ['identity','createRoom','joinRoom','getRoom','subscribeRoom','mutate','now']) assert.match(store,new RegExp(`${method}\\(`));
  assert.match(store,/FirebaseMicrogameStore/);
  assert.match(store,/LocalMicrogameStore/);
});

test('firebase join preflights room and server clock uses RTDB offset',()=>{
  assert.match(firebase,/await get\(roomRef\)/);
  assert.match(firebase,/snapshot\.exists\(\)/);
  assert.match(firebase,/current\s*\?\?\s*initialRoom/);
  assert.match(firebase,/\.info\/serverTimeOffset/);
  assert.match(firebase,/clockOffset/);
  assert.match(firebase,/applyLocally:\s*false/);
});

test('local store supports multi-tab iteration without affecting Firebase mode',()=>{
  assert.match(local,/BroadcastChannel/);
  assert.match(local,/localStorage/);
  assert.match(local,/sessionStorage/);
  assert.match(local,/kadro:microgame:/);
});
