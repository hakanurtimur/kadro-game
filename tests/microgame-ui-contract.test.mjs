import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const exists=p=>fs.existsSync(p);

test('microgame routes and reusable room UI exist',()=>{
  for(const p of ['app/microgame/page.tsx','app/microgame/[code]/page.tsx','components/microgame/MicrogameHome.tsx','components/microgame/MicrogameRoom.tsx','app/microgame/microgame.module.css']) assert.ok(exists(p),p);
  const home=fs.readFileSync('components/microgame/MicrogameHome.tsx','utf8');
  const room=fs.readFileSync('components/microgame/MicrogameRoom.tsx','utf8');
  assert.match(home,/2–6/);
  assert.match(home,/createRoom/);
  assert.match(home,/joinRoom/);
  assert.match(room,/TEST MODE/);
  assert.match(room,/startBombPassTest/);
  assert.match(room,/GameSocial/);
});

test('root hub exposes Microgame Royale',()=>{
  const root=fs.readFileSync('app/page.tsx','utf8');
  assert.match(root,/Microgame Royale/);
  assert.match(root,/\/microgame/);
});
