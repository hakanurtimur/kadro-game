import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';
const e=await importTs('lib/ludo/engine.ts');

function make(playerCount,mode){
  let room=e.createLudoRoom({code:'SIM22',hostUid:'p0',nickname:'P0',mode,now:1});
  for(let i=1;i<playerCount;i++) room=e.joinLudoPlayer(room,{uid:`p${i}`,nickname:`P${i}`,now:i+1});
  return e.startLudoGame(room,'p0',10);
}
function assertInvariant(room){
  for(const player of Object.values(room.players)){
    assert.equal(player.pawns.length,4);
    for(const pawn of player.pawns) assert.ok(pawn.progress>=-1&&pawn.progress<=57,`bad progress ${pawn.progress}`);
  }
  const onTrack=new Map();
  for(const player of Object.values(room.players)) for(const pawn of player.pawns){
    if(pawn.progress>=0&&pawn.progress<52){
      const cell=e.globalTrackCell(room,player.uid,pawn.progress);
      const others=onTrack.get(cell)||[]; others.push(player.uid); onTrack.set(cell,others);
    }
  }
}
for(const mode of ['classic','chaos']) for(const count of [2,3,4]) test(`${mode} ${count}-player game deterministically finishes without corrupting pawns`,()=>{
  let room=make(count,mode);
  let guard=0;
  while(room.status==='playing'&&guard++<10000){
    const uid=room.turnUid;
    if(room.phase==='awaiting-roll') room=e.rollLudoDice(room,uid,100+guard);
    if(room.phase==='choose-die'){
      let choice=room.dice[0];
      for(const die of room.dice){const trial=e.chooseLudoDie(room,uid,die);if(e.legalPawnMoves(trial,uid).length){choice=die;break;}}
      room=e.chooseLudoDie(room,uid,choice,200+guard);
    }
    if(room.phase==='awaiting-move'){
      const legal=e.legalPawnMoves(room,uid);
      room=legal.length?e.moveLudoPawn(room,uid,legal[0],300+guard):e.finishNoMove(room,uid,300+guard);
    }
    assertInvariant(room);
  }
  assert.equal(room.status,'finished',`game stuck after ${guard} actions`);
  assert.ok(room.winnerUid);
});
