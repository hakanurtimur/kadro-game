import { normalizeMatchState } from "./match-state";
import { isSkillGameId, normalizeSkillRound } from "./skill-model";
import { MICROGAME_REGISTRY } from "./registry";
import type { BombPassRound, MicrogamePlayer, MicrogameRoomState, ShrinkArenaRound } from "./types";

export class MicrogameRuleError extends Error {
  constructor(message:string){super(message);this.name="MicrogameRuleError";}
}

const MAX_PLAYERS=6;
const PASS_COOLDOWN_MS=650;
const COUNTDOWN_MS=3000;
const BOMB_INSTRUCTION_MS=4000;
const SHRINK_INSTRUCTION_MS=3200;
const SHRINK_DURATION_MS=11000;

const clone=<T,>(value:T):T=>structuredClone(value);
const cleanNickname=(value:string)=>value.trim().replace(/\s+/g," ").slice(0,20);

function seedFrom(value:string){
  let hash=2166136261;
  for(const char of value){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}
  return hash>>>0;
}

function orderedPlayers(room:MicrogameRoomState){
  return Object.values(room.players).sort((a,b)=>a.seat-b.seat);
}

function assertPlayer(room:MicrogameRoomState,uid:string){
  const player=room.players[uid];
  if(!player)throw new MicrogameRuleError("Bu odada oyuncu değilsin.");
  return player;
}

function assertHost(room:MicrogameRoomState,uid:string){
  assertPlayer(room,uid);
  if(room.hostUid!==uid)throw new MicrogameRuleError("Bu işlemi yalnız oda sahibi yapabilir.");
}

function bombFuseMs(room:MicrogameRoomState,nextRound:number,entropy:number){
  return 7000+(seedFrom(`${room.code}:${nextRound}:${entropy}:bomb`)%3501);
}

function normalizeOut(raw:unknown){
  const out:Record<string,number>={};
  if(!raw||typeof raw!=="object")return out;
  for(const [uid,value] of Object.entries(raw as Record<string,unknown>)){
    const at=Number(value);
    if(uid&&Number.isFinite(at)&&at>0)out[uid]=at;
  }
  return out;
}

export function normalizeMicrogameState(raw:any):MicrogameRoomState{
  const room=clone(raw??{});
  room.schemaVersion=1;
  room.code=String(room.code||"").toUpperCase();
  room.hostUid=String(room.hostUid||"");
  room.status=["lobby","playing","results"].includes(room.status)?room.status:"lobby";
  room.createdAt=Number(room.createdAt)||Date.now();
  room.updatedAt=Number(room.updatedAt)||room.createdAt;
  const rawPlayers=room.players??{};
  const entries=Array.isArray(rawPlayers)?rawPlayers.filter(Boolean).map((p:any)=>[p.uid,p]):Object.entries(rawPlayers);
  room.players={};
  for(const [key,value] of entries as Array<[string,any]>){
    const uid=String(value?.uid||key||"");
    if(!uid)continue;
    room.players[uid]={
      uid,
      nickname:cleanNickname(String(value?.nickname||"Oyuncu"))||"Oyuncu",
      seat:Number.isInteger(Number(value?.seat))?Number(value.seat):0,
      score:Math.max(0,Number(value?.score)||0),
    } satisfies MicrogamePlayer;
  }
  if (Object.hasOwn(room, "match")) room.match=normalizeMatchState(room.match);
  room.roundNumber=Math.max(0,Number(room.roundNumber)||0);
  room.activeGameId=room.activeGameId==="bomb-pass"||room.activeGameId==="shrink-arena"||isSkillGameId(room.activeGameId)?room.activeGameId:null;

  if(room.round?.gameId==="bomb-pass"){
    room.round={
      gameId:"bomb-pass",
      instructionsUntil:Number(room.round.instructionsUntil)||0,
      startsAt:Number(room.round.startsAt)||0,
      endsAt:Number(room.round.endsAt)||0,
      holderUid:String(room.round.holderUid||""),
      passes:Math.max(0,Number(room.round.passes)||0),
      lastPassAt:Math.max(0,Number(room.round.lastPassAt)||0),
      loserUid:room.round.loserUid?String(room.round.loserUid):null,
    } satisfies BombPassRound;
  } else if(room.round?.gameId==="shrink-arena"){
    room.round={
      gameId:"shrink-arena",
      instructionsUntil:Number(room.round.instructionsUntil)||0,
      startsAt:Number(room.round.startsAt)||0,
      endsAt:Number(room.round.endsAt)||0,
      out:normalizeOut(room.round.out),
    } satisfies ShrinkArenaRound;
  } else if(isSkillGameId(room.round?.gameId)) room.round=normalizeSkillRound(room.round);
  else room.round=null;
  return room as MicrogameRoomState;
}

export function createMicrogameRoom(input:{code:string;hostUid:string;nickname:string;now?:number}):MicrogameRoomState{
  const code=input.code.trim().toUpperCase();
  if(!/^[A-Z2-9]{5}$/.test(code))throw new MicrogameRuleError("Oda kodu geçersiz.");
  const nickname=cleanNickname(input.nickname);
  if(!nickname)throw new MicrogameRuleError("Bir nickname yazmalısın.");
  const now=input.now??Date.now();
  return {
    schemaVersion:1,
    code,
    hostUid:input.hostUid,
    status:"lobby",
    createdAt:now,
    updatedAt:now,
    players:{[input.hostUid]:{uid:input.hostUid,nickname,seat:0,score:0}},
    roundNumber:0,
    activeGameId:null,
    round:null,
  };
}

export function joinMicrogamePlayer(room:MicrogameRoomState,input:{uid:string;nickname:string;now?:number}){
  const next=normalizeMicrogameState(room);
  if(next.players[input.uid])return next;
  if(next.status!=="lobby")throw new MicrogameRuleError("Bu tur başladı; yeni oyuncu alınmıyor.");
  const players=orderedPlayers(next);
  if(players.length>=MAX_PLAYERS)throw new MicrogameRuleError("Oda dolu; en fazla 6 kişi oynayabilir.");
  const nickname=cleanNickname(input.nickname);
  if(!nickname)throw new MicrogameRuleError("Bir nickname yazmalısın.");
  if(players.some(player=>player.nickname.toLocaleLowerCase("tr-TR")===nickname.toLocaleLowerCase("tr-TR")))throw new MicrogameRuleError("Bu nickname odada kullanılıyor.");
  const used=new Set(players.map(player=>player.seat));
  let seat=0;while(used.has(seat))seat+=1;
  next.players[input.uid]={uid:input.uid,nickname,seat,score:0};
  next.updatedAt=input.now??Date.now();
  return next;
}

function assertCanStart(room:MicrogameRoomState,uid:string,gameId:"bomb-pass"|"shrink-arena"){
  assertHost(room,uid);
  if(room.status==="playing")throw new MicrogameRuleError("Önce mevcut tur bitsin.");
  const players=orderedPlayers(room);
  const definition=MICROGAME_REGISTRY[gameId];
  if(players.length<definition.minPlayers)throw new MicrogameRuleError("Başlamak için en az 2 oyuncu lazım.");
  return players;
}

export function startBombPassTest(room:MicrogameRoomState,uid:string,now=Date.now()){
  const next=normalizeMicrogameState(room);
  const players=assertCanStart(next,uid,"bomb-pass");
  const roundNumber=next.roundNumber+1;
  const holderIndex=seedFrom(`${next.code}:${roundNumber}:${now}:holder`)%players.length;
  let holder=players[holderIndex];
  if(next.round?.gameId==="bomb-pass"&&players.length>1&&holder.uid===next.round.holderUid){
    holder=players[(holderIndex+1)%players.length];
  }
  const instructionsUntil=now+BOMB_INSTRUCTION_MS;
  const startsAt=instructionsUntil+COUNTDOWN_MS;
  next.status="playing";
  next.roundNumber=roundNumber;
  next.activeGameId="bomb-pass";
  next.round={
    gameId:"bomb-pass",
    instructionsUntil,
    startsAt,
    endsAt:startsAt+bombFuseMs(next,roundNumber,now),
    holderUid:holder.uid,
    passes:0,
    lastPassAt:0,
    loserUid:null,
  };
  next.updatedAt=now;
  return next;
}

export function passBomb(room:MicrogameRoomState,actorUid:string,targetUid:string,now=Date.now()){
  const next=normalizeMicrogameState(room);
  assertPlayer(next,actorUid);
  const target=assertPlayer(next,targetUid);
  if(next.status!=="playing"||next.activeGameId!=="bomb-pass"||next.round?.gameId!=="bomb-pass")throw new MicrogameRuleError("Bomba turu aktif değil.");
  if(now<next.round.startsAt)throw new MicrogameRuleError("Tur daha başlamadı.");
  if(now>=next.round.endsAt)throw new MicrogameRuleError("Bomba patladı; tur bitti.");
  if(next.round.holderUid!==actorUid)throw new MicrogameRuleError("Bomba sende değil.");
  if(target.uid===actorUid)throw new MicrogameRuleError("Bombayı kendine paslayamazsın.");
  if(next.round.passes>0&&now-next.round.lastPassAt<PASS_COOLDOWN_MS)throw new MicrogameRuleError("Çok hızlı! Bombayı bir an tut.");
  next.round.holderUid=target.uid;
  next.round.passes+=1;
  next.round.lastPassAt=now;
  next.updatedAt=now;
  return next;
}

export function settleBombRound(room:MicrogameRoomState,actorUid:string,now=Date.now()){
  const next=normalizeMicrogameState(room);
  assertPlayer(next,actorUid);
  if(next.status==="results"&&next.round?.gameId==="bomb-pass"&&next.round.loserUid)return next;
  if(next.status!=="playing"||next.activeGameId!=="bomb-pass"||next.round?.gameId!=="bomb-pass")throw new MicrogameRuleError("Bomba turu aktif değil.");
  if(now<next.round.endsAt)throw new MicrogameRuleError("Fitil henüz bitmedi.");
  const loserUid=next.round.holderUid;
  next.round.loserUid=loserUid;
  for(const player of Object.values(next.players))if(player.uid!==loserUid)player.score+=100;
  next.status="results";
  next.updatedAt=now;
  return next;
}

export function startShrinkArenaTest(room:MicrogameRoomState,uid:string,now=Date.now()){
  const next=normalizeMicrogameState(room);
  assertCanStart(next,uid,"shrink-arena");
  const roundNumber=next.roundNumber+1;
  const instructionsUntil=now+SHRINK_INSTRUCTION_MS;
  const startsAt=instructionsUntil+COUNTDOWN_MS;
  next.status="playing";
  next.roundNumber=roundNumber;
  next.activeGameId="shrink-arena";
  next.round={
    gameId:"shrink-arena",
    instructionsUntil,
    startsAt,
    endsAt:startsAt+SHRINK_DURATION_MS,
    out:{},
  };
  next.updatedAt=now;
  return next;
}

export function reportArenaOut(room:MicrogameRoomState,actorUid:string,now=Date.now()){
  const next=normalizeMicrogameState(room);
  assertPlayer(next,actorUid);
  if(next.status!=="playing"||next.activeGameId!=="shrink-arena"||next.round?.gameId!=="shrink-arena")throw new MicrogameRuleError("Alan turu aktif değil.");
  if(now<next.round.startsAt)throw new MicrogameRuleError("Tur daha başlamadı.");
  if(now>=next.round.endsAt)throw new MicrogameRuleError("Tur bitti.");
  if(next.round.out[actorUid])return next;
  next.round.out[actorUid]=now;
  next.updatedAt=now;
  return next;
}

export function settleShrinkArenaRound(room:MicrogameRoomState,actorUid:string,now=Date.now()){
  const next=normalizeMicrogameState(room);
  assertPlayer(next,actorUid);
  if(next.status==="results"&&next.round?.gameId==="shrink-arena")return next;
  if(next.status!=="playing"||next.activeGameId!=="shrink-arena"||next.round?.gameId!=="shrink-arena")throw new MicrogameRuleError("Alan turu aktif değil.");
  if(now<next.round.endsAt)throw new MicrogameRuleError("Alan hâlâ açık.");
  const duration=Math.max(1,next.round.endsAt-next.round.startsAt);
  for(const player of Object.values(next.players)){
    const outAt=next.round.out[player.uid];
    if(!outAt){
      player.score+=100;
      continue;
    }
    const survived=Math.max(0,Math.min(1,(outAt-next.round.startsAt)/duration));
    player.score+=Math.max(0,Math.min(60,Math.floor((survived*60)/10)*10));
  }
  next.status="results";
  next.updatedAt=now;
  return next;
}

export function returnMicrogameLobby(room:MicrogameRoomState,uid:string,now=Date.now()){
  const next=normalizeMicrogameState(room);
  assertHost(next,uid);
  if(next.status==="playing")throw new MicrogameRuleError("Tur sürerken lobiye dönemezsin.");
  next.status="lobby";
  next.activeGameId=null;
  next.round=null;
  next.updatedAt=now;
  return next;
}
