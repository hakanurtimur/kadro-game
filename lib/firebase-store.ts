"use client";

import { get, onValue, ref, runTransaction } from "firebase/database";
import { createModeratedRoom, joinPlayer, normalizeRoomState } from "./game-engine";
import { getFirebaseServices } from "./firebase-client";
import { makeRoomCode } from "./local-store";
import type { RoomState } from "./types";

type RoomListener = (room: RoomState | null) => void;

export class FirebaseGameStore {
  readonly mode = "firebase" as const;

  private clockOffset = 0;
  now() { return Date.now() + this.clockOffset; }

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
      const room = createModeratedRoom({ code, hostUid: uid, nickname, budget, slots });
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
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) throw new Error("Oda bulunamadı.");
    const result = await runTransaction(roomRef, (current) => {
      if (!current) return;
      return joinPlayer(normalizeRoomState(current), { uid, nickname });
    }, { applyLocally: false });
    if (!result.committed) {
      const latest = await get(roomRef);
      if (!latest.exists()) throw new Error("Oda bulunamadı.");
      throw new Error("Odaya katılınamadı.");
    }
    return { room: normalizeRoomState(result.snapshot.val()), uid };
  }

  async getRoom(code: string) {
    const { db } = await getFirebaseServices();
    const roomRef = ref(db, `rooms/${code.trim().toUpperCase()}`);
    const snapshot = await get(roomRef);
    return snapshot.exists() ? normalizeRoomState(snapshot.val()) : null;
  }

  async subscribeRoom(code: string, listener: RoomListener, onError?: (error: Error) => void) {
    const { db } = await getFirebaseServices();
    const roomRef = ref(db, `rooms/${code.trim().toUpperCase()}`);
    const stopClock = onValue(ref(db, ".info/serverTimeOffset"), snapshot => {
      const offset = snapshot.val(); this.clockOffset = typeof offset === "number" && Number.isFinite(offset) ? offset : 0;
    });
    const stopRoom = onValue(roomRef, snapshot => listener(snapshot.exists() ? normalizeRoomState(snapshot.val()) : null),
      error => onError?.(new Error(`Veritabanı erişimi: ${error.message}`)));
    return () => { stopRoom(); stopClock(); };
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
