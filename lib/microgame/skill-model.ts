import type { GestureAttempt, GestureName, MotionSample, PressChange, SkillGameId, SkillRound } from "./skill-types";
export const SKILL_IDS: SkillGameId[] = ["freeze-dance", "echo-gestures", "memory-spot", "red-light", "shadow-match", "hold-release", "crown-control"];
export const SUBMISSION_GRACE_MS = 1800;
export const SETTLE_GRACE_MS = 2200;
export const MEMORY_PREVIEW_MS = 2200;
export const SHADOW_PREVIEW_MS = 1800;
export const GESTURE_PREVIEW_MS = 3200;
export const SKILL_DURATION: Record<SkillGameId, number> = {
    "freeze-dance": 12000, "echo-gestures": 14000, "memory-spot": 10000,
    "red-light": 14000, "shadow-match": 9000, "hold-release": 11000, "crown-control": 12000,
};
export const GESTURE_LABELS: Record<GestureName, string> = {
    tap: "Dokun", hold: "Basılı tut", left: "Sola kaydır", right: "Sağa kaydır", up: "Yukarı kaydır", down: "Aşağı kaydır",
};
export const GESTURE_ICONS: Record<GestureName, string> = { tap: "●", hold: "◉", left: "←", right: "→", up: "↑", down: "↓" };
export function isSkillGameId(value: unknown): value is SkillGameId { return SKILL_IDS.includes(value as SkillGameId); }
export function seedFor(text: string) { let h = 2166136261; for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
} return h >>> 0; }
function random(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffled<T>(values: readonly T[], seed: number): T[] { const a = [...values], r = random(seed); for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
} return a; }
export function normalizeSkillRound(raw: Record<string, any>): SkillRound {
    const submissions: SkillRound["submissions"] = {};
    if (raw.submissions && typeof raw.submissions === "object")
        for (const [uid, s] of Object.entries(raw.submissions) as Array<[
            string,
            any
        ]>) {
            if (s && Number.isFinite(s.score) && Number.isFinite(s.submittedAt))
                submissions[uid] = { score: Math.max(0, Math.min(100, Math.round(s.score))), note: String(s.note || "").slice(0, 120), submittedAt: s.submittedAt };
        }
    return { gameId: raw.gameId as SkillGameId, instructionsUntil: Number(raw.instructionsUntil) || 0, startsAt: Number(raw.startsAt) || 0, endsAt: Number(raw.endsAt) || 0, seed: Number(raw.seed) >>> 0, submissions };
}
export function gestureSequence(round: SkillRound): GestureName[] {
    // Always exercise all three interaction types; the swipe direction/order change each round.
    const r = random(round.seed);
    const direction: GestureName[] = ["left", "right", "up", "down"];
    return shuffled<GestureName>(["tap", "hold", direction[Math.floor(r() * 4)], direction[Math.floor(r() * 4)]], round.seed ^ 0x5468);
}
export function classifyGesture(a: Pick<GestureAttempt, "dx" | "dy" | "duration" | "cancelled">): GestureName | null {
    if (a.cancelled || ![a.dx, a.dy, a.duration].every(Number.isFinite) || a.duration < 0)
        return null;
    const distance = Math.hypot(a.dx, a.dy);
    if (distance >= 18 && a.duration <= 1600)
        return Math.abs(a.dx) >= Math.abs(a.dy) ? (a.dx > 0 ? "right" : "left") : (a.dy > 0 ? "down" : "up");
    if (distance > 8)
        return null;
    if (a.duration <= 260)
        return "tap";
    return a.duration >= 500 && a.duration <= 2200 ? "hold" : null;
}
export const SHAPES = ["cat", "rocket", "fish", "cactus", "crown", "star", "bird", "mushroom"] as const;
export type ShapeName = typeof SHAPES[number];
export function shadowSpec(round: SkillRound) { const choices = shuffled(SHAPES, round.seed).slice(0, 6); return { choices, target: choices[round.seed % 6] }; }
export function memorySpec(round: SkillRound) {
    const spots = [[20, 23], [50, 20], [80, 25], [23, 73], [52, 76], [78, 70]] as const;
    const shapes = shuffled(SHAPES, round.seed).slice(0, 6), r = random(round.seed ^ 0x888);
    const items = spots.map(([x, y], i) => ({ x: x + (r() - .5) * 8, y: y + (r() - .5) * 8, shape: shapes[i] }));
    return { items, target: items[round.seed % 6] };
}
export function releaseAt(round: SkillRound) { return round.startsAt + 5700 + (round.seed % 2201); }
/** Shared signal schedule, derived rather than synchronized every animation frame. */
export function signalAt(round: SkillRound, at: number): {
    go: boolean;
    from: number;
    until: number;
    index: number;
} {
    const r = random(round.seed ^ 0x1ac7);
    let from = round.startsAt, index = 0;
    while (from <= round.endsAt) {
        const go = index % 2 === 0;
        const duration = go ? 1300 + Math.floor(r() * 850) : 650 + Math.floor(r() * 550);
        const until = from + duration;
        if (at < until)
            return { go, from, until, index };
        from = until;
        index++;
    }
    return { go: false, from: round.endsAt, until: round.endsAt, index };
}
export function freezeScore(round: SkillRound, samples: MotionSample[]) {
    let movement = 0;
    const misses = new Set<number>();
    for (let i = 1; i < samples.length; i++) {
        const a = samples[i - 1], b = samples[i];
        const dt = b.at - a.at;
        if (dt <= 0 || dt > 300)
            continue;
        const d = Math.min(Math.hypot(b.x - a.x, b.y - a.y), 90 * dt / 1000);
        const signal = signalAt(round, b.at);
        if (signal.go)
            movement += d;
        else if (b.at > signal.from + 180 && d > 1.1)
            misses.add(signal.index);
    }
    const earned = Math.min(1, movement / 70);
    return { score: Math.max(0, Math.round(100 * earned) - misses.size * 25), note: movement < 8 ? "Hareket etmedin · 0 puan" : `${misses.size} DON ihlali · ${Math.round(movement)} hareket` };
}
export function raceState(round: SkillRound, changes: PressChange[], now: number) {
    let progress = 0, penalties = 0, held = false, cursor = 0, finishedAt: number | null = null;
    const penalized = new Set<number>();
    const end = Math.max(round.startsAt, Math.min(now, round.endsAt));
    for (let at = round.startsAt; at < end; at += 20) {
        while (cursor < changes.length && changes[cursor].at <= at) {
            held = changes[cursor].held;
            cursor++;
        }
        const signal = signalAt(round, at);
        const dt = Math.min(20, end - at) / 1000;
        if (held && signal.go)
            progress += 18 * dt;
        else if (held && !signal.go && at > signal.from + 140 && !penalized.has(signal.index)) {
            progress = Math.max(0, progress - 22);
            penalized.add(signal.index);
            penalties++;
        }
        if (progress >= 100) {
            progress = 100;
            finishedAt = at + dt * 1000;
            break;
        }
    }
    return { progress, penalties, finishedAt };
}
