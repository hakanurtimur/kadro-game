import { MicrogameRuleError, normalizeMicrogameState } from "./engine";
import type { ArenaPosition, MicrogameRoomState } from "./types";
import type { SkillEvidence, SkillGameId, SkillRound, SkillScore } from "./skill-types";
import { classifyGesture, freezeScore, gestureSequence, GESTURE_PREVIEW_MS, isSkillGameId, memorySpec, MEMORY_PREVIEW_MS, raceState, releaseAt, seedFor, SETTLE_GRACE_MS, shadowSpec, SHADOW_PREVIEW_MS, SKILL_DURATION, SUBMISSION_GRACE_MS } from "./skill-model";
function requirePlayer(room: MicrogameRoomState, uid: string) { if (!Object.hasOwn(room.players, uid))
    throw new MicrogameRuleError("Bu odada oyuncu değilsin."); }
function requireRound(room: MicrogameRoomState, expectedRound: number): SkillRound {
    if (room.roundNumber !== expectedRound || !room.round || !isSkillGameId(room.round.gameId) || room.activeGameId !== room.round.gameId)
        throw new MicrogameRuleError("Bu işlem eski ya da farklı bir tura ait.");
    return room.round as SkillRound;
}
export function startSkillTest(room: MicrogameRoomState, uid: string, gameId: SkillGameId, now = Date.now()): MicrogameRoomState {
    const next = normalizeMicrogameState(room);
    requirePlayer(next, uid);
    if (next.hostUid !== uid)
        throw new MicrogameRuleError("Yalnız oda sahibi başlatabilir.");
    if (!isSkillGameId(gameId) || !Number.isFinite(now))
        throw new MicrogameRuleError("Geçersiz oyun.");
    if (next.status === "playing")
        throw new MicrogameRuleError("Önce mevcut tur bitsin.");
    const count = Object.keys(next.players).length;
    if (count < 2 || count > 6)
        throw new MicrogameRuleError("2–6 oyuncu gerekiyor.");
    const instructionsUntil = now + 4000, startsAt = instructionsUntil + 3000;
    next.roundNumber++;
    next.activeGameId = gameId;
    next.status = "playing";
    next.updatedAt = now;
    next.round = { gameId, instructionsUntil, startsAt, endsAt: startsAt + SKILL_DURATION[gameId], seed: seedFor(`${next.code}:${next.roundNumber}:${gameId}:${now}`), submissions: {} };
    return next;
}
function bad(): never { throw new MicrogameRuleError("Geçersiz oyun girdisi."); }
function number(value: unknown, min: number, max: number): number { if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    bad(); return value; }
function timeline<T extends {
    at: number;
}>(items: T[], round: SkillRound, now: number, maximum: number): T[] {
    if (!Array.isArray(items) || items.length > maximum)
        bad();
    let previous = round.startsAt - 1;
    for (const item of items) {
        if (!item || typeof item !== "object")
            bad();
        number(item.at, round.startsAt, Math.min(round.endsAt, now));
        if (item.at <= previous)
            bad();
        previous = item.at;
    }
    return items;
}
function evaluate(round: SkillRound, e: SkillEvidence, now: number): Pick<SkillScore, "score" | "note"> {
    if (!e || typeof e !== "object")
        bad();
    if (round.gameId === "memory-spot" && e.kind === "spot") {
        number(e.at, round.startsAt, Math.min(now, round.endsAt));
        if (e.at < round.startsAt + MEMORY_PREVIEW_MS)
            throw new MicrogameRuleError("Sembol gösterimi bitmedi.");
        number(e.x, 0, 100);
        number(e.y, 0, 100);
        const t = memorySpec(round).target, d = Math.hypot(e.x - t.x, e.y - t.y);
        return { score: Math.round(Math.max(0, 100 - d * 3)), note: d < 3 ? "Tam isabet!" : `Hedeften ${Math.round(d)} birim uzakta` };
    }
    if (round.gameId === "shadow-match" && e.kind === "choice") {
        number(e.at, round.startsAt, Math.min(now, round.endsAt));
        if (e.at < round.startsAt + SHADOW_PREVIEW_MS)
            throw new MicrogameRuleError("Siluet gösterimi bitmedi.");
        const spec = shadowSpec(round);
        if (!spec.choices.includes(e.choice as typeof spec.target))
            bad();
        const correct = e.choice === spec.target;
        return { score: correct ? Math.max(70, 100 - Math.floor((e.at - round.startsAt - SHADOW_PREVIEW_MS) / 180)) : 0, note: correct ? "Doğru siluet!" : "Başka bir siluet seçtin" };
    }
    if (round.gameId === "echo-gestures" && e.kind === "gestures") {
        timeline(e.gestures, round, now, 32);
        const sequence = gestureSequence(round);
        let index = 0, errors = 0, completedAt = round.endsAt, previousEnd = round.startsAt + GESTURE_PREVIEW_MS;
        for (const g of e.gestures) {
            number(g.duration, 0, 2500);
            number(g.dx, -100, 100);
            number(g.dy, -100, 100);
            if (typeof g.cancelled !== "boolean")
                bad();
            if (g.at - g.duration < previousEnd)
                throw new MicrogameRuleError("Hareketler gösterimden sonra sırayla yapılmalı.");
            previousEnd = g.at;
            if (classifyGesture(g) === sequence[index])
                index++;
            else {
                index = 0;
                errors++;
            }
            if (index === sequence.length) {
                completedAt = g.at;
                break;
            }
        }
        return { score: index === 4 ? Math.max(50, 100 - errors * 8 - Math.floor((completedAt - round.startsAt - GESTURE_PREVIEW_MS) / 500)) : index * 15, note: index === 4 ? `Dizi tamam! · ${errors} hata` : `${index}/4 doğru · ${errors} hata` };
    }
    if (round.gameId === "hold-release" && e.kind === "release") {
        number(e.downAt, round.instructionsUntil, Math.min(round.endsAt, now));
        number(e.upAt, e.downAt, Math.min(round.endsAt, now));
        if (typeof e.cancelled !== "boolean")
            bad();
        const cue = releaseAt(round);
        if (e.cancelled)
            return { score: 0, note: "Dokunma kesildi" };
        if (e.downAt > round.startsAt + 700)
            return { score: 0, note: "Geri sayımda basılı tutmalısın" };
        if (e.upAt < cue)
            return { score: 0, note: "Erken bıraktın!" };
        return { score: Math.max(10, 100 - Math.floor((e.upAt - cue) / 18)), note: `${Math.round(e.upAt - cue)} ms tepki` };
    }
    if (round.gameId === "freeze-dance" && e.kind === "trace") {
        if (now < round.endsAt)
            throw new MicrogameRuleError("Tur henüz bitmedi.");
        timeline(e.samples, round, now, 256);
        for (const s of e.samples) {
            number(s.x, 0, 100);
            number(s.y, 0, 100);
        }
        return freezeScore(round, e.samples);
    }
    if (round.gameId === "red-light" && e.kind === "run") {
        timeline(e.changes, round, now, 240);
        for (const c of e.changes)
            if (typeof c.held !== "boolean")
                bad();
        const result = raceState(round, e.changes, Math.min(now, round.endsAt));
        if (now < round.endsAt && !result.finishedAt)
            throw new MicrogameRuleError("Yarış henüz bitmedi.");
        return { score: result.finishedAt ? Math.max(75, 100 - Math.floor((result.finishedAt - round.startsAt) / 600)) : Math.floor(result.progress * .7), note: result.finishedAt ? `Bitişe ulaştın · ${result.penalties} kırmızı ihlali` : `%${Math.round(result.progress)} ilerleme · ${result.penalties} ihlal` };
    }
    return bad();
}
export function submitSkillEvidence(room: MicrogameRoomState, uid: string, expectedRound: number, e: SkillEvidence, now = Date.now()): MicrogameRoomState {
    const next = normalizeMicrogameState(room);
    requirePlayer(next, uid);
    const round = requireRound(next, expectedRound);
    if (Object.hasOwn(round.submissions, uid))
        return next; // retry is idempotent, cannot revise an answer
    if (next.status !== "playing" || now < round.startsAt || now > round.endsAt + SUBMISSION_GRACE_MS)
        throw new MicrogameRuleError("Bu tur için gönderim süresi kapandı.");
    const result = evaluate(round, e, now);
    round.submissions[uid] = { score: Math.max(0, Math.min(100, Math.round(result.score))), note: result.note.slice(0, 120), submittedAt: now };
    next.updatedAt = now;
    return next;
}
function settle(next: MicrogameRoomState, round: SkillRound, now: number) {
    for (const player of Object.values(next.players)) {
        const result = round.submissions[player.uid] ?? { score: 0, note: "Yanıt gelmedi · 0 puan", submittedAt: now };
        round.submissions[player.uid] = result;
        player.score += result.score;
    }
    next.status = "results";
    next.updatedAt = now;
    return next;
}
export function settleSkillRound(room: MicrogameRoomState, uid: string, expectedRound: number, now = Date.now()): MicrogameRoomState {
    const next = normalizeMicrogameState(room);
    requirePlayer(next, uid);
    const round = requireRound(next, expectedRound);
    if (next.status === "results")
        return next;
    if (round.gameId === "crown-control")
        throw new MicrogameRuleError("Taht turu ortak konumlarla sonuçlanır.");
    if (next.status !== "playing" || now < round.endsAt + SETTLE_GRACE_MS)
        throw new MicrogameRuleError("Oyuncu yanıtları bekleniyor.");
    return settle(next, round, now);
}
export function settleCrownRound(room: MicrogameRoomState, uid: string, expectedRound: number, positions: Record<string, ArenaPosition>, now = Date.now()): MicrogameRoomState {
    const next = normalizeMicrogameState(room);
    requirePlayer(next, uid);
    const round = requireRound(next, expectedRound);
    if (round.gameId !== "crown-control")
        throw new MicrogameRuleError("Taht turu değil.");
    if (next.status === "results")
        return next;
    if (next.status !== "playing" || now < round.endsAt + SETTLE_GRACE_MS)
        throw new MicrogameRuleError("Son konumlar bekleniyor.");
    const distances = Object.values(next.players).map(p => { const pos = positions[p.uid]; const valid = pos && pos.uid === p.uid && pos.roundNumber === expectedRound && [pos.x, pos.y, pos.updatedAt].every(Number.isFinite) && pos.updatedAt >= round.endsAt - 2000 && pos.updatedAt <= round.endsAt + 1200 && pos.x >= 0 && pos.x <= 100 && pos.y >= 0 && pos.y <= 100; return { uid: p.uid, d: valid ? Math.hypot(pos.x - 50, pos.y - 50) : Infinity }; });
    const best = Math.min(...distances.map(p => p.d));
    for (const p of distances) {
        const winner = p.d <= 13 && Math.abs(p.d - best) < .25;
        round.submissions[p.uid] = { score: winner ? 100 : Number.isFinite(p.d) ? Math.max(0, Math.min(60, Math.round(60 - p.d))) : 0, note: winner ? "Taht senin!" : Number.isFinite(p.d) ? "Tahtın dışında kaldın" : "Güncel konum alınamadı", submittedAt: now };
    }
    return settle(next, round, now);
}
