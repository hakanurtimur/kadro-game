import { NextResponse } from "next/server";
import { callGroqJson, hasGroqKey } from "@/lib/ai/groq";
import {
  rerollFallbackCategory,
  rerollFallbackCharacter,
  rerollFallbackScenario,
} from "@/lib/fallback";
import type { CharacterSeed } from "@/lib/types";

function characterCount(body: any) {
  const playerCount = Math.max(2, Math.min(8, Number(body.playerCount) || 2));
  const slots = Math.max(3, Math.min(8, Number(body.slots) || 5));
  return Math.min(80, playerCount * slots + Math.max(playerCount, 4));
}

function normalizedSeeds(raw: unknown, category: string, count: number): CharacterSeed[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: CharacterSeed[] = [];
  for (const item of raw) {
    const name = String(item?.name || "").trim().slice(0, 64);
    if (!name) continue;
    const key = name.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name, source: String(item?.source || category).trim().slice(0, 64) || category });
    if (result.length >= count) break;
  }
  return result;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const kind = String(body.kind || "");
  const count = characterCount(body);
  const currentScenario = String(body.scenario || "");
  const currentCategory = String(body.characterCategory || "Türk Dizi Evreni");
  const currentCharacters = normalizedSeeds(body.characters, currentCategory, 80);
  const existingNames = currentCharacters.map((character) => character.name);

  if (!["scenario", "category", "character"].includes(kind)) {
    return NextResponse.json({ error: "Geçersiz zar türü." }, { status: 400 });
  }

  if (!hasGroqKey()) {
    if (kind === "scenario") return NextResponse.json({ scenario: rerollFallbackScenario([currentScenario]), source: "demo" });
    if (kind === "category") return NextResponse.json(rerollFallbackCategory([currentCategory], count));
    return NextResponse.json({ character: rerollFallbackCharacter(currentCategory, existingNames), source: "demo" });
  }

  try {
    if (kind === "scenario") {
      const ai = await callGroqJson<any>({
        system: "Sen party game tur tasarımcısısın. Yalnızca geçerli JSON dön.",
        temperature: 1.05,
        prompt: `Şu senaryodan farklı tek bir kısa Türkçe party-game görevi üret: ${JSON.stringify(currentScenario)}. Karakter kadrolarını karşılaştırmaya uygun, komik ama anlaşılır olsun. JSON: {"scenario":"..."}`,
      });
      const scenario = String(ai?.scenario || "").trim().slice(0, 90);
      if (!scenario || scenario.toLocaleLowerCase("tr-TR") === currentScenario.toLocaleLowerCase("tr-TR")) throw new Error("Tekrar");
      return NextResponse.json({ scenario, source: "groq" });
    }

    if (kind === "category") {
      const ai = await callGroqJson<any>({
        system: "Sen party game içerik motorusun. Yalnızca geçerli JSON dön.",
        temperature: 1.05,
        prompt: `Mevcut karakter kategorisi ${JSON.stringify(currentCategory)}. Bundan farklı, sosyal ortamda bilinen yeni bir kurgu karakter havuzu ve tam ${count} benzersiz karakter üret. JSON: {"characterCategory":"...","characters":[{"name":"...","source":"..."}]}`,
      });
      const category = String(ai?.characterCategory || "").trim().slice(0, 80);
      let characters = normalizedSeeds(ai?.characters, category, count);
      if (!category || category.toLocaleLowerCase("tr-TR") === currentCategory.toLocaleLowerCase("tr-TR")) throw new Error("Kategori tekrar");
      if (characters.length < count) {
        const fallback = rerollFallbackCategory([currentCategory], count);
        const seen = new Set(characters.map((character) => character.name.toLocaleLowerCase("tr-TR")));
        characters = [...characters, ...fallback.characters.filter((character) => !seen.has(character.name.toLocaleLowerCase("tr-TR")))].slice(0, count);
      }
      return NextResponse.json({ characterCategory: category, characters, source: "groq" });
    }

    const ai = await callGroqJson<any>({
      system: "Sen party game içerik motorusun. Yalnızca geçerli JSON dön.",
      temperature: 1.1,
      prompt: `Kategori: ${JSON.stringify(currentCategory)}. Şu isimlerin hiçbirini kullanmadan bu kategoriye uygun tek bir farklı ve yaygın bilinen kurgu karakter üret: ${JSON.stringify(existingNames)}. JSON: {"character":{"name":"...","source":"..."}}`,
    });
    const name = String(ai?.character?.name || "").trim().slice(0, 64);
    const source = String(ai?.character?.source || currentCategory).trim().slice(0, 64) || currentCategory;
    if (!name || existingNames.some((existing) => existing.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) throw new Error("Karakter tekrar");
    return NextResponse.json({ character: { name, source }, source: "groq" });
  } catch {
    if (kind === "scenario") return NextResponse.json({ scenario: rerollFallbackScenario([currentScenario]), source: "demo" });
    if (kind === "category") return NextResponse.json(rerollFallbackCategory([currentCategory], count));
    return NextResponse.json({ character: rerollFallbackCharacter(currentCategory, existingNames), source: "demo" });
  }
}
