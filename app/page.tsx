"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Coins, Gamepad2, Sparkles, Users } from "lucide-react";
import PolyAvatar from "@/components/PolyAvatar";
import { getGameStore } from "@/lib/game-store";

export default function Home() {
  const router = useRouter();
  const store = useMemo(() => getGameStore(), []);
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [budget, setBudget] = useState(100);
  const [slots, setSlots] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!nickname.trim()) return setError("Önce bir nickname yaz ✨");
    setLoading(true);
    setError("");
    try {
      const { room } = await store.createRoom(nickname, budget, slots);
      sessionStorage.setItem("kadro:nickname", nickname.trim());
      router.push(`/room/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Oda oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!nickname.trim() || !roomCode.trim()) return setError("Nickname ve oda kodu lazım.");
    setLoading(true);
    setError("");
    try {
      const { room } = await store.joinRoom(roomCode, nickname);
      sessionStorage.setItem("kadro:nickname", nickname.trim());
      router.push(`/room/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Odaya girilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="home-shell">
      <div className="soft-grid" />
      <div className="floating-gem gem-a" />
      <div className="floating-gem gem-b" />
      <div className="floating-gem gem-c" />

      <section className="home-hero">
        <div className="brand-chip"><Gamepad2 size={16} /> browser party game</div>
        <div className="home-logo-wrap">
          <h1>KADRO<span>!</span></h1>
          <div className="logo-spark">✦</div>
        </div>
        <p className="hero-copy">Paranı harca, karakterleri kap, absürt göreve en iyi ekibi kur. Son sözü AI jüri söylesin.</p>
        <div className="hero-pills">
          <span><Users size={15}/> 2–8 kişi</span>
          <span><Coins size={15}/> canlı açık artırma</span>
          <span><Sparkles size={15}/> AI oyun yöneticisi</span>
        </div>
        <div className="avatar-parade" aria-hidden="true">
          {["momo", "yuki", "kiki", "toto"].map((seed, index) => <PolyAvatar key={seed} seed={seed} size={64 + index * 3} />)}
        </div>
      </section>

      <section className="join-card kawaii-card">
        <div className="mode-row">
          <span className="tiny-label">HIZLI GİRİŞ</span>
          <span className={`mode-badge ${store.mode}`}>{store.mode === "firebase" ? "● ONLINE" : "● LOCAL DEMO"}</span>
        </div>
        <label>Nickname</label>
        <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="örn. Hakan" maxLength={20} autoComplete="off" />

        <div className="section-divider"><span>ODA KUR</span><span>AYARLAR</span></div>
        <div className="settings-grid">
          <div>
            <label>Bütçe</label>
            <div className="number-input"><span>₺</span><input type="number" min={20} max={500} step={10} value={budget} onChange={(event) => setBudget(Number(event.target.value))}/></div>
          </div>
          <div>
            <label>Kadro</label>
            <div className="number-input"><input type="number" min={3} max={8} value={slots} onChange={(event) => setSlots(Number(event.target.value))}/><span>slot</span></div>
          </div>
        </div>
        <button className="primary-button" disabled={loading} onClick={handleCreate}>{loading ? "Hazırlanıyor…" : "Oda oluştur"}<ArrowRight size={18}/></button>

        <div className="or"><span>veya</span></div>
        <label>Oda kodu</label>
        <div className="join-row">
          <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))} placeholder="K4DRO" maxLength={5}/>
          <button onClick={handleJoin} disabled={loading}>Katıl</button>
        </div>
        {error && <p className="inline-error">{error}</p>}
        {store.mode === "local" && <p className="demo-note">Firebase env yokken iki ayrı sekmede farklı nickname’lerle lokal test edebilirsin.</p>}
      </section>
    </main>
  );
}
