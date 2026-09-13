"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Bot, Dices, Sparkles, Users } from "lucide-react";

export default function GamesHome() {
  const router = useRouter();
  return (
    <main className="games-hub-shell">
      <div className="soft-grid" />
      <div className="hub-orb hub-orb-a" />
      <div className="hub-orb hub-orb-b" />
      <section className="games-hub-hero">
        <span className="brand-chip"><Sparkles size={16}/> aynı masa, üç oyun</span>
        <h1>Bu gece ne oynuyoruz?</h1>
        <p>Oda kodunu paylaş, tarayıcıdan direkt gir. AI destekli KADRO, klasik Kızma Birader veya iki kişilik kaydırma oyunu TAŞIR.</p>
      </section>

      <section className="game-choice-grid">
        <button className="game-choice-card kadro-choice" onClick={() => router.push("/kadro")}>
          <div className="game-choice-art kadro-choice-art"><Bot size={46}/><span>✦</span></div>
          <div className="game-choice-copy">
            <small>AI PARTY GAME</small>
            <h2>KADRO Oyna</h2>
            <p>Karakterleri açık artırmada kap, en iyi ekibi kur, AI jüriye meydan oku.</p>
            <div className="choice-pills"><span><Users size={14}/> moderatör + oyuncular</span><span>🎲 Kaos</span></div>
          </div>
          <span className="choice-go">Gir <ArrowRight size={18}/></span>
        </button>

        <button className="game-choice-card ludo-choice" onClick={() => router.push("/ludo")}>
          <div className="game-choice-art ludo-choice-art"><Dices size={48}/><span>● ● ● ●</span></div>
          <div className="game-choice-copy">
            <small>KLASİK MASA OYUNU</small>
            <h2>Kızma Birader Oyna</h2>
            <p>4 taş, 6 ile çıkış, rakibi yeme, tam zarla eve giriş. İstersen Kaos kartlarını aç.</p>
            <div className="choice-pills"><span><Users size={14}/> 2–4 kişi</span><span>⚡ Klasik / Kaos</span></div>
          </div>
          <span className="choice-go">Gir <ArrowRight size={18}/></span>
        </button>

        <button className="game-choice-card" onClick={() => router.push("/tasir")}>
          <div className="game-choice-art" style={{background:"linear-gradient(145deg,#eeeaff,#fff0cc)",fontSize:52}}>↕</div>
          <div className="game-choice-copy">
            <small>2 KİŞİLİK KAYDIRMA OYUNU</small>
            <h2>TAŞIR Oyna</h2>
            <p>4×5 kapalı taşları kaydır. Taşan sayı seninse devam et; rakibinse eli karşıya ver.</p>
            <div className="choice-pills"><span><Users size={14}/> tam 2 kişi</span><span>★ Joker + TKM</span></div>
          </div>
          <span className="choice-go">Gir <ArrowRight size={18}/></span>
        </button>
      </section>
    </main>
  );
}
