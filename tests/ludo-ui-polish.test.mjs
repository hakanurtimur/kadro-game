import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const client = fs.readFileSync("components/ludo/LudoClient.tsx","utf8");
const board = fs.readFileSync("components/ludo/LudoBoard.tsx","utf8");
const die = fs.readFileSync("components/ludo/LudoDie.tsx","utf8");
const css = fs.readFileSync("app/globals.css","utf8");
const socialCss = fs.readFileSync("components/social/GameSocial.module.css","utf8");

test("Ludo uses a custom tinted pip die instead of unicode dice glyphs",()=>{
  assert.match(client,/LudoDie/);
  assert.doesNotMatch(client,/const DICE =/);
  assert.match(die,/PIP_LAYOUT/);
  assert.match(die,/className=\{`ludo-die \$\{color\}/);
  assert.match(die,/size\?:\s*"hero"\s*\|\s*"compact"\s*\|\s*"mini"/);
  assert.match(css,/\.ludo-die\.red/);
  assert.match(css,/\.ludo-die\.green/);
  assert.match(css,/\.ludo-die\.yellow/);
  assert.match(css,/\.ludo-die\.blue/);
});

test("dice console has friendly turn hierarchy and themed controls",()=>{
  assert.match(client,/Sıra sende/);
  assert.match(client,/oynuyor/);
  assert.match(client,/ludo-turn-status/);
  assert.match(client,/ludo-action-mark/);
  assert.match(css,/Patch 10 — Ludo high-quality themed UI/);
  assert.match(css,/\.ludo-turn-status/);
  assert.match(css,/\.ludo-action-toast/);
});

test("captures get a board-level hit and knockout animation without a modal",()=>{
  assert.match(board,/ludo-capture-impact/);
  assert.match(board,/ludo-capture-ghost/);
  assert.match(board,/capture-hit/);
  assert.match(board,/victimSeat/);
  assert.match(css,/@keyframes ludo-capture-knockout/);
  assert.match(css,/@keyframes ludo-pawn-impact/);
  assert.match(css,/\.ludo-pawn\.captured/);
  assert.doesNotMatch(board,/dialog|modal/i);
});

test("shared chat and reactions keep the pastel game language",()=>{
  assert.match(socialCss,/Patch 10 — themed social polish/);
  assert.match(socialCss,/\.mobileDockAction/);
  assert.match(socialCss,/\.picker/);
  assert.match(socialCss,/\.chatSheet/);
  assert.match(socialCss,/\.burst/);
});
