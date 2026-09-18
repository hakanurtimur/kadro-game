"use client";

import { makeRoomCode } from "../local-store";
import { createMicrogameRoom, joinMicrogamePlayer, normalizeMicrogameState } from "./engine";
import type { ArenaPosition, MicrogameRoomState } from "./types";

const ROOM_PREFIX="kadro:microgame:room:";
const LIVE_PREFIX="kadro:microgame:live:";
const UID_KEY="kadro:microgame:session-uid";
type Listener=(room:MicrogameRoomState|null)=>void;

export class LocalMicrogameStore{
  readonly mode="local" as const;
  private listeners=new Map<string,Set<Listener>>();
  private liveListeners=new Map<string,Set<(positions:Record<string,ArenaPosition>)=>void>>();
  private channel:BroadcastChannel|null=null;

  constructor(){
    if(typeof window!=="undefined"&&"BroadcastChannel" in window){
      this.channel=new BroadcastChannel("kadro-local-microgame");
      this.channel.addEventListener("message",event=>{
        const code=String(event.data?.code||"");
        if(!code)return;
        if(event.data?.type==="live")this.emitLive(code);
        else this.emit(code);
      });
    }
    if(typeof window!=="undefined")window.addEventListener("storage",event=>{
      if(event.key?.startsWith(ROOM_PREFIX))this.emit(event.key.slice(ROOM_PREFIX.length));
      if(event.key?.startsWith(LIVE_PREFIX))this.emitLive(event.key.slice(LIVE_PREFIX.length));
    });
  }

  now(){return Date.now();}
  async identity(){
    let uid=sessionStorage.getItem(UID_KEY);
    if(!uid){uid=crypto.randomUUID();sessionStorage.setItem(UID_KEY,uid);}
    return uid;
  }
  private key(code:string){return `${ROOM_PREFIX}${code.trim().toUpperCase()}`;}
  private liveKey(code:string){return `${LIVE_PREFIX}${code.trim().toUpperCase()}`;}
  private read(code:string){
    const raw=localStorage.getItem(this.key(code));
    if(!raw)return null;
    try{return normalizeMicrogameState(JSON.parse(raw));}catch{return null;}
  }
  private readLive(code:string):Record<string,ArenaPosition>{
    const raw=localStorage.getItem(this.liveKey(code));
    if(!raw)return {};
    try{
      const parsed=JSON.parse(raw);const next:Record<string,ArenaPosition>={};
      for(const [uid,value] of Object.entries(parsed??{}) as Array<[string,any]>){
        if(!value)continue;
        next[uid]={uid:String(value.uid||uid),roundNumber:Number(value.roundNumber)||0,x:Number(value.x)||0,y:Number(value.y)||0,updatedAt:Number(value.updatedAt)||0};
      }
      return next;
    }catch{return {};}
  }
  private write(code:string,room:MicrogameRoomState){localStorage.setItem(this.key(code),JSON.stringify(room));this.emit(code);this.channel?.postMessage({code,type:"room"});}
  private emit(code:string){const room=this.read(code);this.listeners.get(code)?.forEach(listener=>listener(room));}
  private emitLive(code:string){
    const positions=this.readLive(code);this.liveListeners.get(code)?.forEach(listener=>listener(positions));
  }

  async createRoom(nickname:string){
    const uid=await this.identity();
    for(let attempt=0;attempt<20;attempt++){
      const code=makeRoomCode();if(this.read(code))continue;
      const room=createMicrogameRoom({code,hostUid:uid,nickname});this.write(code,room);return{room,uid};
    }
    throw new Error("Oda kodu üretilemedi.");
  }
  async joinRoom(code:string,nickname:string){
    const normalized=code.trim().toUpperCase();const uid=await this.identity();const room=this.read(normalized);
    if(!room)throw new Error("Oda bulunamadı.");
    const next=joinMicrogamePlayer(room,{uid,nickname});this.write(normalized,next);return{room:next,uid};
  }
  async getRoom(code:string){return this.read(code);}
  async subscribeRoom(code:string,listener:Listener){
    const normalized=code.trim().toUpperCase();const bucket=this.listeners.get(normalized)??new Set<Listener>();bucket.add(listener);this.listeners.set(normalized,bucket);listener(this.read(normalized));
    return()=>{bucket.delete(listener);if(!bucket.size)this.listeners.delete(normalized);};
  }
  async mutate(code:string,transition:(room:MicrogameRoomState)=>MicrogameRoomState){
    const normalized=code.trim().toUpperCase();const current=this.read(normalized);if(!current)throw new Error("Oda bulunamadı.");
    const next=transition(current);this.write(normalized,next);return next;
  }
  async subscribeArenaPositions(code:string,roundNumber:number,listener:(positions:Record<string,ArenaPosition>)=>void){
    const normalized=code.trim().toUpperCase();
    const bucket=this.liveListeners.get(normalized)??new Set<(positions:Record<string,ArenaPosition>)=>void>();
    const wrapped=(positions:Record<string,ArenaPosition>)=>listener(Object.fromEntries(Object.entries(positions).filter(([,position])=>position.roundNumber===roundNumber)));
    bucket.add(wrapped);this.liveListeners.set(normalized,bucket);
    wrapped(this.readLive(normalized));
    return()=>{bucket.delete(wrapped);if(!bucket.size)this.liveListeners.delete(normalized);};
  }
  async getArenaPositions(code:string,roundNumber:number){
    return Object.fromEntries(Object.entries(this.readLive(code.trim().toUpperCase())).filter(([,position])=>position.roundNumber===roundNumber));
  }
  async setArenaPosition(code:string,position:ArenaPosition){
    const normalized=code.trim().toUpperCase();const live=this.readLive(normalized);
    live[position.uid]={...position,x:Math.max(0,Math.min(100,position.x)),y:Math.max(0,Math.min(100,position.y)),updatedAt:this.now()};
    localStorage.setItem(this.liveKey(normalized),JSON.stringify(live));this.emitLive(normalized);this.channel?.postMessage({code:normalized,type:"live"});
  }
}
