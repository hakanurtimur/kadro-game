import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("TAŞIR mobile UI uses dynamic viewport, safe area and finger-sized controls",()=>{
  const css=fs.readFileSync("app/tasir/tasir.module.css","utf8");
  assert.match(css,/100dvh/);assert.match(css,/safe-area-inset/);assert.match(css,/min-height:44px/);assert.match(css,/@media\(max-width:320px\)/);
});

test("TAŞIR tiles have real slide, flip and overflow pop animations",()=>{
  const css=fs.readFileSync("app/tasir/tasir.module.css","utf8");
  const client=fs.readFileSync("components/tasir/TasirClient.tsx","utf8");
  assert.match(css,/@keyframes tasir-slide-down/);
  assert.match(css,/@keyframes tasir-insert-flip/);
  assert.match(css,/@keyframes tasir-pop-out/);
  assert.match(css,/transform-style:preserve-3d/);
  assert.match(client,/tile\.revealed\?styles\.isRevealed/);
  assert.match(client,/legalColumns/);
});

test("root hub exposes TAŞIR route",()=>{
  const source=fs.readFileSync("app/page.tsx","utf8");
  assert.match(source,/TAŞIR Oyna/);assert.match(source,/router\.push\("\/tasir"\)/);
});
