export type SocialGame = "kadro" | "ludo" | "tasir" | "microgame";
export type SocialRole = "player" | "moderator";

export type SocialParticipant = {
  uid: string;
  nickname: string;
  role: SocialRole;
};

export type SocialMessage = SocialParticipant & {
  id: string;
  text: string;
  createdAt: number;
};

export type SocialReaction = SocialParticipant & {
  id: string;
  reaction: string;
  createdAt: number;
};
