import { CharacterPoolError, eligibleCategories, selectCatalogCharacters } from "./character-catalog";
export { CHARACTER_POOLS as FALLBACK_POOLS } from "./character-catalog";
import type { CharacterSeed, JudgeResult, RoundPayload } from "./types";

export const FALLBACK_SCENARIOS = [
  "Entrika İmparatorluğu",
  "Zombi İstilasında Son Gece",
  "Pavyonu Batırmadan İşlet",
  "Mahalle Mafyasını Kur",
  "Issız Adada 30 Gün",
  "Holdingin Başına Geç",
  "Hapishaneden Kaçış Planı",
  "Seçimi Kazan",
  "Düğünü Sabote Et",
  "Bir Gecede Ünlü Ol",
  "Kasabayı Uzaylılardan Kurtar",
  "En Kaotik Aileyi Yönet",
  "Gizli Görevi Tamamla",
  "Reality Show'u Kazan",
  "Krizi Fırsata Çevir",
];


function choose<T>(values: T[], exclude: T[] = []): T {
  const allowed = values.filter((value) => !exclude.includes(value));
  const source = allowed.length ? allowed : values;
  return source[Math.floor(Math.random() * source.length)];
}

export function generateFallbackRound(characterCount: number): RoundPayload {
  const characterCategory = eligibleCategories(characterCount)[0];
  if (!characterCategory) throw new CharacterPoolError("Bu masa büyüklüğü için yeterli karakter içeren bir evren bulunamadı.");
  return {
    scenario: choose(FALLBACK_SCENARIOS),
    characterCategory,
    characters: selectCatalogCharacters(characterCategory, characterCount),
    source: "demo",
  };
}

export function rerollFallbackScenario(excluded: string[] = []) {
  return choose(FALLBACK_SCENARIOS, excluded);
}

export function rerollFallbackCategory(excludedCategories: string[], characterCount: number) {
  const categories = eligibleCategories(characterCount, excludedCategories);
  if (!categories.length) {
    throw new CharacterPoolError("Bu masa büyüklüğünde başka uygun evren yok. Slot sayısını azaltarak daha çok evren açabilirsin.");
  }
  const characterCategory = choose(categories);
  return {
    characterCategory,
    characters: selectCatalogCharacters(characterCategory, characterCount),
    source: "demo" as const,
  };
}

export function rerollFallbackCharacter(category: string, excludedNames: string[]): CharacterSeed {
  return selectCatalogCharacters(category, 1, [], excludedNames)[0];
}

function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) {
    result ^= value.charCodeAt(i);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}

export function fallbackJudge(
  scenario: string,
  teams: Array<{ playerUid: string; nickname: string; balance: number; characters: string[] }>,
): JudgeResult {
  const rankings = teams.map((team) => {
    const seed = `${scenario}|${team.nickname}|${team.characters.join("|")}`;
    const score = Math.min(100, 58 + (hash(seed) % 35) + Math.min(7, team.characters.length));
    const vibe = score >= 88
      ? "Bu kadro görev için fazla iyi; biri kesin planı önceden okumuş."
      : score >= 76
        ? "Kaos kontrollü, roller fena dağılmamış. İş çıkar buradan."
        : "Potansiyel var ama bu ekip önce kendi içinde anlaşabilirse tabii.";
    return { playerUid: team.playerUid, score, comment: vibe };
  }).sort((a, b) => b.score - a.score);

  return {
    winnerUid: rankings[0]?.playerUid ?? "",
    rankings,
    summary: rankings.length ? `Demo jüriye göre bu turun yıldızı ${teams.find((team) => team.playerUid === rankings[0].playerUid)?.nickname ?? "kazanan"}.` : "Henüz puanlanacak kadro yok.",
    source: "demo",
  };
}
