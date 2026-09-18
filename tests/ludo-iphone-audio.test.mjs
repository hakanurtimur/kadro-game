import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';
const sound = await importTs('lib/ludo/sound.ts');

test('Ludo requests playback before creating audio and releases it when muted or leaving', async () => {
  const events=[];
  const session={type:'auto'};
  let context;
  class Context {
    state='suspended'; currentTime=0; destination={};
    constructor(){events.push(session.type);context=this;}
    async resume(){this.state='running';}
    async suspend(){this.state='suspended';}
    createOscillator(){return {connect(){},start(){},stop(){}};}
    createGain(){return {gain:{value:0},connect(){}};}
  }
  global.window={navigator:{audioSession:session},AudioContext:Context,localStorage:{setItem(){}}};
  try {
    sound.setLudoSoundEnabled(true);
    await sound.unlockLudoAudio();
    assert.deepEqual(events,['playback']);
    assert.equal(session.type,'playback');
    sound.setLudoSoundEnabled(false);
    assert.equal(session.type,'auto');
    sound.setLudoSoundEnabled(true);
    await sound.unlockLudoAudio();
    sound.releaseLudoAudio();
    assert.equal(session.type,'auto');
    // A different feature taking over audio must not be reset by Ludo.
    await sound.unlockLudoAudio();
    session.type='play-and-record';
    sound.releaseLudoAudio();
    assert.equal(session.type,'play-and-record');
    await sound.unlockLudoAudio();
    assert.equal(session.type,'play-and-record');
    // Unsupported and rejecting implementations still unlock ordinary Web Audio.
    context.state='closed';
    delete window.navigator.audioSession;
    await sound.unlockLudoAudio();
    assert.equal(context.state,'running');
    context.state='closed';
    Object.defineProperty(window.navigator,'audioSession',{get(){throw new Error('unsupported');}});
    await sound.unlockLudoAudio();
    assert.equal(context.state,'running');
  } finally {delete global.window;}
});
