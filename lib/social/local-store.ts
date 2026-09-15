"use client";

import { isKnownReaction } from "./reactions";
import type { SocialGame, SocialMessage, SocialParticipant, SocialReaction } from "./types";

type LocalState = {
  messages: SocialMessage[];
  reactions: Record<string, SocialReaction>;
};

const PREFIX = "kadro:social:";
const messageListeners = new Map<string, Set<(messages: SocialMessage[]) => void>>();
const reactionListeners = new Map<string, Set<(reaction: SocialReaction) => void>>();
let storageHooked = false;

const roomKey = (game: SocialGame, code: string) => `${game}:${code.trim().toUpperCase()}`;
const storageKey = (key: string) => `${PREFIX}${key}`;

function load(key: string): LocalState {
  if (typeof window === "undefined") return { messages: [], reactions: {} };
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return { messages: [], reactions: {} };
    const parsed = JSON.parse(raw);
    return {
      messages: Array.isArray(parsed?.messages) ? parsed.messages.slice(-50) : [],
      reactions: parsed?.reactions && typeof parsed.reactions === "object" ? parsed.reactions : {},
    };
  } catch {
    return { messages: [], reactions: {} };
  }
}

function save(key: string, state: LocalState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(key), JSON.stringify(state));
}

function emitMessages(key: string, state = load(key)) {
  const payload = [...state.messages].sort((a, b) => a.createdAt - b.createdAt).slice(-50);
  messageListeners.get(key)?.forEach((listener) => listener(payload));
}

function emitReaction(key: string, reaction: SocialReaction) {
  reactionListeners.get(key)?.forEach((listener) => listener(reaction));
}

function ensureStorageHook() {
  if (storageHooked || typeof window === "undefined") return;
  storageHooked = true;
  window.addEventListener("storage", (event) => {
    if (!event.key?.startsWith(PREFIX) || !event.newValue) return;
    const key = event.key.slice(PREFIX.length);
    const state = load(key);
    emitMessages(key, state);
    Object.values(state.reactions)
      .filter((reaction) => Date.now() - Number(reaction.createdAt || 0) < 5000)
      .forEach((reaction) => emitReaction(key, reaction));
  });
}

export class LocalSocialStore {
  readonly mode = "local" as const;

  async subscribeMessages(game: SocialGame, code: string, listener: (messages: SocialMessage[]) => void) {
    ensureStorageHook();
    const key = roomKey(game, code);
    const set = messageListeners.get(key) ?? new Set();
    set.add(listener);
    messageListeners.set(key, set);
    listener(load(key).messages.slice(-50));
    return () => {
      set.delete(listener);
      if (!set.size) messageListeners.delete(key);
    };
  }

  async sendMessage(game: SocialGame, code: string, participant: SocialParticipant, text: string) {
    const normalized = text.trim().replace(/\s+/g, " ").slice(0, 160);
    if (!normalized) return;
    const key = roomKey(game, code);
    const state = load(key);
    state.messages.push({
      ...participant,
      id: `${participant.uid}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      text: normalized,
      createdAt: Date.now(),
    });
    state.messages = state.messages.slice(-50);
    save(key, state);
    emitMessages(key, state);
  }

  async subscribeReactions(game: SocialGame, code: string, listener: (reaction: SocialReaction) => void) {
    ensureStorageHook();
    const key = roomKey(game, code);
    const set = reactionListeners.get(key) ?? new Set();
    set.add(listener);
    reactionListeners.set(key, set);
    Object.values(load(key).reactions)
      .filter((reaction) => Date.now() - Number(reaction.createdAt || 0) < 5000)
      .forEach(listener);
    return () => {
      set.delete(listener);
      if (!set.size) reactionListeners.delete(key);
    };
  }

  async sendReaction(game: SocialGame, code: string, participant: SocialParticipant, reaction: string) {
    if (!isKnownReaction(reaction)) throw new Error("Bilinmeyen tepki.");
    const key = roomKey(game, code);
    const state = load(key);
    const payload: SocialReaction = {
      ...participant,
      id: `${participant.uid}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      reaction,
      createdAt: Date.now(),
    };
    state.reactions[participant.uid] = payload;
    save(key, state);
    emitReaction(key, payload);
  }
}
