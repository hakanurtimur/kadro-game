import type { ReactNode } from "react";
import { getCharacterProfile } from "@/lib/character-profiles";
import type { CharacterSeed, RoomState } from "@/lib/types";
import PolyCharacter from "./PolyCharacter";
import PolyAvatar from "./PolyAvatar";

export function CharacterProfile({character,expanded=false}:{character:CharacterSeed;expanded?:boolean}) {
 const p=getCharacterProfile(character);if(!p)return <p className="profile-note">Bu karakter için oyun profili henüz yok.</p>;
 const content=<div className="profile-body"><p>{p.description}</p><div className="profile-strengths">{p.strengths.map(s=><span key={s}>+ {s}</span>)}</div><p className="profile-weakness"><b>Dikkat:</b> {p.weakness}</p><small>Editoryal oyun profili · sabit güç puanı değildir</small></div>;
 return expanded?<section className="profile-expanded"><b className="profile-role">{p.role}</b>{content}</section>:<details className="character-details"><summary>{p.role} <span>Karakteri tanı ↗</span></summary>{content}</details>;
}
export default function CharacterCard({character,action}:{character:CharacterSeed;action?:ReactNode}) {
 return <article className="profile-card"><div className="profile-card-heading"><PolyCharacter name={character.name} small/><div><strong>{character.name}</strong><small>{character.source}</small></div>{action}</div><CharacterProfile character={character}/></article>;
}
export function TableView({room}:{room:RoomState}) {
 const players=Object.values(room.players).filter(p=>p.uid!==room.moderator?.uid).sort((a,b)=>a.seat-b.seat);
 return <section className="table-view kawaii-card" aria-label="Oyuncuların masadaki kadroları">
  <div className="side-title">✦ MASADAKİ KADROLAR</div>
  <div className="table-seats">{players.map(p=><article className={`table-seat ${room.auction.bidderUid===p.uid?'leading':''}`} key={p.uid}>
   <header><PolyAvatar seed={p.uid} size={38}/><div><b>{p.nickname}</b><small>{p.team.length}/{room.slots} karakter · ₺{p.balance}</small></div>{room.auction.withdrawn?.[p.uid]&&<span className="withdrawn-pill">Çekildi</span>}</header>
   <div className="table-figures">{p.team.map(c=><div className="table-figure" key={c.characterId} title={`${c.name} · ${c.source}`}><PolyCharacter name={c.name} small/><span>{c.name}</span></div>)}{Array.from({length:Math.max(0,room.slots-p.team.length)},(_,i)=><div className="table-vacancy" key={i} aria-label="Boş slot">+</div>)}</div>
  </article>)}</div>
 </section>;
}
