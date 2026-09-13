import { JURY_CRITERIA } from "@/lib/judging";
import { auctionAwards } from "@/lib/presentation";
import { seriesFinished } from "@/lib/series";
import type { RoomState } from "@/lib/types";
import PolyAvatar from "./PolyAvatar";
import { TableView } from "./CharacterCard";
import { ChaosHistory } from "./ChaosMode";
import SeriesBoard from "./SeriesBoard";

type Props={room:RoomState;isModerator:boolean;busy:boolean;now:number;onJudge:()=>void;onAdvance:(step:number)=>void;onNext:()=>void;onRematch:()=>void};
const steps=['Kadrolar sahnede','Göreve uygunluk','Ekip uyumu','Çok yönlülük','Ve kazanan…'];
export default function ResultShow({room,isModerator,busy,now,onJudge,onAdvance,onNext,onRematch}:Props) {
 const step=room.presentationStep??0;const final=!!room.judge&&step===4;
 const players=Object.values(room.players).filter(p=>p.uid!==room.moderator?.uid).sort((a,b)=>a.seat-b.seat);
 const pending=busy||Boolean(room.judgeRequest&&room.judgeRequest.expiresAt>now);
 const awards=final?auctionAwards(room):[];
 return <section className="results-screen game-section result-show" aria-label="Tur finali">
  <header className="results-heading"><div className="section-kicker">✦ TUR {room.series?.currentRound??1} FİNALİ</div><h2>{room.judge?steps[step]:'Kadrolar masada.'}</h2><p><b>{room.scenario}</b></p></header>
  <ol className="show-steps" aria-label="Final sahneleri">{steps.map((s,i)=><li key={s} className={room.judge&&i<=step?'revealed':''} aria-current={i===step?'step':undefined}><span>{i+1}</span>{s}</li>)}</ol>
  <TableView room={room}/>
  <div className="result-grid">{players.map(p=>{
   const r=room.judge?.rankings.find(r=>r.playerUid===p.uid);const win=final&&(room.judge?.winnerUids??[room.judge?.winnerUid]).includes(p.uid);
   const star=p.team.find(c=>c.characterId===r?.starCharacterId);
   return <article className={`result-card kawaii-card ${win?'winner':''}`} key={p.uid}>
    {win&&<div className="winner-crown">✦ {(room.judge?.winnerUids?.length??1)>1?'ORTAK KAZANAN':'KAZANAN'}</div>}
    <div className="result-player"><PolyAvatar seed={p.uid} size={60}/><div><small>YARIŞMACI</small><h3>{p.nickname}</h3></div>{final&&r&&<div className="score-bubble">{r.score.toLocaleString('tr-TR')}</div>}</div>
    <div className="criteria-results">{JURY_CRITERIA.map((c,i)=>{
     const open=!!r&&step>i;const score=r?.criteria?.[c.key]??0;
     return <div className={`criterion ${open?'open':''}`} key={c.key}><div><span>{c.label} <small>%{c.weight}</small></span><b>{open?score:'—'}</b></div><div className="criterion-track"><span style={{width:open?`${score}%`:'0%'}}/></div></div>;
    })}</div>
    {!r&&<p className="judge-comment muted">{pending?'Jüri değerlendiriyor…':'Moderatör jüriyi çağıracak.'}</p>}
    {final&&r&&<div className="judge-detail"><p>“{r.comment}”</p><p><b>Güçlü yanı:</b> {r.strength}</p><p><b>Riski:</b> {r.weakness}</p>{star&&<div className="jury-star"><b>✦ Jürinin yıldızı: {star.name}</b><small>{r.starReason}</small></div>}</div>}
   </article>;
  })}</div>
  {final&&<><div className="judge-summary"><span>{room.judge?.summary}</span></div><div className="award-grid">{awards.map(a=><article className="kawaii-card" key={a.title}><span>✦</span><h3>{a.title}</h3><p>{a.detail}</p></article>)}</div><p className="rubric-note">{room.judge?.source==='groq'?'AI jüri yorumu':'Demo sonucu'} · Yorumlar tartışmaya açıktır. Sonuç bir kez kaydedildi; yeniden gösterim AI çağırmaz.</p></>}
  <ChaosHistory events={room.chaos?.history??[]}/><SeriesBoard room={room}/>
  <div className="results-actions moderator-result-actions">
   {isModerator&&!room.judge&&<button className="primary-button jumbo" disabled={pending} onClick={onJudge}>{pending?'AI jüri değerlendiriyor…':'✦ AI jüriyi çağır'}</button>}
   {!isModerator&&!room.judge&&<div className="waiting-pill">{pending?'Jüri sonuçları hazırlanıyor…':'Moderatör AI jüriyi çağıracak.'}</div>}
   {isModerator&&room.judge&&!final&&<><button className="primary-button jumbo" disabled={busy} onClick={()=>onAdvance(step+1)}>{steps[step+1]} →</button><button className="secondary-button" disabled={busy} onClick={()=>onAdvance(4)}>Hepsini göster</button></>}
   {!isModerator&&room.judge&&!final&&<div className="waiting-pill">Moderatör bir sonraki sahneyi açacak.</div>}
   {isModerator&&final&&<button className="primary-button jumbo" disabled={busy} onClick={seriesFinished(room)?onRematch:onNext}>{seriesFinished(room)?'↻ Aynı masada yeni seri':`→ ${((room.series?.currentRound)??1)+1}. tura geç`}</button>}
  </div>
 </section>;
}
