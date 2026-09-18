"use client";
import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { memorySpec, MEMORY_PREVIEW_MS } from "@/lib/microgame/skill-model";
import { COLORS, Feedback, point, Preparation, Shape, SHAPE_LABELS, Stage, useEvidence, useGameClock, type GameProps } from "./shared";
import css from "./royale.module.css";
export default function MemorySpotGame(props: GameProps) {
    const { round } = props;
    const { now, store } = useGameClock(), submission = useEvidence(props), spec = memorySpec(round);
    const [chosen, setChosen] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const preview = now < round.startsAt + MEMORY_PREVIEW_MS;
    function choose(e: ReactPointerEvent<HTMLDivElement>) { if (preview || now >= round.endsAt || submission.attempted || !e.isPrimary)
        return; const p = point(e); setChosen(p); submission.submit({ kind: "spot", ...p, at: store.now() }); }
    return <Stage round={round} now={now} title="Kör Nokta" hint="Sembollerin yerlerini ezberle. Sonra sorulan şeklin eski yerine bir kez dokun.">
  {now < round.startsAt ? <Preparation round={round} now={now}/> : <>
   <div className={css.question}>{preview ? <b>İyi bak, birazdan kaybolacaklar.</b> : <><span className={css.questionShape}><Shape name={spec.target.shape}/></span><b>{SHAPE_LABELS[spec.target.shape]} neredeydi?</b></>}</div>
   <div className={css.memoryBoard} onPointerDown={choose} role="application" aria-label="Sembolün eski yerini seç">
     {preview && spec.items.map((item, i) => <span key={item.shape} className={css.memoryItem} style={{ left: `${item.x}%`, top: `${item.y}%`, color: COLORS[i] }}><Shape name={item.shape}/></span>)}
     {!preview && !chosen && <span className={css.floorCaption}>Hatırladığın yere dokun</span>}
     {chosen && <span className={css.chosen} style={{ left: `${chosen.x}%`, top: `${chosen.y}%` }}>+</span>}
   </div><Feedback submission={submission}/>
  </>}
 </Stage>;
}
