import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("mobile audio is explicitly unlocked for Ludo and TAŞIR",()=>{
  const ludo=fs.readFileSync("components/ludo/LudoClient.tsx","utf8");
  const tasir=fs.readFileSync("components/tasir/TasirClient.tsx","utf8");
  assert.match(ludo,/unlockLudoAudio/);
  assert.match(tasir,/unlockTasirAudio/);
  assert.match(tasir,/playTasirSfx\("shift"/);
  assert.match(tasir,/playTasirSfx\("handoff"/);
});

test("mobile highlights use inset outlines instead of layout-changing fills",()=>{
  const ludo=fs.readFileSync("app/globals.css","utf8");
  const tasir=fs.readFileSync("app/tasir/tasir.module.css","utf8");
  assert.match(ludo,/mobile Ludo preview without recoloring/);
  assert.match(tasir,/layout-safe mobile highlights/);
  assert.match(tasir,/inset 0 0 0 3px/);
});
