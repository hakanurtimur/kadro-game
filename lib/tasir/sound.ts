export type TasirSfx = "rps" | "shift" | "reveal" | "handoff" | "joker" | "win" | "invalid";
export type TasirSfxOptions = { delay?: number };
export const TASIR_SOUND_STORAGE_KEY="kadro:tasir:sound-enabled";
let enabled=true;
let audioContext:AudioContext|null=null;

export function getTasirSoundEnabled(){
  if(typeof window==="undefined")return true;
  try{enabled=window.localStorage.getItem(TASIR_SOUND_STORAGE_KEY)!=="off";}catch{enabled=true;}
  return enabled;
}
export function setTasirSoundEnabled(value:boolean){
  enabled=value;
  if(typeof window!=="undefined"){try{window.localStorage.setItem(TASIR_SOUND_STORAGE_KEY,value?"on":"off");}catch{}}
  if(!value&&audioContext?.state==="running")void audioContext.suspend().catch(()=>{});
}
function getAudioContext(){
  if(typeof window==="undefined")return null;
  if(audioContext)return audioContext;
  const AudioCtor=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioCtor)return null;
  audioContext=new AudioCtor();return audioContext;
}
function tone(ctx:AudioContext,at:number,freq:number,duration:number,gain=.03,type:OscillatorType="sine",end?:number){
  const o=ctx.createOscillator(),g=ctx.createGain();const stop=at+duration;o.type=type;o.frequency.setValueAtTime(Math.max(40,freq),at);if(end)o.frequency.exponentialRampToValueAtTime(Math.max(40,end),stop);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),at+.008);g.gain.exponentialRampToValueAtTime(.0001,stop);o.connect(g);g.connect(ctx.destination);o.start(at);o.stop(stop+.01);
}
function noise(ctx:AudioContext,at:number,duration:number,gain=.02){
  const len=Math.max(1,Math.floor(ctx.sampleRate*duration));const b=ctx.createBuffer(1,len,ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);const s=ctx.createBufferSource(),g=ctx.createGain();s.buffer=b;g.gain.setValueAtTime(gain,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);s.connect(g);g.connect(ctx.destination);s.start(at);s.stop(at+duration+.01);
}
function schedule(ctx:AudioContext,effect:TasirSfx,options:TasirSfxOptions){
  const start=ctx.currentTime+.008+Math.max(0,options.delay??0);
  switch(effect){
    case"rps":tone(ctx,start,420,.045,.025,"triangle",540);tone(ctx,start+.05,620,.055,.024,"sine",760);break;
    case"shift":[0,1,2,3].forEach(i=>{noise(ctx,start+i*.055,.022,.01);tone(ctx,start+i*.055,i%2?170:145,.035,.028,"triangle",112);});break;
    case"reveal":tone(ctx,start,520,.07,.025,"sine",700);tone(ctx,start+.055,820,.1,.028,"sine",1040);break;
    case"handoff":noise(ctx,start,.09,.025);tone(ctx,start,390,.13,.04,"sawtooth",110);tone(ctx,start+.08,190,.09,.03,"triangle",120);break;
    case"joker":tone(ctx,start,740,.07,.025,"sine",980);tone(ctx,start+.06,1040,.08,.027,"sine",1320);tone(ctx,start+.12,1480,.12,.022,"triangle",1760);break;
    case"win":[523,659,784,1047].forEach((f,i)=>tone(ctx,start+i*.095,f,.19,.032,"sine",f*1.03));break;
    case"invalid":tone(ctx,start,205,.085,.034,"square",132);tone(ctx,start+.085,152,.105,.028,"triangle",100);break;
  }
}
export async function unlockTasirAudio(){
  if(!enabled||typeof window==="undefined")return;const ctx=getAudioContext();if(!ctx)return;if(ctx.state==="suspended"){try{await ctx.resume();}catch{}}if(ctx.state==="running"){const o=ctx.createOscillator(),g=ctx.createGain();g.gain.value=.00001;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.008);}
}
export function playTasirSfx(effect:TasirSfx,options:TasirSfxOptions={}){
  if(!enabled||typeof window==="undefined")return;const ctx=getAudioContext();if(!ctx)return;const play=()=>schedule(ctx,effect,options);if(ctx.state==="suspended"){void ctx.resume().then(play).catch(()=>{});return;}play();
}
