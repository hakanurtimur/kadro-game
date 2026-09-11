import { NextResponse } from "next/server";
import { callGroqJson, hasGroqKey } from "@/lib/ai/groq";
import { fallbackJudge } from "@/lib/fallback";
import type { JudgeResult } from "@/lib/types";

type TeamInput = { playerUid: string; nickname: string; balance: number; characters: string[] };

function normalizeTeams(raw: unknown): TeamInput[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 8).map((item) => ({
    playerUid: String(item?.playerUid || "").trim(),
    nickname: String(item?.nickname || "Oyuncu").trim().slice(0, 20),
    balance: Math.max(0, Number(item?.balance) || 0),
    characters: Array.isArray(item?.characters) ? item.characters.map((value: unknown) => String(value).trim().slice(0, 64)).filter(Boolean).slice(0, 8) : [],
  })).filter((team) => team.playerUid);
}

function normalizeJudge(raw: any, teams: TeamInput[]): JudgeResult | null {
  const validIds = new Set(teams.map((team) => team.playerUid));
  const rankingsRaw = Array.isArray(raw?.rankings) ? raw.rankings : [];
  const rankings = rankingsRaw.map((item: any) => ({
    playerUid: String(item?.playerUid || ""),
    score: Math.max(0, Math.min(100, Math.round(Number(item?.score) || 0))),
    comment: String(item?.comment || "").trim().slice(0, 220),
  })).filter((item: any) => validIds.has(item.playerUid));

  if (rankings.length !== teams.length || new Set(rankings.map((item: any) => item.playerUid)).size !== teams.length) return null;
  const winnerUid = String(raw?.winnerUid || rankings.slice().sort((a: any, b: any) => b.score - a.score)[0]?.playerUid || "");
  if (!validIds.has(winnerUid)) return null;
  return {
    winnerUid,
    rankings,
    summary: String(raw?.summary || "").trim().slice(0, 280),
    source: "groq",
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const scenario = String(body.scenario || "").trim().slice(0, 90);
  const characterCategory = String(body.characterCategory || "").trim().slice(0, 80);
  const teams = normalizeTeams(body.teams);
  if (!scenario || teams.length < 2) return NextResponse.json({ error: "Puanlama verisi eksik." }, { status: 400 });

  if (!hasGroqKey()) return NextResponse.json(fallbackJudge(scenario, teams));

  try {
    const ai = await callGroqJson<any>({
      system: "Sen komik ama tarafsız bir party game jürisisin. Sadece geçerli JSON dön ve her oyuncuyu tam bir kez puanla.",
      temperature: 0.72,
      prompt: `Görev: ${JSON.stringify(scenario)}\nKarakter havuzu: ${JSON.stringify(characterCategory)}\nTakımlar: ${JSON.stringify(teams)}\n\nHer takımı 0-100 puanla. Öncelik karakterlerin bu göreve uygunluğu, birbirini tamamlama ihtimali, stratejik çeşitlilik ve komik ama mantıklı sinerji. Elde kalan bakiye en fazla küçük bir tie-break etkisi yapsın.\n\nTam olarak şu JSON biçiminde dön:\n{"winnerUid":"player uid","rankings":[{"playerUid":"player uid","score":87,"comment":"en fazla iki kısa cümle"}],"summary":"tur için tek kısa final yorumu"}`,
    });
    const normalized = normalizeJudge(ai, teams);
    if (!normalized) throw new Error("Geçersiz jüri");
    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json(fallbackJudge(scenario, teams));
  }
}
