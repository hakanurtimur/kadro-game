"use client";

import type { CSSProperties } from "react";
import { globalTrackCell } from "@/lib/ludo/engine";
import type { LudoColor, LudoRoomState } from "@/lib/ludo/types";

const TRACK: Array<[number, number]> = [
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],
];

const HOME_LANES: Array<Array<[number, number]>> = [
  [[7,1],[7,2],[7,3],[7,4],[7,5]],
  [[1,7],[2,7],[3,7],[4,7],[5,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9]],
  [[13,7],[12,7],[11,7],[10,7],[9,7]],
];
const YARDS: Array<Array<[number, number]>> = [
  [[2,2],[2,4],[4,2],[4,4]],
  [[2,10],[2,12],[4,10],[4,12]],
  [[10,10],[10,12],[12,10],[12,12]],
  [[10,2],[10,4],[12,2],[12,4]],
];
const STARTS = new Set([0,13,26,39]);
const COLORS: LudoColor[] = ["red","green","yellow","blue"];

function posStyle(row:number,col:number,offset=0): CSSProperties {
  const jitter = offset ? ((offset % 2) * 5 - 2.5) : 0;
  return { gridRowStart: row + 1, gridColumnStart: col + 1, transform: `translate(${jitter}px, ${offset>1?4:0}px)` };
}

function progressPosition(room:LudoRoomState,uid:string,progress:number): [number,number] | null {
  const player=room.players[uid];
  if(!player)return null;
  if(progress<52){const global=globalTrackCell(room,uid,progress);return global===null?null:TRACK[global];}
  if(progress<57)return HOME_LANES[player.seat][progress-52];
  if(progress===57)return [7,7];
  return null;
}

export default function LudoBoard({ room, uid, legalMoves, selectedPawnIndex, previewProgress, onPawnClick, onConfirmMove }: {
  room: LudoRoomState;
  uid: string;
  legalMoves: number[];
  selectedPawnIndex: number|null;
  previewProgress: number|null;
  onPawnClick: (index:number)=>void;
  onConfirmMove: ()=>void;
}) {
  const trackCells = TRACK.map(([row,col], index) => ({row,col,index}));
  const lastPawn = room.lastAction?.pawnId;
  const capturedPawn = room.lastAction?.capturedPawnId;
  const previewPosition=previewProgress===null?null:progressPosition(room,uid,previewProgress);
  const previewColor=room.players[uid]?.color??"red";

  return <div className="ludo-board-wrap">
    <div className="ludo-board" aria-label="Kızma Birader tahtası" role="application">
      <div className="ludo-yard-zone red" />
      <div className="ludo-yard-zone green" />
      <div className="ludo-yard-zone yellow" />
      <div className="ludo-yard-zone blue" />
      <div className="ludo-finish"><span>★</span></div>

      {trackCells.map(({row,col,index}) => <div key={`t${index}`} className={`ludo-cell track ${STARTS.has(index)?`safe start-${COLORS[Math.floor(index/13)]}`:""}`} style={posStyle(row,col)}>{STARTS.has(index)&&<span>✦</span>}</div>)}
      {HOME_LANES.map((lane,seat) => lane.map(([row,col],index)=><div key={`h${seat}-${index}`} className={`ludo-cell home-lane ${COLORS[seat]}`} style={posStyle(row,col)} />))}

      {previewPosition&&<div className={`ludo-preview-target-slot ${previewColor}`} style={posStyle(previewPosition[0],previewPosition[1])}>
        <button type="button" className="ludo-preview-target-hitbox" aria-label="Parlayan hedef kare · hamleyi onayla" title="Buraya git" onClick={onConfirmMove}/>
      </div>}

      {Object.values(room.players).flatMap((player) => player.pawns.map((pawn,pawnIndex) => {
        let row:number, col:number;
        if (pawn.progress < 0) [row,col]=YARDS[player.seat][pawnIndex];
        else if (pawn.progress < 52) {
          const global = globalTrackCell(room, player.uid, pawn.progress)!;
          [row,col]=TRACK[global];
        } else if (pawn.progress < 57) [row,col]=HOME_LANES[player.seat][pawn.progress-52];
        else [row,col]=[7,7];
        const isMine=player.uid===uid;
        const legal=isMine&&legalMoves.includes(pawnIndex);
        const selected=isMine&&selectedPawnIndex===pawnIndex;
        const classes=["ludo-pawn",player.color,legal?"legal":"",selected?"selected":"",pawn.id===lastPawn?"moved":"",pawn.id===capturedPawn?"captured":"",pawn.shieldUntilTurn>=room.turnNumber?"shielded":"",pawn.progress===57?"finished":""].filter(Boolean).join(" ");
        return <button key={pawn.id} type="button" aria-label={`${player.nickname} taş ${pawnIndex+1}`} aria-pressed={selected} className={classes} disabled={!legal} onClick={()=>legal&&onPawnClick(pawnIndex)} style={posStyle(row,col,pawn.progress===57?pawnIndex:0)}>
          <span className="pawn-head"/><span className="pawn-body"/>{pawn.shieldUntilTurn>=room.turnNumber&&<i>✦</i>}
        </button>;
      }))}
    </div>
  </div>;
}
