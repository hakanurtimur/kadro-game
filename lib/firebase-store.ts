"use client";

import { get, onValue, ref, runTransaction } from "firebase/database";
import { createInitialRoom, joinPlayer, normalizeRoomState } from "./game-engine";
import { getFirebaseServices } from "./firebase-client";
import { makeRoomCode } from "./local-store";
import type { RoomState } from "./types";

type RoomListener = (room: RoomState | null) => void;

export class FirebaseGameStore {
  readonly mode = "firebase" as const;

  async identity() {
    const { auth } = await getFirebaseServices();
    if (!auth.currentUser) throw new Error("Anonim oturum açılamadı.");
    return auth.currentUser.uid;
  }

  async createRoom(nickname: string, budget: number, slots: number) {
    const uid = await this.identity();
    const { db } = await getFirebaseServices();

    for (let attempt = 0; attempt < 20; attempt++) {
      const code = makeRoomCode();
      const roomRef = ref(db, `rooms/${code}`);
      const room = createInitialRoom({ code, hostUid: uid, nickname, budget, slots });
      const result = await runTransaction(roomRef, (current) => current === null ? room : undefined, { applyLocally: false });
      if (result.committed) return { room: normalizeRoomState(result.snapshot.val()), uid };
    }
    throw new Error("Oda kodu üretilemedi.");
  }

  async joinRoom(code: string, nickname: string) {
    const normalizedCode = code.trim().toUpperCase();
    const uid = await this.identity();
    const { db } = await getFirebaseServices();
    const roomRef = ref(db, `rooms/${normalizedCode}`);
    const result = await runTransaction(roomRef, (current) => {
      if (!current) throw new Error("Oda bulunamadı.");
      return joinPlayer(normalizeRoomState(current), { uid, nickname });
    });
    if (!result.committed) throw new Error("Odaya katılınamadı.");
    return { room: normalizeRoomState(result.snapshot.val()), uid };
  }

  async getRoom(code: string) {
    const { db } = await getFirebaseServices();
    const roomRef = ref(db, `rooms/${code.trim().toUpperCase()}`);
    const snapshot = await get(roomRef);
    return snapshot.exists() ? normalizeRoomState(snapshot.val()) : null;
  }

  async subscribeRoom(code: string, listener: RoomListener) {
    const { db } = await getFirebaseServices();
    const roomRef = ref(db, `rooms/${code.trim().toUpperCase()}`);
    return onValue(roomRef, (snapshot) => listener(snapshot.exists() ? normalizeRoomState(snapshot.val()) : null));
  }

  async mutate(code: string, transition: (room: RoomState) => RoomState) {
    const { db } = await getFirebaseServices();
    const roomRef = ref(db, `rooms/${code.trim().toUpperCase()}`);
    const result = await runTransaction(roomRef, (current) => {
      if (!current) throw new Error("Oda bulunamadı.");
      return transition(normalizeRoomState(current));
    });
    if (!result.committed) throw new Error("Oyun durumu güncellenemedi.");
    return normalizeRoomState(result.snapshot.val());
  }
}
