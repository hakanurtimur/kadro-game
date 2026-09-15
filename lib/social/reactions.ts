export type ReactionOption = {
  id: string;
  label: string;
  kind: "emoji" | "sticker";
  emoji?: string;
  asset?: string;
  quick?: boolean;
};

export const STANDARD_REACTIONS: ReactionOption[] = [
  { id: "laugh", label: "Koptum", kind: "emoji", emoji: "😂", quick: true },
  { id: "heart", label: "Kalp", kind: "emoji", emoji: "❤️" },
  { id: "fire", label: "Oha", kind: "emoji", emoji: "🔥", quick: true },
  { id: "clap", label: "Helal", kind: "emoji", emoji: "👏", quick: true },
  { id: "thumbs", label: "İyi oynadın", kind: "emoji", emoji: "👍" },
  { id: "think", label: "Hmm", kind: "emoji", emoji: "🤔" },
  { id: "party", label: "Parti", kind: "emoji", emoji: "🎉" },
  { id: "cry", label: "Yandım", kind: "emoji", emoji: "😭" },
  { id: "devil", label: "Gel bakalım", kind: "emoji", emoji: "😈" },
];

export const HAKO_REACTIONS: ReactionOption[] = [
  { id: "hako-coffee", label: "Hakö Baba", kind: "sticker", asset: "/reactions/hako/hako-coffee.png" },
  { id: "iyi-oynadin", label: "İyi oynadın", kind: "sticker", asset: "/reactions/hako/iyi-oynadin.png" },
  { id: "helal", label: "Helal", kind: "sticker", asset: "/reactions/hako/helal.png" },
  { id: "rahat", label: "Rahat", kind: "sticker", asset: "/reactions/hako/rahat.png" },
  { id: "ne-alaka", label: "Ne alaka", kind: "sticker", asset: "/reactions/hako/ne-alaka.png" },
  { id: "hahaha", label: "Hahaha", kind: "sticker", asset: "/reactions/hako/hahaha.png" },
  { id: "vay-be", label: "Vay be", kind: "sticker", asset: "/reactions/hako/vay-be.png" },
  { id: "aslanim", label: "Aslanım", kind: "sticker", asset: "/reactions/hako/aslanim.png" },
  { id: "dusuncemdeyim", label: "Düşüncemdeyim", kind: "sticker", asset: "/reactions/hako/dusuncemdeyim.png" },
  { id: "hako-crown", label: "Hakö Baba 👑", kind: "sticker", asset: "/reactions/hako/hako-crown.png", quick: true },
];

export const ALL_REACTIONS = [...STANDARD_REACTIONS, ...HAKO_REACTIONS];
export const QUICK_REACTIONS = ALL_REACTIONS.filter((item) => item.quick);
const REACTION_MAP = new Map(ALL_REACTIONS.map((item) => [item.id, item]));

export function reactionById(id: string) {
  return REACTION_MAP.get(id) ?? null;
}

export function isKnownReaction(id: string) {
  return REACTION_MAP.has(id);
}
