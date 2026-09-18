import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const rules=JSON.parse(fs.readFileSync("firebase/database.rules.json","utf8")).rules;

test("microgame room rules accept both registered round types",()=>{
  const room=rules.microgameRooms?.["$code"];
  assert.ok(room);
  assert.match(room.activeGameId?.[".validate"]??"",/shrink-arena/);
  assert.match(room.round?.[".validate"]??"",/bomb-pass/);
  assert.match(room.round?.[".validate"]??"",/shrink-arena/);
  assert.match(room.round?.[".validate"]??"",/instructionsUntil/);
});

test("arena live positions are member-readable and self-writable",()=>{
  const live=rules.microgameLive?.["$code"];
  assert.ok(live);
  assert.match(live[".read"]??"",/microgameRooms/);
  const position=live.positions?.["$uid"];
  assert.ok(position);
  assert.match(position[".write"]??"",/\$uid === auth\.uid/);
  assert.match(position[".validate"]??"",/roundNumber/);
  assert.match(position[".validate"]??"",/newData\.child\('x'\)/);
  assert.match(position[".validate"]??"",/newData\.child\('y'\)/);
});
