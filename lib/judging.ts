import type { JudgeCriteria, JudgeResult, JudgeRanking, RoundSource, TeamMember } from "./types";

export const JURY_CRITERIA = [
  { key: "fit", label: "Göreve uygunluk", weight: 50, explanation: "Kadrodaki karakterler bu görevi ne kadar iyi yapabilir?" },
  { key: "synergy", label: "Ekip uyumu", weight: 30, explanation: "Birbirlerini tamamlıyorlar mı, yoksa birbirlerinin işini mi zorlaştırıyorlar?" },
  { key: "versatility", label: "Çok yönlülük", weight: 20, explanation: "Beklenmedik sorunlara karşı farklı becerileri var mı?" },
] as const;
export type JudgeTeam = { playerUid: string; nickname: string; characters: TeamMember[] };

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function text(v: unknown, max: number): string {
  if (typeof v !== "string" || !v.trim()) throw new Error("Jüri açıklaması eksik.");
  return v.trim().slice(0, max);
}
export function readCriteria(raw: unknown): JudgeCriteria {
  if (!record(raw)) throw new Error("Jüri kriter puanları eksik.");
  const scores = {} as JudgeCriteria;
  for (const c of JURY_CRITERIA) {
    const value = raw[c.key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      throw new Error("Jüri kriter puanı 0–100 arasında bir sayı olmalı.");
    }
    scores[c.key] = Math.round(value * 10) / 10;
  }
  return scores;
}
export function weightedScore(criteria: JudgeCriteria): number {
  const valid = readCriteria(criteria);
  return Math.round(JURY_CRITERIA.reduce((sum, c) => sum + valid[c.key] * c.weight, 0) / 10) / 10;
}

/** The model supplies interpretations; the code, not the model, determines totals and winners. */
export function normalizeJudgement(raw: unknown, teams: JudgeTeam[], source: RoundSource = "groq"): JudgeResult {
  if (!record(raw) || !Array.isArray(raw.rankings) || teams.length < 2 || teams.length > 8 || raw.rankings.length !== teams.length) {
    throw new Error("Jüri tüm yarışmacıları değerlendirmeli.");
  }
  const expected = new Map(teams.map(team => [team.playerUid, team]));
  if (expected.size !== teams.length) throw new Error("Yarışmacı kimlikleri tekrarlı.");
  const seen = new Set<string>();
  const rankings: JudgeRanking[] = raw.rankings.map((item: unknown) => {
    if (!record(item) || typeof item.playerUid !== "string") throw new Error("Jüri oyuncu kimliği geçersiz.");
    const team = expected.get(item.playerUid);
    if (!team || seen.has(item.playerUid)) throw new Error("Jüride eksik, fazla veya tekrarlı oyuncu var.");
    seen.add(item.playerUid);
    const criteria = readCriteria(item.criteria);
    const star = typeof item.starCharacterId === "string" ? item.starCharacterId : "";
    if (!star || !team.characters.some(c => c.characterId === star)) throw new Error("Jürinin yıldızı bu takımda değil.");
    return {
      playerUid: item.playerUid, criteria, score: weightedScore(criteria),
      comment: text(item.comment, 220), strength: text(item.strength, 160), weakness: text(item.weakness, 160),
      starCharacterId: star, starReason: text(item.starReason, 160),
    };
  });
  // Stable input order breaks display-order ties only, never point or winner ties.
  const order = new Map(teams.map((t,i) => [t.playerUid,i]));
  rankings.sort((a,b) => b.score-a.score || order.get(a.playerUid)!-order.get(b.playerUid)!);
  const winnerUids = rankings.filter(r => r.score === rankings[0].score).map(r => r.playerUid);
  return { scoringVersion: "rubric-v1", winnerUid: winnerUids[0], winnerUids, rankings, summary: text(raw.summary,280), source };
}

/** Rank points reward placement, not money. Equal scores share the same competition rank. */
export function placementPoints(rankings: JudgeRanking[]): Record<string, number> {
  const points: Record<string, number> = {};
  for (const ranking of rankings) {
    const better = rankings.filter(other => other.score > ranking.score).length;
    points[ranking.playerUid] = rankings.length - better;
  }
  return points;
}
