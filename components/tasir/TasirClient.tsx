"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Play, RotateCcw } from "lucide-react";
import { chooseTasirRps, playTasirColumn, startTasirRps, tasirOwnedRange } from "@/lib/tasir/engine";
import { getTasirStore } from "@/lib/tasir/store";
import type { TasirRoomState, TasirRpsChoice, TasirTile } from "@/lib/tasir/types";
import styles from "@/app/tasir/tasir.module.css";

const RPS:Array<{value:TasirRpsChoice;emoji:string;label:string}>=[{value:"rock",emoji:"✊",label:"Taş"},{value:"paper",emoji:"✋",label:"Kağıt"},{value:"scissors",emoji:"✌️",label:"Makas"}];
function tileLabel(tile:TasirTile){return tile==="joker"?"★":String(tile);}

export default function TasirClient({code}:{code:string}){
  const router=useRouter();const store=useMemo(()=>getTasirStore(),[]);const[room,setRoom]=useState<TasirRoomState|null>(null);const[uid,setUid]=useState<string|null>(null);const[loading,setLoading]=useState(true);const[actionBusy,setActionBusy]=useState(false);const[toast,setToast]=useState("");
  useEffect(()=>{let off:(()=>void)|undefined;let live=true;(async()=>{try{const id=await store.identity();if(!live)return;setUid(id);off=await store.subscribeRoom(code,(next)=>{setRoom(next);setLoading(false);});}catch{setLoading(false);}})();return()=>{live=false;off?.();};},[code,store]);
  async function run(work:()=>Promise<void>){if(actionBusy)return;setActionBusy(true);try{await work();}catch(e){setToast(e instanceof Error?e.message:"İşlem olmadı.");}finally{setActionBusy(false);}}
  if(loading)return <main className={styles.room}><div className={styles.centerCard}>TAŞIR masası kuruluyor…</div></main>;
  if(!room||!uid)return <main className={styles.room}><div className={styles.centerCard}>Oda bulunamadı.<button onClick={()=>router.push('/tasir')}>Geri dön</button></div></main>;
  const actorUid=uid;const me=room.players[actorUid];if(!me)return <main className={styles.room}><div className={styles.centerCard}>Bu sekme odada değil.<button onClick={()=>router.push('/tasir')}>Ana sayfa</button></div></main>;
  const players=Object.values(room.players).sort((a,b)=>a.seat-b.seat);const opponent=players.find((p)=>p.uid!==actorUid);const myTurn=room.turnUid===actorUid;const[min,max]=tasirOwnedRange(me.seat);const winner=room.winnerUid?room.players[room.winnerUid]:null;
  async function mutate(transition:(state:TasirRoomState)=>TasirRoomState){await store.mutate(code,transition);}
  return <main className={styles.room}><header className={styles.topbar}><button onClick={()=>router.push('/tasir')}><ArrowLeft size={15}/> Çık</button><button onClick={()=>{navigator.clipboard?.writeText(code);setToast("Oda kodu kopyalandı.");}}><Copy size={14}/> {code}</button></header>
    {room.status==='lobby'&&<section className={styles.lobby}><div className={styles.centerCard}><span className={styles.chip}>TAŞIR · LOBİ</span><h1>Rakibini bekle</h1><div className={styles.seats}>{[0,1].map((seat)=>{const p=players.find((x)=>x.seat===seat);const range=tasirOwnedRange(seat);return <div key={seat} className={`${styles.seat} ${p?styles.filled:""}`}><b>{p?.nickname||"Boş koltuk"}</b><small>{range[0]}–{range[1]} sayı grubu</small></div>;})}</div>{actorUid===room.hostUid?<button className={styles.primary} disabled={players.length!==2||actionBusy} onClick={()=>run(()=>mutate((state)=>startTasirRps(state,actorUid)))}><Play size={17}/> Taş–Kağıt–Makas'a geç</button>:<p>Host oyunu başlatacak.</p>}</div></section>}
    {room.status==='rps'&&<section className={styles.rps}><div className={styles.centerCard}><span className={styles.chip}>BAŞLANGIÇ · TUR {room.rps.round}</span><h1>Kim başlayacak?</h1><p>Seçimin rakibin seçene kadar gizli kalır.</p><div className={styles.rpsChoices}>{RPS.map((item)=><button key={item.value} disabled={!!room.rps.choices[actorUid]||actionBusy} onClick={()=>run(()=>mutate((state)=>chooseTasirRps(state,actorUid,item.value)))}><span>{item.emoji}</span>{item.label}</button>)}</div>{room.rps.choices[actorUid]&&<b>Seçtin ✓ Rakip bekleniyor…</b>}</div></section>}
    {(room.status==='playing'||room.status==='finished')&&<section className={styles.game}><div className={styles.statusStrip}><div><small>SIRA</small><b>{room.status==='finished'?`${winner?.nickname} kazandı!`:myTurn?"SENDE":room.players[room.turnUid||""]?.nickname||"—"}</b></div><div className={`${styles.held} ${room.heldTile==='joker'?styles.joker:""}`}><small>ELDEKİ TAŞ</small><strong>{tileLabel(room.heldTile)}</strong></div><div><small>SENİN SAYILARIN</small><b>{min} · {min+1} · {min+2} · {min+3} · {max}</b></div></div>
      <div className={styles.table}><PlayerBoard label={opponent?.nickname||"Rakip"} player={opponent} active={false} reveal={room.status==='finished'}/><div className={styles.flow}>{room.lastAction?<><span className={styles.overflow}>{tileLabel(room.lastAction.overflow)}</span><p>{room.lastAction.message}</p></>:<><span className={`${styles.overflow} ${styles.joker}`}>★</span><p>Joker ortada. Başlayan oyuncu bir sütun seçer.</p></>}</div><PlayerBoard label={`${me.nickname} · Sen`} player={me} active={myTurn&&room.status==='playing'} reveal={room.status==='finished'} onColumn={(column)=>run(()=>mutate((state)=>playTasirColumn(state,actorUid,column)))} busy={actionBusy}/></div>
      {room.status==='finished'&&<div className={styles.winOverlay}><div><span>✦</span><h2>{winner?.nickname} TAŞIR!</h2><p>20 taş kendi sayı grubunda toplandı.</p><button onClick={()=>router.push('/tasir')}><RotateCcw size={16}/> Yeni oda</button></div></div>}</section>}
    {toast&&<button className={styles.toast} onClick={()=>setToast("")}>{toast}</button>}
  </main>;
}

function PlayerBoard({label,player,active,reveal,onColumn,busy}:{label:string;player:any;active:boolean;reveal:boolean;onColumn?:(column:number)=>void;busy?:boolean}){
  const board:TasirTile[][]=player?.board||Array.from({length:4},()=>Array.from({length:5},()=>0));
  return <section className={`${styles.boardCard} ${active?styles.activeBoard:""}`}><div className={styles.boardHeader}><b>{label}</b><span>{active?"SÜTUN SEÇ":"KAPALI TAŞLAR"}</span></div><div className={styles.columnButtons}>{Array.from({length:5},(_,column)=><button key={column} aria-label={`${column+1}. sütunu kaydır`} disabled={!active||busy} onClick={()=>onColumn?.(column)}>↓</button>)}</div><div className={styles.boardGrid}>{board.flatMap((row,rowIndex)=>row.map((tile,columnIndex)=><div key={`${rowIndex}-${columnIndex}`} className={`${styles.tile} ${reveal?styles.revealed:""}`}>{reveal?tileLabel(tile):""}</div>))}</div></section>;
}
