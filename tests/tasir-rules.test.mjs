import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const rules=JSON.parse(fs.readFileSync("firebase/database.rules.json","utf8")).rules;
test("TAŞIR rooms require auth and cap seats at two",()=>{const r=rules.tasirRooms.$code;assert.equal(r[".read"],"auth != null");assert.match(r[".write"],/auth != null/);assert.match(r.players.$uid[".validate"],/seat'\)\.val\(\) < 2/);});
