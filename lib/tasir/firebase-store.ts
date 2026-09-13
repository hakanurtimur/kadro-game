"use client";

import { get, onValue, ref, runTransaction } from "firebase/database";
import { getFirebaseServices } from "../firebase-client";
import { makeRoomCode } from "../local-store";
import { createTasirRoom, joinTasirPlayer, normalizeTasirState } from "./engine";
import type { TasirRoomState } from "./types";

type Listener = (room: TasirRoomState | null) => void;
export class FirebaseTasirStore {
  readonly mode = "firebase" as const;
  async identity(){const{auth}=await getFirebaseServices();if(!auth.currentUser)throw new Error("Anonim oturum açılamadı.");return auth.currentUser.uid;}
  async createRoom(nickname:string){const uid=await this.identity();const{db}=await getFirebaseServices();for(let attempt=0;attempt<20;attempt++){const code=makeRoomCode();const roomRef=ref(db,`tasirRooms/${code}`);const room=createTasirRoom({code,hostUid:uid,nickname});const result=await runTransaction(roomRef,(current)=>current===null?room:undefined,{applyLocally:false});if(result.committed)return{room:normalizeTasirState(result.snapshot.val()),uid};}throw new Error("Oda kodu üretilemedi.");}
  async joinRoom(code:string,nickname:string){const normalized=code.trim().toUpperCase();const uid=await this.identity();const{db}=await getFirebaseServices();const roomRef=ref(db,`tasirRooms/${normalized}`);const result=await runTransaction(roomRef,(current)=>{if(!current)throw new Error("Oda bulunamadı.");return joinTasirPlayer(normalizeTasirState(current),{uid,nickname});});if(!result.committed)throw new Error("Odaya katılınamadı.");return{room:normalizeTasirState(result.snapshot.val()),uid};}
  async getRoom(code:string){const{db}=await getFirebaseServices();const snapshot=await get(ref(db,`tasirRooms/${code.trim().toUpperCase()}`));return snapshot.exists()?normalizeTasirState(snapshot.val()):null;}
  async subscribeRoom(code:string,listener:Listener){const{db}=await getFirebaseServices();return onValue(ref(db,`tasirRooms/${code.trim().toUpperCase()}`),(snapshot)=>listener(snapshot.exists()?normalizeTasirState(snapshot.val()):null));}
  async mutate(code:string,transition:(room:TasirRoomState)=>TasirRoomState){const{db}=await getFirebaseServices();const roomRef=ref(db,`tasirRooms/${code.trim().toUpperCase()}`);const result=await runTransaction(roomRef,(current)=>{if(!current)throw new Error("Oda bulunamadı.");return transition(normalizeTasirState(current));});if(!result.committed)throw new Error("Oyun durumu güncellenemedi.");return normalizeTasirState(result.snapshot.val());}
}
