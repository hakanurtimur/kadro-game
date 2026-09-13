"use client";

import { createLudoRoom, joinLudoPlayer, normalizeLudoState } from "./engine";
import type { LudoMode, LudoRoomState } from "./types";
import { makeRoomCode } from "../local-store";

const ROOM_PREFIX = "kadro:ludo:room:";
const UID_KEY = "kadro:ludo:session-uid";
type Listener = (room: LudoRoomState | null) => void;

export class LocalLudoStore {
  readonly mode = "local" as const;
  private listeners = new Map<string, Set<Listener>>();
  private channel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.channel = new BroadcastChannel("kadro-local-ludo");
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

  private key(code: string) { return `${ROOM_PREFIX}${code.toUpperCase()}`; }

  private read(code: string) {
    const raw = localStorage.getItem(this.key(code));
    if (!raw) return null;
    try { return normalizeLudoState(JSON.parse(raw)); } catch { return null; }
  }

  private write(code: string, room: LudoRoomState) {
    localStorage.setItem(this.key(code), JSON.stringify(room));
    this.emit(code);
    this.channel?.postMessage({ code });
  }

  private emit(code: string) {
    const room = this.read(code);
    this.listeners.get(code)?.forEach((listener) => listener(room));
  }

  async createRoom(nickname: string, mode: LudoMode = "classic") {
    const uid = await this.identity();
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = makeRoomCode();
      if (this.read(code)) continue;
      const room = createLudoRoom({ code, hostUid: uid, nickname, mode });
      this.write(code, room);
      return { room, uid };
    }
    throw new Error("Oda kodu üretilemedi.");
  }

  async joinRoom(code: string, nickname: string) {
    const normalized = code.trim().toUpperCase();
    const uid = await this.identity();
    const room = this.read(normalized);
    if (!room) throw new Error("Oda bulunamadı.");
    const next = joinLudoPlayer(room, { uid, nickname });
    this.write(normalized, next);
    return { room: next, uid };
  }

  async getRoom(code: string) { return this.read(code.trim().toUpperCase()); }

  async subscribeRoom(code: string, listener: Listener) {
    const normalized = code.trim().toUpperCase();
    const bucket = this.listeners.get(normalized) ?? new Set<Listener>();
    bucket.add(listener);
    this.listeners.set(normalized, bucket);
    listener(this.read(normalized));
    return () => {
      bucket.delete(listener);
      if (!bucket.size) this.listeners.delete(normalized);
    };
  }

  async mutate(code: string, transition: (room: LudoRoomState) => LudoRoomState) {
    const normalized = code.trim().toUpperCase();
    const current = this.read(normalized);
    if (!current) throw new Error("Oda bulunamadı.");
    const next = transition(current);
    this.write(normalized, next);
    return next;
  }
}
