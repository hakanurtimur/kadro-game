"use client";

import { hasFirebaseConfig } from "../firebase-client";
import { FirebaseMicrogameStore } from "./firebase-store";
import { LocalMicrogameStore } from "./local-store";
import type { ArenaPosition, MicrogameRoomState } from "./types";

export interface MicrogameStore {
  readonly mode:"firebase"|"local";
  identity():Promise<string>;
  createRoom(nickname:string):Promise<{room:MicrogameRoomState;uid:string}>;
  joinRoom(code:string,nickname:string):Promise<{room:MicrogameRoomState;uid:string}>;
  getRoom(code:string):Promise<MicrogameRoomState|null>;
  subscribeRoom(code:string,listener:(room:MicrogameRoomState|null)=>void):Promise<()=>void>;
  mutate(code:string,transition:(room:MicrogameRoomState)=>MicrogameRoomState):Promise<MicrogameRoomState>;
  subscribeArenaPositions(code:string,roundNumber:number,listener:(positions:Record<string,ArenaPosition>)=>void):Promise<()=>void>;
  getArenaPositions(code:string,roundNumber:number):Promise<Record<string,ArenaPosition>>;
  setArenaPosition(code:string,position:ArenaPosition):Promise<void>;
  now():number;
}

let singleton:MicrogameStore|null=null;
export function getMicrogameStore():MicrogameStore{
  const forceLocal=process.env.NEXT_PUBLIC_GAME_MODE==="local";
  if(!singleton)singleton=!forceLocal&&hasFirebaseConfig?new FirebaseMicrogameStore():new LocalMicrogameStore();
  return singleton;
}
