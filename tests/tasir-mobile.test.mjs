import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("TAŞIR mobile UI uses dynamic viewport, safe area and finger-sized controls",()=>{
  const css=fs.readFileSync("app/tasir/tasir.module.css","utf8");
  assert.match(css,/100dvh/);assert.match(css,/safe-area-inset/);assert.match(css,/min-height:44px/);assert.match(css,/@media\(max-width:320px\)/);
});

test("root hub exposes TAŞIR route",()=>{
  const source=fs.readFileSync("app/page.tsx","utf8");
  assert.match(source,/TAŞIR Oyna/);assert.match(source,/router\.push\("\/tasir"\)/);
});
