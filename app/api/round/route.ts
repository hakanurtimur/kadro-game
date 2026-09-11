import { NextResponse } from "next/server";
import { callGroqJson, hasGroqKey } from "@/lib/ai/groq";
import { generateFallbackRound, rerollFallbackCharacter } from "@/lib/fallback";
import type { CharacterSeed } from "@/lib/types";

function safeInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function normalizeCharacters(raw: unknown, count: number, category: string): CharacterSeed[] {
  const items = Array.isArray(raw) ? raw : [];
  const result: CharacterSeed[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const name = String(item?.name || "").trim().slice(0, 64);
    if (!name) continue;
    const key = name.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ name, source: String(item?.source || category).trim().slice(0, 64) || category });
    if (result.length >= count) break;
  }
  while (result.length < count) {
    const replacement = rerollFallbackCharacter(category || "Türk Dizi Evreni", [...seen]);
    const key = replacement.name.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) break;
    seen.add(key);
    result.push(replacement);
  }
  return result;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const playerCount = safeInt(body.playerCount, 2, 2, 8);
  const slots = safeInt(body.slots, 5, 3, 8);
  const characterCount = Math.min(80, playerCount * slots + Math.max(playerCount, 4));

  if (!hasGroqKey()) return NextResponse.json(generateFallbackRound(characterCount));

  try {
    const ai = await callGroqJson<any>({
      temperature: 1,
      system: "Sen Türkçe bir browser party game için yaratıcı ama tutarlı içerik motorusun. Yalnızca geçerli JSON dön.",
      prompt: `Açık artırmayla karakter kadrosu kurulan bir party game için yeni tur üret.\n\nOyuncu sayısı: ${playerCount}\nKadro slotu: ${slots}\nGerekli benzersiz karakter: ${characterCount}\n\nİstenen JSON:\n{"scenario":"kısa, komik ve rekabetçi görev","characterCategory":"tek ve anlaşılır popüler kültür havuzu","characters":[{"name":"karakter","source":"eser/dizi"}]}\n\nKurallar:\n- Senaryo bir kadronun başarısının karşılaştırılabileceği net bir görev olsun.\n- Kategori mümkünse Türkiye'de yaygın bilinen dizi/TV karakterleri gibi sosyal ortamda tartışması eğlenceli bir havuz olsun.\n- Tam ${characterCount} benzersiz karakter üret.\n- Aynı karakterin farklı yazımlarını tekrar etme.\n- Gerçek kişiler yerine ağırlıklı olarak kurgu karakterleri kullan.\n- Açıklama veya markdown yazma.`,
    });

    const scenario = String(ai?.scenario || "").trim().slice(0, 90);
    const characterCategory = String(ai?.characterCategory || "").trim().slice(0, 80);
    const characters = normalizeCharacters(ai?.characters, characterCount, characterCategory || "Türk Dizi Evreni");
    if (!scenario || !characterCategory || characters.length < playerCount * slots) throw new Error("AI turu eksik.");

    return NextResponse.json({ scenario, characterCategory, characters, source: "groq" });
  } catch {
    return NextResponse.json(generateFallbackRound(characterCount));
  }
}
