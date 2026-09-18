"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { getMicrogameStore } from "@/lib/microgame/store";
import { MICROGAME_REGISTRY } from "@/lib/microgame/registry";
import type { ArenaPosition, MicrogameRoomState } from "@/lib/microgame/types";
import type { SkillEvidence, SkillRound } from "@/lib/microgame/skill-types";
import { SKILL_IDS, type ShapeName } from "@/lib/microgame/skill-model";
import css from "./royale.module.css";
export type GameProps = {
    room: MicrogameRoomState;
    round: SkillRound;
    uid: string;
    now: number;
    onSubmit: (e: SkillEvidence, roundNumber: number) => Promise<void>;
};
export const COLORS = ["#d97b78", "#5d9e79", "#7889ce", "#bb923d", "#a775bf", "#d58c57"];
export const SHAPE_LABELS: Record<ShapeName, string> = { cat: "Kedi", rocket: "Roket", fish: "Balık", cactus: "Kaktüs", crown: "Taç", star: "Yıldız", bird: "Kuş", mushroom: "Mantar" };
export function Shape({ name, silhouette = false }: {
    name: ShapeName;
    silhouette?: boolean;
}) {
    const paths: Record<ShapeName, ReactNode> = {
        cat: <><path d="M22 40 20 14 40 28Q50 24 60 28L80 14 78 40Q87 82 50 85Q13 82 22 40Z"/><path d="M28 78Q12 95 10 68" fill="none" stroke="currentColor" strokeWidth="9"/>{!silhouette && <><circle cx="36" cy="50" r="4" fill="#fff7e9"/><circle cx="64" cy="50" r="4" fill="#fff7e9"/></>}</>,
        rocket: <><path d="M50 8Q78 32 68 70H32Q22 32 50 8ZM32 50 17 68 17 81 34 72M68 50 83 68 83 81 66 72M40 77 50 95 60 77Z"/>{!silhouette && <circle cx="50" cy="40" r="10" fill="#fff7e9"/>}</>,
        fish: <><path d="M16 49Q44 14 77 49Q44 87 16 49M72 47 92 27 91 72 72 54ZM40 26 48 14 59 30ZM40 73 48 85 59 69Z"/>{!silhouette && <circle cx="32" cy="44" r="4" fill="#fff7e9"/>}</>,
        cactus: <><path d="M40 88V58H25Q12 58 12 43V28Q12 16 23 16Q34 16 34 28V39H40V19Q40 6 51 6Q62 6 62 19V47H68V31Q68 19 78 19Q88 19 88 31V51Q88 66 74 66H62V88Z"/><rect x="30" y="84" width="43" height="9" rx="4"/></>,
        crown: <><path d="M15 32 34 49 50 17 66 49 85 32 76 77H24ZM25 82H75V91H25Z"/><circle cx="15" cy="28" r="6"/><circle cx="50" cy="13" r="6"/><circle cx="85" cy="28" r="6"/></>,
        star: <path d="M50 8 62 35 92 38 69 59 76 89 50 73 24 89 31 59 8 38 38 35Z"/>,
        bird: <><path d="M15 60Q7 45 14 25L38 43Q42 16 65 21Q78 24 80 38L95 45 79 51Q80 80 44 80L21 91 28 73Z"/>{!silhouette && <circle cx="67" cy="35" r="4" fill="#fff7e9"/>}</>,
        mushroom: <><path d="M36 55H64L70 89Q50 98 30 89ZM10 55Q12 8 50 8Q88 8 90 55Q50 71 10 55Z"/>{!silhouette && <><circle cx="32" cy="40" r="7" fill="#fff7e9"/><circle cx="63" cy="31" r="8" fill="#fff7e9"/></>}</>,
    };
    return <svg viewBox="0 0 100 100" aria-hidden="true" className={css.shape} fill="currentColor">{paths[name]}</svg>;
}
export function point(e: ReactPointerEvent<HTMLElement>) { const r = e.currentTarget.getBoundingClientRect(); return { x: Math.max(0, Math.min(100, (e.clientX - r.left) / Math.max(1, r.width) * 100)), y: Math.max(0, Math.min(100, (e.clientY - r.top) / Math.max(1, r.height) * 100)) }; }
export function capture(e: ReactPointerEvent<HTMLElement>) { if (!e.isPrimary || e.button !== 0)
    return false; e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); return true; }
export function release(e: ReactPointerEvent<HTMLElement>) { if (e.currentTarget.hasPointerCapture(e.pointerId))
    e.currentTarget.releasePointerCapture(e.pointerId); }
export function useGameClock() { const store = useMemo(() => getMicrogameStore(), []); const [now, setNow] = useState(() => store.now()); useEffect(() => { const timer = setInterval(() => setNow(store.now()), 50); return () => clearInterval(timer); }, [store]); return { now, store }; }
export function useEvidence(props: GameProps) {
    const ref = useRef(props.onSubmit);
    ref.current = props.onSubmit;
    const evidence = useRef<SkillEvidence | null>(null), busy = useRef(false);
    const [pending, setPending] = useState(false), [error, setError] = useState("");
    const [sent, setSent] = useState(false);
    const mounted = useRef(true);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const attempt = useCallback(async () => { if (!evidence.current || busy.current)
        return; busy.current = true; setPending(true); setError(""); try {
        await ref.current(evidence.current, props.room.roundNumber);
        if (mounted.current)
            setSent(true);
    }
    catch (e) {
        if (mounted.current)
            setError(e instanceof Error ? e.message : "Yanıt gönderilemedi.");
    }
    finally {
        busy.current = false;
        if (mounted.current)
            setPending(false);
    } }, [props.room.roundNumber]);
    const submit = useCallback((next: SkillEvidence) => { if (evidence.current)
        return; evidence.current = structuredClone(next); void attempt(); }, [attempt]);
    return { submit, attempt, pending, error, sent: sent || Boolean(props.round.submissions[props.uid]), attempted: !!evidence.current || Boolean(props.round.submissions[props.uid]) };
}
export function Feedback({ submission }: {
    submission: ReturnType<typeof useEvidence>;
}) { return <div className={css.feedback} role="status">{submission.error ? <><span>{submission.error}</span><button type="button" onClick={() => void submission.attempt()}>Tekrar gönder</button></> : submission.pending ? "Yanıt gönderiliyor…" : submission.sent ? "Yanıtın alındı. Diğer oyuncular bekleniyor." : null}</div>; }
export function Preparation({ round, now, children }: {
    round: SkillRound;
    now: number;
    children?: ReactNode;
}) {
    const definition = MICROGAME_REGISTRY[round.gameId];
    if (now >= round.startsAt)
        return null;
    const instructions = now < round.instructionsUntil;
    return <div className={css.preparation}>
    <span className={css.pill}>{instructions ? "Nasıl oynanır?" : "Hazır mısın?"}</span>
    <div className={css.introSymbol} aria-hidden="true">{instructions ? ["✋", "↔", "✦", "⚑", "◐", "◉", "♛"][SKILL_IDS.indexOf(round.gameId)] : Math.max(1, Math.ceil((round.startsAt - now) / 1000))}</div>
    <h2>{definition.title}</h2><p>{definition.description}</p>
    {children ?? <small>{instructions ? "Birazdan birlikte başlayacaksınız." : "PC: mouse · Telefon: dokun ve sürükle"}</small>}
  </div>;
}
export function Stage({ round, now, title, hint, children }: {
    round: SkillRound;
    now: number;
    title: string;
    hint: string;
    children: ReactNode;
}) {
    return <section className={css.stage}>
  <header className={css.heading}><div><small>OYUN {String(SKILL_IDS.indexOf(round.gameId) + 3).padStart(2, "0")}</small><h2>{title}</h2></div><span className={css.timer} aria-label="Kalan süre">{Math.max(0, Math.ceil((round.endsAt - Math.max(now, round.startsAt)) / 1000))}<small>sn</small></span></header>
  <p className={css.hint}>{hint}</p>{children}
    </section>;
}
export function useArenaChannel(code: string, roundNumber: number) {
    const store = useMemo(() => getMicrogameStore(), []);
    const [positions, setPositions] = useState<Record<string, ArenaPosition>>({});
    const [error, setError] = useState("");
    useEffect(() => { let active = true, off: (() => void) | undefined; setPositions({}); void store.subscribeArenaPositions(code, roundNumber, p => { if (active)
        setPositions(p); }).then(stop => { if (active)
        off = stop;
    else
        stop(); }).catch(() => { if (active)
        setError("Canlı bağlantı kurulamadı. Firebase kurallarını kontrol et."); }); return () => { active = false; off?.(); }; }, [code, roundNumber, store]);
    const publish = useCallback((uid: string, x: number, y: number) => store.setArenaPosition(code, { uid, x, y, roundNumber, updatedAt: store.now() }).catch(() => { setError("Konum gönderilemedi. Bağlantını kontrol et."); }), [code, roundNumber, store]);
    return { positions, publish, error, store };
}
