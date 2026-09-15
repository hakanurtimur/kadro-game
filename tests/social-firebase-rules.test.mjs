import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const rules = JSON.parse(fs.readFileSync("firebase/database.rules.json","utf8")).rules;

test("social rooms exist for KADRO, Ludo and Tasir with participant-only reads",()=>{
  assert.ok(rules.socialRooms);
  for(const game of ["kadro","ludo","tasir"]){
    const code=rules.socialRooms[game].$code;
    assert.match(code[".read"],/auth != null/);
    assert.match(code[".read"],/players/);
    assert.ok(code.messages.$messageId[".write"]);
    assert.ok(code.reactions.$uid[".write"]);
    assert.match(code.messages.$messageId[".validate"],/160/);
    assert.match(code.reactions.$uid[".validate"],/reaction/);
  }
  assert.match(rules.socialRooms.kadro.$code[".read"],/moderator/);
  assert.match(rules.socialRooms.kadro.$code.messages.$messageId[".validate"],/MOD|moderator/i);
});
