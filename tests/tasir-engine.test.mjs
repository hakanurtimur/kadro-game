import test from "node:test";
import assert from "node:assert/strict";
import { importTs } from "./transpile-import.mjs";

const engine = await importTs("lib/tasir/engine.ts");

test("TAŞIR is exactly two-player and deals four copies of 0-9",()=>{
  let room=engine.createTasirRoom({code:"TSR22",hostUid:"a",nickname:"A"});
  room=engine.joinTasirPlayer(room,{uid:"b",nickname:"B"});
  assert.throws(()=>engine.joinTasirPlayer(room,{uid:"c",nickname:"C"}),/2 kişilik/);
  room=engine.startTasirRps(room,"a");
  const digits=Object.values(room.players).flatMap((p)=>p.board.flat()).sort((a,b)=>a-b);
  assert.equal(digits.length,40);
  for(let n=0;n<10;n++)assert.equal(digits.filter((x)=>x===n).length,4);
});

test("RPS tie repeats and winner starts with Joker",()=>{
  let room=engine.createTasirRoom({code:"TSR23",hostUid:"a",nickname:"A"});
  room=engine.joinTasirPlayer(room,{uid:"b",nickname:"B"});room=engine.startTasirRps(room,"a");
  room=engine.chooseTasirRps(room,"a","rock");room=engine.chooseTasirRps(room,"b","rock");
  assert.equal(room.status,"rps");assert.equal(room.rps.round,2);
  room=engine.chooseTasirRps(room,"a","paper");room=engine.chooseTasirRps(room,"b","rock");
  assert.equal(room.status,"playing");assert.equal(room.turnUid,"a");assert.equal(room.heldTile,"joker");
});

test("overflow owned by opponent passes the turn",()=>{
  let room=engine.createTasirRoom({code:"TSR24",hostUid:"a",nickname:"A"});room=engine.joinTasirPlayer(room,{uid:"b",nickname:"B"});room=engine.startTasirRps(room,"a");
  room={...room,status:"playing",turnUid:"a",heldTile:"joker",players:{...room.players,a:{...room.players.a,board:[[0,0,0,0,0],[1,1,1,1,1],[2,2,2,2,2],[7,3,3,3,3]]}}};
  const next=engine.playTasirColumn(room,"a",0);
  assert.equal(next.heldTile,7);assert.equal(next.turnUid,"b");assert.equal(next.lastAction.overflow,7);
});

test("a solved 0-4 board wins immediately",()=>{
  let room=engine.createTasirRoom({code:"TSR25",hostUid:"a",nickname:"A"});room=engine.joinTasirPlayer(room,{uid:"b",nickname:"B"});room=engine.startTasirRps(room,"a");
  room={...room,status:"playing",turnUid:"a",heldTile:0,players:{...room.players,a:{...room.players.a,board:[[1,1,1,1,1],[2,2,2,2,2],[3,3,3,3,3],[4,4,4,4,4]]}}};
  const next=engine.playTasirColumn(room,"a",0);
  assert.equal(next.status,"finished");assert.equal(next.winnerUid,"a");
});
