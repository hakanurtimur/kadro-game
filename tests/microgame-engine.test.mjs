import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

const engine = await importTs('lib/microgame/engine.ts');

function room() {
  let state = engine.createMicrogameRoom({ code:'MCR22', hostUid:'p1', nickname:'Ada', now:1 });
  state = engine.joinMicrogamePlayer(state, { uid:'p2', nickname:'Can', now:2 });
  return state;
}

test('microgame room allows 2-6 players and rejects seventh', () => {
  let state = engine.createMicrogameRoom({ code:'MCR22', hostUid:'p1', nickname:'Ada', now:1 });
  for (let i=2;i<=6;i++) state = engine.joinMicrogamePlayer(state,{uid:`p${i}`,nickname:`P${i}`,now:i});
  assert.equal(Object.keys(state.players).length,6);
  assert.throws(()=>engine.joinMicrogamePlayer(state,{uid:'p7',nickname:'Fazla'}),/dolu/i);
});

test('only host starts Bomb Pass with instructions followed by shared countdown', () => {
  let state=room();
  const requestedAt=1000;
  assert.throws(()=>engine.startBombPassTest(state,'p2',requestedAt),/host|oda sahibi/i);
  state=engine.startBombPassTest(state,'p1',requestedAt);
  assert.equal(state.status,'playing');
  assert.equal(state.activeGameId,'bomb-pass');
  // Patch 12: 4 seconds of instructions, then a 3-second countdown.
  assert.equal(state.round.instructionsUntil-requestedAt,4000);
  assert.equal(state.round.startsAt-state.round.instructionsUntil,3000);
  assert.ok(state.round.endsAt-state.round.startsAt>=7000);
  assert.ok(state.round.endsAt-state.round.startsAt<=10500);
  assert.ok(state.players[state.round.holderUid]);
});

test('only current holder can pass and cooldown blocks double taps', () => {
  let state=engine.startBombPassTest(room(),'p1',1000);
  const holder=state.round.holderUid;
  const target=Object.keys(state.players).find(uid=>uid!==holder);
  // Exercise holder/cooldown rules during play, not during instructions.
  const passAt=state.round.startsAt+100;
  assert.throws(()=>engine.passBomb(state,target,holder,passAt),/bomba sende değil/i);
  assert.throws(()=>engine.passBomb(state,holder,holder,passAt),/kendine/i);
  state=engine.passBomb(state,holder,target,passAt);
  assert.equal(state.round.holderUid,target);
  assert.equal(state.round.passes,1);
  assert.equal(state.round.lastPassAt,passAt);
  assert.throws(()=>engine.passBomb(state,target,holder,passAt+200),/çok hızlı/i);
  assert.throws(()=>engine.passBomb(state,target,holder,passAt+649),/çok hızlı/i);
  state=engine.passBomb(state,target,holder,passAt+650);
  assert.equal(state.round.holderUid,holder);
  assert.equal(state.round.passes,2);
  assert.equal(state.round.lastPassAt,passAt+650);
});

test('passes respect instruction, countdown, start and explosion boundaries', () => {
  const requestedAt=1000;
  const state=engine.startBombPassTest(room(),'p1',requestedAt);
  const holder=state.round.holderUid;
  const target=Object.keys(state.players).find(uid=>uid!==holder);
  const {instructionsUntil,startsAt,endsAt}=state.round;
  for(const at of [requestedAt,instructionsUntil-1,instructionsUntil,startsAt-1]){
    assert.throws(()=>engine.passBomb(state,holder,target,at),/başlamadı/i);
  }
  // The playable interval is [startsAt, endsAt); each call uses the same base state.
  assert.equal(engine.passBomb(state,holder,target,startsAt).round.holderUid,target);
  assert.equal(engine.passBomb(state,holder,target,endsAt-1).round.holderUid,target);
  assert.throws(()=>engine.passBomb(state,holder,target,endsAt),/patladı|bitti/i);
});

test('settle is idempotent and awards +100 to everyone except holder', () => {
  let state=engine.startBombPassTest(room(),'p1',1000);
  const loser=state.round.holderUid;
  const before=Object.fromEntries(Object.values(state.players).map(p=>[p.uid,p.score]));
  state=engine.settleBombRound(state,'p2',state.round.endsAt+1);
  assert.equal(state.status,'results');
  assert.equal(state.round.loserUid,loser);
  for (const p of Object.values(state.players)) assert.equal(p.score,before[p.uid]+(p.uid===loser?0:100));
  const settled=JSON.stringify(state);
  state=engine.settleBombRound(state,'p1',state.round.endsAt+500);
  assert.equal(JSON.stringify(state),settled);
});

test('host can return results to lobby without resetting scores', () => {
  let state=engine.startBombPassTest(room(),'p1',1000);
  state=engine.settleBombRound(state,'p2',state.round.endsAt+1);
  const score=state.players.p1.score;
  state=engine.returnMicrogameLobby(state,'p1',state.updatedAt+1);
  assert.equal(state.status,'lobby');
  assert.equal(state.round,null);
  assert.equal(state.activeGameId,null);
  assert.equal(state.players.p1.score,score);
});
