"use client";

import { hasFirebaseConfig } from "../firebase-client";
import { FirebaseTasirStore } from "./firebase-store";
import { LocalTasirStore } from "./local-store";
import type { TasirRoomState } from "./types";

export interface TasirStore {
  readonly mode: "firebase" | "local";
  identity(): Promise<string>;
  createRoom(nickname: string): Promise<{ room: TasirRoomState; uid: string }>;
  joinRoom(code: string, nickname: string): Promise<{ room: TasirRoomState; uid: string }>;
  getRoom(code: string): Promise<TasirRoomState | null>;
  subscribeRoom(code: string, listener: (room: TasirRoomState | null) => void): Promise<() => void>;
  mutate(code: string, transition: (room: TasirRoomState) => TasirRoomState): Promise<TasirRoomState>;
}

let singleton: TasirStore | null = null;
export function getTasirStore(): TasirStore {
  const forceLocal = process.env.NEXT_PUBLIC_GAME_MODE === "local";
  if (!singleton) singleton = !forceLocal && hasFirebaseConfig ? new FirebaseTasirStore() : new LocalTasirStore();
  return singleton;
}
