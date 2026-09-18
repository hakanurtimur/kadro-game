import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';
const e=await importTs('lib/ludo/engine.ts');
function room(count=3){let r=e.createLudoRoom({code:'LUD22',hostUid:'a',nickname:'Ada',now:1});for(const uid of ['b','c','d'].slice(0,count-1))r=e.joinLudoPlayer(r,{uid,nickname:uid,now:2});return r;}
test('choosing an available color also changes the board seat and reserves it for joins',()=>{
 let r=room(2);const original=structuredClone(r);r=e.setLudoColor(r,'a','blue',3);
 assert.equal(r.players.a.color,'blue');assert.equal(r.players.a.seat,3);assert.deepEqual(original.players.a.seat,0);
 assert.equal(e.globalTrackCell(r,'a',0),39);
 assert.throws(()=>e.setLudoColor(r,'b','blue'),/kullanılıyor/);
 assert.throws(()=>e.setLudoColor(r,'outsider','yellow'),/oyuncu/);
 assert.throws(()=>e.setLudoColor(r,'a','purple'),/geçersiz/);
 r=e.joinLudoPlayer(r,{uid:'c',nickname:'Cem'});assert.equal(r.players.c.seat,0);
 r=e.startLudoGame(r,'a');assert.throws(()=>e.setLudoColor(r,'a','yellow'),/lobi/);
});
test('leaving a lobby transfers ownership and a new player uses the vacant seat',()=>{
 let r=room();r=e.leaveLudoPlayer(r,'a',5);assert.equal(r.hostUid,'b');assert.equal(r.players.a,undefined);
 r=e.joinLudoPlayer(r,{uid:'d',nickname:'Deniz'});assert.equal(r.players.d.seat,0);assert.equal(r.players.c.seat,2);
 assert.throws(()=>e.leaveLudoPlayer(r,'a'),/oyuncu/);
});
test('leaving during a selected die moves to the correct next player without shifting pieces',()=>{
 let r=e.startLudoGame(room(4),'a');r.turnUid='c';r.phase='choose-die';r.dice=[3,6];r.players.d.pawns[0].progress=18;
 r=e.leaveLudoPlayer(r,'c',10);assert.equal(r.turnUid,'d');assert.equal(r.phase,'awaiting-roll');assert.deepEqual(r.dice,[]);assert.equal(r.selectedDie,null);assert.equal(r.players.d.seat,3);assert.equal(r.players.d.pawns[0].progress,18);assert.equal(r.players.c,undefined);
 r=e.leaveLudoPlayer(r,'a',11);assert.equal(r.turnUid,'d');assert.equal(r.hostUid,'b');
});
test('the last remaining player wins, and an empty room cannot be rejoined',()=>{
 let r=e.startLudoGame(room(2),'a');r=e.leaveLudoPlayer(r,'a',10);assert.equal(r.status,'finished');assert.equal(r.winnerUid,'b');assert.equal(r.finishReason,'last-player');assert.equal(r.turnUid,null);
 r=e.leaveLudoPlayer(r,'b',11);assert.equal(r.winnerUid,null);assert.deepEqual(r.players,{});assert.equal(r.status,'finished');assert.throws(()=>e.joinLudoPlayer(r,{uid:'c',nickname:'Cem'}),/başladı/);
});
test('non-active departure preserves pending roll and completed-game departures do not create a new winner',()=>{
 let r=e.startLudoGame(room(),'a');r=e.forceRollForTest(r,'a',[6]);r=e.leaveLudoPlayer(r,'c');assert.equal(r.selectedDie,6);assert.equal(r.phase,'awaiting-move');
 for(const p of r.players.a.pawns)p.progress=57;r=e.recomputeLudoWinner(r);r=e.leaveLudoPlayer(r,'a');assert.equal(r.status,'finished');assert.equal(r.winnerUid,null);
});
