"use client";

import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUpRight, Bomb, Bot, Dices, MoveVertical, Users } from "lucide-react";
import styles from "./home.module.css";

export default function GamesHome() {
  const router = useRouter();
  return (
    <main className={styles.home}>
      <header className={styles.header}>
        <a href="/" aria-label="DÜMBÜK ana sayfa"><img src="/brand/logo-horizontal.svg" width="258" height="82" alt="DÜMBÜK" /></a>
        <a className={styles.headerLink} href="#oyunlar">Tayfa burada <ArrowDown size={16}/></a>
      </header>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.note}>Arkadaş arası rekabet kurumu.</span>
          <h1>Ekip tamam mı?<br/><span>Bir dümbük eksik.</span></h1>
          <p>Odayı aç. Tayfayı çağır. Aynı masada ya da ayrı şehirlerde, bir oyun daha bahanesi hep burada.</p>
          <a className={styles.cta} href="#oyunlar">Oyunu seç, masayı kur <ArrowDown size={20}/></a>
          <small>İndirme yok. Oda kodu var. Bolca “son bir el” var.</small>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <span className={styles.speech}>sen gel, biz anlatırız.</span>
          <img src="/brand/mascot.svg" width="400" height="400" alt="" />
          <span className={styles.signature}>çok iddialı. sebepsiz yere.</span>
        </div>
      </section>
      <section id="oyunlar" className={styles.games} aria-labelledby="games-title">
        <div className={styles.sectionHeading}><div><span>MASADA NE VAR?</span><h2 id="games-title">Oyun değişir. Tayfa aynı.</h2></div><p>Birini seç. Odanı kur veya kodla katıl.</p></div>
        <div className={styles.grid}>
          <button className={`${styles.card} ${styles.kadro}`} onClick={() => router.push("/kadro")}>
            <div className={styles.cardTop}><Bot size={38}/><span>01 / AI JÜRİ</span><ArrowUpRight className={styles.cardArrow}/></div>
            <h3>KADRO Oyna</h3><p>Karakterleri açık artırmada kap. Ekibini kur, AI jüriyi ikna et.</p>
            <div className={styles.cardBottom}><span><Users size={15}/> Moderatör + 2–8 kişi</span><b>Masaya geç →</b></div>
          </button>
          <button className={`${styles.card} ${styles.ludo}`} onClick={() => router.push("/ludo")}>
            <div className={styles.cardTop}><Dices size={38}/><span>02 / ESKİ DOST</span><ArrowUpRight className={styles.cardArrow}/></div>
            <h3>Kızma Birader Oyna</h3><p>Adında kızma var. Gerisini garanti edemiyoruz. Klasik veya Kaos.</p>
            <div className={styles.cardBottom}><span><Users size={15}/> 2–4 kişi</span><b>Zarı at →</b></div>
          </button>
          <button className={`${styles.card} ${styles.tasir}`} onClick={() => router.push("/tasir")}>
            <div className={styles.cardTop}><MoveVertical size={38}/><span>03 / KAFA KAFAYA</span><ArrowUpRight className={styles.cardArrow}/></div>
            <h3>TAŞIR Oyna</h3><p>Taşı aç, hattı kaydır. Beş hattı tamamla, karşı tarafa geçmiş olsun.</p>
            <div className={styles.cardBottom}><span><Users size={15}/> 2 kişi</span><b>Hamleni yap →</b></div>
          </button>
          <button className={`${styles.card} ${styles.micro}`} onClick={() => router.push("/microgame")}>
            <div className={styles.cardTop}><Bomb size={38}/><span>04 / TATLI KAOS</span><ArrowUpRight className={styles.cardArrow}/></div>
            <h3>Microgame Royale</h3><p>Dokuz kısa oyun. Refleks, hafıza, biraz panik. Elenmek yok, rövanş var.</p>
            <div className={styles.cardBottom}><span><Users size={15}/> 2–6 kişi · 8 turluk maç</span><b>Kaosa katıl →</b></div>
          </button>
        </div>
      </section>
      <section className={styles.origin}><img src="/brand/mascot.svg" alt="" width="64" height="64"/><p>Bir öğle arasında başladı.<br/><strong>“Son bir el” diye diye buraya geldik.</strong></p><span>Bizim masadan, sizin tayfaya.</span></section>
      <footer className={styles.footer}><b>DÜMBÜK</b><span>Muhabbet baki. Skor geçici.</span><a href="/brand/dumbuk-brand-kit.zip" download>Logo paketi ↗</a></footer>
    </main>
  );
}
