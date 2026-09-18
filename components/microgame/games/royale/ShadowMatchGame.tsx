"use client";
import { useState } from "react";
import { shadowSpec, SHADOW_PREVIEW_MS } from "@/lib/microgame/skill-model";
import { COLORS, Feedback, Preparation, Shape, SHAPE_LABELS, Stage, useEvidence, useGameClock, type GameProps } from "./shared";
import css from "./royale.module.css";
export default function ShadowMatchGame(props: GameProps) {
    const { round } = props;
    const { now, store } = useGameClock(), submission = useEvidence(props), spec = shadowSpec(round);
    const [chosen, setChosen] = useState("");
    const preview = now < round.startsAt + SHADOW_PREVIEW_MS;
    return <Stage round={round} now={now} title="Gölgeyi Yakala" hint="Gölgenin dış çizgisini aklında tut. Sonra altı şekilden birini seç.">
  {now < round.startsAt ? <Preparation round={round} now={now}/> : preview ? <div className={css.shadowPreview}><span><Shape name={spec.target} silhouette/></span><b>Bu gölgeyi hatırla.</b></div> : <>
    <div className={css.question}><b>Az önce hangisini gördün?</b></div>
    <div className={css.shapeGrid}>{spec.choices.map((name, i) => <button type="button" key={name} disabled={submission.attempted || now >= round.endsAt} className={chosen === name ? css.picked : ""} onClick={() => { setChosen(name); submission.submit({ kind: "choice", choice: name, at: store.now() }); }} style={{ color: COLORS[i] }} aria-label={SHAPE_LABELS[name]}><Shape name={name}/><small>{SHAPE_LABELS[name]}</small></button>)}</div><Feedback submission={submission}/>
  </>}
 </Stage>;
}
