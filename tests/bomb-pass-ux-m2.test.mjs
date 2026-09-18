import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const ui=fs.readFileSync("components/microgame/games/BombPassGame.tsx","utf8");
const engine=fs.readFileSync("lib/microgame/engine.ts","utf8");

test("bomb game explains the rule before countdown and keeps explosion time hidden",()=>{
  assert.match(ui,/Fitil 7–10\.5 sn/);
  assert.match(ui,/Tam patlama anını göremezsin/);
  assert.match(ui,/Patladığında kimdeyse/);
  assert.match(ui,/instructionsUntil/);
  assert.match(ui,/Fitil hızlanıyor/);
  assert.match(ui,/Çok sıcak/);
  assert.doesNotMatch(ui,/remaining\/1000/);
  assert.match(engine,/now}:holder/);
});
