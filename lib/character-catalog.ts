import type { CharacterSeed } from "./types";

// The catalog, not an LLM's self-reported `source`, decides universe membership.
const TURKISH_TV_UNIVERSE = [
  // Additional named characters: broadcaster cast and episode references in docs/PATCH-01.md.
  ["Hatice Sultan", "Muhteşem Yüzyıl"],
  ["Ayşe Hafsa Sultan", "Muhteşem Yüzyıl"],
  ["Mimar Sinan", "Muhteşem Yüzyıl"],
  ["Aybige Hatun", "Muhteşem Yüzyıl"],
  ["Gül Ağa", "Muhteşem Yüzyıl"],
  ["Ebu Suud Efendi", "Muhteşem Yüzyıl"],
  ["Taşlıcalı Yahya", "Muhteşem Yüzyıl"],
  ["Şehzade Cihangir", "Muhteşem Yüzyıl"],
  ["Firuze", "Muhteşem Yüzyıl"],
  ["Fatma Sultan", "Muhteşem Yüzyıl"],
  ["Victoria", "Muhteşem Yüzyıl"],
  ["Malkoçoğlu Bali Bey", "Muhteşem Yüzyıl"],
  ["Prenses İsabella", "Muhteşem Yüzyıl"],
  ["Yakup Efendi", "Muhteşem Yüzyıl"],
  ["Şehzade Mehmet", "Muhteşem Yüzyıl"],

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
  ["Melek Yıldız", "İçerde"],
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

export const CHARACTER_POOLS: Record<string, [string, string][]> = {
  "Türk Dizi Evreni": TURKISH_TV_UNIVERSE,
  "Suç & Mafya Dizileri": CRIME,
  "Aşk & Dram Dizileri": DRAMA,
  "Komedi Dizileri": COMEDY,
  "Muhteşem Yüzyıl": MUHTESEM,
  "Kurtlar Vadisi": KURTLAR,
  "Ezel": EZEL,
  "Aşk-ı Memnu": ASK_MEMNU,
};


export class CharacterPoolError extends Error {
  constructor(message: string, readonly availableCount = 0) {
    super(message);
    this.name = "CharacterPoolError";
  }
}

export function normalizeCatalogKey(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/ı/g, "i")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

const CATEGORY_ALIASES: Record<string, string> = {
  "turk dizileri": "Türk Dizi Evreni",
  "turk dizi karakterleri": "Türk Dizi Evreni",
  "muhtesem yuzyil evreni": "Muhteşem Yüzyıl",
  "magnificent century": "Muhteşem Yüzyıl",
  "ask i memnu evreni": "Aşk-ı Memnu",
};

const CHARACTER_ALIASES: Record<string, string> = {
  "pargali ibrahim": "İbrahim Paşa",
  "pargali ibrahim pasa": "İbrahim Paşa",
  "sultan suleyman": "Kanuni Sultan Süleyman",
  "hurrem": "Hürrem Sultan",
  "valide sultan": "Ayşe Hafsa Sultan",
  "hafsa sultan": "Ayşe Hafsa Sultan",
  "ebussuud efendi": "Ebu Suud Efendi",
  "ebusuud efendi": "Ebu Suud Efendi",
  "sehzade mehmed": "Şehzade Mehmet",
  "damat rustem pasa": "Rüstem Paşa",
  "firuze hatun": "Firuze",
  "bali bey": "Malkoçoğlu Bali Bey",
  "kebapci celal": "Celal Duman",
  "bahar": "Bahar Özden",
};

export function canonicalCategory(value: string): string | null {
  const key = normalizeCatalogKey(value);
  return Object.keys(CHARACTER_POOLS).find((name) => normalizeCatalogKey(name) === key)
    ?? CATEGORY_ALIASES[key] ?? null;
}

function canonicalName(value: string): string {
  const key = normalizeCatalogKey(value);
  return normalizeCatalogKey(CHARACTER_ALIASES[key] ?? value);
}

export function catalogCharacters(category: string): CharacterSeed[] {
  const resolved = canonicalCategory(category);
  if (!resolved) throw new CharacterPoolError("Bu evren henüz karakter kataloğunda yok. Evren zarını kullan.");
  const seen = new Set<string>();
  return CHARACTER_POOLS[resolved].flatMap(([name, source]) => {
    const key = canonicalName(name);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ name, source }];
  });
}

export function eligibleCategories(count: number, excluded: string[] = []): string[] {
  const keys = new Set(excluded.map((name) => normalizeCatalogKey(canonicalCategory(name) ?? name)));
  return Object.keys(CHARACTER_POOLS).filter((category) =>
    !keys.has(normalizeCatalogKey(category)) && catalogCharacters(category).length >= count);
}

export function canonicalCharacter(category: string, raw: unknown): CharacterSeed | null {
  if (!raw || typeof raw !== "object" || !("name" in raw) || typeof raw.name !== "string") return null;
  const key = canonicalName(raw.name);
  // Replace provenance with the catalog value; merely claiming to be from a show is not enough.
  return catalogCharacters(category).find((character) => canonicalName(character.name) === key) ?? null;
}

export function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function selectCatalogCharacters(
  category: string,
  count: number,
  preferred: unknown = [],
  excludedNames: string[] = [],
): CharacterSeed[] {
  if (!Number.isInteger(count) || count < 1 || count > 80) {
    throw new CharacterPoolError("Karakter havuzu boyutu 1–80 arasında olmalı.");
  }
  const excluded = new Set(excludedNames.map(canonicalName));
  const available = catalogCharacters(category).filter((character) => !excluded.has(canonicalName(character.name)));
  if (available.length < count) {
    throw new CharacterPoolError(
      `Bu evrende ${available.length} uygun, kullanılmamış karakter var; ${count} gerekiyor. Slot sayısını azalt veya başka bir evren seç.`,
      available.length,
    );
  }
  const byName = new Map(available.map((character) => [canonicalName(character.name), character]));
  const selected: CharacterSeed[] = [];
  const seen = new Set<string>();
  const candidates = [...(Array.isArray(preferred) ? preferred : []), ...shuffled(available)];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate.name !== "string") continue;
    const key = canonicalName(candidate.name);
    const canonical = byName.get(key);
    if (!canonical || seen.has(key)) continue;
    selected.push({ ...canonical });
    seen.add(key);
    if (selected.length === count) break;
  }
  return selected;
}
