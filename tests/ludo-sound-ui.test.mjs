import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync('components/ludo/LudoClient.tsx','utf8');
const soundPath = 'lib/ludo/sound.ts';

test('ludo exposes persistent sound toggle that defaults on', () => {
  assert.ok(fs.existsSync(soundPath), 'lib/ludo/sound.ts should exist');
  const sound = fs.readFileSync(soundPath,'utf8');
  assert.match(sound,/kadro:ludo:sound-enabled/);
  assert.match(sound,/return true/);
  assert.match(client,/Volume2/);
  assert.match(client,/VolumeX/);
  assert.match(client,/setLudoSoundEnabled/);
  assert.match(client,/ludo-sound-toggle/);
});

test('ludo synthesizes tactile effects without audio asset files', () => {
  assert.ok(fs.existsSync(soundPath), 'lib/ludo/sound.ts should exist');
  const sound = fs.readFileSync(soundPath,'utf8');
  assert.match(sound,/AudioContext/);
  assert.match(sound,/roll/);
  assert.match(sound,/select/);
  assert.match(sound,/move/);
  assert.match(sound,/capture/);
  assert.match(sound,/home/);
  assert.match(sound,/chaos/);
  assert.match(sound,/win/);
  assert.match(sound,/confirm/);
  assert.match(client,/playLudoSfx\("roll"/);
  assert.match(client,/playLudoSfx\("select"/);
  assert.match(client,/playLudoSfx\("move"/);
  assert.match(client,/playLudoSfx\("capture"/);
  assert.match(client,/playLudoSfx\("home"/);
  assert.match(client,/playLudoSfx\("chaos"/);
  assert.match(client,/playLudoSfx\("win"/);
});
