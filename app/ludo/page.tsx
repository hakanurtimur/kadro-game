"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Dices, Users, Zap } from "lucide-react";
import LudoGuide from "@/components/ludo/LudoGuide";
import { getLudoStore } from "@/lib/ludo/store";
import type { LudoMode } from "@/lib/ludo/types";

export default function LudoHome(){
  const router=useRouter();
  const store=useMemo(()=>getLudoStore(),[]);
  const [nickname,setNickname]=useState("");
  const [roomCode,setRoomCode]=useState("");
  const [mode,setMode]=useState<LudoMode>('classic');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function create(){if(!nickname.trim())return setError('Önce nickname yaz.');setLoading(true);setError('');try{const {room}=await store.createRoom(nickname,mode);router.push(`/ludo/${room.code}`);}catch(e){setError(e instanceof Error?e.message:'Oda açılamadı.');}finally{setLoading(false);}}
  async function join(){if(!nickname.trim()||!roomCode.trim())return setError('Nickname ve oda kodu lazım.');setLoading(true);setError('');try{const {room}=await store.joinRoom(roomCode,nickname);router.push(`/ludo/${room.code}`);}catch(e){setError(e instanceof Error?e.message:'Odaya girilemedi.');}finally{setLoading(false);}}

  return <main className="ludo-home-shell">
    <div className="soft-grid"/><button className="back-to-games" onClick={()=>router.push('/')}><ArrowLeft size={16}/> DÜMBÜK · Oyunlar</button>
    <section className="ludo-home-hero"><span className="brand-chip"><Dices size={16}/> klasik masa oyunu</span><h1>Kızma <em>Birader</em></h1><p>4 taşını avludan çıkar, rakibini eve yolla, tam zarla bitişe gir. Kaosu açarsan masa biraz karışır.</p><div className="ludo-hero-pawns" aria-hidden="true"><i className="red"/><i className="green"/><i className="yellow"/><i className="blue"/></div><LudoGuide/></section>
    <section className="join-card kawaii-card ludo-join-card">
      <div className="mode-row"><span className="tiny-label">2–4 OYUNCU</span><span className={`mode-badge ${store.mode}`}>{store.mode==='firebase'?'● ONLINE':'● LOCAL'}</span></div>
      <label>Nickname</label><input value={nickname} onChange={(e)=>setNickname(e.target.value)} maxLength={20} placeholder="örn. Hakan"/>
      <div className="section-divider"><span>ODA KUR</span><span>MOD</span></div>
      <div className="ludo-create-mode"><button className={mode==='classic'?'active':''} onClick={()=>setMode('classic')}><Dices size={18}/> Klasik</button><button className={mode==='chaos'?'active':''} onClick={()=>setMode('chaos')}><Zap size={18}/> Kaos</button></div>
      <p className="ludo-mode-description">{mode==='classic'?'Saf klasik kurallar. Host da normal oyuncu.':'Klasik kurallar + her 4 turda karışık Kaos kartı.'}</p>
      <button className="primary-button ludo-primary" disabled={loading} onClick={create}>{loading?'Tahta kuruluyor…':'Oda oluştur'}<ArrowRight size={18}/></button>
      <div className="or"><span>veya</span></div><label>Oda kodu</label><div className="join-row"><input value={roomCode} onChange={(e)=>setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))} maxLength={5} placeholder="LUD22"/><button onClick={join} disabled={loading}>Katıl</button></div>
      {error&&<p className="inline-error">{error}</p>}
      <p className="demo-note"><Users size={14}/> Odayı kuran kişi de oynar; moderatör yok.</p>
    </section>
  </main>;
}
