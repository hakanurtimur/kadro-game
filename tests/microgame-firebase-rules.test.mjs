import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules=JSON.parse(fs.readFileSync('firebase/database.rules.json','utf8')).rules;
const social=fs.readFileSync('lib/social/types.ts','utf8');

test('microgame rooms require auth, cap seats at six and allow lobby joins',()=>{
  const room=rules.microgameRooms.$code;
  assert.equal(room['.read'],'auth != null');
  assert.match(room['.write'],/status'\)\.val\(\) === 'lobby'/);
  assert.match(room.players.$uid['.validate'],/seat'\)\.val\(\) < 6/);
  assert.match(room.players.$uid['.validate'],/score/);
  assert.match(room.round['.validate'],/bomb-pass/);
});

test('social layer recognizes microgame and membership rules point to microgameRooms',()=>{
  assert.match(social,/"microgame"/);
  const room=rules.socialRooms.microgame.$code;
  assert.match(room['.read'],/microgameRooms/);
  assert.match(room.messages.$messageId['.write'],/microgameRooms/);
  assert.match(room.reactions.$uid['.write'],/microgameRooms/);
});
