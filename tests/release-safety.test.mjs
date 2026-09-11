import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const firebaseRc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
const gitignore = fs.readFileSync('.gitignore', 'utf8');

test('Firebase CLI targets the connected production project', () => {
  assert.equal(firebaseRc.projects.default, 'kadro-party-game-51d0c');
});

test('Admin SDK credential exports are ignored by git', () => {
  assert.match(gitignore, /^\*firebase-adminsdk\*\.json$/m);
});
