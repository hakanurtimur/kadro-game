"use client";

import { Move, Scan, ShieldAlert, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { getMicrogameStore } from "@/lib/microgame/store";
import type { ArenaPosition, MicrogameRoomState, ShrinkArenaRound } from "@/lib/microgame/types";
import styles from "@/app/microgame/microgame.module.css";

const START_POSITIONS:Array<[number,number]>=[
  [30,30],[70,30],[70,70],[30,70],[50,27],[50,73],
];
const PLAYER_COLORS=["#e87979","#66b883","#7588df","#e0b54e","#b675d4","#e58a55"];

function radiusAt(round:ShrinkArenaRound,now:number){
  if(now<=round.startsAt)return 42;
  const progress=Math.max(0,Math.min(1,(now-round.startsAt)/Math.max(1,round.endsAt-round.startsAt)));
  return 42-(24*progress);
}

function distance(x:number,y:number){
  return Math.hypot(x-50,y-50);
}

function initialForSeat(seat:number){
  const pair=START_POSITIONS[seat]??[50,50];
  return {x:pair[0],y:pair[1]};
}

export default function ShrinkArenaGame({
  room,uid,now,code,onOut,
}:{
  room:MicrogameRoomState;
  uid:string;
  now:number;
  code:string;
  onOut:()=>void;
}){
  const round=room.round?.gameId==="shrink-arena"?room.round:null;
  const store=useMemo(()=>getMicrogameStore(),[]);
  const me=room.players[uid];
  const initial=initialForSeat(me?.seat??0);
  const[positions,setPositions]=useState<Record<string,ArenaPosition>>({});
  const[localPos,setLocalPos]=useState(initial);
  const[target,setTarget]=useState(initial);
  const localRef=useRef(initial);
  const targetRef=useRef(initial);
  const positionsRef=useRef<Record<string,ArenaPosition>>({});
  const lastFrameRef=useRef<number|null>(null);
  const lastSentRef=useRef(0);
  const outsideSinceRef=useRef<number|null>(null);
  const reportedRef=useRef(false);
  const onOutRef=useRef(onOut);

  useEffect(()=>{onOutRef.current=onOut;},[onOut]);
  useEffect(()=>{positionsRef.current=positions;},[positions]);
  useEffect(()=>{targetRef.current=target;},[target]);

  useEffect(()=>{
    if(!round)return;
    const start=initialForSeat(me?.seat??0);
    localRef.current=start;
    targetRef.current=start;
    setLocalPos(start);
    setTarget(start);
    outsideSinceRef.current=null;
    reportedRef.current=Boolean(round.out[uid]);
    lastFrameRef.current=null;
    void store.setArenaPosition(code,{uid,roundNumber:room.roundNumber,...start,updatedAt:store.now()}).catch(()=>{});
  },[code,me?.seat,room.roundNumber,round?.gameId,store,uid]);

  useEffect(()=>{
    if(!round)return;
    let live=true;let stop:(()=>void)|undefined;
    void store.subscribeArenaPositions(code,room.roundNumber,next=>{
      if(live)setPositions(next);
    }).then(off=>{if(!live)off();else stop=off;}).catch(()=>{});
    return()=>{live=false;stop?.();};
  },[code,room.roundNumber,round?.gameId,store]);

  useEffect(()=>{
    if(!round||room.status!=="playing")return;
    let frame=0;
    const tick=()=>{
      const clock=store.now();
      const previous=lastFrameRef.current??clock;
      const dt=Math.min(.05,Math.max(0,(clock-previous)/1000));
      lastFrameRef.current=clock;
      const isOut=Boolean(round.out[uid]);

      if(clock>=round.startsAt&&clock<round.endsAt&&!isOut){
        let{x,y}=localRef.current;
        const tx=targetRef.current.x,ty=targetRef.current.y;
        const dx=tx-x,dy=ty-y;
        const len=Math.hypot(dx,dy);
        const maxStep=34*dt;
        if(len>.15){
          const step=Math.min(len,maxStep);
          x+=(dx/len)*step;
          y+=(dy/len)*step;
        }

        for(const position of Object.values(positionsRef.current)){
          if(position.uid===uid||position.roundNumber!==room.roundNumber)continue;
          const px=x-position.x,py=y-position.y;
          const pd=Math.max(.001,Math.hypot(px,py));
          if(pd<11){
            const force=(11-pd)*2.2*dt;
            x+=(px/pd)*force;
            y+=(py/pd)*force;
          }
        }

        x=Math.max(4,Math.min(96,x));
        y=Math.max(4,Math.min(96,y));
        const next={x,y};
        localRef.current=next;
        setLocalPos(next);

        const radius=radiusAt(round,clock);
        const outside=distance(x,y)>radius-4.2;
        if(outside){
          outsideSinceRef.current??=clock;
          if(!reportedRef.current&&clock-outsideSinceRef.current>=650){
            reportedRef.current=true;
            void onOutRef.current();
          }
        }else outsideSinceRef.current=null;

        if(clock-lastSentRef.current>=90){
          lastSentRef.current=clock;
          void store.setArenaPosition(code,{uid,roundNumber:room.roundNumber,x,y,updatedAt:clock}).catch(()=>{});
        }
      }
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[code,room.roundNumber,room.status,round,store,uid]);

  if(!round)return null;
  if(room.status==="results")return <ArenaResults room={room} round={round}/>;

  if(now<round.instructionsUntil)return <section className={`${styles.arenaStage} ${styles.arenaInstruction}`}>
    <small className={styles.kicker}>OYUN 02 · ALAN DARALIYOR</small>
    <div className={styles.arenaGuideIcon}><Scan size={52}/></div>
    <h2>Dairenin içinde kal.</h2>
    <p>Parmağını ya da mouse'u arenada sürükle. Karakterin hedefe doğru koşar; diğer oyuncular çok yaklaşırsa birbirinizi itersiniz.</p>
    <div className={styles.instructionRules}>
      <div><Move size={19}/><span><b>Sürükle ve yönlendir</b><small>Karakter anında ışınlanmaz, hedefe koşar.</small></span></div>
      <div><Users size={19}/><span><b>Birbirinizi itersiniz</b><small>Merkez kalabalıklaştıkça işler karışır.</small></span></div>
      <div><ShieldAlert size={19}/><span><b>Alan dışında 0.65 sn</b><small>Bu round için oyun dışı kalırsın.</small></span></div>
    </div>
  </section>;

  const beforeStart=Math.max(0,round.startsAt-now);
  if(beforeStart>0)return <section className={styles.arenaStage}>
    <small className={styles.kicker}>ALAN DARALIYOR</small>
    <div className={styles.countdown}>{Math.max(1,Math.ceil(beforeStart/1000))}</div>
    <h2>Merkeze hazır ol.</h2>
    <p>Yeşil alan küçülmeye başladığında karakterini içeride tut.</p>
  </section>;

  const radius=radiusAt(round,now);
  const seconds=Math.max(0,Math.ceil((round.endsAt-now)/1000));
  const isOut=Boolean(round.out[uid]);
  const merged:Record<string,{x:number;y:number}>={};
  for(const player of Object.values(room.players)){
    const remote=positions[player.uid];
    merged[player.uid]=player.uid===uid?localPos:remote??initialForSeat(player.seat);
  }

  function pointFromEvent(event:ReactPointerEvent<HTMLDivElement>){
    const rect=event.currentTarget.getBoundingClientRect();
    const x=((event.clientX-rect.left)/rect.width)*100;
    const y=((event.clientY-rect.top)/rect.height)*100;
    return{x:Math.max(3,Math.min(97,x)),y:Math.max(3,Math.min(97,y))};
  }
  function steer(event:ReactPointerEvent<HTMLDivElement>){
    if(isOut)return;
    if(event.type==="pointerdown")event.currentTarget.setPointerCapture(event.pointerId);
    if(event.type==="pointermove"&&event.buttons===0&&event.pointerType==="mouse")return;
    const next=pointFromEvent(event);setTarget(next);targetRef.current=next;
  }

  return <section className={styles.arenaStage}>
    <div className={styles.arenaTopline}>
      <div><small className={styles.kicker}>ALAN DARALIYOR</small><strong>{isOut?"Bu round dışarıdasın":"İçeride kal!"}</strong></div>
      <span>{seconds}<small>sn</small></span>
    </div>
    <div
      className={`${styles.arena} ${isOut?styles.arenaOut:""}`}
      onPointerDown={steer}
      onPointerMove={steer}
      onPointerUp={steer}
      style={{touchAction:"none"}}
      role="application"
      aria-label="Daralan güvenli alan"
    >
      <div className={styles.safeZone} style={{width:`${radius*2}%`,height:`${radius*2}%`}}/>
      <div className={styles.targetMarker} style={{left:`${target.x}%`,top:`${target.y}%`}}/>
      {Object.values(room.players).map(player=>{
        const pos=merged[player.uid];
        const playerOut=Boolean(round.out[player.uid]);
        return <div
          key={player.uid}
          className={`${styles.arenaPlayer} ${player.uid===uid?styles.arenaMe:""} ${playerOut?styles.arenaPlayerOut:""}`}
          style={{left:`${pos.x}%`,top:`${pos.y}%`,"--player-color":PLAYER_COLORS[player.seat%PLAYER_COLORS.length]} as CSSProperties}
        >
          <span>{player.nickname.slice(0,1).toLocaleUpperCase("tr-TR")}</span>
          <small>{player.nickname}</small>
        </div>;
      })}
      {isOut&&<div className={styles.outBanner}>Alan dışında kaldın · diğerlerini izle</div>}
    </div>
    <p className={styles.arenaHint}>{isOut?"Round bitince hayatta kalma sürene göre puanın eklenecek.":"Basılı tutup/sürükleyip yön ver. Merkezde diğer oyuncular seni itebilir."}</p>
  </section>;
}

function ArenaResults({room,round}:{room:MicrogameRoomState;round:ShrinkArenaRound}){
  const survivors=Object.values(room.players).filter(player=>!round.out[player.uid]);
  return <section className={styles.arenaStage}>
    <small className={styles.kicker}>ROUND {room.roundNumber} · ALAN DARALIYOR</small>
    <div className={styles.arenaResultIcon}><Scan size={48}/></div>
    <h2>{survivors.length?`${survivors.length} kişi dayandı!`:"Alan herkesi yuttu!"}</h2>
    <p>Tur sonuna kadar içeride kalanlar <b>+100</b> aldı. Dışarı çıkanlar hayatta kaldıkları süre kadar kısmi puan topladı.</p>
    <div className={styles.arenaResults}>
      {Object.values(room.players).sort((a,b)=>b.score-a.score||a.seat-b.seat).map(player=><div key={player.uid}>
        <span>{round.out[player.uid]?"OUT":"✓"}</span><strong>{player.nickname}</strong><small>{round.out[player.uid]?"alan dışı":"hayatta"}</small><b>{player.score}</b>
      </div>)}
    </div>
  </section>;
}
