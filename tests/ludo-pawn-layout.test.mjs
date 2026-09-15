import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const board = fs.readFileSync("components/ludo/LudoBoard.tsx","utf8");

test("yard pawns use a tighter centered 2x2 socket layout",()=>{
  assert.match(board,/\[\[2,2\],\[2,3\],\[3,2\],\[3,3\]\]/);
  assert.match(board,/\[\[2,11\],\[2,12\],\[3,11\],\[3,12\]\]/);
  assert.match(board,/yardSocketStyle/);
  assert.match(board,/YARD_SOCKET_COLORS/);
});

test("multiple pawns on start cells dock apart without scaling",()=>{
  assert.match(board,/startDockMap/);
  assert.match(board,/startDockOffset/);
  assert.match(board,/dockX/);
  assert.match(board,/dockY/);
  assert.match(board,/transform:`translate\(calc\(/);
  assert.doesNotMatch(board,/startDockPattern[\s\S]*scale/);
});

test("edge start cells bias their docking inward for mobile safety",()=>{
  assert.match(board,/globalCell===0.*baseX\+inward/);
  assert.match(board,/globalCell===13.*baseY\+inward/);
  assert.match(board,/globalCell===26.*baseX-inward/);
  assert.match(board,/globalCell===39.*baseY-inward/);
});
