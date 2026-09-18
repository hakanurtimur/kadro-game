"use client";

import { get, onValue, ref, runTransaction, set, type Database } from "firebase/database";
import { getFirebaseServices } from "../firebase-client";
import { makeRoomCode } from "../local-store";
import { createMicrogameRoom, joinMicrogamePlayer, normalizeMicrogameState } from "./engine";
import type { ArenaPosition, MicrogameRoomState } from "./types";

type Listener=(room:MicrogameRoomState|null)=>void;

function cleanCode(code:string){return code.trim().toUpperCase();}

function cleanPosition(raw:any):ArenaPosition|null{
  if(!raw||typeof raw!=="object")return null;
  const uid=String(raw.uid||"");
  const roundNumber=Number(raw.roundNumber);
  const x=Number(raw.x);
  const y=Number(raw.y);
  const updatedAt=Number(raw.updatedAt);
  if(!uid||!Number.isFinite(roundNumber)||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(updatedAt))return null;
  return {uid,roundNumber,x:Math.max(0,Math.min(100,x)),y:Math.max(0,Math.min(100,y)),updatedAt};
}

export class FirebaseMicrogameStore{
  readonly mode="firebase" as const;
  private clockOffset=0;

  now(){return Date.now()+this.clockOffset;}
  private async syncClock(db:Database){
    try{const snapshot=await get(ref(db,".info/serverTimeOffset"));this.clockOffset=Number(snapshot.val()||0);}catch{/* local Date.now fallback */}
  }
  async identity(){
    const{auth,db}=await getFirebaseServices();await this.syncClock(db);
    if(!auth.currentUser)throw new Error("Anonim oturum açılamadı.");
    return auth.currentUser.uid;
  }
  async createRoom(nickname:string){
    const uid=await this.identity();const{db}=await getFirebaseServices();
    for(let attempt=0;attempt<20;attempt++){
      const code=makeRoomCode();const roomRef=ref(db,`microgameRooms/${code}`);const room=createMicrogameRoom({code,hostUid:uid,nickname,now:this.now()});
      const result=await runTransaction(roomRef,(current:any)=>current===null?room:undefined,{applyLocally:false});
      if(result.committed)return{room:normalizeMicrogameState(result.snapshot.val()),uid};
    }
    throw new Error("Oda kodu üretilemedi.");
  }
  async joinRoom(code:string,nickname:string){
    const normalized=cleanCode(code);const uid=await this.identity();const{db}=await getFirebaseServices();const roomRef=ref(db,`microgameRooms/${normalized}`);
    const snapshot=await get(roomRef);if(!snapshot.exists())throw new Error("Oda bulunamadı.");const initialRoom=snapshot.val();
    const result=await runTransaction(roomRef,(current:any)=>joinMicrogamePlayer(normalizeMicrogameState(current??initialRoom),{uid,nickname,now:this.now()}),{applyLocally:false});
    if(!result.committed){const latest=await get(roomRef);if(!latest.exists())throw new Error("Oda bulunamadı.");throw new Error("Odaya katılınamadı.");}
    return{room:normalizeMicrogameState(result.snapshot.val()),uid};
  }
  async getRoom(code:string){const{db}=await getFirebaseServices();const snapshot=await get(ref(db,`microgameRooms/${cleanCode(code)}`));return snapshot.exists()?normalizeMicrogameState(snapshot.val()):null;}
  async subscribeRoom(code:string,listener:Listener,onError?: (error: Error) => void){
    const{db}=await getFirebaseServices();void this.syncClock(db);const normalized=cleanCode(code);
    return onValue(ref(db,`microgameRooms/${normalized}`),(snapshot:any)=>listener(snapshot.exists()?normalizeMicrogameState(snapshot.val()):null),onError);
  }
  async mutate(code:string,transition:(room:MicrogameRoomState)=>MicrogameRoomState){
    const{db}=await getFirebaseServices();const roomRef=ref(db,`microgameRooms/${cleanCode(code)}`);
    const result=await runTransaction(roomRef,(current:any)=>{if(!current)throw new Error("Oda bulunamadı.");return transition(normalizeMicrogameState(current));},{applyLocally:false});
    if(!result.committed)throw new Error("Oyun durumu güncellenemedi.");
    return normalizeMicrogameState(result.snapshot.val());
  }
  async subscribeArenaPositions(code:string,roundNumber:number,listener:(positions:Record<string,ArenaPosition>)=>void){
    const{db}=await getFirebaseServices();const positionsRef=ref(db,`microgameLive/${cleanCode(code)}/positions`);
    return onValue(positionsRef,(snapshot:any)=>{
      const next:Record<string,ArenaPosition>={};
      snapshot.forEach((child:any)=>{
        const position=cleanPosition(child.val());
        if(position&&position.roundNumber===roundNumber)next[position.uid]=position;
      });
      listener(next);
    });
  }
  async getArenaPositions(code:string,roundNumber:number){
    const {db}=await getFirebaseServices();
    const snapshot=await get(ref(db,`microgameLive/${cleanCode(code)}/positions`));
    const positions:Record<string,ArenaPosition>={};
    snapshot.forEach(child=>{const position=cleanPosition(child.val());if(position&&position.roundNumber===roundNumber)positions[position.uid]=position;});
    return positions;
  }
  async setArenaPosition(code:string,position:ArenaPosition){
    const{auth,db}=await getFirebaseServices();
    if(!auth.currentUser||auth.currentUser.uid!==position.uid)throw new Error("Arena oturumu eşleşmiyor.");
    const clean:ArenaPosition={
      uid:position.uid,
      roundNumber:Math.max(0,Math.floor(position.roundNumber)),
      x:Math.max(0,Math.min(100,position.x)),
      y:Math.max(0,Math.min(100,position.y)),
      updatedAt:this.now(),
    };
    await set(ref(db,`microgameLive/${cleanCode(code)}/positions/${position.uid}`),clean);
  }
}
