import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const social = fs.readFileSync("components/social/GameSocial.tsx","utf8");
const css = fs.readFileSync("components/social/GameSocial.module.css","utf8");
const reactions = fs.readFileSync("lib/social/reactions.ts","utf8");
const room = fs.readFileSync("components/RoomClient.tsx","utf8");
const ludo = fs.readFileSync("components/ludo/LudoClient.tsx","utf8");
const tasir = fs.readFileSync("components/tasir/TasirClient.tsx","utf8");

test("shared social layer is integrated into all three games",()=>{
  assert.match(room,/GameSocial/);
  assert.match(room,/game="kadro"/);
  assert.match(ludo,/game="ludo"/);
  assert.match(tasir,/game="tasir"/);
  assert.match(room,/role:\s*isHost\s*\?\s*"moderator"/);
});

test("mobile social controls dock outside game boards while desktop keeps the rail",()=>{
  assert.match(social,/createPortal/);
  assert.match(social,/mobileDockId/);
  assert.match(social,/mobileDockControls/);
  assert.match(social,/MessageCircle/);
  assert.match(social,/maxLength=\{160\}/);
  assert.match(css,/@media \(max-width:\s*759px\)[\s\S]*?\.rail\s*\{\s*display:\s*none/);
  assert.match(css,/\.mobileDockControls/);
  assert.match(css,/pointer-events:\s*none/);

  assert.match(ludo,/id="ludo-social-dock"/);
  assert.match(ludo,/mobileDockId="ludo-social-dock"/);
  assert.match(ludo,/dice-console-head/);

  assert.match(room,/id="kadro-social-dock"/);
  assert.match(room,/mobileDockId="kadro-social-dock"/);

  assert.match(tasir,/id="tasir-social-dock"/);
  assert.match(tasir,/mobileDockId="tasir-social-dock"/);
});

test("reaction catalog contains standard emoji plus full Hako Baba pack",()=>{
  for(const emoji of ["😂","❤️","🔥","👏","👍","🤔","🎉","😭","😈"]) assert.match(reactions,new RegExp(emoji));
  for(const id of ["hako-coffee","iyi-oynadin","helal","rahat","ne-alaka","hahaha","vay-be","aslanim","dusuncemdeyim","hako-crown"]){
    assert.match(reactions,new RegExp(id));
    assert.ok(fs.existsSync(`public/reactions/hako/${id}.png`),id);
  }
});
