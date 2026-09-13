import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const board = fs.readFileSync('components/ludo/LudoBoard.tsx', 'utf8');
const client = fs.readFileSync('components/ludo/LudoClient.tsx', 'utf8');
const css = fs.readFileSync('app/globals.css', 'utf8');

test('ludo move preview uses a tinted route and glowing target instead of a checkmark', () => {
  assert.doesNotMatch(board, />✓<\/button>/);
  assert.doesNotMatch(client, /✓ işaretine/);
  assert.match(board, /ludo-preview-route/);
  assert.match(board, /ludo-preview-target-hitbox/);
  assert.match(css, /\.ludo-preview-route\.red/);
  assert.match(css, /\.ludo-preview-route\.green/);
  assert.match(css, /\.ludo-preview-route\.yellow/);
  assert.match(css, /\.ludo-preview-route\.blue/);
  assert.match(css, /\.ludo-preview-route\.target/);
});

test('preview renders every progress cell from the selected pawn to its destination', () => {
  assert.match(board, /previewPathPositions/);
  assert.match(board, /sourceProgress/);
  assert.match(board, /previewProgress/);
  assert.match(board, /path\.map/);
});
