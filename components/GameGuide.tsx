"use client";
import { useId, useRef } from "react";
import { GUIDE_SECTIONS } from "@/lib/game-guide";
import { JURY_CRITERIA } from "@/lib/judging";

export default function GameGuide() {
 const dialog=useRef<HTMLDialogElement>(null);const heading=useId();
 return <>
  <button type="button" className="guide-trigger" onClick={()=>dialog.current?.showModal()}>? Nasıl oynanır?</button>
  <dialog ref={dialog} className="guide-dialog" aria-labelledby={heading} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
   <div className="guide-sheet">
    <header><div><span className="tiny-label">MASANIN EL KİTABI</span><h2 id={heading}>İki dakikada KADRO!</h2></div><button type="button" className="guide-close" aria-label="Yönergeyi kapat" onClick={()=>dialog.current?.close()}>×</button></header>
    <p className="guide-intro">Bir moderatör. Bir masa dolusu yarışmacı. Göreve en uygun kadroyu kuran kazanır.</p>
    {GUIDE_SECTIONS.map(s=><section key={s.title}><h3>{s.title}</h3><p>{s.text}</p></section>)}
    <button type="button" className="primary-button" onClick={()=>dialog.current?.close()}>Anladım, masaya dön</button>
   </div>
  </dialog>
 </>;
}
export function RubricCard({compact=false}:{compact?:boolean}) {
 return <section className={`rubric-card kawaii-card ${compact?'compact':''}`} aria-label="Jüri değerlendirme kriterleri">
  <div><span className="tiny-label">JÜRİ NEYE BAKIYOR?</span><h3>Kurallar baştan belli.</h3></div>
  <div className="rubric-grid">{JURY_CRITERIA.map(c=><article key={c.key}><strong>%{c.weight}</strong><b>{c.label}</b>{!compact&&<p>{c.explanation}</p>}</article>)}</div>
  {!compact&&<p className="rubric-note">AI kriterleri yorumlar; toplamı kod hesaplar. Para puan değildir. Eşit toplam, eşit derece.</p>}
 </section>;
}
