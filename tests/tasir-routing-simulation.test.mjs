import test from "node:test";
import assert from "node:assert/strict";
import { importTs } from "./transpile-import.mjs";

const engine = await importTs("lib/tasir/engine.ts");

function columnDone(player,column){
  const target=engine.tasirTargetForColumn(player.seat,column);
  return player.board.every((row)=>row[column].revealed&&row[column].value===target);
}

function makeCode(index){
  const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value=index+1,code="";
  for(let i=0;i<5;i++){code+=alphabet[value%alphabet.length];value=Math.floor(value/alphabet.length)+7;}
  return code;
}

test("thirty deterministic routed games finish with every winning lane matched 4/4",()=>{
  let longest=0;
  for(let game=0;game<30;game++){
    let room=engine.createTasirRoom({code:makeCode(game),hostUid:"a",nickname:"A"});
    room=engine.joinTasirPlayer(room,{uid:"b",nickname:"B"});
    room=engine.startTasirRps(room,"a");
    room=engine.chooseTasirRps(room,"a","paper");
    room=engine.chooseTasirRps(room,"b","rock");
    let moves=0;
    while(room.status==="playing"&&moves<300){
      const uid=room.turnUid;
      const player=room.players[uid];
      const legal=engine.tasirLegalColumns(room,uid);
      assert.ok(legal.length>0,"active owner always has a target lane");
      const column=room.heldTile==="joker"?(legal.find((c)=>!columnDone(player,c))??legal[0]):legal[0];
      room=engine.playTasirColumn(room,uid,column);
      moves++;
    }
    assert.equal(room.status,"finished",`game ${game} should finish`);
    assert.ok(room.winnerUid);
    assert.equal(engine.tasirCompletedColumns(room.players[room.winnerUid]),5);
    longest=Math.max(longest,moves);
  }
  assert.ok(longest<100);
});
