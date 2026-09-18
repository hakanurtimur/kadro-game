"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { raceState, signalAt } from "@/lib/microgame/skill-model";
import type { PressChange } from "@/lib/microgame/skill-types";
import { capture, COLORS, Feedback, Preparation, release, Stage, useArenaChannel, useEvidence, useGameClock, type GameProps } from "./shared";
import css from "./royale.module.css";
export default function RedLightGame(props: GameProps) {
    const { round, uid, room } = props, { now, store } = useGameClock(), submission = useEvidence(props), live = useArenaChannel(room.code, room.roundNumber);
    const changes = useRef<PressChange[]>([]), pointer = useRef<number | null>(null), lastPublish = useRef(0);
    const [holding, setHolding] = useState(false), [version, setVersion] = useState(0);
    const active = now >= round.startsAt && now < round.endsAt && !submission.attempted;
    function change(held: boolean) { const at = store.now(); if (at < round.startsAt || at >= round.endsAt)
        return; const list = changes.current; if (list.at(-1)?.held === held)
        return; if (list.at(-1)?.at === at)
        list[list.length - 1] = { held, at };
    else if (list.length < 238)
        list.push({ held, at }); setHolding(held); setVersion(v => v + 1); }
    useEffect(() => { const blur = () => { if (pointer.current !== null || changes.current.at(-1)?.held) {
        pointer.current = null;
        const at = store.now();
        if (at >= round.startsAt && at < round.endsAt) {
            const old = changes.current.at(-1);
            if (old?.held && old.at < at)
                changes.current.push({ held: false, at });
        }
        setHolding(false);
        setVersion(v => v + 1);
    } }; window.addEventListener("blur", blur); return () => window.removeEventListener("blur", blur); }, [round, store]);
    const race = raceState(round, changes.current, now);
    useEffect(() => { if (now >= round.startsAt && !submission.attempted) {
        if (now >= round.endsAt || race.finishedAt)
            submission.submit({ kind: "run", changes: changes.current });
        if (now - lastPublish.current >= 120) {
            lastPublish.current = now;
            void live.publish(uid, 50, 100 - race.progress);
        }
    } }, [now, uid, round, submission.attempted, submission.submit, live.publish, race.progress, race.finishedAt, version]);
    function down(e: ReactPointerEvent<HTMLDivElement>) { if (!active || pointer.current !== null || !capture(e))
        return; pointer.current = e.pointerId; change(true); }
    function up(e: ReactPointerEvent<HTMLDivElement>) { if (pointer.current !== e.pointerId)
        return; pointer.current = null; change(false); release(e); }
    const signal = signalAt(round, now), players = Object.values(room.players).sort((a, b) => a.seat - b.seat);
    return <Stage round={round} now={now} title="Kırmızı Işık" hint="Yeşilde basılı tutarak koş. Kırmızı yanınca bırak; yoksa 22 adım geri gidersin.">
  {now < round.startsAt ? <Preparation round={round} now={now}/> : <>
    <div className={`${css.signal} ${signal.go ? css.go : css.stop}`} role="status">{race.finishedAt ? "BİTİŞ!" : now >= round.endsAt ? "Yarış bitti" : signal.go ? "YEŞİL · KOŞ" : "KIRMIZI · DUR"}</div>
    <div className={css.raceTrack} style={{ "--lane-count": players.length } as CSSProperties}>
      {players.map(p => { const remote = live.positions[p.uid]; const progress = p.uid === uid ? race.progress : remote ? 100 - remote.y : 0; return <div className={css.raceLane} key={p.uid}><span className={css.finishLine}>⚑</span><span className={css.raceRunner} style={{ bottom: `${8 + Math.min(100, progress) * .75}%`, background: COLORS[p.seat] }}>{p.nickname.slice(0, 1).toLocaleUpperCase("tr-TR")}</span><b>{p.uid === uid ? "Sen" : p.nickname}</b></div>; })}
    </div>
    <div className={`${css.runPad} ${holding ? css.pressed : ""}`} role="button" tabIndex={0} aria-label="Koşmak için basılı tut" aria-pressed={holding} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat && active) {
            e.preventDefault();
            change(true);
        } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            change(false);
        } }}>
      <b>{race.finishedAt ? "Bitişe ulaştın" : holding ? "Koşuyorsun…" : "Koşmak için basılı tut"}</b><small>{Math.round(race.progress)} / 100 · {race.penalties} kırmızı ihlali</small>
    </div>{live.error && <p className={css.error} role="alert">{live.error}</p>}<Feedback submission={submission}/>
  </>}
 </Stage>;
}
