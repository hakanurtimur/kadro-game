import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const rules=JSON.parse(fs.readFileSync('firebase/database.rules.json','utf8')).rules;

test('ludo rooms require auth and allow lobby joins only',()=>{
  assert.ok(rules.ludoRooms?.$code);
  const r=rules.ludoRooms.$code;
  assert.equal(r['.read'],'auth != null');
  assert.match(r['.write'],/auth != null/);
  assert.match(r['.write'],/status.*lobby/);
  assert.match(r['.write'],/players.*auth\.uid/);
  assert.doesNotMatch(r['.validate'], /hasChildren\(\[[^\]]*'dice'/);
});
