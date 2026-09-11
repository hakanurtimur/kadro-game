"use client";

import { createInitialRoom, joinPlayer, normalizeRoomState } from "./game-engine";
import type { RoomState } from "./types";

const ROOM_PREFIX = "kadro:room:";
const UID_KEY = "kadro:session-uid";

type RoomListener = (room: RoomState | null) => void;

export function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export class LocalGameStore {
  readonly mode = "local" as const;
  private listeners = new Map<string, Set<RoomListener>>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("kadro-local-game");
      this.channel.addEventListener("message", (event) => {
        const code = String(event.data?.code || "");
        if (code) this.emit(code);
      });
    }
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (event) => {
        if (event.key?.startsWith(ROOM_PREFIX)) this.emit(event.key.slice(ROOM_PREFIX.length));
      });
    }
  }

  async identity() {
    let uid = sessionStorage.getItem(UID_KEY);
    if (!uid) {
      uid = crypto.randomUUID();
      sessionStorage.setItem(UID_KEY, uid);
    }
    return uid;
  }

  private key(code: string) {
    return `${ROOM_PREFIX}${code.toUpperCase()}`;
  }

  private read(code: string): RoomState | null {
    const raw = localStorage.getItem(this.key(code));
    if (!raw) return null;
    try {
      return normalizeRoomState(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  private write(code: string, room: RoomState) {
    localStorage.setItem(this.key(code), JSON.stringify(room));
    this.emit(code);
    this.channel?.postMessage({ code });
  }

  private emit(code: string) {
    const room = this.read(code);
    this.listeners.get(code)?.forEach((listener) => listener(room));
  }

  async createRoom(nickname: string, budget: number, slots: number) {
    const uid = await this.identity();
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = makeRoomCode();
      if (this.read(code)) continue;
      const room = createInitialRoom({ code, hostUid: uid, nickname, budget, slots });
      this.write(code, room);
      return { room, uid };
    }
    throw new Error("Oda kodu üretilemedi.");
  }

  async joinRoom(code: string, nickname: string) {
    const normalizedCode = code.trim().toUpperCase();
    const uid = await this.identity();
    const room = this.read(normalizedCode);
    if (!room) throw new Error("Oda bulunamadı.");
    const next = joinPlayer(room, { uid, nickname });
    this.write(normalizedCode, next);
    return { room: next, uid };
  }

  async getRoom(code: string) {
    return this.read(code.trim().toUpperCase());
  }

  async subscribeRoom(code: string, listener: RoomListener) {
    const normalizedCode = code.trim().toUpperCase();
    const bucket = this.listeners.get(normalizedCode) ?? new Set<RoomListener>();
    bucket.add(listener);
    this.listeners.set(normalizedCode, bucket);
    listener(this.read(normalizedCode));
    return () => {
      const current = this.listeners.get(normalizedCode);
      current?.delete(listener);
      if (current?.size === 0) this.listeners.delete(normalizedCode);
    };
  }

  async mutate(code: string, transition: (room: RoomState) => RoomState) {
    const normalizedCode = code.trim().toUpperCase();
    const current = this.read(normalizedCode);
    if (!current) throw new Error("Oda bulunamadı.");
    const next = transition(current);
    this.write(normalizedCode, next);
    return next;
  }
}
