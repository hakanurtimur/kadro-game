import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

for(const file of ["lib/firebase-store.ts","lib/ludo/firebase-store.ts","lib/tasir/firebase-store.ts"]){
  test(`${file} preflights room existence before transaction`,()=>{
    const source=fs.readFileSync(file,"utf8");
    const join=source.slice(source.indexOf("async joinRoom"),source.indexOf("async getRoom"));
    assert.match(join,/await get\(roomRef\)/);
    assert.match(join,/snapshot\.exists\(\)/);
    assert.match(join,/applyLocally:\s*false/);
    assert.ok(join.indexOf("await get(roomRef)") < join.indexOf("runTransaction"));
  });
}
