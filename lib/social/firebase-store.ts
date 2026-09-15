"use client";

import {
  limitToLast,
  onChildAdded,
  onChildChanged,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  set,
  type DataSnapshot,
} from "firebase/database";
import { getFirebaseServices } from "../firebase-client";
import { isKnownReaction } from "./reactions";
import type { SocialGame, SocialMessage, SocialParticipant, SocialReaction } from "./types";

const cleanCode = (code: string) => code.trim().toUpperCase();

async function authorizedServices(participant?: SocialParticipant) {
  const services = await getFirebaseServices();
  const uid = services.auth.currentUser?.uid;
  if (!uid) throw new Error("Anonim oturum açılamadı.");
  if (participant && participant.uid !== uid) throw new Error("Sosyal oturum eşleşmiyor.");
  return services;
}

export class FirebaseSocialStore {
  readonly mode = "firebase" as const;

  async subscribeMessages(game: SocialGame, code: string, listener: (messages: SocialMessage[]) => void) {
    const { db } = await authorizedServices();
    const messagesQuery = query(
      ref(db, `socialRooms/${game}/${cleanCode(code)}/messages`),
      orderByChild("createdAt"),
      limitToLast(50),
    );
    return onValue(messagesQuery, (snapshot) => {
      const messages: SocialMessage[] = [];
      snapshot.forEach((child) => {
        const raw = child.val();
        if (!raw || typeof raw !== "object") return;
        messages.push({
          id: String(raw.id || child.key || ""),
          uid: String(raw.uid || ""),
          nickname: String(raw.nickname || "Oyuncu").slice(0, 20),
          role: raw.role === "moderator" ? "moderator" : "player",
          text: String(raw.text || "").slice(0, 160),
          createdAt: Number(raw.createdAt || 0),
        });
      });
      listener(messages.sort((a, b) => a.createdAt - b.createdAt));
    });
  }

  async sendMessage(game: SocialGame, code: string, participant: SocialParticipant, text: string) {
    const normalized = text.trim().replace(/\s+/g, " ").slice(0, 160);
    if (!normalized) return;
    const { db } = await authorizedServices(participant);
    const messageRef = push(ref(db, `socialRooms/${game}/${cleanCode(code)}/messages`));
    if (!messageRef.key) throw new Error("Mesaj kimliği üretilemedi.");
    const message: SocialMessage = {
      id: messageRef.key,
      uid: participant.uid,
      nickname: participant.nickname.trim().slice(0, 20),
      role: participant.role,
      text: normalized,
      createdAt: Date.now(),
    };
    await set(messageRef, message);
  }

  async subscribeReactions(game: SocialGame, code: string, listener: (reaction: SocialReaction) => void) {
    const { db } = await authorizedServices();
    const reactionsRef = ref(db, `socialRooms/${game}/${cleanCode(code)}/reactions`);
    const emit = (snapshot: DataSnapshot) => {
      const raw = snapshot.val();
      if (!raw || typeof raw !== "object") return;
      listener({
        id: String(raw.id || ""),
        uid: String(raw.uid || snapshot.key || ""),
        nickname: String(raw.nickname || "Oyuncu").slice(0, 20),
        role: raw.role === "moderator" ? "moderator" : "player",
        reaction: String(raw.reaction || ""),
        createdAt: Number(raw.createdAt || 0),
      });
    };
    const stopAdded = onChildAdded(reactionsRef, emit);
    const stopChanged = onChildChanged(reactionsRef, emit);
    return () => {
      stopAdded();
      stopChanged();
    };
  }

  async sendReaction(game: SocialGame, code: string, participant: SocialParticipant, reaction: string) {
    if (!isKnownReaction(reaction)) throw new Error("Bilinmeyen tepki.");
    const { db } = await authorizedServices(participant);
    const createdAt = Date.now();
    const payload: SocialReaction = {
      id: `${participant.uid}:${createdAt}:${Math.random().toString(36).slice(2, 7)}`,
      uid: participant.uid,
      nickname: participant.nickname.trim().slice(0, 20),
      role: participant.role,
      reaction,
      createdAt,
    };
    await set(ref(db, `socialRooms/${game}/${cleanCode(code)}/reactions/${participant.uid}`), payload);
  }
}
