import test from "node:test";
import assert from "node:assert/strict";
import { importTs } from "./transpile-import.mjs";

const engine = await importTs("lib/tasir/engine.ts");
const hidden = (value) => ({ value, revealed: false });
const open = (value) => ({ value, revealed: true });
const boardOf = (value=0, revealed=false) => Array.from({length:4},()=>Array.from({length:5},()=>({value,revealed})));

function startedRoom(code="TSR22") {
  let room=engine.createTasirRoom({code,hostUid:"a",nickname:"A"});
  room=engine.joinTasirPlayer(room,{uid:"b",nickname:"B"});
  room=engine.startTasirRps(room,"a");
  room=engine.chooseTasirRps(room,"a","paper");
  room=engine.chooseTasirRps(room,"b","rock");
  return room;
}

test("TAŞIR is exactly two-player, deals four copies of 0-9 and starts every board tile closed",()=>{
  let room=engine.createTasirRoom({code:"TSR22",hostUid:"a",nickname:"A"});
  room=engine.joinTasirPlayer(room,{uid:"b",nickname:"B"});
  assert.throws(()=>engine.joinTasirPlayer(room,{uid:"c",nickname:"C"}),/2 kişilik/);
  room=engine.startTasirRps(room,"a");
  const tiles=Object.values(room.players).flatMap((p)=>p.board.flat());
  const digits=tiles.map((tile)=>tile.value).sort((a,b)=>a-b);
  assert.equal(digits.length,40);
  assert.ok(tiles.every((tile)=>tile.revealed===false));
  for(let n=0;n<10;n++)assert.equal(digits.filter((x)=>x===n).length,4);
});

test("RPS tie repeats and winner starts with visible Joker",()=>{
  let room=engine.createTasirRoom({code:"TSR23",hostUid:"a",nickname:"A"});
  room=engine.joinTasirPlayer(room,{uid:"b",nickname:"B"});room=engine.startTasirRps(room,"a");
  room=engine.chooseTasirRps(room,"a","rock");room=engine.chooseTasirRps(room,"b","rock");
  assert.equal(room.status,"rps");assert.equal(room.rps.round,2);
  room=engine.chooseTasirRps(room,"a","paper");room=engine.chooseTasirRps(room,"b","rock");
  assert.equal(room.status,"playing");assert.equal(room.turnUid,"a");assert.equal(room.heldTile,"joker");
  assert.deepEqual(engine.tasirLegalColumns(room,"a"),[0,1,2,3,4]);
});

test("a shift pushes the column down, inserts the held tile face-up and reveals the overflow",()=>{
  let room=startedRoom("TSR24");
  const board=boardOf(0,false);board[3][1]=hidden(7);
  room={...room,players:{...room.players,a:{...room.players.a,board}},turnUid:"a",heldTile:"joker"};
  const next=engine.playTasirColumn(room,"a",1);
  assert.deepEqual(next.players.a.board[0][1],{value:"joker",revealed:true});
  assert.equal(next.heldTile,7);
  assert.equal(next.lastAction.overflowWasRevealed,false);
  assert.equal(next.turnUid,"b");
});

test("own number stays with the player and continues through the same column",()=>{
  let room=startedRoom("TSR25");
  const board=boardOf(8,false);board[3][2]=hidden(3);
  room={...room,players:{...room.players,a:{...room.players.a,board}},turnUid:"a",heldTile:2,forcedColumn:2,columnChainCount:1};
  assert.deepEqual(engine.tasirLegalColumns(room,"a"),[2]);
  assert.throws(()=>engine.playTasirColumn(room,"a",1),/3\. sütundan/);
  const next=engine.playTasirColumn(room,"a",2);
  assert.equal(next.heldTile,3);assert.equal(next.turnUid,"a");
  assert.deepEqual(engine.tasirLegalColumns(next,"a"),[2]);
  assert.deepEqual(next.players.a.board[0][2],{value:2,revealed:true});
});

test("opponent number passes the visible tile and gives the opponent a fresh column choice",()=>{
  let room=startedRoom("TSR26");
  const board=boardOf(0,false);board[3][0]=hidden(7);
  room={...room,players:{...room.players,a:{...room.players.a,board}},turnUid:"a",heldTile:0};
  const next=engine.playTasirColumn(room,"a",0);
  assert.equal(next.heldTile,7);assert.equal(next.turnUid,"b");
  assert.deepEqual(engine.tasirLegalColumns(next,"b"),[0,1,2,3,4]);
});

test("player wins as soon as all 4x5 board tiles are face-up, regardless of their numbers",()=>{
  let room=startedRoom("TSR27");
  const board=boardOf(9,true);board[3][0]=hidden(6);
  room={...room,players:{...room.players,a:{...room.players.a,board}},turnUid:"a",heldTile:"joker"};
  const next=engine.playTasirColumn(room,"a",0);
  assert.equal(engine.tasirRevealCount(next.players.a),20);
  assert.equal(next.status,"finished");assert.equal(next.winnerUid,"a");
});

test("already opened tiles stay opened after later shifts",()=>{
  let room=startedRoom("TSR28");
  const board=boardOf(1,true);board[3][4]=hidden(7);
  room={...room,players:{...room.players,a:{...room.players.a,board}},turnUid:"a",heldTile:"joker"};
  const next=engine.playTasirColumn(room,"a",4);
  assert.ok(next.players.a.board.slice(1).flat().filter((_,i)=>i%5!==4).every((tile)=>tile.revealed));
  assert.equal(next.players.a.board[0][4].revealed,true);
});

test("old numeric Patch 04 boards normalize as closed tiles",()=>{
  const raw={schemaVersion:1,code:"OLD22",hostUid:"a",status:"playing",createdAt:1,updatedAt:1,players:{a:{uid:"a",nickname:"A",seat:0,board:Array.from({length:4},()=>[0,1,2,3,4])}},randomSeed:1,turnUid:"a",heldTile:"joker",moveNumber:0,rps:{round:1,choices:{},winnerUid:null},winnerUid:null,lastAction:null};
  const room=engine.normalizeTasirState(raw);
  assert.deepEqual(room.players.a.board[0][2],{value:2,revealed:false});
});
