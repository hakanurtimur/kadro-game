"use client";

import { get, onValue, ref, runTransaction } from "firebase/database";
import { getFirebaseServices } from "../firebase-client";
import { makeRoomCode } from "../local-store";
import { createLudoRoom, joinLudoPlayer, normalizeLudoState } from "./engine";
import type { LudoMode, LudoRoomState } from "./types";

type Listener = (room: LudoRoomState | null) => void;

export class FirebaseLudoStore {
  readonly mode = "firebase" as const;

  async identity() {
    const { auth } = await getFirebaseServices();
    if (!auth.currentUser) throw new Error("Anonim oturum açılamadı.");
    return auth.currentUser.uid;
  }

  async createRoom(nickname: string, mode: LudoMode = "classic") {
    const uid = await this.identity();
    const { db } = await getFirebaseServices();
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = makeRoomCode();
      const roomRef = ref(db, `ludoRooms/${code}`);
      const room = createLudoRoom({ code, hostUid: uid, nickname, mode });
      const result = await runTransaction(roomRef, (current) => current === null ? room : undefined, { applyLocally: false });
      if (result.committed) return { room: normalizeLudoState(result.snapshot.val()), uid };
    }
    throw new Error("Oda kodu üretilemedi.");
  }

  async joinRoom(code: string, nickname: string) {
    const normalized = code.trim().toUpperCase();
    const uid = await this.identity();
    const { db } = await getFirebaseServices();
    const roomRef = ref(db, `ludoRooms/${normalized}`);
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) throw new Error("Oda bulunamadı.");
    const initialRoom = snapshot.val();
    const result = await runTransaction(roomRef, (current) => {
      const source = current ?? initialRoom;
      return joinLudoPlayer(normalizeLudoState(source), { uid, nickname });
    }, { applyLocally: false });
    if (!result.committed) {
      const latest = await get(roomRef);
      if (!latest.exists()) throw new Error("Oda bulunamadı.");
      throw new Error("Odaya katılınamadı.");
    }
    return { room: normalizeLudoState(result.snapshot.val()), uid };
  }

  async getRoom(code: string) {
    const { db } = await getFirebaseServices();
    const snapshot = await get(ref(db, `ludoRooms/${code.trim().toUpperCase()}`));
    return snapshot.exists() ? normalizeLudoState(snapshot.val()) : null;
  }

  async subscribeRoom(code: string, listener: Listener) {
    const { db } = await getFirebaseServices();
    return onValue(ref(db, `ludoRooms/${code.trim().toUpperCase()}`), (snapshot) => {
      listener(snapshot.exists() ? normalizeLudoState(snapshot.val()) : null);
    });
  }

  async mutate(code: string, transition: (room: LudoRoomState) => LudoRoomState) {
    const { db } = await getFirebaseServices();
    const roomRef = ref(db, `ludoRooms/${code.trim().toUpperCase()}`);
    const result = await runTransaction(roomRef, (current) => {
      if (!current) throw new Error("Oda bulunamadı.");
      return transition(normalizeLudoState(current));
    });
    if (!result.committed) throw new Error("Oyun durumu güncellenemedi.");
    return normalizeLudoState(result.snapshot.val());
  }
}
