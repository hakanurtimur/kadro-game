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

const TURKISH_TV_UNIVERSE = [
  ["Hürrem Sultan", "Muhteşem Yüzyıl"], ["Kanuni Sultan Süleyman", "Muhteşem Yüzyıl"],
  ["İbrahim Paşa", "Muhteşem Yüzyıl"], ["Rüstem Paşa", "Muhteşem Yüzyıl"],
  ["Sümbül Ağa", "Muhteşem Yüzyıl"], ["Nigar Kalfa", "Muhteşem Yüzyıl"],
  ["Matrakçı Nasuh", "Muhteşem Yüzyıl"], ["Mahidevran Sultan", "Muhteşem Yüzyıl"],
  ["Mihrimah Sultan", "Muhteşem Yüzyıl"], ["Şehzade Mustafa", "Muhteşem Yüzyıl"],
  ["Polat Alemdar", "Kurtlar Vadisi"], ["Memati Baş", "Kurtlar Vadisi"],
  ["Süleyman Çakır", "Kurtlar Vadisi"], ["Abdülhey Çoban", "Kurtlar Vadisi"],
  ["Laz Ziya", "Kurtlar Vadisi"], ["Aslan Akbey", "Kurtlar Vadisi"],
  ["Elif Eylül", "Kurtlar Vadisi"], ["Pala", "Kurtlar Vadisi"],
  ["Ramiz Dayı", "Ezel"], ["Ezel Bayraktar", "Ezel"], ["Eyşan Tezcan", "Ezel"],
  ["Cengiz Atay", "Ezel"], ["Ali Kırgız", "Ezel"], ["Kenan Birkan", "Ezel"],
  ["Bihter Ziyagil", "Aşk-ı Memnu"], ["Behlül Haznedar", "Aşk-ı Memnu"],
  ["Firdevs Yöreoğlu", "Aşk-ı Memnu"], ["Adnan Ziyagil", "Aşk-ı Memnu"],
  ["Nihal Ziyagil", "Aşk-ı Memnu"], ["Beşir", "Aşk-ı Memnu"],
  ["Erdal Bakkal", "Leyla ile Mecnun"], ["İsmail Abi", "Leyla ile Mecnun"],
  ["Mecnun Çınar", "Leyla ile Mecnun"], ["Leyla", "Leyla ile Mecnun"],
  ["Yavuz", "Leyla ile Mecnun"], ["Ak Sakallı Dede", "Leyla ile Mecnun"],
  ["Burhan Altıntop", "Avrupa Yakası"], ["Aslı Sütçüoğlu", "Avrupa Yakası"],
  ["Volkan Sütçüoğlu", "Avrupa Yakası"], ["Şahika Koçarslanlı", "Avrupa Yakası"],
  ["Gaffur Aksoy", "Avrupa Yakası"], ["Tahsin Sütçüoğlu", "Avrupa Yakası"],
  ["Yamaç Koçovalı", "Çukur"], ["İdris Koçovalı", "Çukur"], ["Vartolu Saadettin", "Çukur"],
  ["Cumali Koçovalı", "Çukur"], ["Sena Koçovalı", "Çukur"], ["Selim Koçovalı", "Çukur"],
  ["Kuzey Tekinoğlu", "Kuzey Güney"], ["Güney Tekinoğlu", "Kuzey Güney"],
  ["Cemre Çayak", "Kuzey Güney"], ["Banu Sinaner", "Kuzey Güney"],
  ["Ali Vefa", "Mucize Doktor"], ["Ferman Eryiğit", "Mucize Doktor"],
  ["Bahar Özden", "Bahar"], ["Timur Yavuzoğlu", "Bahar"],
  ["Sarp Yılmaz", "İçerde"], ["Mert Karadağ", "İçerde"], ["Celal Duman", "İçerde"],
  ["Melek Yıldız", "İçerde"], ["Kebapçı Celal", "İçerde"],
  ["Seyit Eminof", "Kurt Seyit ve Şura"], ["Şura", "Kurt Seyit ve Şura"],
  ["Azize", "Hercai"], ["Miran Aslanbey", "Hercai"], ["Reyyan Şadoğlu", "Hercai"],
  ["Alya Albora", "Uzak Şehir"], ["Cihan Albora", "Uzak Şehir"],
  ["Ferit Korhan", "Yalı Çapkını"], ["Seyran Şanlı", "Yalı Çapkını"],
  ["Kazım Şanlı", "Yalı Çapkını"], ["Halis Ağa", "Yalı Çapkını"],
] satisfies [string, string][];

const bySources = (...sources: string[]) => TURKISH_TV_UNIVERSE.filter(([, source]) => sources.includes(source));
const MUHTESEM = bySources("Muhteşem Yüzyıl");
const KURTLAR = bySources("Kurtlar Vadisi");
const EZEL = bySources("Ezel");
const ASK_MEMNU = bySources("Aşk-ı Memnu");
const CRIME = bySources("Kurtlar Vadisi", "Ezel", "Çukur", "İçerde");
const COMEDY = bySources("Leyla ile Mecnun", "Avrupa Yakası");
const DRAMA = bySources("Aşk-ı Memnu", "Kuzey Güney", "Bahar", "Hercai", "Yalı Çapkını", "Uzak Şehir", "Kurt Seyit ve Şura");

export const FALLBACK_POOLS: Record<string, [string, string][]> = {
  "Türk Dizi Evreni": TURKISH_TV_UNIVERSE,
  "Suç & Mafya Dizileri": CRIME,
  "Aşk & Dram Dizileri": DRAMA,
  "Komedi Dizileri": COMEDY,
  "Muhteşem Yüzyıl": MUHTESEM,
  "Kurtlar Vadisi": KURTLAR,
  "Ezel": EZEL,
  "Aşk-ı Memnu": ASK_MEMNU,
};

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function choose<T>(values: T[], exclude: T[] = []): T {
  const allowed = values.filter((value) => !exclude.includes(value));
  const source = allowed.length ? allowed : values;
  return source[Math.floor(Math.random() * source.length)];
}

function makePool(category: string, count: number, excludedNames: string[] = []): CharacterSeed[] {
  const excluded = new Set(excludedNames.map((name) => name.toLocaleLowerCase("tr-TR")));
  const primary = FALLBACK_POOLS[category] ?? TURKISH_TV_UNIVERSE;
  const candidates = [...primary, ...TURKISH_TV_UNIVERSE]
    .filter(([name], index, array) => array.findIndex(([other]) => other === name) === index)
    .filter(([name]) => !excluded.has(name.toLocaleLowerCase("tr-TR")));

  const selected = shuffle(candidates).slice(0, count).map(([name, source]) => ({ name, source }));
  let index = 1;
  while (selected.length < count) {
    const name = `Sürpriz Dizi Karakteri ${index++}`;
    if (!excluded.has(name.toLocaleLowerCase("tr-TR"))) selected.push({ name, source: category });
  }
  return selected;
}

export function generateFallbackRound(characterCount: number): RoundPayload {
  const safeCount = Math.max(1, Math.min(80, Math.floor(characterCount)));
  const eligibleCategories = Object.keys(FALLBACK_POOLS).filter((category) => FALLBACK_POOLS[category].length >= Math.min(safeCount, 8));
  const characterCategory = safeCount > 10 ? "Türk Dizi Evreni" : choose(eligibleCategories);
  return {
    scenario: choose(FALLBACK_SCENARIOS),
    characterCategory,
    characters: makePool(characterCategory, safeCount),
    source: "demo",
  };
}

export function rerollFallbackScenario(excluded: string[] = []) {
  return choose(FALLBACK_SCENARIOS, excluded);
}

export function rerollFallbackCategory(excludedCategories: string[], characterCount: number) {
  const categories = Object.keys(FALLBACK_POOLS);
  const eligible = categories.filter((category) => FALLBACK_POOLS[category].length >= characterCount);
  const source = eligible.length ? eligible : categories;
  const candidates = source.filter((category) => !excludedCategories.includes(category));
  const category = choose(candidates.length ? candidates : source);
  return {
    characterCategory: category,
    characters: makePool(category, characterCount),
    source: "demo" as const,
  };
}

export function rerollFallbackCharacter(category: string, excludedNames: string[]): CharacterSeed {
  return makePool(category, 1, excludedNames)[0];
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
