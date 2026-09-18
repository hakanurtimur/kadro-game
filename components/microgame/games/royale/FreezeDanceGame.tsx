"use client";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { freezeScore, signalAt } from "@/lib/microgame/skill-model";
import type { MotionSample } from "@/lib/microgame/skill-types";
import { capture, Feedback, point, Preparation, release, Stage, useEvidence, useGameClock, type GameProps } from "./shared";
import css from "./royale.module.css";
export default function FreezeDanceGame(props: GameProps) {
    const { round } = props;
    const { now, store } = useGameClock();
    const submission = useEvidence(props);
    const [pos, setPos] = useState({ x: 50, y: 50 });
    const position = useRef(pos);
    const samples = useRef<MotionSample[]>([]);
    const pointer = useRef<number | null>(null);
    useEffect(() => { const at = Math.min(now, round.endsAt); if (now >= round.startsAt && !submission.attempted) {
        const last = samples.current.at(-1);
        if (!last || at - last.at >= 75)
            samples.current.push({ ...position.current, at });
        if (now >= round.endsAt)
            submission.submit({ kind: "trace", samples: samples.current });
    } }, [now, round, submission.submit, submission.attempted]);
    const active = now >= round.startsAt && now < round.endsAt;
    function steer(e: ReactPointerEvent<HTMLDivElement>) { if (!active)
        return; if (e.type === "pointerdown") {
        if (!capture(e))
            return;
        pointer.current = e.pointerId;
    }
    else if (pointer.current !== e.pointerId)
        return; const next = point(e); position.current = next; setPos(next); }
    function up(e: ReactPointerEvent<HTMLDivElement>) { if (pointer.current === e.pointerId) {
        pointer.current = null;
        release(e);
    } }
    const signal = signalAt(round, now);
    const score = freezeScore(round, samples.current);
    return <Stage round={round} now={now} title="Sakın Kıpırdama" hint="HAREKET: sürükle ve dans et. DON: parmağını veya mouse'u sabit tut.">
    {now < round.startsAt ? <Preparation round={round} now={now}/> : <>
      <div className={`${css.signal} ${signal.go ? css.go : css.stop}`} role="status">{active ? (signal.go ? "HAREKET!" : "DON!") : "Tur tamamlandı"}</div>
      <div className={`${css.danceFloor} ${!signal.go ? css.frozen : ""}`} role="application" aria-label="Dans alanı" onPointerDown={steer} onPointerMove={steer} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()}>
        <div className={css.danceToken} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}><span>•ᴗ•</span></div><span className={css.floorCaption}>{signal.go ? "Sürükle · dans et" : "Kıpırdama"}</span>
      </div>
      <div className={css.meter}><span style={{ width: `${Math.min(100, score.score)}%` }}/></div><small className={css.caption}>{score.note}</small>
      <Feedback submission={submission}/>
    </>}
  </Stage>;
}
