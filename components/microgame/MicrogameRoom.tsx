"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bomb, Copy, FlaskConical, RotateCcw, Scan, Users } from "lucide-react";
import GameSocial from "@/components/social/GameSocial";
import BombPassGame from "./games/BombPassGame";
import ShrinkArenaGame from "./games/ShrinkArenaGame";
import SkillGame from "./games/royale/SkillGame";
import { isSkillGameId, SETTLE_GRACE_MS } from "@/lib/microgame/skill-model";
import { settleSkillRound, settleCrownRound, startSkillTest, submitSkillEvidence } from "@/lib/microgame/skill-engine";
import type { SkillEvidence, SkillRound } from "@/lib/microgame/skill-types";
import {
  passBomb,
  reportArenaOut,
  returnMicrogameLobby,
  settleBombRound,
  settleShrinkArenaRound,
  startBombPassTest,
  startShrinkArenaTest,
} from "@/lib/microgame/engine";
import { MICROGAMES, MICROGAME_REGISTRY } from "@/lib/microgame/registry";
import { getMicrogameStore } from "@/lib/microgame/store";
import type { MicrogameId, MicrogameRoomState } from "@/lib/microgame/types";
import styles from "@/app/microgame/microgame.module.css";

export default function MicrogameRoom({code}:{code:string}){
  const router=useRouter();
  const store=useMemo(()=>getMicrogameStore(),[]);
  const[room,setRoom]=useState<MicrogameRoomState|null>(null);
  const[uid,setUid]=useState<string|null>(null);
  const[now,setNow]=useState(()=>Date.now());
  const[busy,setBusy]=useState(false);
  const[toast,setToast]=useState("");
  const[selectedGame,setSelectedGame]=useState<MicrogameId>("bomb-pass");
  const settling=useRef(false);

  useEffect(()=>{
    let live=true;let off:(()=>void)|undefined;
    (async()=>{try{const id=await store.identity();if(!live)return;setUid(id);setNow(store.now());off=await store.subscribeRoom(code,next=>{if(live)setRoom(next);});}catch(error){setToast(error instanceof Error?error.message:"Odaya bağlanılamadı.");}})();
    return()=>{live=false;off?.();};
  },[code,store]);

  useEffect(()=>{const timer=window.setInterval(()=>setNow(store.now()),100);return()=>window.clearInterval(timer);},[store]);

  async function mutate(transition:(state:MicrogameRoomState)=>MicrogameRoomState){
    if(busy)return null;setBusy(true);
    try{return await store.mutate(code,transition);}catch(error){setToast(error instanceof Error?error.message:"İşlem olmadı.");return null;}finally{setBusy(false);}
  }

  useEffect(()=>{
    if(!room||!uid||room.status!=="playing"||!room.round||settling.current)return;
    const gameId=room.round.gameId,expectedRound=room.roundNumber;
    if(now<room.round.endsAt+(isSkillGameId(gameId)?SETTLE_GRACE_MS:0))return;
    settling.current=true;
    void (async()=>{
      const positions=gameId==="crown-control"?await store.getArenaPositions(code,expectedRound):{};
      const at=store.now();
      await store.mutate(code,state=>{
        // A delayed callback from a previous round must never settle the next one.
        if(state.roundNumber!==expectedRound||state.activeGameId!==gameId)return state;
        if(gameId==="bomb-pass")return settleBombRound(state,uid,at);
        if(gameId==="shrink-arena")return settleShrinkArenaRound(state,uid,at);
        if(gameId==="crown-control")return settleCrownRound(state,uid,expectedRound,positions,at);
        return settleSkillRound(state,uid,expectedRound,at);
      });
    })().catch(error=>setToast(error instanceof Error?error.message:"Sonuç alınamadı; bağlantı yeniden deneniyor.")).finally(()=>{settling.current=false;});
  },[code,now,room,store,uid]);

  if(!room||!uid)return <main className={styles.loading}>{toast||"Microgame odası kuruluyor…"}</main>;
  const actorUid=uid;
  const me=room.players[actorUid];
  if(!me)return <main className={styles.loading}><div><h2>Bu sekme odada değil.</h2><button onClick={()=>router.push("/microgame")}>Ana sayfa</button></div></main>;
  const players=Object.values(room.players).sort((a,b)=>a.seat-b.seat);
  const isHost=actorUid===room.hostUid;
  const activeDefinition=room.activeGameId?MICROGAME_REGISTRY[room.activeGameId]:null;

  async function startGame(gameId:MicrogameId){
    setSelectedGame(gameId);
    const at=store.now();
    await mutate(state=>gameId==="bomb-pass"
      ? startBombPassTest(state,actorUid,at)
      : gameId==="shrink-arena"
        ? startShrinkArenaTest(state,actorUid,at)
        : startSkillTest(state,actorUid,gameId,at));
  }
  async function restart(){
    const gameId=room?.activeGameId??selectedGame;
    await startGame(gameId);
  }
  async function sendBomb(targetUid:string){await mutate(state=>passBomb(state,actorUid,targetUid,store.now()));}
  async function reportOut(){await mutate(state=>reportArenaOut(state,actorUid,store.now()));}
  async function lobby(){await mutate(state=>returnMicrogameLobby(state,actorUid,store.now()));}
  async function sendSkill(evidence:SkillEvidence,expectedRound:number){
    const at=store.now();
    await store.mutate(code,state=>submitSkillEvidence(state,actorUid,expectedRound,evidence,at));
  }

  return <main className={styles.room}>
    <header className={styles.topbar}>
      <button onClick={()=>router.push("/microgame")}><ArrowLeft size={16}/> Çık</button>
      <button onClick={()=>navigator.clipboard?.writeText(code)}><Copy size={15}/>{code}</button>
      <div id="microgame-social-dock" className={styles.socialDock}/>
    </header>

    {room.status==="lobby"&&<section className={styles.lobby}>
      <div className={styles.lobbyMain}>
        <span className={styles.eyebrow}><Users size={15}/> {players.length}/6 OYUNCU</span>
        <h1>Masa hazır.</h1>
        <p>Test Mode'da oyunları tek tek seçip tekrar tekrar deneyebilirsin. PC ve telefondan aynı odaya girerek gerçek iki oyuncu akışını test et.</p>
        <div className={styles.playerGrid}>
          {players.map(player=><article key={player.uid} className={player.uid===actorUid?styles.me:""}><span>{player.nickname.slice(0,1).toLocaleUpperCase("tr-TR")}</span><div><strong>{player.nickname}</strong><small>{player.uid===room.hostUid?"host · oyuncu":`${player.seat+1}. koltuk`}</small></div><b>{player.score}</b></article>)}
        </div>
      </div>
      <aside className={styles.testPanel}>
        <span className={styles.eyebrow}><FlaskConical size={15}/> TEST MODE · {MICROGAMES.length} OYUN</span>
        <div className={styles.gamePicker}>
          {MICROGAMES.map((definition,index)=><button
            key={definition.id}
            type="button"
            disabled={!isHost||busy}
            className={`${styles.gameCard} ${isHost&&selectedGame===definition.id?styles.selectedGame:""}`}
            onClick={()=>setSelectedGame(definition.id)}
          >
            <div>{definition.id==="bomb-pass"?<Bomb size={28}/>:definition.id==="shrink-arena"?<Scan size={28}/>:<span aria-hidden="true" className={styles.gameEmoji}>{["✋","↔","✦","⚑","◐","◉","♛"][index-2]}</span>}<span>OYUN {String(index+1).padStart(2,"0")}</span></div>
            <h2>{definition.title}</h2>
            <p>{definition.description}</p>
            <small>~{definition.estimatedSeconds} sn · touch + mouse</small>
          </button>)}
        </div>
        {isHost?<button className={styles.primary} disabled={players.length<2||busy} onClick={()=>startGame(selectedGame)}>{players.length<2?"Bir oyuncu daha lazım":`${MICROGAME_REGISTRY[selectedGame].title} başlat`}</button>:<p className={styles.wait}>Host Test Mode'dan bir oyun seçecek.</p>}
      </aside>
    </section>}

    {(room.status==="playing"||room.status==="results")&&<section className={styles.gameShell}>
      {room.activeGameId==="bomb-pass"&&<BombPassGame room={room} uid={actorUid} now={now} onPass={sendBomb}/>}
      {room.activeGameId==="shrink-arena"&&<ShrinkArenaGame room={room} uid={actorUid} now={now} code={code} onOut={reportOut}/>}
      {room.round&&isSkillGameId(room.round.gameId)&&<SkillGame key={`${room.code}:${room.roundNumber}:${room.round.gameId}`} room={room} round={room.round as SkillRound} uid={actorUid} now={now} onSubmit={sendSkill}/>}
      {room.status==="results"&&<div className={styles.resultActions}>{isHost?<><button className={styles.primary} disabled={busy} onClick={restart}><RotateCcw size={17}/> {activeDefinition?.title??"Oyunu"} tekrar oyna</button><button className={styles.secondary} disabled={busy} onClick={lobby}>Lobiye dön</button></>:<p className={styles.wait}>Host tekrar başlatabilir.</p>}</div>}
    </section>}

    <GameSocial game="microgame" code={code} participant={{uid:actorUid,nickname:me.nickname,role:"player"}} mobileDockId="microgame-social-dock"/>
    {toast&&<button className={styles.toast} onClick={()=>setToast("")}>{toast}</button>}
  </main>;
}
