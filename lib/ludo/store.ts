"use client";

import { hasFirebaseConfig } from "../firebase-client";
import { FirebaseLudoStore } from "./firebase-store";
import { LocalLudoStore } from "./local-store";
import type { LudoMode, LudoRoomState } from "./types";

export interface LudoStore {
  readonly mode: "firebase" | "local";
  identity(): Promise<string>;
  createRoom(nickname: string, mode?: LudoMode): Promise<{ room: LudoRoomState; uid: string }>;
  joinRoom(code: string, nickname: string): Promise<{ room: LudoRoomState; uid: string }>;
  getRoom(code: string): Promise<LudoRoomState | null>;
  subscribeRoom(code: string, listener: (room: LudoRoomState | null) => void): Promise<() => void>;
  mutate(code: string, transition: (room: LudoRoomState) => LudoRoomState): Promise<LudoRoomState>;
}

let singleton: LudoStore | null = null;
export function getLudoStore(): LudoStore {
  const forceLocal = process.env.NEXT_PUBLIC_GAME_MODE === "local";
  if (!singleton) singleton = !forceLocal && hasFirebaseConfig ? new FirebaseLudoStore() : new LocalLudoStore();
  return singleton;
}
