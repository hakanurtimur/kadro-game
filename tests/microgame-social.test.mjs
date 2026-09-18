import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const room=fs.readFileSync('components/microgame/MicrogameRoom.tsx','utf8');
test('Microgame room mounts shared social layer in a safe dock',()=>{
  assert.match(room,/game="microgame"/);
  assert.match(room,/microgame-social-dock/);
  assert.match(room,/mobileDockId="microgame-social-dock"/);
});
