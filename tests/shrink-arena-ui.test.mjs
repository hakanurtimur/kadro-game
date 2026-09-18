import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ui=fs.readFileSync("components/microgame/games/ShrinkArenaGame.tsx","utf8");
const room=fs.readFileSync("components/microgame/MicrogameRoom.tsx","utf8");
const registry=fs.readFileSync("lib/microgame/registry.ts","utf8");

test("Alan Daralıyor remains registered in the normal match pool",()=>{
  assert.match(registry,/shrink-arena/);
  assert.match(registry,/Alan Daralıyor/);
  assert.match(room,/ShrinkArenaGame/);
  assert.match(room,/startMicrogameMatch/);
  assert.match(fs.readFileSync("components/microgame/MatchLobby.tsx","utf8"),/MICROGAMES\.map/);
});

test("arena supports touch/mouse steering, realtime opponents and out reporting",()=>{
  assert.match(ui,/onPointerDown/);
  assert.match(ui,/onPointerMove/);
  assert.match(ui,/touchAction:"none"/);
  assert.match(ui,/subscribeArenaPositions/);
  assert.match(ui,/setArenaPosition/);
  assert.match(ui,/requestAnimationFrame/);
  assert.match(ui,/onOutRef/);
  assert.match(ui,/650/);
  assert.match(ui,/safeZone/);
});
