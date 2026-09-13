"use client";

import { useState } from "react";
import { BookOpen, X } from "lucide-react";

export default function LudoGuide() {
  const [open, setOpen] = useState(false);
  return <>
    <button className="ludo-guide-button" onClick={() => setOpen(true)}><BookOpen size={16}/> Nasıl oynanır?</button>
    {open && <div className="guide-overlay" onClick={() => setOpen(false)}>
      <section className="guide-panel ludo-guide-panel" onClick={(event) => event.stopPropagation()}>
        <button className="guide-close" onClick={() => setOpen(false)}><X size={18}/></button>
        <span className="tiny-label">KIZMA BİRADER</span>
        <h2>Klasik kurallar, tatlı kaos.</h2>
        <div className="guide-steps">
          <article><b>1</b><div><strong>6 ile çık</strong><p>Her oyuncunun 4 taşı var. Avludaki taşı yalnızca 6 atınca parkura çıkarabilirsin.</p></div></article>
          <article><b>2</b><div><strong>6 atınca tekrar</strong><p>6 attığında hamleni yaptıktan sonra sıra yine sende kalır.</p></div></article>
          <article><b>3</b><div><strong>Rakibi ye</strong><p>Güvenli başlangıç kareleri dışında rakibin üstüne basarsan onu avluya geri gönderirsin.</p></div></article>
          <article><b>4</b><div><strong>Tam zarla eve gir</strong><p>Ev koridorunun sonunu aşamazsın. Dört taşını da eve getiren kazanır.</p></div></article>
        </div>
        <div className="guide-chaos-note"><strong>⚡ Kaos modu:</strong> Her 4 tamamlanmış turda Çifte Zar, Portal, Kalkan, Barış Turu, Deprem veya Ters Köşe kartlarından biri gelir. Kartlar klasik bitiş kuralını bozmaz.</div>
      </section>
    </div>}
  </>;
}
