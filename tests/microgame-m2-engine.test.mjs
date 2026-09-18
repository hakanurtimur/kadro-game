import test from "node:test";
import assert from "node:assert/strict";
import { importTs } from "./transpile-import.mjs";

const engine = await importTs("lib/microgame/engine.ts");

function room(){
  let state=engine.createMicrogameRoom({code:"MCR22",hostUid:"p1",nickname:"Ada",now:1});
  state=engine.joinMicrogamePlayer(state,{uid:"p2",nickname:"Can",now:2});
  state=engine.joinMicrogamePlayer(state,{uid:"p3",nickname:"Ece",now:3});
  return state;
}

test("bomb pass now shows instruction window, hidden 7-10.5s fuse, and variable initial holder",()=>{
  const base=room();
  const holders=new Set();
  for(let i=0;i<12;i++){
    const state=engine.startBombPassTest(base,"p1",1000+i*137);
    assert.equal(state.round.gameId,"bomb-pass");
    assert.ok(state.round.instructionsUntil>1000+i*137);
    assert.equal(state.round.startsAt-state.round.instructionsUntil,3000);
    const fuse=state.round.endsAt-state.round.startsAt;
    assert.ok(fuse>=7000&&fuse<=10500,`fuse ${fuse}`);
    holders.add(state.round.holderUid);
  }
  assert.ok(holders.size>1,"different test starts should not always choose the same holder");
});

test("shrink arena starts after instruction + countdown and records outs",()=>{
  let state=room();
  state=engine.startShrinkArenaTest(state,"p1",1000);
  assert.equal(state.activeGameId,"shrink-arena");
  assert.equal(state.round.gameId,"shrink-arena");
  assert.ok(state.round.instructionsUntil>1000);
  assert.equal(state.round.startsAt-state.round.instructionsUntil,3000);
  assert.equal(state.round.endsAt-state.round.startsAt,11000);

  assert.throws(()=>engine.reportArenaOut(state,"p2",state.round.startsAt-1),/başlamadı/i);
  state=engine.reportArenaOut(state,"p2",state.round.startsAt+5000);
  assert.equal(state.round.out.p2,state.round.startsAt+5000);
  const again=engine.reportArenaOut(state,"p2",state.round.startsAt+6000);
  assert.equal(again.round.out.p2,state.round.startsAt+5000);
});

test("shrink arena settlement scores survivors highest and is idempotent",()=>{
  let state=room();
  state=engine.startShrinkArenaTest(state,"p1",1000);
  const {startsAt,endsAt}=state.round;
  state=engine.reportArenaOut(state,"p2",startsAt+Math.floor((endsAt-startsAt)*.5));
  state=engine.reportArenaOut(state,"p3",startsAt+Math.floor((endsAt-startsAt)*.9));
  state=engine.settleShrinkArenaRound(state,"p1",endsAt+1);
  assert.equal(state.status,"results");
  assert.equal(state.players.p1.score,100);
  assert.ok(state.players.p3.score>state.players.p2.score);
  assert.ok(state.players.p3.score<=60);
  const again=engine.settleShrinkArenaRound(state,"p2",endsAt+500);
  assert.deepEqual(again.players,state.players);
});
