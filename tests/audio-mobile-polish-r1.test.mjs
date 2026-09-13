import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Ludo mobile audio re-unlocks on real gestures and after returning to the page",()=>{
  const client=fs.readFileSync("components/ludo/LudoClient.tsx","utf8");
  assert.match(client,/addEventListener\("pointerdown",unlock,\{capture:true\}\)/);
  assert.match(client,/addEventListener\("touchstart",unlock,\{capture:true,passive:true\}\)/);
  assert.match(client,/addEventListener\("pageshow",unlock/);
  assert.match(client,/visibilitychange/);
  assert.doesNotMatch(client,/once:true/);
});

test("Ludo sound engine recovers closed and interrupted AudioContexts before scheduling effects",()=>{
  const sound=fs.readFileSync("lib/ludo/sound.ts","utf8");
  assert.match(sound,/state\s*===\s*["']closed["']/);
  assert.match(sound,/["']interrupted["']/);
  assert.match(sound,/ensureRunningAudioContext/);
  assert.match(sound,/audioContext\s*=\s*null/);
  assert.match(sound,/await\s+ctx\.resume\(\)/);
});
