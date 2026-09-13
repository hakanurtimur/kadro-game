import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

const sound = await importTs('lib/ludo/sound.ts');

test('ludo sound preference defaults on and persists mute choice', () => {
  const values = new Map();
  global.window = {
    localStorage: {
      getItem(key) { return values.get(key) ?? null; },
      setItem(key, value) { values.set(key, value); },
    },
  };
  assert.equal(sound.getLudoSoundEnabled(), true);
  sound.setLudoSoundEnabled(false);
  assert.equal(values.get(sound.LUDO_SOUND_STORAGE_KEY), 'off');
  assert.equal(sound.getLudoSoundEnabled(), false);
  sound.setLudoSoundEnabled(true);
  assert.equal(values.get(sound.LUDO_SOUND_STORAGE_KEY), 'on');
  assert.equal(sound.getLudoSoundEnabled(), true);
  delete global.window;
});

test('sound API is safe during server rendering', () => {
  delete global.window;
  assert.equal(sound.getLudoSoundEnabled(), true);
  assert.doesNotThrow(() => sound.playLudoSfx('roll'));
});
