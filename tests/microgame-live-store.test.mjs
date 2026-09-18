import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const contract=fs.readFileSync("lib/microgame/store.ts","utf8");
const firebase=fs.readFileSync("lib/microgame/firebase-store.ts","utf8");
const local=fs.readFileSync("lib/microgame/local-store.ts","utf8");

test("microgame store exposes a dedicated realtime arena position channel",()=>{
  for(const source of [contract,firebase,local]){
    assert.match(source,/subscribeArenaPositions/);
    assert.match(source,/setArenaPosition/);
  }
  assert.match(firebase,/microgameLive/);
  assert.match(firebase,/positions/);
  assert.match(local,/kadro:microgame:live:/);
});
