"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy } from "lucide-react";
import GameSocial from "@/components/social/GameSocial";
import BombPassGame from "./games/BombPassGame";
import ShrinkArenaGame from "./games/ShrinkArenaGame";
import SkillGame from "./games/royale/SkillGame";
import MatchLobby from "./MatchLobby";
import MatchSummary, { MatchProgress } from "./MatchSummary";
import { isSkillGameId } from "@/lib/microgame/skill-model";
import { submitSkillEvidence } from "@/lib/microgame/skill-engine";
import { passBomb, reportArenaOut } from "@/lib/microgame/engine";
import {
  startMicrogameMatch, settleMicrogameMatchRound, advanceMicrogameMatch,
  openMicrogameLobby, matchSettleAt,
} from "@/lib/microgame/match-engine";
import { getMicrogameStore } from "@/lib/microgame/store";
import type { SkillEvidence, SkillRound } from "@/lib/microgame/skill-types";
import type { MicrogameRoomState } from "@/lib/microgame/types";
import styles from "@/app/microgame/microgame.module.css";

export default function MicrogameRoom({ code }: { code: string }) {
  const router = useRouter();
  const store = useMemo(() => getMicrogameStore(), []);
  const [room, setRoom] = useState<MicrogameRoomState | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const busyRef = useRef(false), ticking = useRef(false), retryAfter = useRef(0);

  useEffect(() => {
    let live = true;
    let off: (() => void) | undefined;
    setLoaded(false);
    void (async () => {
      try {
        const id = await store.identity();
        if (!live) return;
        setUid(id); setNow(store.now());
        const stop = await store.subscribeRoom(code, next => {
          if (live) { setRoom(next); setLoaded(true); }
        }, error => {
          if (live) { setLoaded(true); setToast(error.message); }
        });
        if (!live) stop(); else off = stop;
      } catch (error) {
        if (live) { setLoaded(true); setToast(error instanceof Error ? error.message : "Odaya bağlanılamadı."); }
      }
    })();
    return () => { live = false; off?.(); };
  }, [code, store]);

  useEffect(() => {
    const tick = () => setNow(store.now());
    const timer = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [store]);

  useEffect(() => {
    if (!room || !uid || !room.players[uid] || ticking.current || now < retryAfter.current) return;
    const settle = room.status === "playing" && now >= matchSettleAt(room);
    const advance = room.status === "results" && room.match?.status === "active" && room.match.nextAt > 0 && now >= room.match.nextAt;
    if (!settle && !advance) return;
    const expectedRound = room.roundNumber;
    ticking.current = true;
    void (async () => {
      const positions = settle && room.activeGameId === "crown-control" ? await store.getArenaPositions(code, expectedRound) : {};
      const at = store.now();
      await store.mutate(code, state => settle
        ? settleMicrogameMatchRound(state, uid, expectedRound, positions, at)
        : advanceMicrogameMatch(state, uid, expectedRound, at));
    })().catch(error => {
      retryAfter.current = store.now() + 1500;
      setToast(error instanceof Error ? error.message : "Bağlantı bekleniyor; yeniden denenecek.");
    }).finally(() => { ticking.current = false; });
  }, [code, now, room, store, uid]);

  async function mutate(transition: (state: MicrogameRoomState) => MicrogameRoomState) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setToast("");
    try { await store.mutate(code, transition); }
    catch (error) { setToast(error instanceof Error ? error.message : "İşlem olmadı."); }
    finally { busyRef.current = false; setBusy(false); }
  }

  if (!loaded) return <main className={styles.loading}>{toast || "Odaya bağlanılıyor…"}</main>;
  if (!room || !uid || !room.players[uid]) return <main className={styles.loading}><div><h2>{room ? "Bu sekme odada değil." : "Oda bulunamadı."}</h2><p>{toast || "Oda kodunu kontrol edip yeniden katıl."}</p><button className={styles.primary} onClick={() => router.push("/microgame")}>Odaya katıl</button></div></main>;

  const actorUid = uid, expectedRound = room.roundNumber;
  const me = room.players[actorUid];
  const gameKey = `${room.code}:${room.roundNumber}:${room.activeGameId}`;
  const at = () => store.now();
  async function start() { const time = at(); await mutate(state => startMicrogameMatch(state, actorUid, expectedRound, time)); }
  async function lobby() { const time = at(); await mutate(state => openMicrogameLobby(state, actorUid, expectedRound, time)); }
  async function sendBomb(targetUid: string) {
    const time = at();
    await mutate(state => state.roundNumber === expectedRound ? passBomb(state, actorUid, targetUid, time) : state);
  }
  async function reportOut() {
    const time = at();
    // Never swallow an elimination just because another UI action is pending.
    try { await store.mutate(code, state => state.roundNumber === expectedRound && state.status === "playing" ? reportArenaOut(state, actorUid, time) : state); }
    catch (error) { setToast(error instanceof Error ? error.message : "Tur sonucu gönderilemedi; bağlantını kontrol et."); }
  }
  async function sendSkill(evidence: SkillEvidence, roundNumber: number) {
    const time = at();
    await store.mutate(code, state => submitSkillEvidence(state, actorUid, roundNumber, evidence, time));
  }
  function exit() {
    if (room?.match?.status === "active" && !window.confirm("Maç devam ediyor. Odadan çıkmak istiyor musun?")) return;
    router.push("/microgame");
  }
  async function copyCode() {
    try { if (navigator.clipboard) { await navigator.clipboard.writeText(code); setToast("Oda kodu kopyalandı."); } else setToast(`Oda kodu: ${code}`); }
    catch { setToast(`Oda kodu: ${code}`); }
  }

  return <main className={styles.room}>
    <header className={styles.topbar}>
      <button type="button" onClick={exit}><ArrowLeft size={16}/> Çık</button>
      <button type="button" onClick={() => void copyCode()} aria-label={`Oda kodunu kopyala: ${code}`}><Copy size={15}/>{code}</button>
      <div id="microgame-social-dock" className={styles.socialDock}/>
    </header>
    {room.status === "lobby" && <MatchLobby room={room} uid={actorUid} busy={busy} onStart={() => void start()}/>}
    {(room.status === "playing" || room.status === "results") && <section className={styles.gameShell}>
      <MatchProgress room={room}/>
      {room.status === "results" && room.match
        ? <MatchSummary room={room} uid={actorUid} now={now} busy={busy} onRematch={() => void start()} onLobby={() => void lobby()}/>
        : <>
          {room.activeGameId === "bomb-pass" && <BombPassGame key={gameKey} room={room} uid={actorUid} now={now} onPass={sendBomb}/>}
          {room.activeGameId === "shrink-arena" && <ShrinkArenaGame key={gameKey} room={room} uid={actorUid} now={now} code={code} onOut={reportOut}/>}
          {room.round && isSkillGameId(room.round.gameId) && <SkillGame key={gameKey} room={room} round={room.round as SkillRound} uid={actorUid} now={now} onSubmit={sendSkill}/>}
        </>}
      {room.status === "results" && !room.match && <div className={styles.resultActions}>{uid === room.hostUid ? <button className={styles.primary} disabled={busy} onClick={() => void lobby()}>Yeni maç için lobiye dön</button> : <p className={styles.wait}>Oda sahibi lobiye dönünce yeni maç başlayabilir.</p>}</div>}
    </section>}
    <GameSocial game="microgame" code={code} participant={{ uid: actorUid, nickname: me.nickname, role: "player" }} mobileDockId="microgame-social-dock"/>
    {toast && <button className={styles.toast} onClick={() => setToast("")} role="status">{toast}</button>}
  </main>;
}
