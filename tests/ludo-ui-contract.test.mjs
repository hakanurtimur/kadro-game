import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('root offers both KADRO and Kızma Birader',()=>{
  const home=fs.readFileSync('app/page.tsx','utf8');
  assert.match(home,/KADRO Oyna/);
  assert.match(home,/Kızma Birader Oyna/);
  assert.match(home,/\/kadro/);
  assert.match(home,/\/ludo/);
});

test('ludo routes and board component exist',()=>{
  for(const path of ['app/ludo/page.tsx','app/ludo/[code]/page.tsx','components/ludo/LudoBoard.tsx','components/ludo/LudoClient.tsx']) assert.ok(fs.existsSync(path),path);
});

test('ludo pawn selection previews a destination and requires confirmation before moving',()=>{
  const client=fs.readFileSync('components/ludo/LudoClient.tsx','utf8');
  const board=fs.readFileSync('components/ludo/LudoBoard.tsx','utf8');
  assert.match(client,/selectedPawn/);
  assert.match(client,/previewLudoPawnMove/);
  assert.match(board,/previewProgress/);
  assert.match(board,/onConfirmMove/);
  assert.match(board,/Hedef kare/);
});
