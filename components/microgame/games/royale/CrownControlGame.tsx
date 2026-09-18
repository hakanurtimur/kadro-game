"use client";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createArenaMotion, sampleArenaPeers, stepArenaMotion, type ArenaPeer } from "@/lib/microgame/arena-physics";
import { capture, COLORS, point, Preparation, release, Shape, Stage, useArenaChannel, useGameClock, type GameProps } from "./shared";
import css from "./royale.module.css";
const SPAWNS: Array<[
    number,
    number
]> = [[26, 30], [74, 30], [74, 70], [26, 70], [50, 24], [50, 76]];
export default function CrownControlGame(props: GameProps) {
    const { round, room, uid } = props;
    const { now, store } = useGameClock(), live = useArenaChannel(room.code, room.roundNumber), me = room.players[uid];
    const initial = SPAWNS[me.seat] ?? [50, 50];
    const motion = useRef(createArenaMotion({ x: initial[0], y: initial[1] })), target = useRef({ x: initial[0], y: initial[1] });
    const peers = useRef<Record<string, ArenaPeer>>({}), pointer = useRef<number | null>(null), lastInput = useRef(0);
    const [pos, setPos] = useState({ x: initial[0], y: initial[1] }), [hitUntil, setHitUntil] = useState(0);
    useEffect(() => { peers.current = sampleArenaPeers(peers.current, live.positions, room.roundNumber, new Set(Object.keys(room.players)), {}); }, [live.positions, room.roundNumber, room.players]);
    useEffect(() => {
        let frame = 0, last = store.now(), sentAt = 0, finalSent = false;
        void live.publish(uid, motion.current.x, motion.current.y);
        const tick = () => {
            const at = store.now(), dt = Math.min(.05, Math.max(0, (at - last) / 1000));
            last = at;
            if (at >= round.startsAt && at < round.endsAt) {
                const result = stepArenaMotion(motion.current, target.current, Object.values(peers.current), uid, at, dt);
                motion.current = result.body;
                if (result.hit)
                    setHitUntil(result.body.knockbackUntil);
                if (result.body.lastHitAt > lastInput.current && at < result.body.knockbackUntil)
                    target.current = { x: result.body.x, y: result.body.y };
                setPos({ x: result.body.x, y: result.body.y });
                if (result.hit || at - sentAt >= 90) {
                    sentAt = at;
                    void live.publish(uid, result.body.x, result.body.y);
                }
            }
            else if (at >= round.endsAt && !finalSent) {
                finalSent = true;
                void live.publish(uid, motion.current.x, motion.current.y);
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [round.startsAt, round.endsAt, store, uid, live.publish]);
    function steer(e: ReactPointerEvent<HTMLDivElement>) { if (now < round.startsAt || now >= round.endsAt)
        return; if (e.type === "pointerdown") {
        if (!capture(e) || pointer.current !== null)
            return;
        pointer.current = e.pointerId;
    }
    else if (e.pointerId !== pointer.current)
        return; target.current = point(e); lastInput.current = store.now(); }
    function up(e: ReactPointerEvent<HTMLDivElement>) { if (pointer.current === e.pointerId) {
        pointer.current = null;
        release(e);
    } }
    const nearest = Object.values(room.players).map(p => { const position = p.uid === uid ? pos : live.positions[p.uid]; return { uid: p.uid, d: position ? Math.hypot(position.x - 50, position.y - 50) : Infinity }; }).filter(p => Number.isFinite(p.d) && p.d <= 13).sort((a, b) => a.d - b.d)[0];
    return <Stage round={round} now={now} title="Tahtı Kap" hint="Merkeze koş, rakiplerini it. Süre bittiğinde tahtın içinde merkeze en yakın olan +100 alır.">
  {now < round.startsAt ? <Preparation round={round} now={now}/> : <>
   <div className={css.throneState} role="status">{now >= round.endsAt ? "Son konumlar değerlendiriliyor…" : nearest ? `${room.players[nearest.uid].nickname} tahtta!` : "Taht boş. Kap!"}</div>
   <div className={css.crownArena} role="application" aria-label="Taht kapma arenası" onPointerDown={steer} onPointerMove={steer} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()}>
     <div className={css.throne}><Shape name="crown"/></div>
     {Object.values(room.players).map(p => { const spawn = SPAWNS[p.seat] ?? [50, 50], position = p.uid === uid ? pos : live.positions[p.uid] ?? { x: spawn[0], y: spawn[1] }; return <div key={p.uid} className={`${css.crownPlayer} ${p.uid === uid ? css.mine : ""} ${p.uid === uid && now < hitUntil ? css.knocked : ""}`} style={{ left: `${position.x}%`, top: `${position.y}%`, background: COLORS[p.seat] } as CSSProperties}><b>{p.nickname.slice(0, 1).toLocaleUpperCase("tr-TR")}</b><small>{p.uid === uid ? "Sen" : p.nickname}</small></div>; })}
   </div><small className={css.caption}>Basılı tutup sürükle. Çarpışmadan sonra yeniden yön ver.</small>{live.error && <p className={css.error} role="alert">{live.error}</p>}
  </>}
 </Stage>;
}
