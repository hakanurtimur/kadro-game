"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Play, RotateCcw } from "lucide-react";
import {
  chooseTasirRps,
  playTasirColumn,
  startTasirRps,
  tasirCompletedColumns,
  tasirLegalColumns,
  tasirOwnedRange,
  tasirRevealCount,
  tasirTargetForColumn,
} from "@/lib/tasir/engine";
import { tasirSymbol } from "@/lib/tasir/symbols";
import { getTasirStore } from "@/lib/tasir/store";
import type { TasirBoardTile, TasirLastAction, TasirPlayer, TasirRoomState, TasirRpsChoice, TasirTile } from "@/lib/tasir/types";
import styles from "@/app/tasir/tasir.module.css";

const RPS:Array<{value:TasirRpsChoice;emoji:string;label:string}>=[
  {value:"rock",emoji:"✊",label:"Taş"},
  {value:"paper",emoji:"✋",label:"Kağıt"},
  {value:"scissors",emoji:"✌️",label:"Makas"},
];

function TileMark({tile,compact=false}:{tile:TasirTile;compact?:boolean}){
  return <span className={`${styles.tileMark} ${compact?styles.compactTileMark:""}`}>
    <b>{tasirSymbol(tile)}</b>
    <small>{tile==="joker"?"J":tile}</small>
  </span>;
}

export default function TasirClient({code}:{code:string}){
  const router=useRouter();
  const store=useMemo(()=>getTasirStore(),[]);
  const[room,setRoom]=useState<TasirRoomState|null>(null);
  const[uid,setUid]=useState<string|null>(null);
  const[loading,setLoading]=useState(true);
  const[actionBusy,setActionBusy]=useState(false);
  const[toast,setToast]=useState("");

  useEffect(()=>{
    let off:(()=>void)|undefined;let live=true;
    (async()=>{
      try{
        const id=await store.identity();if(!live)return;setUid(id);
        off=await store.subscribeRoom(code,(next)=>{setRoom(next);setLoading(false);});
      }catch{setLoading(false);}
    })();
    return()=>{live=false;off?.();};
  },[code,store]);

  async function run(work:()=>Promise<void>){
    if(actionBusy)return;
    setActionBusy(true);
    try{await work();}
    catch(e){setToast(e instanceof Error?e.message:"İşlem olmadı.");}
    finally{setActionBusy(false);}
  }

  if(loading)return <main className={styles.room}><div className={styles.centerCard}>TAŞIR masası kuruluyor…</div></main>;
  if(!room||!uid)return <main className={styles.room}><div className={styles.centerCard}>Oda bulunamadı.<button onClick={()=>router.push('/tasir')}>Geri dön</button></div></main>;
  const actorUid=uid;
  const me=room.players[actorUid];
  if(!me)return <main className={styles.room}><div className={styles.centerCard}>Bu sekme odada değil.<button onClick={()=>router.push('/tasir')}>Ana sayfa</button></div></main>;

  const players=Object.values(room.players).sort((a,b)=>a.seat-b.seat);
  const opponent=players.find((p)=>p.uid!==actorUid);
  const myTurn=room.turnUid===actorUid;
  const[min,max]=tasirOwnedRange(me.seat);
  const winner=room.winnerUid?room.players[room.winnerUid]:null;
  const legalColumns=tasirLegalColumns(room,actorUid);
  const nextTarget=room.heldTile==="joker"?null:room.heldTile;

  async function mutate(transition:(state:TasirRoomState)=>TasirRoomState){await store.mutate(code,transition);}

  return <main className={styles.room}>
    <header className={styles.topbar}>
      <button onClick={()=>router.push('/tasir')}><ArrowLeft size={15}/> Çık</button>
      <button onClick={()=>{navigator.clipboard?.writeText(code);setToast("Oda kodu kopyalandı.");}}><Copy size={14}/> {code}</button>
    </header>

    {room.status==='lobby'&&<section className={styles.lobby}><div className={styles.centerCard}>
      <span className={styles.chip}>TAŞIR · LOBİ</span><h1>Rakibini bekle</h1>
      <p>Her oyuncunun 5 hedef hattı var; her hatta aynı sembolden 4 taş toplamaya çalışacaksınız.</p>
      <div className={styles.seats}>{[0,1].map((seat)=>{const p=players.find((x)=>x.seat===seat);const range=tasirOwnedRange(seat);return <div key={seat} className={`${styles.seat} ${p?styles.filled:""}`}><b>{p?.nickname||"Boş koltuk"}</b><small>{range[0]}–{range[1]} hedef hatları</small></div>;})}</div>
      {actorUid===room.hostUid?<button className={styles.primary} disabled={players.length!==2||actionBusy} onClick={()=>run(()=>mutate((state)=>startTasirRps(state,actorUid)))}><Play size={17}/> Taş–Kağıt–Makas'a geç</button>:<p>Host oyunu başlatacak.</p>}
    </div></section>}

    {room.status==='rps'&&<section className={styles.rps}><div className={styles.centerCard}>
      <span className={styles.chip}>BAŞLANGIÇ · TUR {room.rps.round}</span><h1>Kim başlayacak?</h1>
      <p>Kazanan Joker ile kendi beş hattından istediğini ilk kez kaydırır.</p>
      <div className={styles.rpsChoices}>{RPS.map((item)=><button key={item.value} disabled={!!room.rps.choices[actorUid]||actionBusy} onClick={()=>run(()=>mutate((state)=>chooseTasirRps(state,actorUid,item.value)))}><span>{item.emoji}</span>{item.label}</button>)}</div>
      {room.rps.choices[actorUid]&&<b>Seçtin ✓ Rakip bekleniyor…</b>}
    </div></section>}

    {(room.status==='playing'||room.status==='finished')&&<section className={styles.game}>
      <div className={styles.statusStrip}>
        <div><small>SIRA</small><b>{room.status==='finished'?`${winner?.nickname} kazandı!`:myTurn?"SENDE":room.players[room.turnUid||""]?.nickname||"—"}</b></div>
        <div key={`held-${room.moveNumber}`} className={`${styles.held} ${room.heldTile==='joker'?styles.joker:""}`}><small>ELDEKİ TAŞ</small><TileMark tile={room.heldTile}/></div>
        <div><small>{nextTarget===null?"JOKER":"HEDEF HAT"}</small><b>{nextTarget===null?"Serbest seçim":`${tasirSymbol(nextTarget)} ${nextTarget}`}</b><small className={styles.rangeHint}>Sen: {min}–{max}</small></div>
      </div>

      <div className={styles.table}>
        <PlayerBoard label={opponent?.nickname||"Rakip"} player={opponent} active={false} moveNumber={room.moveNumber} action={room.lastAction?.playerUid===opponent?.uid?room.lastAction:null}/>
        <div className={styles.flow}>{room.lastAction?<ActionFlow action={room.lastAction} players={room.players}/>:<><span className={`${styles.overflow} ${styles.joker}`}><TileMark tile="joker"/></span><p>Joker ortada. Başlayan oyuncu kendi beş hedef hattından birini seçer.</p></>}</div>
        <PlayerBoard label={`${me.nickname} · Sen`} player={me} active={myTurn&&room.status==='playing'} legalColumns={legalColumns} moveNumber={room.moveNumber} action={room.lastAction?.playerUid===me.uid?room.lastAction:null} onColumn={(column)=>run(()=>mutate((state)=>playTasirColumn(state,actorUid,column)))} busy={actionBusy}/>
      </div>

      {room.status==='finished'&&<div className={styles.winOverlay}><div><span>✦</span><h2>{winner?.nickname} TAŞIR!</h2><p>Beş hedef hattını da kendi sembolüyle 4/4 tamamladı.</p><button onClick={()=>router.push('/tasir')}><RotateCcw size={16}/> Yeni oda</button></div></div>}
    </section>}
    {toast&&<button className={styles.toast} onClick={()=>setToast("")}>{toast}</button>}
  </main>;
}

function ActionFlow({action,players}:{action:NonNullable<TasirLastAction>;players:Record<string,TasirPlayer>}){
  const actor=players[action.playerUid];
  const target=actor?tasirTargetForColumn(actor.seat,action.column):action.column;
  return <><div className={styles.flowTrail}><span><TileMark tile={action.incoming} compact/></span><i>{tasirSymbol(target)} {target} hattı ↓</i><strong><TileMark tile={action.overflow} compact/></strong></div><p>{action.message}</p></>;
}

function PlayerBoard({label,player,active,legalColumns=[],onColumn,busy,moveNumber,action}:{label:string;player?:TasirPlayer;active:boolean;legalColumns?:number[];onColumn?:(column:number)=>void;busy?:boolean;moveNumber:number;action:TasirLastAction}){
  const board:TasirBoardTile[][]=player?.board||Array.from({length:4},()=>Array.from({length:5},()=>({value:0 as TasirTile,revealed:false})));
  const open=player?tasirRevealCount(player):0;
  const completedColumns=player?tasirCompletedColumns(player):0;
  const shiftedColumn=action?.column??-1;

  return <section className={`${styles.boardCard} ${active?styles.activeBoard:""}`}>
    <div className={styles.boardHeader}>
      <div><b>{label}</b><small>{open}/20 açık · {completedColumns}/5 hat tamam</small></div>
      <span>{active?(legalColumns.length===5?"JOKER · BİR HAT SEÇ":legalColumns.length===1?`${tasirTargetForColumn(player?.seat??0,legalColumns[0])} HATTI SIRADA`:"BEKLE"):"HER SÜTUN KENDİ SEMBOLÜNÜ TOPLAR"}</span>
    </div>

    <div className={styles.columnButtons}>{Array.from({length:5},(_,column)=>{
      const target=tasirTargetForColumn(player?.seat??0,column);
      const correct=board.reduce((sum,row)=>sum+(row[column]?.revealed&&row[column]?.value===target?1:0),0);
      const legal=active&&legalColumns.includes(column);
      const complete=correct===4;
      return <button key={column} aria-label={`${target} hattını kaydır`} className={`${legal?styles.legalColumn:""} ${complete?styles.completeColumn:""}`} disabled={!legal||busy} onClick={()=>onColumn?.(column)}>
        <span className={styles.targetBadge}><span>{tasirSymbol(target)}</span><b>{target}</b><small>{correct}/4</small></span><em>↓</em>
      </button>;
    })}</div>

    <div className={styles.boardGrid}>{board.flatMap((row,rowIndex)=>row.map((tile,columnIndex)=>{
      const shifted=columnIndex===shiftedColumn;
      const inserted=shifted&&rowIndex===0;
      const target=tasirTargetForColumn(player?.seat??0,columnIndex);
      const correct=tile.revealed&&tile.value===target;
      return <div key={`${rowIndex}-${columnIndex}-${shifted?moveNumber:0}`} className={`${styles.tileSlot} ${shifted?styles.shiftedSlot:""} ${inserted?styles.insertedSlot:""}`}>
        <div className={`${styles.tileInner} ${tile.revealed?styles.isRevealed:""}`}>
          <div className={styles.tileBack}><span>↕</span></div>
          <div className={`${styles.tileFront} ${correct?styles.correctTile:styles.wrongTile}`}><TileMark tile={tile.value}/></div>
        </div>
      </div>;
    }))}</div>
  </section>;
}
