"use client";
import { Crown, ArrowRight, RotateCcw, Home, Trophy } from "lucide-react";
import { microgameStandings, INTERMISSION_MS, MATCH_ROUNDS } from "@/lib/microgame/match-engine";
import { MICROGAME_REGISTRY } from "@/lib/microgame/registry";
import type { MicrogameRoomState } from "@/lib/microgame/types";
import css from "./match.module.css";

export function MatchProgress({ room }: { room: MicrogameRoomState }) {
  const match = room.match;
  if (!match) return null;
  return <div className={css.progressHeader}>
    <div><small>MICROGAME ROYALE</small><strong>Tur {match.index + 1}<span> / {MATCH_ROUNDS}</span></strong></div>
    <div className={css.progressDots} aria-label={`8 turun ${match.index + 1}. turu`}>{match.order.map((id, i) => <span key={id} title={MICROGAME_REGISTRY[id].title} className={i < match.index ? css.done : i === match.index ? css.current : ""}/>)}</div>
  </div>;
}

export default function MatchSummary({ room, uid, now, busy, onRematch, onLobby }: {
  room: MicrogameRoomState; uid: string; now: number; busy: boolean; onRematch: () => void; onLobby: () => void;
}) {
  const match = room.match;
  if (!match) return null;
  const final = match.status === "finished";
  const standings = microgameStandings(room);
  const winners = standings.filter(player => player.rank === 1);
  const recap = match.history[String(match.index)];
  const gains = recap?.gains ?? {};
  const currentGame = MICROGAME_REGISTRY[match.order[match.index]];
  const nextGame = match.order[match.index + 1] ? MICROGAME_REGISTRY[match.order[match.index + 1]] : null;
  const remaining = Math.max(0, match.nextAt - now);
  const myGain = gains[uid] ?? 0;
  return <section className={`${css.summary} ${final ? css.final : ""}`} aria-label={final ? "Maç sonucu" : "Tur puan tablosu"}>
    <span className={css.summaryIcon} aria-hidden="true">{final ? <Crown size={46}/> : <Trophy size={34}/>}</span>
    <span className={css.eyebrow}>{final ? "MAÇ TAMAMLANDI" : `TUR ${match.index + 1} TAMAMLANDI`}</span>
    <h1>{final ? winners.length > 1 ? "Şampiyonluk paylaşıldı!" : "Masanın şampiyonu!" : `${myGain > 0 ? `+${myGain} puan!` : "Sıradaki tur senin olsun."}`}</h1>
    <p className={css.summaryLead}>{final ? <strong>{winners.map(player => player.nickname).join(" & ")}</strong> : currentGame.title}</p>
    <ol className={css.standings} aria-label="Toplam puan sıralaması">
      {standings.map(player => <li key={player.uid} className={player.uid === uid ? css.you : ""}>
        <b className={css.rank}>{player.rank}</b>
        <span className={`${css.avatar} ${css[`seat${player.seat}`]}`}>{player.nickname.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
        <div className={css.playerName}><strong title={player.nickname}>{player.nickname}{player.uid === uid && <em>sen</em>}</strong><small>{final ? player.rank === 1 ? "Şampiyon" : `${MATCH_ROUNDS} tur tamamlandı` : `Bu tur +${gains[player.uid] ?? 0}`}</small></div>
        <strong className={css.total}>{player.score}<small>puan</small></strong>
      </li>)}
    </ol>
    {!final && nextGame && <div className={css.nextRound}>
      <div><small>SIRADAKİ OYUN</small><strong>{nextGame.title}</strong></div>
      <b aria-live="polite" aria-atomic="true">{remaining > 0 ? Math.ceil(remaining / 1000) : "…"}</b>
      <span className={css.nextTrack} aria-hidden="true"><i style={{ width: `${Math.min(100, remaining / INTERMISSION_MS * 100)}%` }}/></span>
      {remaining === 0 && <small role="status">Sıradaki tur hazırlanıyor. Bağlantı bekleniyorsa bu ekran açık kalsın.</small>}
    </div>}
    {final && <><p className={css.tieNote}>{winners.length > 1 ? "Eşit toplam puan, ortak şampiyonluk. Bir rövanş yakışır!" : "Herkes masada, yeni maçın sırası bambaşka."}</p>
      {uid === room.hostUid ? <div className={css.finalActions}><button type="button" className={css.primary} disabled={busy} onClick={onRematch}><RotateCcw size={17}/> Rövanş<ArrowRight size={17}/></button><button type="button" className={css.secondary} disabled={busy} onClick={onLobby}><Home size={17}/> Lobiye dön</button></div> : <p className={css.wait}>Oda sahibi rövanş başlatabilir veya lobiye dönebilir.</p>}
    </>}
  </section>;
}
