import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const board = fs.readFileSync('components/ludo/LudoBoard.tsx', 'utf8');
const client = fs.readFileSync('components/ludo/LudoClient.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');

test('ludo move preview uses only the destination target, without route painting or a checkmark', () => {
  assert.doesNotMatch(board, />✓<\/button>/);
  assert.doesNotMatch(client, /✓ işaretine/);
  assert.doesNotMatch(board, /previewPathPositions/);
  assert.doesNotMatch(board, /path\.map/);
  assert.doesNotMatch(board, /ludo-preview-route/);
  assert.match(board, /ludo-preview-target-slot/);
  assert.match(board, /ludo-preview-target-hitbox/);
  assert.match(css, /\.ludo-preview-target-slot\.red/);
  assert.match(css, /\.ludo-preview-target-slot\.green/);
  assert.match(css, /\.ludo-preview-target-slot\.yellow/);
  assert.match(css, /\.ludo-preview-target-slot\.blue/);
});

test('target overlay keeps the board cell size untouched while retaining a 44px mobile hit target', () => {
  assert.match(css, /\.ludo-preview-target-slot\s*\{[^}]*min-width:\s*0[^}]*min-height:\s*0[^}]*position:\s*relative/s);
  assert.match(css, /\.ludo-preview-target-hitbox\s*\{[^}]*position:\s*absolute[^}]*width:\s*44px[^}]*height:\s*44px/s);
  assert.match(css, /transform:\s*translate\(-50%,-50%\)/);
  assert.doesNotMatch(css, /mobile Ludo preview without recoloring/);
});
