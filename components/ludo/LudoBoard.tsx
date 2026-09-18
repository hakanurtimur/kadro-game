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
  [[2,2],[2,3],[3,2],[3,3]],
  [[2,11],[2,12],[3,11],[3,12]],
  [[11,11],[11,12],[12,11],[12,12]],
  [[11,2],[11,3],[12,2],[12,3]],
];

const YARD_SOCKET_COLORS: Record<LudoColor,{background:string;boxShadow:string}> = {
  red:{background:"rgba(255,240,238,.34)",boxShadow:"inset 0 0 0 2px rgba(198,83,83,.08), inset 0 3px 7px rgba(255,255,255,.46), 0 2px 4px rgba(72,58,82,.06)"},
  green:{background:"rgba(237,251,241,.34)",boxShadow:"inset 0 0 0 2px rgba(67,140,96,.08), inset 0 3px 7px rgba(255,255,255,.46), 0 2px 4px rgba(72,58,82,.06)"},
  yellow:{background:"rgba(255,248,224,.38)",boxShadow:"inset 0 0 0 2px rgba(168,122,29,.08), inset 0 3px 7px rgba(255,255,255,.46), 0 2px 4px rgba(72,58,82,.06)"},
  blue:{background:"rgba(239,242,255,.36)",boxShadow:"inset 0 0 0 2px rgba(86,104,186,.08), inset 0 3px 7px rgba(255,255,255,.46), 0 2px 4px rgba(72,58,82,.06)"},
};
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

type StartDock = { x:number; y:number };

const START_DOCK_PATTERNS: Record<2|3|4, Array<[number,number]>> = {
  2: [[-16,-16],[16,16]],
  3: [[-16,-16],[16,-16],[0,16]],
  4: [[-16,-16],[16,-16],[-16,16],[16,16]],
};

function startDockPattern(count:number,index:number): [number,number] {
  if(count<=1)return [0,0];
  const key=(Math.min(4,Math.max(2,count)) as 2|3|4);
  return START_DOCK_PATTERNS[key][index]??[0,0];
}

function startDockOffset(globalCell:number,count:number,index:number): StartDock {
  const [baseX,baseY]=startDockPattern(count,index);
  const inward=8;
  if(globalCell===0)return {x:baseX+inward,y:baseY};
  if(globalCell===13)return {x:baseX,y:baseY+inward};
  if(globalCell===26)return {x:baseX-inward,y:baseY};
  if(globalCell===39)return {x:baseX,y:baseY-inward};
  return {x:baseX,y:baseY};
}

function startDockMap(room:LudoRoomState) {
  const grouped=new Map<number,Array<{id:string;seat:number;pawnIndex:number}>>();
  for(const player of Object.values(room.players)){
    player.pawns.forEach((pawn,pawnIndex)=>{
      if(pawn.progress<0||pawn.progress>=52)return;
      const global=globalTrackCell(room,player.uid,pawn.progress);
      if(global===null||!STARTS.has(global))return;
      const list=grouped.get(global)??[];
      list.push({id:pawn.id,seat:player.seat,pawnIndex});
      grouped.set(global,list);
    });
  }
  const docks=new Map<string,StartDock>();
  for(const [global,list] of grouped){
    if(list.length<2)continue;
    list.sort((a,b)=>a.seat-b.seat||a.pawnIndex-b.pawnIndex);
    list.forEach((item,index)=>docks.set(item.id,startDockOffset(global,list.length,index)));
  }
  return docks;
}

function pawnStyle(row:number,col:number,finishOffset:number,dock?:StartDock): CSSProperties {
  const jitter=finishOffset?((finishOffset%2)*5-2.5):0;
  const finishY=finishOffset>1?4:0;
  const dockX=dock?.x??0;
  const dockY=dock?.y??0;
  return {
    gridRowStart:row+1,
    gridColumnStart:col+1,
    transform:`translate(calc(${jitter}px + ${dockX}%), calc(${finishY}px + ${dockY}%))`,
  };
}

function yardSocketStyle(row:number,col:number,color:LudoColor): CSSProperties {
  return {
    ...posStyle(row,col),
    alignSelf:"center",
    justifySelf:"center",
    width:"86%",
    height:"86%",
    borderRadius:"50%",
    border:"1px solid rgba(255,255,255,.72)",
    background:YARD_SOCKET_COLORS[color].background,
    boxShadow:YARD_SOCKET_COLORS[color].boxShadow,
    pointerEvents:"none",
    zIndex:1,
  };
}

function captureEffect(room:LudoRoomState) {
  const action=room.lastAction;
  if(action?.type!=="capture"||!action.pawnId||!action.capturedPawnId)return null;
  const players=Object.values(room.players);
  const attacker=players.find((player)=>player.pawns.some((pawn)=>pawn.id===action.pawnId));
  const victim=players.find((player)=>player.pawns.some((pawn)=>pawn.id===action.capturedPawnId));
  const attackerPawn=attacker?.pawns.find((pawn)=>pawn.id===action.pawnId);
  if(!attacker||!victim||!attackerPawn)return null;
  const position=progressPosition(room,attacker.uid,attackerPawn.progress);
  if(!position)return null;
  return {
    row:position[0],
    col:position[1],
    attackerColor:attacker.color,
    victimColor:victim.color,
    victimSeat:victim.seat,
    key:`${action.at}-${action.capturedPawnId}`,
  };
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
  const captureFx=captureEffect(room);
  const startDocks=startDockMap(room);

  return <div className="ludo-board-wrap">
    <div className="ludo-board" aria-label="Kızma Birader tahtası" role="application">
      <div className="ludo-yard-zone red"><span aria-hidden="true">01 / KIRMIZI</span></div>
      <div className="ludo-yard-zone green"><span aria-hidden="true">02 / YEŞİL</span></div>
      <div className="ludo-yard-zone yellow"><span aria-hidden="true">03 / SARI</span></div>
      <div className="ludo-yard-zone blue"><span aria-hidden="true">04 / MAVİ</span></div>
      <div className="ludo-finish"><img src="/brand/mascot.svg" width="64" height="64" alt=""/></div>

      {YARDS.map((yard,seat)=>yard.map(([row,col],index)=><div
        key={`yard-socket-${seat}-${index}`}
        className="ludo-yard-socket"
        style={yardSocketStyle(row,col,COLORS[seat])}
        aria-hidden="true"
      />))}

      {trackCells.map(({row,col,index}) => <div key={`t${index}`} className={`ludo-cell track ${STARTS.has(index)?`safe start-${COLORS[Math.floor(index/13)]}`:""}`} style={posStyle(row,col)}>{STARTS.has(index)&&<span>✦</span>}</div>)}
      {HOME_LANES.map((lane,seat) => lane.map(([row,col],index)=><div key={`h${seat}-${index}`} className={`ludo-cell home-lane ${COLORS[seat]}`} style={posStyle(row,col)} />))}

      {previewPosition&&<div className={`ludo-preview-target-slot ${previewColor}`} style={posStyle(previewPosition[0],previewPosition[1])}>
        <button type="button" className="ludo-preview-target-hitbox" aria-label="Parlayan hedef kare · hamleyi onayla" title="Buraya git" onClick={onConfirmMove}/>
      </div>}

      {captureFx&&<div key={captureFx.key} className={`ludo-capture-impact seat-${captureFx.victimSeat} attacker-${captureFx.attackerColor}`} style={posStyle(captureFx.row,captureFx.col)} aria-hidden="true">
        <span className="ludo-impact-ring"/>
        <span className={`ludo-capture-ghost ${captureFx.victimColor}`}><i className="ghost-head"/><i className="ghost-body"/></span>
        <i className="ludo-impact-spark spark-a">✦</i>
        <i className="ludo-impact-spark spark-b">✦</i>
        <i className="ludo-impact-spark spark-c">•</i>
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
        const captureHit=room.lastAction?.type==="capture"&&pawn.id===lastPawn;
        const startDock=startDocks.get(pawn.id);
        const classes=["ludo-pawn",player.color,legal?"legal":"",selected?"selected":"",pawn.id===lastPawn?"moved":"",captureHit?"capture-hit":"",pawn.id===capturedPawn?"captured":"",pawn.shieldUntilTurn>=room.turnNumber?"shielded":"",pawn.progress===57?"finished":""].filter(Boolean).join(" ");
        return <button key={pawn.id} type="button" aria-label={`${player.nickname} taş ${pawnIndex+1}`} aria-pressed={selected} className={classes} disabled={!legal} onClick={()=>legal&&onPawnClick(pawnIndex)} style={pawnStyle(row,col,pawn.progress===57?pawnIndex:0,startDock)}>
          <span className="pawn-head"/><span className="pawn-body"/>{pawn.shieldUntilTurn>=room.turnNumber&&<i>✦</i>}
        </button>;
      }))}
    </div>
  </div>;
}
