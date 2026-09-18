"use client";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { classifyGesture, gestureSequence, GESTURE_ICONS, GESTURE_LABELS, GESTURE_PREVIEW_MS } from "@/lib/microgame/skill-model";
import type { GestureAttempt } from "@/lib/microgame/skill-types";
import { capture, Feedback, point, Preparation, release, Stage, useEvidence, useGameClock, type GameProps } from "./shared";
import css from "./royale.module.css";
export default function EchoGesturesGame(props: GameProps) {
    const { round } = props;
    const { now, store } = useGameClock();
    const submission = useEvidence(props);
    const sequence = gestureSequence(round);
    const attempts = useRef<GestureAttempt[]>([]), pointer = useRef<{
        id: number;
        x: number;
        y: number;
        at: number;
    } | null>(null);
    const [progress, setProgress] = useState(0), [pressed, setPressed] = useState(false), [notice, setNotice] = useState("Hareketleri aynı sırayla yap.");
    const previewEnd = round.startsAt + GESTURE_PREVIEW_MS;
    const active = now >= previewEnd && now < round.endsAt && !submission.attempted;
    useEffect(() => { if (now >= round.endsAt && !submission.attempted)
        submission.submit({ kind: "gestures", gestures: attempts.current }); }, [now, round.endsAt, submission.submit, submission.attempted]);
    function down(e: ReactPointerEvent<HTMLDivElement>) { if (!active || !capture(e) || pointer.current)
        return; pointer.current = { id: e.pointerId, ...point(e), at: store.now() }; setPressed(true); }
    function up(e: ReactPointerEvent<HTMLDivElement>) { const p = pointer.current; if (!p || p.id !== e.pointerId)
        return; pointer.current = null; setPressed(false); release(e); if (!active)
        return; const at = store.now(); if (at >= round.endsAt)
        return; const end = point(e); const attempt = { dx: end.x - p.x, dy: end.y - p.y, duration: at - p.at, at, cancelled: e.type === "pointercancel" }; if (attempt.duration > 2500) {
        attempt.duration = 2500;
        attempt.cancelled = true;
    } attempts.current.push(attempt); const gesture = classifyGesture(attempt); const next = gesture === sequence[progress] ? progress + 1 : 0; setProgress(next); setNotice(next === 4 ? "Aynısını yaptın!" : next ? `${next}/4 · devam et` : "Sıra karıştı. Baştan deneyebilirsin."); if (next === 4 || attempts.current.length >= 30)
        submission.submit({ kind: "gestures", gestures: attempts.current }); }
    const previewIndex = Math.min(3, Math.floor((now - round.startsAt) / 800));
    return <Stage round={round} now={now} title="Taklitçi" hint="Önce izle; sonra aynı sırayla dokun, basılı tut ve kaydır.">
  {now < round.startsAt ? <Preparation round={round} now={now}/> : <>
    <div className={css.sequence}>{sequence.map((g, i) => <span key={i} className={`${now < previewEnd && i === previewIndex ? css.lit : ""} ${i < progress ? css.correct : ""}`}>{now < previewEnd || i < progress ? GESTURE_ICONS[g] : "?"}</span>)}</div>
    <div className={`${css.gesturePad} ${pressed ? css.pressed : ""}`} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()} role="application" aria-label="Hareket tekrar alanı">
      <strong>{now < previewEnd ? GESTURE_ICONS[sequence[Math.max(0, previewIndex)]] : submission.sent ? "✓" : pressed ? "◉" : "↔"}</strong>
      <b>{now < previewEnd ? GESTURE_LABELS[sequence[Math.max(0, previewIndex)]] : pressed ? "Basılı…" : notice}</b>
      <small>{now < previewEnd ? "Şimdi sadece izle" : "Dokun: kısa · Basılı tut: yarım saniye · Kaydır: belirgin bir hareket"}</small>
    </div><Feedback submission={submission}/>
  </>}
 </Stage>;
}
