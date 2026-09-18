"use client";
import type { GameProps } from "./shared";
import { COLORS, Shape } from "./shared";
import { MICROGAME_REGISTRY } from "@/lib/microgame/registry";
import FreezeDanceGame from "./FreezeDanceGame";
import EchoGesturesGame from "./EchoGesturesGame";
import MemorySpotGame from "./MemorySpotGame";
import RedLightGame from "./RedLightGame";
import ShadowMatchGame from "./ShadowMatchGame";
import HoldReleaseGame from "./HoldReleaseGame";
import CrownControlGame from "./CrownControlGame";
import css from "./royale.module.css";
export default function SkillGame(props: GameProps) {
    if (props.room.status === "results") {
        const players = Object.values(props.room.players).sort((a, b) => (props.round.submissions[b.uid]?.score ?? 0) - (props.round.submissions[a.uid]?.score ?? 0) || a.seat - b.seat);
        const best = Math.max(...players.map(p => props.round.submissions[p.uid]?.score ?? 0));
        return <section className={css.stage}><div className={css.resultCrown}><Shape name="crown"/></div><span className={css.pill}>TUR {props.room.roundNumber} TAMAMLANDI</span><h2 className={css.resultTitle}>{MICROGAME_REGISTRY[props.round.gameId].title}</h2><p className={css.hint}>Tur puanın toplamına eklendi. Kimse masadan elenmiyor.</p>
   <div className={css.results}>{players.map(p => { const result = props.round.submissions[p.uid]; return <article key={p.uid} className={p.uid === props.uid ? css.myResult : ""}><span style={{ background: COLORS[p.seat] }}>{p.nickname.slice(0, 1)}</span><div><b>{p.nickname}{best > 0 && result?.score === best ? " ★" : ""}</b><small>{result?.note ?? "Yanıt yok"}</small></div><strong>+{result?.score ?? 0}<small>Toplam {p.score}</small></strong></article>; })}</div>
  </section>;
    }
    switch (props.round.gameId) {
        case "freeze-dance": return <FreezeDanceGame {...props}/>;
        case "echo-gestures": return <EchoGesturesGame {...props}/>;
        case "memory-spot": return <MemorySpotGame {...props}/>;
        case "red-light": return <RedLightGame {...props}/>;
        case "shadow-match": return <ShadowMatchGame {...props}/>;
        case "hold-release": return <HoldReleaseGame {...props}/>;
        case "crown-control": return <CrownControlGame {...props}/>;
    }
}
