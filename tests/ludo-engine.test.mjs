import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';

const engine = await importTs('lib/ludo/engine.ts');

function room(mode='classic') {
  let state = engine.createLudoRoom({ code:'LUD22', hostUid:'p1', nickname:'Ada', mode, now:1 });
  state = engine.joinLudoPlayer(state, { uid:'p2', nickname:'Can', now:2 });
  return state;
}

test('host is a normal player and room allows 2-4 players only', () => {
  let state = engine.createLudoRoom({ code:'LUD22', hostUid:'p1', nickname:'Ada', mode:'classic', now:1 });
  assert.equal(state.players.p1.nickname, 'Ada');
  assert.equal(state.players.p1.pawns.length, 4);
  state = engine.joinLudoPlayer(state,{uid:'p2',nickname:'Can',now:2});
  state = engine.joinLudoPlayer(state,{uid:'p3',nickname:'Ece',now:3});
  state = engine.joinLudoPlayer(state,{uid:'p4',nickname:'Mert',now:4});
  assert.equal(Object.keys(state.players).length,4);
  assert.throws(()=>engine.joinLudoPlayer(state,{uid:'p5',nickname:'Fazla'}), /dolu/i);
});

test('only a six can leave the yard and six grants another roll', () => {
  let state = room();
  state = engine.startLudoGame(state,'p1',10);
  state = engine.forceRollForTest(state,'p1',[5],11);
  assert.equal(engine.legalPawnMoves(state,'p1').length,0);
  state = engine.finishNoMove(state,'p1',12);
  assert.equal(state.turnUid,'p2');

  state = engine.forceRollForTest(state,'p2',[6],13);
  assert.deepEqual(engine.legalPawnMoves(state,'p2'), [0,1,2,3]);
  state = engine.moveLudoPawn(state,'p2',0,14);
  assert.equal(state.players.p2.pawns[0].progress,0);
  assert.equal(state.turnUid,'p2');
  assert.equal(state.phase,'awaiting-roll');
});

test('capture sends opponent home, but start cells are safe', () => {
  let state = room();
  state = engine.startLudoGame(state,'p1',10);
  state.players.p1.pawns[0].progress = 5;
  state.players.p2.pawns[0].progress = 45; // same global cell when p1 moves to 6, not safe
  state.turnUid='p1'; state.phase='awaiting-move'; state.dice=[1]; state.selectedDie=1;
  state = engine.moveLudoPawn(state,'p1',0,20);
  assert.equal(state.players.p2.pawns[0].progress,-1);

  // player 2 start cell is global 13; safe, so no capture.
  state.players.p1.pawns[0].progress=12;
  state.players.p2.pawns[0].progress=0;
  state.turnUid='p1'; state.phase='awaiting-move'; state.dice=[1]; state.selectedDie=1;
  state = engine.moveLudoPawn(state,'p1',0,21);
  assert.equal(state.players.p2.pawns[0].progress,0);
});

test('home entry requires an exact roll and four finished pawns win', () => {
  let state = room();
  state = engine.startLudoGame(state,'p1',10);
  state.players.p1.pawns[0].progress=56;
  state.turnUid='p1'; state.phase='awaiting-move'; state.dice=[2]; state.selectedDie=2;
  assert.deepEqual(engine.legalPawnMoves(state,'p1'), []);
  state.dice=[1]; state.selectedDie=1;
  state = engine.moveLudoPawn(state,'p1',0,20);
  assert.equal(state.players.p1.pawns[0].progress,57);

  for (const pawn of state.players.p1.pawns) pawn.progress=57;
  state = engine.recomputeLudoWinner(state,21);
  assert.equal(state.winnerUid,'p1');
  assert.equal(state.status,'finished');
});

test('dice generation is deterministic for transaction retries', () => {
  let a=engine.startLudoGame(room(), 'p1', 100);
  let b=structuredClone(a);
  a=engine.rollLudoDice(a,'p1',101);
  b=engine.rollLudoDice(b,'p1',999);
  assert.deepEqual(a.dice,b.dice);
  assert.equal(a.randomSeq,b.randomSeq);
});

test('chaos triggers every fourth completed turn with mixed global and active cards', () => {
  let state=room('chaos');
  state=engine.startLudoGame(state,'p1',10);
  for(let i=0;i<3;i++) state=engine.advanceTurnForTest(state,20+i);
  const before=state.turnNumber;
  state=engine.advanceTurnForTest(state,30);
  assert.equal(state.turnNumber,before+1);
  assert.ok(state.chaos.current || state.chaos.history.length>0);
  assert.equal(state.chaos.history.length,1);
  assert.ok(['active','global'].includes(state.chaos.history[0].scope));
});

test('double dice requires a choice, reverse transforms roll, portal never bypasses exact home', () => {
  let state=room('chaos');
  state=engine.startLudoGame(state,'p1',10);
  state=engine.forceChaosForTest(state,{kind:'double',scope:'active'},'p1');
  state=engine.rollLudoDice(state,'p1',11);
  assert.equal(state.dice.length,2);
  assert.equal(state.phase,'choose-die');
  state=engine.chooseLudoDie(state,'p1',state.dice[0],12);
  assert.equal(state.phase,'awaiting-move');

  state=engine.forceChaosForTest(state,{kind:'reverse',scope:'active'},'p1');
  state.phase='awaiting-roll'; state.dice=[]; state.selectedDie=null;
  state=engine.forceRollForTest(state,'p1',[1],13);
  assert.equal(state.selectedDie,6);

  state.players.p1.pawns[0].progress=56;
  state=engine.forceChaosForTest(state,{kind:'portal',scope:'active'},'p1');
  state.phase='awaiting-move'; state.dice=[1]; state.selectedDie=1;
  state=engine.moveLudoPawn(state,'p1',0,14);
  assert.equal(state.players.p1.pawns[0].progress,57);
});

test('shield prevents capture and peace disables captures globally', () => {
  let state=room('chaos');
  state=engine.startLudoGame(state,'p1',10);
  state.players.p2.pawns[0].progress=45;
  state.players.p2.pawns[0].shieldUntilTurn=state.turnNumber+3;
  state.players.p1.pawns[0].progress=5;
  state.turnUid='p1'; state.phase='awaiting-move'; state.dice=[1]; state.selectedDie=1;
  state=engine.moveLudoPawn(state,'p1',0,11);
  assert.equal(state.players.p2.pawns[0].progress,45);

  state.players.p1.pawns[0].progress=5;
  state.players.p2.pawns[0].progress=45;
  state.turnUid='p1'; state.phase='awaiting-move'; state.dice=[1]; state.selectedDie=1;
  state.chaos.peaceUntilTurn=state.turnNumber+3;
  state=engine.moveLudoPawn(state,'p1',0,12);
  assert.equal(state.players.p2.pawns[0].progress,45);
});
