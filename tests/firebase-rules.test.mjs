import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = JSON.parse(fs.readFileSync('firebase/database.rules.json', 'utf8')).rules;

test('room rules require auth and never allow a client-side room deletion', () => {
  const roomRules = rules.rooms.$code;

  assert.equal(roomRules['.read'], 'auth != null');
  assert.match(roomRules['.write'], /auth != null/);
  assert.match(roomRules['.write'], /newData\.exists\(\)/);
});

test('room schema limits budget, slots and player seat range', () => {
  const validation = rules.rooms.$code['.validate'];

  assert.doesNotMatch(validation, /numChildren/);
  assert.match(rules.rooms.$code.players.$uid['.validate'], /seat'\)\.val\(\) < 8/);
  assert.match(validation, /budget'\)\.val\(\) <= 500/);
  assert.match(validation, /slots'\)\.val\(\) <= 8/);
});
