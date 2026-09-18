"use client";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { releaseAt } from "@/lib/microgame/skill-model";
import { capture, Feedback, Preparation, release, Stage, useEvidence, useGameClock, type GameProps } from "./shared";
import css from "./royale.module.css";
export default function HoldReleaseGame(props: GameProps) {
    const { round } = props, { now, store } = useGameClock(), submission = useEvidence(props);
    const pointer = useRef<{
        id: number;
        at: number;
    } | null>(null);
    const [holding, setHolding] = useState(false), [notice, setNotice] = useState("");
    const cue = releaseAt(round);
    const submitRef = useRef(submission.submit);
    submitRef.current = submission.submit;
    function end(cancelled: boolean) { const p = pointer.current; if (!p)
        return; pointer.current = null; setHolding(false); const at = store.now(); if (at < round.startsAt) {
        setNotice("Başlamadan yeniden basılı tutabilirsin.");
        return;
    } submitRef.current({ kind: "release", downAt: p.at, upAt: Math.min(at, round.endsAt), cancelled: cancelled || at >= round.endsAt }); }
    useEffect(() => { const cancel = () => { if (document.visibilityState !== "visible" && pointer.current) {
        const p = pointer.current;
        pointer.current = null;
        setHolding(false);
        const at = store.now();
        if (at >= round.startsAt)
            submitRef.current({ kind: "release", downAt: p.at, upAt: Math.min(at, round.endsAt), cancelled: true });
    } }; document.addEventListener("visibilitychange", cancel); return () => document.removeEventListener("visibilitychange", cancel); }, [round, store]);
    useEffect(() => { if (now >= round.endsAt && pointer.current) {
        const p = pointer.current;
        pointer.current = null;
        setHolding(false);
        submission.submit({ kind: "release", downAt: p.at, upAt: round.endsAt, cancelled: true });
    } }, [now, round.endsAt, submission.submit]);
    function down(e: ReactPointerEvent<HTMLDivElement>) { const at = store.now(); if (pointer.current || submission.attempted || at < round.instructionsUntil || at > round.startsAt + 700)
        return; if (!capture(e))
        return; pointer.current = { id: e.pointerId, at }; setHolding(true); setNotice(""); }
    function up(e: ReactPointerEvent<HTMLDivElement>) { if (pointer.current?.id !== e.pointerId)
        return; end(e.type === "pointercancel"); release(e); }
    const text = now < round.startsAt ? `Hazır ol · ${Math.ceil((round.startsAt - now) / 1000)}` : now >= cue ? "ŞİMDİ BIRAK!" : ["BIRAKMA!", "SAKIN BIRAKMA", "DAHA DEĞİL"][Math.floor((now - round.startsAt) / 1150) % 3];
    return <Stage round={round} now={now} title="Parmağını Çekme" hint="Geri sayımda basılı tut. Yalnızca ŞİMDİ BIRAK! komutunda parmağını kaldır.">
  {now < round.instructionsUntil ? <Preparation round={round} now={now}/> : <>
   <div className={`${css.signal} ${now >= cue ? css.go : css.holdSignal}`} role="status">{now >= round.endsAt ? "Süre doldu" : submission.attempted ? "Yanıtın kaydediliyor" : text}</div>
   <div className={`${css.holdPad} ${holding ? css.pressed : ""} ${now >= cue ? css.releaseCue : ""}`} role="button" tabIndex={0} aria-label="Geri sayımda basılı tut ve doğru anda bırak" aria-pressed={holding} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat && now >= round.instructionsUntil && now <= round.startsAt + 700 && !pointer.current && !submission.attempted) {
            e.preventDefault();
            pointer.current = { id: -1, at: store.now() };
            setHolding(true);
        } }} onKeyUp={e => { if ((e.key === " " || e.key === "Enter") && pointer.current?.id === -1) {
            e.preventDefault();
            end(false);
        } }}>
      <span aria-hidden="true">{holding ? "◉" : "◎"}</span><b>{holding ? "Tutmaya devam et" : now <= round.startsAt + 700 ? "Şimdi basılı tut" : "Tutuş tamamlandı"}</b><small>{notice || "Telefon: parmağını tut · PC: mouse'a basılı tut"}</small>
   </div><Feedback submission={submission}/>
  </>}
 </Stage>;
}
