import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const game=fs.readFileSync('components/microgame/games/BombPassGame.tsx','utf8');
const css=fs.readFileSync('app/microgame/microgame.module.css','utf8');

test('Bomb Pass is touch-first and hides exact fuse milliseconds',()=>{
  assert.match(game,/Bomba sende!/);
  assert.match(game,/onPass/);
  assert.match(game,/countdown/);
  assert.match(game,/targetGrid/);
  assert.doesNotMatch(game,/remainingMs.*toFixed|endsAt\s*-\s*now.*ms/i);
  assert.match(css,/min-height:\s*52px|min-height:\s*56px/);
  assert.match(css,/safe-area-inset-bottom/);
});

test('Bomb Pass result keeps everyone in the room and shows score board',()=>{
  assert.match(game,/Patladı!/);
  assert.match(game,/scoreBoard/);
  assert.match(game,/\+100/);
});
