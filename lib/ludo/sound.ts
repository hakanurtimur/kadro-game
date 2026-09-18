export type LudoSfx = "roll" | "select" | "confirm" | "move" | "capture" | "home" | "chaos" | "win" | "invalid";

export type LudoSfxOptions = {
  steps?: number;
  delay?: number;
};

export const LUDO_SOUND_STORAGE_KEY = "kadro:ludo:sound-enabled";

let enabled = true;
let audioContext: AudioContext | null = null;
let primedContext: AudioContext | null = null;

// Safari exposes this experimental API; other browsers use normal Web Audio.
type PlaybackSession = { type: string };
let ownedSession: PlaybackSession | null = null;
let previousSessionType = "auto";
function requestPlaybackSession() {
  try {
    const session = (window.navigator as Navigator & { audioSession?: PlaybackSession })?.audioSession;
    if (!session || ownedSession === session || session.type === "play-and-record") return;
    const previous = session.type;
    session.type = "playback";
    ownedSession = session;
    previousSessionType = previous;
  } catch { /* AudioSession is optional, including when its setter rejects. */ }
}

export function releaseLudoAudio() {
  try {
    if (ownedSession?.type === "playback") ownedSession.type = previousSessionType;
  } catch { /* A platform session change must not break room cleanup. */ }
  ownedSession = null;
  if (audioContext?.state === "running") void audioContext.suspend().catch(() => {});
}

export function getLudoSoundEnabled() {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(LUDO_SOUND_STORAGE_KEY);
    enabled = stored !== "off";
  } catch {
    enabled = true;
  }
  return enabled;
}

export function setLudoSoundEnabled(value: boolean) {
  enabled = value;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(LUDO_SOUND_STORAGE_KEY, value ? "on" : "off"); } catch {}
  }
  if (!value) releaseLudoAudio();
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (audioContext && String(audioContext.state) !== "closed") return audioContext;
  audioContext = null;
  primedContext = null;
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  audioContext = new AudioCtor();
  return audioContext;
}

function primeContext(ctx: AudioContext) {
  if (primedContext === ctx) return;
  try {
    const osc=ctx.createOscillator();
    const gain=ctx.createGain();
    gain.gain.value=.0001;
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+.012);
    primedContext=ctx;
  } catch {}
}

async function ensureRunningAudioContext() {
  if (!enabled || typeof window === "undefined") return null;
  requestPlaybackSession();
  let ctx=getAudioContext();
  if(!ctx)return null;

  let state=String(ctx.state);
  if(state==="closed"){
    audioContext=null;
    primedContext=null;
    ctx=getAudioContext();
    if(!ctx)return null;
    state=String(ctx.state);
  }

  if(state==="suspended"||state==="interrupted"){
    try{await ctx.resume();}catch{}
    state=String(ctx.state);
  }

  if(state!=="running")return null;
  primeContext(ctx);
  return ctx;
}

function noise(ctx: AudioContext, at: number, duration: number, gain = 0.025) {
  const length=Math.max(1,Math.floor(ctx.sampleRate*duration));
  const buffer=ctx.createBuffer(1,length,ctx.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length);
  const source=ctx.createBufferSource();
  const amp=ctx.createGain();
  source.buffer=buffer;
  amp.gain.setValueAtTime(gain,at);
  amp.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(amp);amp.connect(ctx.destination);source.start(at);source.stop(at+duration+.01);
}

function tone(ctx: AudioContext, at: number, frequency: number, duration: number, gain = 0.035, type: OscillatorType = "sine", endFrequency?: number) {
  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();
  const stop = at + duration;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(Math.max(40, frequency), at);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), stop);
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), at + Math.min(0.012, duration / 3));
  amp.gain.exponentialRampToValueAtTime(0.0001, stop);
  oscillator.connect(amp);
  amp.connect(ctx.destination);
  oscillator.start(at);
  oscillator.stop(stop + 0.015);
}

function scheduleEffect(ctx: AudioContext, effect: LudoSfx, options: LudoSfxOptions) {
  const start = ctx.currentTime + 0.008 + Math.max(0, options.delay ?? 0);
  switch (effect) {
    case "roll":
      noise(ctx,start,.24,.024);
      [156,210,174,236,198,260].forEach((frequency,index)=>tone(ctx,start+index*.042,frequency,.028,.024,index%2?"triangle":"square",frequency*.78));
      tone(ctx,start+.255,118,.095,.045,"triangle",76);
      break;
    case "select":
      tone(ctx, start, 520, 0.05, 0.025, "sine", 660);
      break;
    case "confirm":
      tone(ctx, start, 620, 0.045, 0.024, "sine", 760);
      tone(ctx, start + 0.045, 880, 0.065, 0.026, "sine", 980);
      break;
    case "move": {
      const steps = Math.max(1, Math.min(8, Math.round(options.steps ?? 1)));
      for (let index = 0; index < steps; index++) {
        const at=start+index*.06;
        noise(ctx,at,.025,.012);
        tone(ctx,at,index%2?190:155,.042,.032,"triangle",index%2?128:112);
      }
      break;
    }
    case "capture":
      noise(ctx,start,.11,.055);
      tone(ctx,start,420,.14,.05,"sawtooth",68);
      tone(ctx,start+.07,840,.095,.038,"square",150);
      tone(ctx,start+.145,110,.11,.045,"triangle",62);
      break;
    case "home":
      tone(ctx, start, 540, 0.11, 0.028, "sine", 640);
      tone(ctx, start + 0.09, 720, 0.12, 0.031, "sine", 840);
      tone(ctx, start + 0.19, 960, 0.16, 0.034, "sine", 1120);
      break;
    case "chaos":
      tone(ctx, start, 185, 0.18, 0.035, "sawtooth", 620);
      tone(ctx, start + 0.12, 340, 0.2, 0.03, "triangle", 980);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((frequency, index) => tone(ctx, start + index * 0.1, frequency, 0.2, 0.032, "sine", frequency * 1.03));
      tone(ctx, start + 0.43, 1318, 0.35, 0.026, "triangle", 1568);
      break;
    case "invalid":
      tone(ctx,start,205,.09,.034,"square",132);
      tone(ctx,start+.09,154,.11,.03,"triangle",104);
      break;
  }
}

export async function unlockLudoAudio() {
  await ensureRunningAudioContext();
}

export function playLudoSfx(effect: LudoSfx, options: LudoSfxOptions = {}) {
  if (!enabled || typeof window === "undefined") return;
  void ensureRunningAudioContext().then((ctx)=>{
    if(ctx && enabled && ctx.state === "running")scheduleEffect(ctx,effect,options);
  }).catch(()=>{});
}
