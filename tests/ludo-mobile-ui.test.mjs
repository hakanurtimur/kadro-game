import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/globals.css', 'utf8');
const client = fs.readFileSync('components/ludo/LudoClient.tsx', 'utf8');
const board = fs.readFileSync('components/ludo/LudoBoard.tsx', 'utf8');
const layout = fs.readFileSync('app/layout.tsx', 'utf8');

test('mobile viewport opts into safe-area layout', () => {
  assert.match(layout, /viewportFit:\s*["']cover["']/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /100dvh/);
});

test('ludo board is explicitly hardened down to 280px without page overflow', () => {
  assert.match(css, /@media\s*\(max-width:\s*320px\)/);
  assert.match(css, /max-width:\s*280px/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /touch-action:\s*manipulation/);
});

test('legal pawns expose a finger-sized hit target on mobile', () => {
  assert.match(css, /\.ludo-pawn\.legal::after/);
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(board, /aria-label=/);
});

test('mobile action console is a sticky bottom control surface', () => {
  assert.match(css, /\.ludo-sidebar-right\s*\{[^}]*position:\s*sticky/s);
  assert.match(css, /\.ludo-sidebar-right\s*\{[^}]*bottom:\s*max\(/s);
  assert.match(css, /\.ludo-roll-button[^}]*min-height:\s*48px/s);
});

test('client serializes interactive actions to block double taps', () => {
  assert.match(client, /const \[actionBusy,setActionBusy\]=useState\(false\)/);
  assert.match(client, /async function runAction/);
  assert.match(client, /if\(actionBusy\)return/);
  assert.match(client, /disabled=\{rolling\|\|actionBusy\}/);
});
