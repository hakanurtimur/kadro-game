"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Crown, Dices, RotateCcw, Shield, Sparkles, Users, Volume2, VolumeX, Zap } from "lucide-react";
import LudoBoard from "./LudoBoard";
import LudoGuide from "./LudoGuide";
import GameSocial from "@/components/social/GameSocial";
import { chooseLudoDie, finishNoMove, legalPawnMoves, moveLudoPawn, previewLudoPawnMove, rollLudoDice, setLudoMode, startLudoGame } from "@/lib/ludo/engine";
import { getLudoStore } from "@/lib/ludo/store";
import { getLudoSoundEnabled, playLudoSfx, setLudoSoundEnabled, unlockLudoAudio } from "@/lib/ludo/sound";
import type { LudoMode, LudoRoomState } from "@/lib/ludo/types";

const DICE = ["⚀","⚁","⚂","⚃","⚄","⚅"];

export default function LudoClient({ code }: { code:string }) {
  const router=useRouter();
  const store=useMemo(()=>getLudoStore(),[]);
  const [uid,setUid]=useState<string|null>(null);
  const [room,setRoom]=useState<LudoRoomState|null>(null);
  const [toast,setToast]=useState("");
  const [rolling,setRolling]=useState(false);
  const [actionBusy,setActionBusy]=useState(false);
  const [selectedPawn,setSelectedPawn]=useState<number|null>(null);
  const [soundEnabled,setSoundEnabledState]=useState(true);

  useEffect(()=>{
    let active=true; let unsub:(()=>void)|undefined;
    (async()=>{
      try {
        const id=await store.identity(); if(!active)return; setUid(id);
        unsub=await store.subscribeRoom(code,(next)=>{ if(active){setRoom(next); if(!next)setToast("Oda bulunamadı.");} });
      } catch(error){setToast(error instanceof Error?error.message:"Odaya bağlanılamadı.");}
    })();
    return()=>{active=false;unsub?.();};
  },[code,store]);

  useEffect(()=>{ setSelectedPawn(null); },[room?.turnUid,room?.turnNumber,room?.phase,room?.selectedDie]);
  useEffect(()=>{
    setSoundEnabledState(getLudoSoundEnabled());
    const unlock=()=>{void unlockLudoAudio();};
    const resumeVisible=()=>{if(document.visibilityState==="visible")unlock();};
    window.addEventListener("pointerdown",unlock,{capture:true});
    window.addEventListener("touchstart",unlock,{capture:true,passive:true});
    window.addEventListener("pageshow",unlock);
    document.addEventListener("visibilitychange",resumeVisible);
    return()=>{
      window.removeEventListener("pointerdown",unlock,true);
      window.removeEventListener("touchstart",unlock,true);
      window.removeEventListener("pageshow",unlock);
      document.removeEventListener("visibilitychange",resumeVisible);
    };
  },[]);

  if(!room||!uid) return <main className="loading-screen"><div className="ludo-loading"><Dices size={56}/><span>{toast||"Tahta kuruluyor…"}</span></div></main>;
  const actorUid = uid;
  const currentRoom = room;
  const me=room.players[actorUid];
  if(!me) return <main className="loading-screen"><section className="empty-card kawaii-card"><h2>Bu sekme odada değil.</h2><button className="primary-button" onClick={()=>router.push('/ludo')}>Kızma Birader ana sayfası</button></section></main>;

  const players=Object.values(room.players).sort((a,b)=>a.seat-b.seat);
  const isHost=room.hostUid===uid;
  const turnPlayer=room.turnUid?room.players[room.turnUid]:null;
  const myTurn=room.turnUid===uid&&room.status==='playing';
  const legal=myTurn?legalPawnMoves(room,uid):[];
  const winner=room.winnerUid?room.players[room.winnerUid]:null;
  const previewProgress=selectedPawn===null?null:previewLudoPawnMove(currentRoom,actorUid,selectedPawn);

  async function mutate(fn:(state:LudoRoomState)=>LudoRoomState){
    try{return await store.mutate(code,fn);}catch(error){setToast(error instanceof Error?error.message:"İşlem yapılamadı.");throw error;}
  }
  async function runAction<T>(work:()=>Promise<T>){
    if(actionBusy)return undefined;
    setActionBusy(true);
    try{return await work();}finally{setActionBusy(false);}
  }
  function toggleSound(){
    const next=!soundEnabled;
    setLudoSoundEnabled(next);
    setSoundEnabledState(next);
    if(next){void unlockLudoAudio();playLudoSfx("confirm");}
  }
  function playMoveOutcome(next:LudoRoomState,steps:number){
    const delay=Math.min(8,Math.max(1,steps))*0.055+0.04;
    if(next.status==='finished'&&next.winnerUid===actorUid) playLudoSfx("win",{delay});
    else if(next.lastAction?.type==='capture') playLudoSfx("capture",{delay});
    else if(next.lastAction?.type==='home') playLudoSfx("home",{delay});
    if(next.lastAction?.type==='chaos') playLudoSfx("chaos",{delay:delay+0.08});
  }
  async function changeMode(mode:LudoMode){playLudoSfx("select");await runAction(async()=>{try{await mutate((state)=>setLudoMode(state,actorUid,mode));}catch{}});}
  async function start(){playLudoSfx("confirm");await runAction(async()=>{try{await mutate((state)=>startLudoGame(state,actorUid));}catch{}});}
  async function roll(){
    if(actionBusy||rolling||!myTurn||!room||room.phase!=='awaiting-roll')return;
    void unlockLudoAudio();
    playLudoSfx("roll");
    setActionBusy(true); setRolling(true); setToast("Zar dönüyor…");
    await new Promise((resolve)=>setTimeout(resolve,520));
    try {
      const next=await mutate((state)=>rollLudoDice(state,actorUid));
      const moves=next.phase==='awaiting-move'?legalPawnMoves(next,actorUid):[];
      if(next.phase==='awaiting-move'&&!moves.length){playLudoSfx("invalid",{delay:.08});setToast("Oynayacak taş yok. Turu geçebilirsin.");}
      else setToast("");
    } catch{} finally{setRolling(false);setActionBusy(false);}
  }
  async function chooseDie(value:number){playLudoSfx("select");await runAction(async()=>{try{await mutate((state)=>chooseLudoDie(state,actorUid,value));}catch{}});}
  function selectPawn(index:number){
    if(actionBusy||previewLudoPawnMove(currentRoom,actorUid,index)===null)return;
    playLudoSfx("select");
    setSelectedPawn(index);
    setToast("Parlayan hedef kareye dokunup hamleyi onayla.");
  }
  async function confirmMove(){
    if(selectedPawn===null)return;
    const index=selectedPawn;
    const pawn=currentRoom.players[actorUid]?.pawns[index];
    const steps=previewProgress===null||!pawn?1:pawn.progress<0?1:Math.max(1,previewProgress-pawn.progress);
    setSelectedPawn(null);
    playLudoSfx("confirm");
    await runAction(async()=>{try{const next=await mutate((state)=>moveLudoPawn(state,actorUid,index));playLudoSfx("move",{steps});playMoveOutcome(next,steps);setToast("");}catch{}});
  }
  async function pass(){void unlockLudoAudio();playLudoSfx("invalid");await runAction(async()=>{try{const next=await mutate((state)=>finishNoMove(state,actorUid));if(next.lastAction?.type==='chaos')playLudoSfx("chaos");setToast("");}catch{}});}

  return <main className={`ludo-room-shell ludo-theme-${room.mode}`} aria-busy={actionBusy||rolling}>
    <div className="soft-grid"/>
    <header className="ludo-topbar">
      <button className="ludo-back" onClick={()=>router.push('/ludo')}><ArrowLeft size={16}/> Kızma Birader</button>
      <button className="room-code" onClick={()=>navigator.clipboard.writeText(code)}>{code}<Copy size={14}/></button>
      <div className="ludo-topbar-actions">
        <button className="ludo-sound-toggle" type="button" aria-pressed={soundEnabled} aria-label={soundEnabled?'Oyun seslerini kapat':'Oyun seslerini aç'} title={soundEnabled?'Sesleri kapat':'Sesleri aç'} onClick={toggleSound}>{soundEnabled?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{soundEnabled?'Ses açık':'Sessiz'}</span></button>
        <LudoGuide/>
      </div>
    </header>

    {room.status==='lobby' && <section className="ludo-lobby-wrap">
      <div className="ludo-lobby-card kawaii-card">
        <div className="ludo-social-heading-row"><div className="section-kicker"><Users size={16}/> OYUNCULAR TOPLANIYOR</div><div id="ludo-social-dock" className="ludo-social-dock"/></div>
        <h1>Klasik masa hazır.</h1>
        <p>Host da oyuncu. 2–4 kişi tamamlanınca oyunu başlat.</p>
        <div className="ludo-player-list">
          {players.map((player)=><article key={player.uid} className={`ludo-player-card ${player.color}`}><span className="ludo-mini-pawn"/><div><strong>{player.nickname}</strong><small>{player.uid===room.hostUid?'host · oyuncu':`${player.seat+1}. koltuk`}</small></div>{player.uid===room.hostUid&&<Crown size={17}/>}</article>)}
          {Array.from({length:4-players.length}).map((_,i)=><div className="ludo-empty-seat" key={i}>+</div>)}
        </div>
        <div className="ludo-mode-picker">
          <button disabled={!isHost||actionBusy} className={room.mode==='classic'?'active':''} onClick={()=>changeMode('classic')}><Dices size={17}/> Klasik</button>
          <button disabled={!isHost||actionBusy} className={room.mode==='chaos'?'active':''} onClick={()=>changeMode('chaos')}><Zap size={17}/> Kaos</button>
        </div>
        {room.mode==='chaos'&&<p className="chaos-lobby-copy">Her 4 tamamlanmış turda global veya kişisel bir Kaos kartı açılır.</p>}
        {isHost?<button className="primary-button" disabled={players.length<2||actionBusy} onClick={start}>{players.length<2?'Bir oyuncu daha lazım':'Oyunu başlat'}</button>:<p className="waiting-copy">Host oyunu başlatınca tahta açılacak.</p>}
      </div>
    </section>}

    {room.status!=='lobby' && <section className="ludo-game-layout">
      <aside className="ludo-sidebar ludo-sidebar-left">
        <div className="ludo-turn-card kawaii-card">
          <small>SIRA</small>
          <strong>{turnPlayer?.nickname||'Oyun bitti'}</strong>
          {turnPlayer&&<span className={`turn-color-dot ${turnPlayer.color}`}/>}
          <p>Tur {room.turnNumber+1}</p>
        </div>
        <div className="ludo-score-stack">
          {players.map((player)=><div className={`ludo-score-row ${player.uid===room.turnUid?'turn':''}`} key={player.uid}><span className={`turn-color-dot ${player.color}`}/><div><strong>{player.nickname}</strong><small>{player.pawns.filter((p)=>p.progress===57).length}/4 evde</small></div></div>)}
        </div>
        {room.chaos.current&&<div className={`ludo-chaos-card ${room.chaos.current.scope}`}><span>{room.chaos.current.scope==='global'?'🌍':'⚡'}</span><small>{room.chaos.current.scope==='global'?'GLOBAL':'AKTİF OYUNCU'}</small><h3>{room.chaos.current.title}</h3><p>{room.chaos.current.description}</p></div>}
      </aside>

      <div className="ludo-board-stage">
        <LudoBoard room={room} uid={uid} legalMoves={legal} selectedPawnIndex={selectedPawn} previewProgress={previewProgress} onPawnClick={selectPawn} onConfirmMove={confirmMove}/>
        {room.lastAction&&<div className={`ludo-action-toast action-${room.lastAction.type}`}>{room.lastAction.message}</div>}
      </div>

      <aside className="ludo-sidebar ludo-sidebar-right">
        <div className="dice-console kawaii-card">
          <div className="dice-console-head"><small>{myTurn?'SIRA SENDE':'ZAR'}</small><div id="ludo-social-dock" className="ludo-social-dock"/></div>
          <div className={`big-die ${rolling?'rolling':''}`}>{room.dice.length?room.dice.map((die,index)=><span key={`${die}-${index}`}>{DICE[die-1]}</span>):<span>⚄</span>}</div>
          {myTurn&&room.phase==='awaiting-roll'&&<button className="ludo-roll-button" disabled={rolling||actionBusy} onClick={roll}><Dices size={20}/>{rolling?'Dönüyor…':'Zarı at'}</button>}
          {myTurn&&room.phase==='choose-die'&&<div className="choose-dice"><p>Hangisini kullanacaksın?</p>{room.dice.map((die,index)=><button key={`${die}-${index}`} disabled={actionBusy} onClick={()=>chooseDie(die)}>{DICE[die-1]} <b>{die}</b></button>)}</div>}
          {myTurn&&room.phase==='awaiting-move'&&legal.length>0&&<p className="move-hint">{selectedPawn===null?"✨ Parlayan taşlardan birini seç.":"Parlayan hedef kareye dokunup onayla."}</p>}
          {myTurn&&room.phase==='awaiting-move'&&!legal.length&&<button className="secondary-button" disabled={actionBusy} onClick={pass}><RotateCcw size={16}/> Hamle yok · turu geç</button>}
          {!myTurn&&room.status==='playing'&&<p className="waiting-copy">{turnPlayer?.nickname} zar atıyor…</p>}
        </div>
        {room.chaos.peaceUntilTurn>=room.turnNumber&&<div className="peace-chip"><Shield size={16}/> Barış Turu · yeme kapalı</div>}
        {room.mode==='chaos'&&<div className="chaos-history-mini"><small>KAOS GEÇMİŞİ</small>{room.chaos.history.slice(-3).reverse().map((event)=><span key={event.id}>⚡ {event.title}</span>)}</div>}
      </aside>
    </section>}

    {room.status==='finished'&&winner&&<div className="ludo-winner-overlay"><div className={`winner-pawn ${winner.color}`}><span/></div><Sparkles size={28}/><small>KAZANAN</small><h2>{winner.nickname}</h2><p>Dört taş da eve geldi. Masa dağıldı, gurur kaldı.</p><button className="primary-button" onClick={()=>router.push('/ludo')}>Yeni oyun</button></div>}
    <GameSocial game="ludo" code={code} participant={{uid:actorUid,nickname:me.nickname,role:"player"}} mobileDockId="ludo-social-dock"/>
    {toast&&<div className="toast">{toast}</div>}
  </main>;
}
