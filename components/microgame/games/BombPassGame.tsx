"use client";

import { Bomb, CircleAlert, Hand, Sparkles, TimerReset } from "lucide-react";
import type { CSSProperties } from "react";
import type { BombPassRound, MicrogameRoomState } from "@/lib/microgame/types";
import styles from "@/app/microgame/microgame.module.css";

export default function BombPassGame({room,uid,now,onPass}:{room:MicrogameRoomState;uid:string;now:number;onPass:(targetUid:string)=>void}){
  const round=room.round?.gameId==="bomb-pass"?room.round:null;
  if(!round)return null;
  const players=Object.values(room.players).sort((a,b)=>a.seat-b.seat);
  const holder=room.players[round.holderUid];
  const loser=round.loserUid?room.players[round.loserUid]:null;

  if(room.status==="results")return <section className={styles.bombStage}>
    <div className={`${styles.bombOrb} ${styles.exploded}`}><Bomb size={68}/><span>💥</span></div>
    <small className={styles.kicker}>ROUND {room.roundNumber}</small>
    <h2>Patladı!</h2>
    <p><strong>{loser?.nickname??"Bir oyuncu"}</strong> bombayla yakalandı. Diğer herkes <b>+100</b> aldı.</p>
    <ScoreBoard room={room}/>
  </section>;

  if(now<round.instructionsUntil)return <BombInstructions/>;

  const beforeStart=Math.max(0,round.startsAt-now);
  const countdown=Math.max(1,Math.ceil(beforeStart/1000));
  if(beforeStart>0)return <section className={styles.bombStage}>
    <small className={styles.kicker}>BOMBA KİMDE?</small>
    <div className={styles.countdown}>{countdown}</div>
    <h2>Hazır ol.</h2>
    <p>Geri sayım bitince bomba rastgele bir oyuncuya düşecek.</p>
    <div className={styles.miniRuleRow}><span><Hand size={15}/> Dokun → pasla</span><span><TimerReset size={15}/> Patlama anı gizli</span></div>
  </section>;

  const total=Math.max(1,round.endsAt-round.startsAt);
  const remaining=Math.max(0,round.endsAt-now);
  const elapsedRatio=Math.max(0,Math.min(1,1-(remaining/total)));
  const bombStyle={"--heat":elapsedRatio} as CSSProperties;
  const danger=elapsedRatio>.58;
  const urgent=elapsedRatio>.82;
  const fuseCopy=urgent?"Çok sıcak!":danger?"Fitil hızlanıyor…":"Fitil yanıyor…";

  return <section className={`${styles.bombStage} ${urgent?styles.bombUrgentStage:""}`}>
    <small className={styles.kicker}>BOMBA KİMDE?</small>
    <div className={`${styles.fuseStatus} ${danger?styles.fuseDanger:""} ${urgent?styles.fuseUrgent:""}`}>
      <span/><b>{fuseCopy}</b><small>Tam patlama anı gizli</small>
    </div>
    <div className={`${styles.bombOrb} ${danger?styles.danger:""} ${urgent?styles.urgent:""}`} style={bombStyle}>
      <Bomb size={68}/><i className={styles.fuse}/><i className={styles.sparkOne}/><i className={styles.sparkTwo}/>
    </div>

    {round.holderUid===uid?<>
      <h2>Bomba sende!</h2>
      <p>Bir oyuncuya dokun. Pas verdikten sonra bomba onun ekranına geçer.</p>
      <div className={styles.targetGrid}>
        {players.filter(player=>player.uid!==uid).map(player=><button key={player.uid} onClick={()=>onPass(player.uid)}>
          <span>{player.nickname.slice(0,1).toLocaleUpperCase("tr-TR")}</span><strong>{player.nickname}</strong><small>Bombayı yolla</small>
        </button>)}
      </div>
    </>:<>
      <h2>Bomba {holder?.nickname??"bir oyuncu"}'da.</h2>
      <p>Şimdilik güvendesin. Ama bombayı sana paslayabilir.</p>
      <div className={styles.waitingHolder}><span>{holder?.nickname.slice(0,1).toLocaleUpperCase("tr-TR")}</span><div><small>ŞU AN BOMBA</small><b>{holder?.nickname}</b></div><Sparkles size={18}/></div>
    </>}
    <ScoreBoard room={room}/>
  </section>;
}

function BombInstructions(){
  return <section className={`${styles.bombStage} ${styles.instructionStage}`}>
    <small className={styles.kicker}>OYUN 01 · BOMBA KİMDE?</small>
    <div className={styles.instructionBomb}><Bomb size={54}/><span>?</span></div>
    <h2>Bombayı elinde tutma.</h2>
    <p>3 saniyelik geri sayımdan sonra bomba oyunculardan birine düşer. Bomba sendeyken başka bir oyuncuya dokunup pasla.</p>
    <div className={styles.instructionRules}>
      <div><Hand size={19}/><span><b>Bir oyuncuya dokun</b><small>Bombayı ona pasla.</small></span></div>
      <div><TimerReset size={19}/><span><b>Fitil 7–10.5 sn</b><small>Tam patlama anını göremezsin.</small></span></div>
      <div><CircleAlert size={19}/><span><b>Patladığında kimdeyse</b><small>O round'u kaybeder.</small></span></div>
    </div>
  </section>;
}

function ScoreBoard({room}:{room:MicrogameRoomState}){
  const players=Object.values(room.players).sort((a,b)=>b.score-a.score||a.seat-b.seat);
  return <div className={styles.scoreBoard}>
    {players.map((player,index)=><div key={player.uid}><span>{index+1}</span><strong>{player.nickname}</strong><b>{player.score}</b></div>)}
  </div>;
}
