"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Bomb, Gamepad2, Users } from "lucide-react";
import { MICROGAMES } from "@/lib/microgame/registry";
import { getMicrogameStore } from "@/lib/microgame/store";
import styles from "@/app/microgame/microgame.module.css";

export default function MicrogameHome(){
  const router=useRouter();
  const store=useMemo(()=>getMicrogameStore(),[]);
  const[nickname,setNickname]=useState("");
  const[roomCode,setRoomCode]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  async function create(){
    if(!nickname.trim())return setError("Önce nickname yaz.");
    setLoading(true);setError("");
    try{const{room}=await store.createRoom(nickname);router.push(`/microgame/${room.code}`);}
    catch(error){setError(error instanceof Error?error.message:"Oda açılamadı.");}
    finally{setLoading(false);}
  }
  async function join(){
    if(!nickname.trim()||!roomCode.trim())return setError("Nickname ve oda kodu lazım.");
    setLoading(true);setError("");
    try{const{room}=await store.joinRoom(roomCode,nickname);router.push(`/microgame/${room.code}`);}
    catch(error){setError(error instanceof Error?error.message:"Odaya girilemedi.");}
    finally{setLoading(false);}
  }

  return <main className={styles.home}>
    <button className={styles.back} onClick={()=>router.push("/")}><ArrowLeft size={16}/> <img className="brand-back-mark" src="/brand/mascot.svg" width="26" height="27" alt=""/> DÜMBÜK · Oyunlar</button>
    <section className={styles.hero}>
      <span className={styles.eyebrow}><Gamepad2 size={16}/> 2–6 OYUNCU · HIZLI MİNİ OYUNLAR</span>
      <h1>Microgame <em>Royale</em></h1>
      <p>{MICROGAMES.length} kısa oyun, ortak skor, kimse masadan elenmiyor. Hafızanı, reflekslerini ve arkadaşlarınla kapışmayı aynı masada dene.</p>
      <div className={styles.heroBomb} aria-hidden="true"><Bomb size={72}/><i/><i/></div>
    </section>

    <section className={styles.joinCard}>
      <div className={styles.cardTop}><span>ODA</span><b>{store.mode==="firebase"?"● ONLINE":"● LOCAL"}</b></div>
      <label>Nickname</label>
      <input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={20} placeholder="örn. Hakan"/>
      <button className={styles.primary} disabled={loading} onClick={create}>{loading?"Kuruluyor…":"Oda oluştur"}<ArrowRight size={18}/></button>
      <div className={styles.or}><span>veya</span></div>
      <label>Oda kodu</label>
      <div className={styles.joinRow}>
        <input value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,""))} maxLength={5} placeholder="MCR22"/>
        <button disabled={loading} onClick={join}>Katıl</button>
      </div>
      {error&&<p className={styles.error}>{error}</p>}
      <small className={styles.note}><Users size={14}/> Host da oynar. Test Mode’da her oyunu ayrı seçip istediğin kadar tekrar oyna.</small>
    </section>
  </main>;
}
