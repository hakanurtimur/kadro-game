"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  startAuction,
  submitRpsChoice,
} from "@/lib/game-engine";
import { getGameStore } from "@/lib/game-store";
import type { CharacterSeed, JudgeResult, RoomState, RoundPayload, RpsMove } from "@/lib/types";

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

  const players = useMemo(() => room ? Object.values(room.players).sort((a, b) => a.seat - b.seat) : [], [room]);
  const me = uid && room ? room.players[uid] : null;
  const isHost = Boolean(uid && room?.hostUid === uid);
  const currentCharacter = room?.status === "auction" ? room.characters[room.auction.index] : null;
  const topBidder = room?.auction.bidderUid ? room.players[room.auction.bidderUid] : null;
  const remainingMs = room?.auction.endsAt ? Math.max(0, room.auction.endsAt - now) : 0;
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
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
        });
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
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

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
      await mutate((current) => closeAuction(current, uid, characterId, Date.now()));
    } catch {
      // A stale timer may race with a manual close; the toast already explains it.
    }
  }, [isHost, mutate, uid]);

  useEffect(() => {
    if (!room || !uid || !isHost || room.status !== "auction" || !room.auction.endsAt || !currentCharacter) return;
    const characterId = currentCharacter.id;
    const delay = Math.max(20, room.auction.endsAt - Date.now() + 40);
    const timeout = window.setTimeout(() => closeCurrentAuction(characterId), delay);
    return () => window.clearTimeout(timeout);
  }, [closeCurrentAuction, currentCharacter, isHost, room, uid]);

  useEffect(() => {
    if (room && uid && !room.players[uid]) {
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

  async function generateRound() {
    if (!room || !uid || !isHost) return;
    setBusy(true);
    setToast("AI oyun masasını hazırlıyor…");
    try {
      const payload = await fetchJson("/api/round", { playerCount: players.length, slots: room.slots }) as RoundPayload;
      await mutate((current) => applyRoundPreview(current, uid, payload));
      setToast(payload.source === "groq" ? "AI turu hazırladı ✨" : "Demo turu hazır. Groq key ekleyince AI devreye girer.");
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
      await mutate((current) => applyScenarioReroll(current, uid, data.scenario));
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
      await mutate((current) => applyCategoryReroll(current, uid, {
        characterCategory: data.characterCategory,
        characters: data.characters,
        source: data.source,
      }));
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
      await mutate((current) => applyCharacterReroll(current, uid, index, data.character as CharacterSeed));
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
      await mutate((current) => startAuction(current, uid, Date.now()));
      setToast("Açık artırma başladı! 🔔");
    } catch {
      // toast handled by mutate
    }
  }

  async function bid(increment: number, allIn = false) {
    if (!room || !uid || !me) return;
    const amount = allIn ? me.balance : room.auction.currentBid + increment;
    try {
      await mutate((current) => placeBid(current, uid, amount, Date.now()));
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
    if (!room || !uid || !isHost) return;
    setBusy(true);
    setToast("AI jüri kadroları didikliyor…");
    try {
      const teams = players.map((player) => ({
        playerUid: player.uid,
        nickname: player.nickname,
        balance: player.balance,
        characters: player.team.map((member) => member.name),
      }));
      const judge = await fetchJson("/api/judge", {
        scenario: room.scenario,
        characterCategory: room.characterCategory,
        teams,
      }) as JudgeResult;
      await mutate((current) => saveJudge(current, uid, judge));
      setToast(judge.source === "groq" ? "Jüri kararını verdi 🏆" : "Demo jüri kararını verdi.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Jüri cevap veremedi.");
    } finally {
      setBusy(false);
    }
  }

  if (!room || !uid) {
    return <main className="loading-screen"><div className="loading-mascot"><PolyAvatar seed="loading" size={84}/><span>KADRO masası kuruluyor…</span></div></main>;
  }

  if (!me) {
    return (
      <main className="loading-screen">
        <div className="empty-card kawaii-card">
          <h2>Bu sekme odada değil.</h2>
          <p>Nickname ile tekrar katılman gerekiyor.</p>
          <button className="primary-button" onClick={() => router.push("/")}>Ana sayfaya dön</button>
        </div>
      </main>
    );
  }

  const host = room.players[room.hostUid];
  const unsoldCharacters = room.characters.filter((character) => character.status === "unsold");
  const myRpsChoice = room.rps?.choices[uid];
  const rpsContender = Boolean(room.rps?.contenders.includes(uid));
  const draftPlayer = room.draftTurnUid ? room.players[room.draftTurnUid] : null;

  return (
    <main className="room-shell">
      <div className="soft-grid" />
      <header className="room-topbar">
        <button className="mini-logo" onClick={() => router.push("/")}>KADRO<span>!</span></button>
        <div className="room-meta">
          <button className="room-code" onClick={() => navigator.clipboard.writeText(code)}>{code}<Copy size={14}/></button>
          <span className={`mode-badge ${store.mode}`}>{store.mode === "firebase" ? "● ONLINE" : "● LOCAL"}</span>
        </div>
        <div className="me-chip">
          <PolyAvatar seed={uid} size={40}/>
          <div><small>{me.nickname}</small><strong>₺{me.balance}</strong></div>
        </div>
      </header>

      {room.status === "lobby" && (
        <section className="lobby-screen game-section">
          <div className="lobby-main kawaii-card">
            <div className="section-kicker"><Users size={16}/> OYUNCULAR TOPLANIYOR</div>
            <h2>Masada kimler var?</h2>
            <p className="section-copy">Oda kodunu arkadaşlarına at. Herkes gelince AI ilk turu hazırlasın.</p>
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
              <button className="primary-button jumbo" disabled={busy || players.length < 2} onClick={generateRound}>
                <Sparkles size={20}/>{players.length < 2 ? "En az 2 oyuncu lazım" : "AI turu hazırlasın"}
              </button>
            ) : <div className="waiting-pill"><Hourglass size={16}/> {host?.nickname || "Host"} oyunu başlatacak</div>}
          </div>
          <aside className="lobby-side kawaii-card">
            <span className="tiny-label">MASA AYARLARI</span>
            <div className="big-stat"><small>Bütçe</small><strong>₺{room.budget}</strong></div>
            <div className="big-stat"><small>Kadro</small><strong>{room.slots}<em> slot</em></strong></div>
            <div className="rule-note">Karakterleri açık artırmada topla. Para biterse üzülme; satılmayan karakterler için RPS sonrası bedava draft var.</div>
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
              <p>{room.characters.length} karakter açık artırma sırasını bekliyor.</p>
            </article>
          </div>

          <div className="character-pool kawaii-card">
            <div className="pool-head"><div><span className="tiny-label">KARAKTER HAVUZU</span><h3>Kimler geliyor?</h3></div><span className="source-chip">{room.roundSource === "groq" ? "AI generated" : "demo pool"}</span></div>
            <div className="character-chip-grid">
              {room.characters.map((character, index) => (
                <div className="character-chip" key={character.id}>
                  <PolyCharacter name={character.name} small/>
                  <div><strong>{character.name}</strong><small>{character.source}</small></div>
                  {isHost && <DiceButton label="" compact disabled={busy || room.rerollsLeft <= 0} onClick={() => rerollCharacter(index)}/>} 
                </div>
              ))}
            </div>
          </div>

          <div className="preview-actions">
            {isHost ? <button className="primary-button jumbo" disabled={busy} onClick={beginAuction}><Zap size={20}/> Açık artırmayı başlat</button> : <div className="waiting-pill"><Hourglass size={16}/> Host son zarları kontrol ediyor</div>}
          </div>
        </section>
      )}

      {room.status === "auction" && currentCharacter && (
        <section className="auction-screen game-section">
          <div className="scenario-ribbon"><span>{room.scenario}</span><i>×</i><span>{room.characterCategory}</span></div>
          <div className="auction-grid">
            <section className="auction-stage kawaii-card">
              <div className="auction-topline">
                <span>KARAKTER {room.auction.index + 1}/{room.characters.length}</span>
                <div className={`timer-pill ${remainingSeconds <= 3 ? "danger" : ""}`}><span>{remainingSeconds}</span> sn</div>
              </div>
              <div className="auction-progress"><span style={{ width: `${timerPercent}%` }}/></div>
              <PolyCharacter name={currentCharacter.name} source={currentCharacter.source}/>
              <div className="auction-title"><h2>{currentCharacter.name}</h2><p>{currentCharacter.source}</p></div>
              <div className="price-stack">
                <small>EN YÜKSEK TEKLİF</small>
                <strong>₺{room.auction.currentBid}</strong>
                <span>{topBidder ? `${topBidder.nickname} önde` : "Henüz teklif yok"}</span>
              </div>
              <div className="bid-controls">
                {[1, 5, 10].map((increment) => (
                  <button key={increment} onClick={() => bid(increment)} disabled={me.team.length >= room.slots || room.auction.currentBid + increment > me.balance}>+₺{increment}</button>
                ))}
                <button className="all-in" onClick={() => bid(0, true)} disabled={me.team.length >= room.slots || me.balance <= room.auction.currentBid}>ALL IN</button>
              </div>
              {isHost && <button className="host-skip" onClick={() => closeCurrentAuction(currentCharacter.id)}>Şimdi kapat <ChevronRight size={15}/></button>}
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
              <div className="my-roster kawaii-card">
                <div className="side-title"><Sparkles size={16}/> KADRON</div>
                {me.team.length === 0 && <p className="empty-copy">Henüz kimseyi kapamadın.</p>}
                {me.team.map((member, index) => (
                  <div className="roster-line" key={member.characterId}><span>{index + 1}</span><div><strong>{member.name}</strong><small>{member.source}</small></div><b>{member.price ? `₺${member.price}` : "FREE"}</b></div>
                ))}
                {Array.from({ length: Math.max(0, room.slots - me.team.length) }).map((_, index) => <div className="roster-empty" key={index}>boş slot</div>)}
              </div>
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
            <div><div className="section-kicker"><Sparkles size={16}/> BEDAVA DRAFT</div><h2>Satılmayanları kap.</h2><p>Para yok, teklif yok. Sıran gelince istediğini seç.</p></div>
            {draftPlayer && <div className="turn-card"><PolyAvatar seed={draftPlayer.uid} size={52}/><div><small>ŞİMDİ SIRA</small><strong>{draftPlayer.nickname}</strong></div></div>}
          </div>
          <div className="leftover-grid">
            {unsoldCharacters.map((character) => (
              <button className="leftover-card kawaii-card" key={character.id} disabled={room.draftTurnUid !== uid || me.team.length >= room.slots} onClick={() => draftCharacter(character.id)}>
                <PolyCharacter name={character.name} small/>
                <strong>{character.name}</strong><small>{character.source}</small><span>₺0 • BEDAVA</span>
              </button>
            ))}
          </div>
          {room.draftTurnUid !== uid && <div className="waiting-pill centered"><Hourglass size={16}/> {draftPlayer?.nickname || "Sıradaki oyuncu"} seçiyor</div>}
        </section>
      )}

      {room.status === "results" && (
        <section className="results-screen game-section">
          <div className="results-heading">
            <div className="section-kicker"><Trophy size={16}/> FİNAL</div>
            <h2>{room.judge ? "AI kararını verdi." : "Kadrolar masada."}</h2>
            <p><b>{room.scenario}</b> görevi için kim en iyi ekibi kurdu?</p>
          </div>

          <div className="result-grid">
            {players.map((player) => {
              const ranking = room.judge?.rankings.find((item) => item.playerUid === player.uid);
              const winner = room.judge?.winnerUid === player.uid;
              return (
                <article className={`result-card kawaii-card ${winner ? "winner" : ""}`} key={player.uid}>
                  {winner && <div className="winner-crown">👑 KAZANAN</div>}
                  <div className="result-player"><PolyAvatar seed={player.uid} size={64}/><div><small>OYUNCU</small><h3>{player.nickname}</h3></div>{ranking && <div className="score-bubble">{ranking.score}</div>}</div>
                  <div className="result-roster">
                    {player.team.map((member, index) => <div key={member.characterId}><span>{String(index + 1).padStart(2, "0")}</span><strong>{member.name}</strong><small>{member.acquisition === "leftover" ? "FREE" : `₺${member.price}`}</small></div>)}
                  </div>
                  {ranking ? <p className="judge-comment">“{ranking.comment}”</p> : <p className="judge-comment muted">Jüri henüz konuşmadı.</p>}
                </article>
              );
            })}
          </div>

          {room.judge?.summary && <div className="judge-summary"><Bot size={20}/><span>{room.judge.summary}</span></div>}
          <div className="results-actions">
            {isHost && !room.judge && <button className="primary-button jumbo" disabled={busy} onClick={runJudge}><Sparkles size={20}/> AI jüriyi çalıştır</button>}
            {!isHost && !room.judge && <div className="waiting-pill"><Hourglass size={16}/> Host AI jüriyi çağıracak</div>}
            {isHost && room.judge && <button className="primary-button jumbo" disabled={busy} onClick={generateRound}><RotateCcw size={19}/> Yeni tur</button>}
          </div>
        </section>
      )}

      {toast && <button className="toast" onClick={() => setToast("")}>{toast}</button>}
    </main>
  );
}
