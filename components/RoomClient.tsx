"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Check,
  ChevronRight,
  Coins,
  Copy,
  Crown,
  Dices,
  Hand,
  Hourglass,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import GameGuide, { RubricCard } from "@/components/GameGuide";
import CharacterCard, { CharacterProfile, TableView } from "@/components/CharacterCard";
import ResultShow from "@/components/ResultShow";
import SeriesBoard, { SeriesPicker } from "@/components/SeriesBoard";
import { useTableExperience, ExperienceControls } from "@/components/TableExperience";
import GameSocial from "@/components/social/GameSocial";
import { stageHelp } from "@/lib/game-guide";
import { sceneTheme } from "@/lib/presentation";
import { ChaosBanner, ChaosHistory, ModePicker } from "@/components/ChaosMode";
import DiceButton from "@/components/DiceButton";
import PolyAvatar from "@/components/PolyAvatar";
import PolyCharacter from "@/components/PolyCharacter";
import {
  applyCategoryReroll,
  applyCharacterReroll,
  applyRoundPreview,
  applyScenarioReroll,
  closeAuction,
  pickLeftover,
  placeBid,
  saveJudge,
  setGameMode,
  startAuction,
  submitRpsChoice,
  auctionCanClose, withdrawAuction, configureSeries, claimJudging, releaseJudging, advancePresentation, nextSeriesRound, resetSeries,
} from "@/lib/game-engine";
import { getGameStore } from "@/lib/game-store";
import type { GameMode, CharacterSeed, JudgeResult, RoomState, RoundPayload, RpsMove } from "@/lib/types";

const rpsChoices: Array<{ move: RpsMove; emoji: string; label: string }> = [
  { move: "rock", emoji: "✊", label: "Taş" },
  { move: "paper", emoji: "✋", label: "Kağıt" },
  { move: "scissors", emoji: "✌️", label: "Makas" },
];

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const store = useMemo(() => getGameStore(), []);
  const [uid, setUid] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(Date.now());
  const experience = useTableExperience();
  const lastSoundState = useRef<{sales:number;bid:number;round?:string;step:number}|null>(null);

  const players = useMemo(() => room ? Object.values(room.players).filter(p => p.uid !== room.moderator?.uid).sort((a, b) => a.seat - b.seat) : [], [room]);
  const me = uid && room ? room.players[uid] : null;
  const isHost = Boolean(uid && room?.hostUid === uid);
  const currentCharacter = room?.status === "auction" ? room.characters[room.auction.index] : null;
  const topBidder = room?.auction.bidderUid ? room.players[room.auction.bidderUid] : null;
  const remainingMs = room?.auction.endsAt ? Math.max(0, room.auction.endsAt - now) : 0;
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const chaosPauseSeconds = room?.status === "auction" && room.auction.startsAt
    ? Math.max(0, Math.ceil((room.auction.startsAt - now) / 1000)) : 0;
  const chaosPaused = chaosPauseSeconds > 0;
  const chaosHistory = room?.chaos?.history ?? [];
  const lastChaosEvent = chaosHistory[chaosHistory.length - 1];
  const timerPercent = Math.max(0, Math.min(100, (remainingMs / 15_000) * 100));

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const identity = await store.identity();
        if (!active) return;
        setUid(identity);
        unsubscribe = await store.subscribeRoom(code, (nextRoom) => {
          if (!active) return;
          if (!nextRoom) {
            setToast("Oda bulunamadı.");
            return;
          }
          setRoom(nextRoom);
        }, (error) => { if(active) setToast(error.message); });
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Odaya bağlanılamadı.");
      }
    })();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [code, store]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(store.now()), 250);
    return () => window.clearInterval(interval);
  }, [store]);

  const mutate = useCallback(async (transition: (current: RoomState) => RoomState) => {
    try {
      return await store.mutate(code, transition);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "İşlem yapılamadı.");
      throw error;
    }
  }, [code, store]);

  const closeCurrentAuction = useCallback(async (characterId: string) => {
    if (!uid || !isHost) return;
    try {
      const actionNow = store.now();
      await mutate((current) => {
        if(!auctionCanClose(current, actionNow)) throw new Error("İhale henüz kapanmaya hazır değil.");
        return closeAuction(current, uid, characterId, actionNow);
      });
    } catch {
      // A stale timer may race with a manual close; the toast already explains it.
    }
  }, [isHost, mutate, uid, store]);

  useEffect(() => {
    if (!room || room.schemaVersion !== 2 || !uid || !isHost || room.status !== "auction" || !room.auction.endsAt || !currentCharacter) return;
    const characterId = currentCharacter.id;
    const delay = auctionCanClose(room,store.now()) ? 120 : Math.max(20, room.auction.endsAt - store.now() + 40);
    const timeout = window.setTimeout(() => closeCurrentAuction(characterId), delay);
    return () => window.clearTimeout(timeout);
  }, [closeCurrentAuction, currentCharacter, isHost, room, uid, store]);

  useEffect(() => {
    if (room && uid && !room.players[uid] && room.moderator?.uid !== uid) {
      setToast("Bu sekme odaya oyuncu olarak katılmamış. Ana sayfadan tekrar gir.");
    }
  }, [room, uid]);

  async function fetchJson(url: string, payload: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "AI isteği başarısız.");
    return data;
  }

  async function selectMode(mode: GameMode) {
    if (!uid || !isHost || busy) return;
    setBusy(true);
    try {
      await mutate((current) => setGameMode(current, uid, mode));
      setToast(mode === "chaos" ? "Kaos modu açık! Her 3 ihalede bir sürpriz 🎲" : "Klasik moda dönüldü.");
    } catch {
      // mutate already shows the error; no local optimistic mode can diverge.
    } finally {
      setBusy(false);
    }
  }

  function againstSnapshot(snapshot: RoomState, transition: (current: RoomState) => RoomState) {
    return (current: RoomState) => {
      if (current.updatedAt !== snapshot.updatedAt || current.status !== snapshot.status ||
          current.characterCategory !== snapshot.characterCategory || current.rerollsLeft !== snapshot.rerollsLeft) {
        throw new Error("Masa başka bir işlemle değişti. Güncel turda tekrar dene; zar hakkın harcanmadı.");
      }
      return transition(current);
    };
  }

  async function generateRound() {
    if (!room || !uid || !isHost || busy) return;
    setBusy(true);
    setToast("AI oyun masasını hazırlıyor…");
    try {
      const payload = await fetchJson("/api/round", { playerCount: players.length, slots: room.slots, excludedScenarios: Object.values(room.series?.completed ?? {}).map(r=>r.scenario) }) as RoundPayload;
      await mutate(againstSnapshot(room, (current) => applyRoundPreview(current, uid, payload, store.now())));
      setToast(payload.source === "groq" ? "AI turu hazırladı ✨" : "Hazır katalog turu oluşturuldu; evren ve karakterler eşleşiyor.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Tur üretilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function rerollScenario() {
    if (!room || !uid || !isHost || room.rerollsLeft <= 0) return;
    setBusy(true);
    try {
      const data = await fetchJson("/api/reroll", {
        kind: "scenario",
        scenario: room.scenario,
        characterCategory: room.characterCategory,
        characters: room.characters,
        playerCount: players.length,
        slots: room.slots,
      });
      await mutate(againstSnapshot(room, (current) => applyScenarioReroll(current, uid, data.scenario)));
      setToast("Görev zarlandı 🎲");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Zar çalışmadı.");
    } finally {
      setBusy(false);
    }
  }

  async function rerollCategory() {
    if (!room || !uid || !isHost || room.rerollsLeft <= 0) return;
    setBusy(true);
    try {
      const data = await fetchJson("/api/reroll", {
        kind: "category",
        scenario: room.scenario,
        characterCategory: room.characterCategory,
        characters: room.characters,
        playerCount: players.length,
        slots: room.slots,
      });
      await mutate(againstSnapshot(room, (current) => applyCategoryReroll(current, uid, {
        characterCategory: data.characterCategory,
        characters: data.characters,
        source: data.source,
      })));
      setToast("Karakter evreni değişti 🌈");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Kategori zarında sorun oldu.");
    } finally {
      setBusy(false);
    }
  }

  async function rerollCharacter(index: number) {
    if (!room || !uid || !isHost || room.rerollsLeft <= 0) return;
    setBusy(true);
    try {
      const data = await fetchJson("/api/reroll", {
        kind: "character",
        scenario: room.scenario,
        characterCategory: room.characterCategory,
        characters: room.characters,
        playerCount: players.length,
        slots: room.slots,
        index,
      });
      await mutate(againstSnapshot(room, (current) => applyCharacterReroll(current, uid, index, data.character as CharacterSeed)));
      setToast("Karakter değişti ✨");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Karakter zarında sorun oldu.");
    } finally {
      setBusy(false);
    }
  }

  async function beginAuction() {
    if (!room || !uid || !isHost) return;
    try {
      const actionNow = store.now();
      await mutate((current) => startAuction(current, uid, actionNow));
      setToast("Açık artırma başladı! 🔔");
    } catch {
      // toast handled by mutate
    }
  }

  async function bid(increment: number, allIn = false) {
    if (!room || !uid || !me || isHost) return;
    const amount = allIn ? me.balance : room.auction.currentBid + increment;
    try {
      const actionNow = store.now(); const characterId = room.characters[room.auction.index]?.id;
      await mutate((current) => placeBid(current, uid, amount, actionNow, characterId));
    } catch {
      // toast handled by mutate
    }
  }

  async function chooseRps(move: RpsMove) {
    if (!room || !uid) return;
    try {
      await mutate((current) => submitRpsChoice(current, uid, move));
    } catch {
      // toast handled by mutate
    }
  }

  async function draftCharacter(characterId: string) {
    if (!room || !uid) return;
    try {
      await mutate((current) => pickLeftover(current, uid, characterId));
    } catch {
      // toast handled by mutate
    }
  }

  async function runJudge() {
    if (!room || !uid || !isHost || busy || room.judge) return;
    const requestId = crypto.randomUUID(); const actionNow = store.now();
    setBusy(true); setToast("AI jüri kriterleri değerlendiriyor…");
    try {
      const locked = await mutate(current => claimJudging(current, uid, requestId, actionNow));
      const teams = Object.values(locked.players).filter(p=>p.uid!==locked.moderator?.uid).sort((a,b)=>a.seat-b.seat).map(p=>({playerUid:p.uid,nickname:p.nickname,characters:p.team}));
      const judge = await fetchJson("/api/judge", { scenario:locked.scenario,characterCategory:locked.characterCategory,slots:locked.slots,moderatorUid:locked.moderator?.uid,teams }) as JudgeResult;
      const savedAt = store.now();
      await mutate(current => saveJudge(current,uid,judge,savedAt,locked.roundId,requestId));
      setToast("Jüri kaydedildi. Sonucu sahne sahne açabilirsin ✦");
    } catch(error) {
      try { const failedAt=store.now(); await store.mutate(code,current=>releaseJudging(current,uid,requestId,failedAt)); } catch { /* lease expires if connection is lost */ }
      setToast(error instanceof Error ? error.message : "Jüri sonuç veremedi. Puanlar değişmedi.");
    } finally { setBusy(false); }
  }

  async function moderatorAction(action: (r:RoomState,actor:string,at:number)=>RoomState) {
    if(!uid || !isHost || busy)return;
    setBusy(true); const at=store.now();
    try { await mutate(current=>action(current,uid,at)); } catch { /* mutate shows error */ } finally {setBusy(false);}
  }
  async function withdraw() {
    if(!room || !uid || !me || isHost)return;
    const id=room.characters[room.auction.index]?.id;const at=store.now();
    try {await mutate(current=>withdrawAuction(current,uid,id,at));}catch { /* mutate shows error */ }
  }

  useEffect(()=>{
    if(!room)return;
    const current={sales:room.sales?.length??0,bid:room.auction.currentBid,round:room.roundId,step:room.presentationStep??0};
    const previous=lastSoundState.current; lastSoundState.current=current;
    if(!previous || previous.round!==current.round)return;
    if(current.step===4 && previous.step<4)experience.play('win');
    else if(current.sales>previous.sales)experience.play('sale');
    else if(current.bid>previous.bid)experience.play('bid');
  },[room,experience.play]);

  if (!room || !uid) {
    return <main className="loading-screen"><div className="loading-mascot"><PolyAvatar seed="loading" size={84}/><span>{toast || "KADRO masası kuruluyor…"}</span>{toast&&<button className="secondary-button" onClick={()=>router.push("/kadro")}>Ana sayfa</button>}</div></main>;
  }

  if (room.schemaVersion !== 2) {
    return <main className="loading-screen"><section className="empty-card kawaii-card"><h2>Yeni moderatör masası hazır.</h2><p>Bu oda önceki sürümle açılmış. Oyuncu kadrolarını değiştirmemek için eski oda otomatik dönüştürülmedi. Herkes sayfayı yenilesin ve yeni bir oda açın.</p><button className="primary-button" onClick={()=>router.push("/kadro")}>Yeni oda aç</button></section></main>;
  }

  if (!me && !isHost) {
    return (
      <main className="loading-screen">
        <div className="empty-card kawaii-card">
          <h2>Bu sekme odada değil.</h2>
          <p>Nickname ile tekrar katılman gerekiyor.</p>
          <button className="primary-button" onClick={() => router.push("/kadro")}>Ana sayfaya dön</button>
        </div>
      </main>
    );
  }

  const host = room.moderator ?? room.players[room.hostUid];
  const unsoldCharacters = room.characters.filter((character) => character.status === "unsold");
  const myRpsChoice = room.rps?.choices[uid];
  const rpsContender = Boolean(room.rps?.contenders.includes(uid));
  const draftPlayer = room.draftTurnUid ? room.players[room.draftTurnUid] : null;

  return (
    <main className={`room-shell ${experience.reducedMotion ? "reduce-motion" : ""}`} data-scene={sceneTheme(room.scenario)}>
      <div className="soft-grid" />
      <header className="room-topbar">
        <button className="mini-logo" onClick={() => router.push("/kadro")}>KADRO<span>!</span></button>
        <div className="room-meta">
          <button className="room-code" onClick={() => navigator.clipboard.writeText(code)}>{code}<Copy size={14}/></button>
          <span className={`mode-badge ${store.mode}`}>{store.mode === "firebase" ? "● ONLINE" : "● LOCAL"}</span>
        </div>
        <div className="me-chip">
          <PolyAvatar seed={uid} size={40}/>
          <div><small>{isHost ? host?.nickname : me?.nickname}</small><strong>{isHost ? "MODERATÖR" : `₺${me?.balance ?? 0}`}</strong></div>
        </div>
      </header>

      <div className="table-toolbar"><div className="moderator-badge"><PolyAvatar seed={room.hostUid} size={30}/><b>{host?.nickname || "Moderatör"}</b><span>masayı yönetiyor · oynamıyor</span></div><GameGuide/><ExperienceControls experience={experience}/></div>
      <p className="stage-help" role="status">{stageHelp(room)}</p>
      {room.schemaVersion !== 2 && <div className="legacy-notice">Bu oda önceki sürüme ait. Moderatör ve turnuva özellikleri için ana sayfadan yeni oda oluştur.</div>}
      {room.status !== "results" && <SeriesBoard room={room}/>}

      {room.status === "lobby" && (
        <section className="lobby-screen game-section">
          <div className="lobby-main kawaii-card">
            <div className="section-kicker"><Users size={16}/> OYUNCULAR TOPLANIYOR</div>
            <h2>Masada kimler var?</h2>
            <p className="section-copy">Oda kodunu yarışmacılara gönder. Moderatör kadroya dahil değil; herkes gelince tur hazırlanacak.</p>
            <div className="players-grid">
              {players.map((player) => (
                <article className="player-tile" key={player.uid}>
                  <PolyAvatar seed={player.uid} size={68}/>
                  <div><strong>{player.nickname}</strong><small>{player.uid === room.hostUid ? "host ✦" : `koltuk ${player.seat + 1}`}</small></div>
                  {player.uid === room.hostUid && <Crown size={18}/>} 
                </article>
              ))}
              {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, index) => <div className="empty-player" key={index}>+</div>)}
            </div>
            {isHost ? (
              <button className="primary-button jumbo" disabled={busy || players.length < 2 || room.schemaVersion !== 2} onClick={generateRound}>
                <Sparkles size={20}/>{players.length < 2 ? "En az 2 oyuncu lazım" : "AI turu hazırlasın"}
              </button>
            ) : <div className="waiting-pill"><Hourglass size={16}/> {host?.nickname || "Host"} oyunu başlatacak</div>}
          </div>
          <aside className="lobby-side kawaii-card">
            <span className="tiny-label">MASA AYARLARI</span>
            <div className="big-stat"><small>Bütçe</small><strong>₺{room.budget}</strong></div>
            <div className="big-stat"><small>Kadro</small><strong>{room.slots}<em> slot</em></strong></div>
            <ModePicker value={room.mode ?? "classic"} disabled={!isHost || busy} onChange={selectMode}/>
            {room.series&&<SeriesPicker value={room.series.totalRounds} disabled={!isHost||busy||room.series.locked} onChange={rounds=>moderatorAction((r,a,at)=>configureSeries(r,a,rounds,at))}/>}
            <div className="rule-note">{players.length} yarışmacı + 1 moderatör. Paralar oyuncular içindir; moderatör jüri sıralamasında yer almaz.</div>
            <RubricCard compact/>
          </aside>
        </section>
      )}

      {room.status === "preview" && (
        <section className="preview-screen game-section">
          <div className="preview-heading">
            <div>
              <div className="section-kicker"><Bot size={16}/> AI GAME MASTER</div>
              <h2>Tur hazır. Beğenmediğini zarla.</h2>
            </div>
            <div className="reroll-counter"><Dices size={18}/><strong>{room.rerollsLeft}</strong><span>zar hakkı</span></div>
          </div>

          <div className="preview-top-grid">
            <article className="prompt-card scenario-card kawaii-card">
              <div className="prompt-card-head"><span>GÖREV</span>{isHost && <DiceButton compact disabled={busy || room.rerollsLeft <= 0} onClick={rerollScenario}/>}</div>
              <strong>{room.scenario}</strong>
              <p>AI jürisi finalde kadroları bu göreve göre puanlayacak.</p>
            </article>
            <article className="prompt-card category-card kawaii-card">
              <div className="prompt-card-head"><span>KARAKTER EVRENİ</span>{isHost && <DiceButton compact disabled={busy || room.rerollsLeft <= 0} onClick={rerollCategory}/>}</div>
              <strong>{room.characterCategory}</strong>
              <p>{room.characters.length} karakter bu evrenin kataloğundan seçildi. Yetersiz evrenler başka dizilerle doldurulmaz.</p>
            </article>
          </div>

          <RubricCard/>
          <div className="character-pool kawaii-card">
            <div className="pool-head"><div><span className="tiny-label">KARAKTER HAVUZU</span><h3>Kimler geliyor?</h3></div><span className="source-chip">{room.roundSource === "groq" ? "AI + katalog" : "hazır katalog"}</span></div>
            <div className="character-chip-grid">
              {room.characters.map((character, index) => (
                <CharacterCard key={character.id} character={character} action={isHost ? <DiceButton label="" compact disabled={busy || room.rerollsLeft<=0} onClick={()=>rerollCharacter(index)}/> : undefined}/>
              ))}
            </div>
          </div>

          <div className="preview-mode kawaii-card"><ModePicker value={room.mode ?? "classic"} disabled={!isHost || busy} onChange={selectMode}/></div>
          <div className="preview-actions">
            {isHost ? <button className="primary-button jumbo" disabled={busy} onClick={beginAuction}><Zap size={20}/> Açık artırmayı başlat</button> : <div className="waiting-pill"><Hourglass size={16}/> Host son zarları kontrol ediyor</div>}
          </div>
        </section>
      )}

      {room.status === "auction" && currentCharacter && (
        <section className="auction-screen game-section">
          {room.mode === "chaos" && <div className="chaos-mode-label"><Dices size={16}/> KAOS MODU <span>Her 3 ihale sonunda olay kartı</span></div>}
          {room.mode === "chaos" && lastChaosEvent && <ChaosBanner event={lastChaosEvent} seconds={chaosPauseSeconds}/>}
          <div className="scenario-ribbon"><span>{room.scenario}</span><i>×</i><span>{room.characterCategory}</span></div>
          <div className="auction-grid">
            <section className="auction-stage kawaii-card">
              <div className="auction-topline">
                <span>KARAKTER {room.auction.index + 1}/{room.characters.length}</span>
                <div className={`timer-pill ${!chaosPaused && remainingSeconds <= 3 ? "danger" : ""}`}><span>{chaosPaused ? 15 : remainingSeconds}</span> {chaosPaused ? "bekle" : "sn"}</div>
              </div>
              <div className="auction-progress"><span style={{ width: `${timerPercent}%` }}/></div>
              <PolyCharacter name={currentCharacter.name} source={currentCharacter.source}/>
              <div className="auction-title"><h2>{currentCharacter.name}</h2><p>{currentCharacter.source}</p></div>
              <CharacterProfile character={currentCharacter} expanded/>
              <div className="price-stack" key={`${currentCharacter.id}-${room.auction.currentBid}`}>
                <small>EN YÜKSEK TEKLİF</small>
                <strong>₺{room.auction.currentBid}</strong>
                <span>{topBidder ? `${topBidder.nickname} önde` : "Henüz teklif yok"}</span>
              </div>
              {me && !isHost && <div className="bid-controls">
                {[1, 5, 10].map((increment) => (
                  <button key={increment} onClick={() => bid(increment)} disabled={Boolean(room.auction.withdrawn?.[uid]) || chaosPaused || remainingMs <= 0 || me.team.length >= room.slots || room.auction.currentBid + increment > me.balance}>+₺{increment}</button>
                ))}
                <button className="all-in" onClick={() => bid(0, true)} disabled={Boolean(room.auction.withdrawn?.[uid]) || chaosPaused || remainingMs <= 0 || me.team.length >= room.slots || me.balance <= room.auction.currentBid}>ALL IN</button>
              </div>}
              {me && !isHost && <button className="withdraw-button" disabled={chaosPaused || remainingMs<=0 || room.auction.bidderUid===uid || Boolean(room.auction.withdrawn?.[uid]) || me.team.length>=room.slots} onClick={withdraw}>{room.auction.withdrawn?.[uid] ? "Bu ihaleden çekildin · sıradaki kartı bekle" : "Bu ihaleden çekil"}</button>}
              {isHost && <div className="moderator-auction-note">Teklif vermezsin; masayı yönetiyorsun. Rakip teklif kalmazsa ihale otomatik kapanır.</div>}
              {isHost && <button className="host-skip" disabled={chaosPaused || !auctionCanClose(room,now)} onClick={() => closeCurrentAuction(currentCharacter.id)}>İhaleyi sonuçlandır <ChevronRight size={15}/></button>}
            </section>

            <aside className="auction-sidebar">
              <div className="score-card kawaii-card">
                <div className="side-title"><Coins size={16}/> MASA</div>
                {players.map((player) => (
                  <div className={`score-player ${player.uid === uid ? "me" : ""}`} key={player.uid}>
                    <PolyAvatar seed={player.uid} size={42}/>
                    <div><strong>{player.nickname}</strong><small>{player.team.length}/{room.slots} karakter</small></div>
                    <b>₺{player.balance}</b>
                  </div>
                ))}
              </div>
              <TableView room={room}/>
            </aside>
          </div>
        </section>
      )}

      {room.status === "rps" && room.rps && (
        <section className="rps-screen game-section">
          <div className="rps-card kawaii-card">
            <div className="section-kicker"><Hand size={16}/> KALANLAR İÇİN SIRA KAVGASI</div>
            <h2>Taş. Kağıt. Makas!</h2>
            <p>{room.rps.message}</p>
            <div className="rps-round">TUR {room.rps.round}</div>
            <div className="rps-contenders">
              {room.rps.contenders.map((playerUid) => {
                const player = room.players[playerUid];
                const locked = Boolean(room.rps?.choices[playerUid]);
                return <div className={`rps-player ${locked ? "locked" : ""}`} key={playerUid}><PolyAvatar seed={playerUid} size={60}/><strong>{player.nickname}</strong><small>{locked ? "seçti ✓" : "düşünüyor…"}</small></div>;
              })}
            </div>
            {rpsContender ? (
              <div className="rps-buttons">
                {rpsChoices.map((choice) => <button className={myRpsChoice === choice.move ? "selected" : ""} key={choice.move} disabled={Boolean(myRpsChoice)} onClick={() => chooseRps(choice.move)}><span>{choice.emoji}</span><strong>{choice.label}</strong></button>)}
              </div>
            ) : <div className="waiting-pill"><Hourglass size={16}/> Bu eşleşmede beklemedesin</div>}
            {myRpsChoice && <p className="choice-lock"><Check size={16}/> Seçimin kilitlendi. Diğer oyuncular bekleniyor.</p>}
          </div>
        </section>
      )}

      {room.status === "leftovers" && (
        <section className="leftover-screen game-section">
          <div className="leftover-head">
            <div><div className="section-kicker"><Sparkles size={16}/> BEDAVA DRAFT</div><h2>Satılmayanları kap.</h2><p>Para harcanmaz. Sıran gelince seç; dolu kadrolar sıradan çıkar.</p></div>
            {draftPlayer && <div className="turn-card"><PolyAvatar seed={draftPlayer.uid} size={52}/><div><small>ŞİMDİ SIRA</small><strong>{draftPlayer.nickname}</strong></div></div>}
          </div>
          <div className="leftover-grid">
            {unsoldCharacters.map((character) => (
              <article className="leftover-profile-card kawaii-card" key={character.id}><CharacterCard character={character}/><button className="primary-button" disabled={isHost || room.draftTurnUid!==uid || !me || me.team.length>=room.slots} onClick={()=>draftCharacter(character.id)}>Ücretsiz seç · ₺0</button></article>
            ))}
          </div>
          {room.draftTurnUid !== uid && <div className="waiting-pill centered"><Hourglass size={16}/> {draftPlayer?.nickname || "Sıradaki oyuncu"} seçiyor</div>}
        </section>
      )}

      {room.status === "results" && <ResultShow room={room} isModerator={isHost} busy={busy} now={now} onJudge={runJudge} onAdvance={step=>moderatorAction((r,a,at)=>advancePresentation(r,a,step,at))} onNext={()=>moderatorAction(nextSeriesRound)} onRematch={()=>moderatorAction(resetSeries)}/>}

      {uid && (me || isHost) && <GameSocial game="kadro" code={code} participant={{ uid, nickname: isHost ? room.moderator?.nickname ?? "Moderatör" : me?.nickname ?? "Oyuncu", role: isHost ? "moderator" : "player" }} />}

      {toast && <button role="status" className="toast" onClick={() => setToast("")}>{toast}</button>}
    </main>
  );
}
