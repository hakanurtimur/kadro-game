"use client";

import { hasFirebaseConfig } from "../firebase-client";
import { FirebaseSocialStore } from "./firebase-store";
import { LocalSocialStore } from "./local-store";
import type { SocialGame, SocialMessage, SocialParticipant, SocialReaction } from "./types";

export interface SocialStore {
  readonly mode: "firebase" | "local";
  subscribeMessages(game: SocialGame, code: string, listener: (messages: SocialMessage[]) => void): Promise<() => void>;
  sendMessage(game: SocialGame, code: string, participant: SocialParticipant, text: string): Promise<void>;
  subscribeReactions(game: SocialGame, code: string, listener: (reaction: SocialReaction) => void): Promise<() => void>;
  sendReaction(game: SocialGame, code: string, participant: SocialParticipant, reaction: string): Promise<void>;
}

let singleton: SocialStore | null = null;

export function getSocialStore(): SocialStore {
  const forceLocal = process.env.NEXT_PUBLIC_GAME_MODE === "local";
  if (!singleton) singleton = !forceLocal && hasFirebaseConfig ? new FirebaseSocialStore() : new LocalSocialStore();
  return singleton;
}
