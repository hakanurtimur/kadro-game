"use client";
import { Crown, Shuffle, Users, ArrowRight, Sparkles } from "lucide-react";
import { MICROGAMES } from "@/lib/microgame/registry";
import { MATCH_ROUNDS } from "@/lib/microgame/match-state";
import type { MicrogameRoomState } from "@/lib/microgame/types";
import css from "./match.module.css";

const MARKS = ["💣", "◉", "✋", "↔", "✦", "⚑", "◐", "◎", "♛"];
export default function MatchLobby({ room, uid, busy, onStart }: {
  room: MicrogameRoomState; uid: string; busy: boolean; onStart: () => void;
}) {
  const players = Object.values(room.players).sort((a, b) => a.seat - b.seat);
  const host = uid === room.hostUid;
  return <section className={css.lobby}>
    <div className={css.lobbyMain}>
      <span className={css.eyebrow}><Users size={16}/> {players.length}/6 oyuncu masada</span>
      <h1>Herkes burada mı?</h1>
      <p>{MATCH_ROUNDS} kısa tur, her maç farklı sıra. Puanları topla; son turda masanın şampiyonu belli olsun.</p>
      <div className={css.players}>
        {players.map(player => <article key={player.uid} className={player.uid === uid ? css.you : ""}>
          <span className={`${css.avatar} ${css[`seat${player.seat}`]}`}>{player.nickname.slice(0, 1).toLocaleUpperCase("tr-TR")}</span>
          <div><strong title={player.nickname}>{player.nickname}</strong><small>{player.uid === room.hostUid ? "Oda sahibi · oyuncu" : player.uid === uid ? "Sen" : "Oyuncu"}</small></div>
          {player.uid === room.hostUid && <Crown size={17} aria-label="Oda sahibi"/>}
        </article>)}
        {players.length < 2 && <div className={css.emptySeat}><Users size={20}/><span>Oda kodunu paylaş,<br/>bir arkadaşın katılsın.</span></div>}
      </div>
      <div className={css.ruleRow}><span><Shuffle size={16}/> Tekrar etmeyen oyunlar</span><span><Sparkles size={16}/> Kimse elenmiyor</span></div>
    </div>
    <aside className={css.matchPanel}>
      <div className={css.roundCount}><span>{MATCH_ROUNDS}</span><div><b>turda kapışıyoruz</b><small>9 oyundan rastgele seçilir</small></div></div>
      <div className={css.catalog} aria-label="Maça gelebilecek oyunlar">
        {MICROGAMES.map((definition, index) => <div key={definition.id} title={definition.description}><span aria-hidden="true">{MARKS[index]}</span><strong>{definition.title}</strong></div>)}
      </div>
      <p className={css.matchNote}>Her turdan önce kuralı görürsün. Tur bitince puan tablosu açılır ve sıradaki oyun kendiliğinden başlar.</p>
      {host ? <button type="button" className={css.primary} disabled={busy || players.length < 2} onClick={onStart}>{busy ? "Maç hazırlanıyor…" : players.length < 2 ? "Bir oyuncu daha bekleniyor" : "Maçı başlat"}<ArrowRight size={18}/></button> : <p className={css.wait} role="status">Oda sahibi maçı başlatınca hepiniz aynı anda oyuna gireceksiniz.</p>}
    </aside>
  </section>;
}
