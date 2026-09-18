"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import { getTasirStore } from "@/lib/tasir/store";
import styles from "./tasir.module.css";

export default function TasirHome(){
  const router=useRouter();const store=useMemo(()=>getTasirStore(),[]);const[nickname,setNickname]=useState("");const[roomCode,setRoomCode]=useState("");const[loading,setLoading]=useState(false);const[error,setError]=useState("");
  async function create(){if(!nickname.trim())return setError("Önce nickname yaz.");setLoading(true);setError("");try{const{room}=await store.createRoom(nickname);router.push(`/tasir/${room.code}`);}catch(e){setError(e instanceof Error?e.message:"Oda açılamadı.");}finally{setLoading(false);}}
  async function join(){if(!nickname.trim()||!roomCode.trim())return setError("Nickname ve oda kodu lazım.");setLoading(true);setError("");try{const{room}=await store.joinRoom(roomCode,nickname);router.push(`/tasir/${room.code}`);}catch(e){setError(e instanceof Error?e.message:"Odaya girilemedi.");}finally{setLoading(false);}}
  return <main className={styles.home}><button className={styles.back} onClick={()=>router.push('/')}><ArrowLeft size={16}/> DÜMBÜK · Oyunlar</button><section className={styles.hero}><span className={styles.chip}>↕ KAYDIR · TAŞIR · DEVRET</span><h1>TAŞIR</h1><p>0–4 ve 5–9 karşı karşıya. Her sayı kendi hattına ait: açılan 5, 5 hattını; açılan 2, 2 hattını kaydırır. Beş hattını da doğru sembollerle tamamla.</p><div className={styles.miniBoard} aria-hidden="true">{Array.from({length:20},(_,i)=><i key={i}/>)}</div><div className={styles.rules}><b>2 oyuncu</b><span>4 × 5 kapalı taş</span><span>Taş–Kağıt–Makas başlangıcı</span></div></section><section className={styles.joinCard}><div className={styles.modeRow}><span>2 OYUNCU</span><em>{store.mode==='firebase'?'● ONLINE':'● LOCAL'}</em></div><label>Nickname</label><input value={nickname} onChange={(e)=>setNickname(e.target.value)} maxLength={20} placeholder="örn. Hakan"/><button className={styles.primary} onClick={create} disabled={loading}>{loading?'Kuruluyor…':'TAŞIR odası oluştur'}<ArrowRight size={18}/></button><div className={styles.or}>veya</div><label>Oda kodu</label><div className={styles.joinRow}><input value={roomCode} onChange={(e)=>setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))} maxLength={5} placeholder="TAS22"/><button onClick={join} disabled={loading}>Katıl</button></div>{error&&<p className={styles.error}>{error}</p>}<p className={styles.note}><Users size={14}/> Host da normal oyuncu. Her hedef hattını kendi sembolüyle 4/4 dolduran taraf kazanır.</p></section></main>;
}
