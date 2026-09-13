import { seriesFinished, seriesStandings } from "@/lib/series";
import type { RoomState } from "@/lib/types";

export function SeriesPicker({value,disabled,onChange}:{value:1|3;disabled:boolean;onChange:(rounds:1|3)=>void}) {
 return <div className="series-picker"><span className="tiny-label">MASA FORMATI</span><div role="group" aria-label="Tur sayısı">{([1,3] as const).map(n=><button type="button" aria-pressed={value===n} disabled={disabled} key={n} onClick={()=>onChange(n)}><b>{n===1?'Tek tur':'3 turluk seri'}</b><small>{n===1?'Hızlı kapışma':'Rövanşın rövanşı'}</small></button>)}</div></div>;
}
export default function SeriesBoard({room}:{room:RoomState}) {
 if(!room.series || room.series.totalRounds===1)return null;
 // Do not spoil this round's outcome while the presenter is still revealing it.
 const visible={...room,series:{...room.series,completed:{...room.series.completed}}};
 if(room.status==='results' && (room.presentationStep??0)<4) delete visible.series.completed[`r${room.series.currentRound}`];
 const standings=seriesStandings(visible);const finished=seriesFinished(room)&&(room.presentationStep??0)===4;
 const best=standings[0]?.points??0;const names=standings.filter(p=>p.points===best).map(p=>p.nickname);
 return <section className="series-board kawaii-card"><div><span className="tiny-label">{finished?'SERİ TAMAMLANDI':'TURNUVA TABLOSU'}</span><h3>{finished?`${names.join(' & ')} ${names.length>1?'ortak şampiyon!':'şampiyon!'}`:`Tur ${room.series.currentRound} / ${room.series.totalRounds}`}</h3></div><div className="standings">{standings.map(p=><div key={p.uid} className={finished&&p.points===best?'series-champion':''}><span>{p.nickname}</span><b>{p.points}<small> puan</small></b></div>)}</div><p>Her tur para ve kadro sıfırlanır. Yalnız sıra puanları taşınır; eşitler aynı puanı alır.</p></section>;
}
