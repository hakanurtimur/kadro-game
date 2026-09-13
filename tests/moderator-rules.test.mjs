import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const rules=JSON.parse(fs.readFileSync('firebase/database.rules.json','utf8')).rules.rooms.$code;
test('v2 rule accepts a moderator-only room even when Firebase omits empty players',()=>{
 assert.match(rules['.write'], /moderator/);
 const required=rules['.validate'].match(/hasChildren\(\[([^\]]+)\]\)/)[1];
 assert.doesNotMatch(required, /'players'/);
 assert.match(rules['.write'], /data\.child\('hostUid'\)\.val\(\) === auth.uid/);
});
test('v2 room schema explicitly forbids moderator from appearing in player seats',()=>{
 assert.match(rules['.validate'], /!newData\.child\('players'\)\.child\(newData\.child\('hostUid'\)\.val\(\)\)\.exists\(\)/);
 assert.match(rules['.write'], /locked/);
 assert.doesNotMatch(JSON.stringify(rules), /numChildren/);
});
