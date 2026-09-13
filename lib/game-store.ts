"use client";

import type { RoomState } from "./types";
import { hasFirebaseConfig } from "./firebase-client";
import { FirebaseGameStore } from "./firebase-store";
import { LocalGameStore } from "./local-store";

export interface GameStore {
  readonly mode: "firebase" | "local";
  now(): number;
  identity(): Promise<string>;
  createRoom(nickname: string, budget: number, slots: number): Promise<{ room: RoomState; uid: string }>;
  joinRoom(code: string, nickname: string): Promise<{ room: RoomState; uid: string }>;
  getRoom(code: string): Promise<RoomState | null>;
  subscribeRoom(code: string, listener: (room: RoomState | null) => void, onError?: (error: Error) => void): Promise<() => void>;
  mutate(code: string, transition: (room: RoomState) => RoomState): Promise<RoomState>;
}

let singleton: GameStore | null = null;

export function getGameStore(): GameStore {
  const forceLocalDemo = process.env.NEXT_PUBLIC_GAME_MODE === "local";
  if (!singleton) {
    singleton = !forceLocalDemo && hasFirebaseConfig
      ? new FirebaseGameStore()
      : new LocalGameStore();
  }
  return singleton;
}
