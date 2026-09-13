export type LudoSfx = "roll" | "select" | "confirm" | "move" | "capture" | "home" | "chaos" | "win" | "invalid";

export type LudoSfxOptions = {
  steps?: number;
  delay?: number;
};

export const LUDO_SOUND_STORAGE_KEY = "kadro:ludo:sound-enabled";

let enabled = true;
let audioContext: AudioContext | null = null;

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
  if (!value && audioContext?.state === "running") void audioContext.suspend().catch(() => {});
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  audioContext = new AudioCtor();
  return audioContext;
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
      [170, 225, 188, 252, 205].forEach((frequency, index) => tone(ctx, start + index * 0.045, frequency, 0.035, 0.026, "square"));
      tone(ctx, start + 0.235, 115, 0.085, 0.04, "triangle", 82);
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
        tone(ctx, start + index * 0.055, index % 2 ? 175 : 145, 0.036, 0.028, "triangle", index % 2 ? 138 : 118);
      }
      break;
    }
    case "capture":
      tone(ctx, start, 330, 0.13, 0.042, "sawtooth", 72);
      tone(ctx, start + 0.075, 760, 0.09, 0.032, "square", 170);
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
      tone(ctx, start, 185, 0.075, 0.025, "square", 125);
      break;
  }
}

export function playLudoSfx(effect: LudoSfx, options: LudoSfxOptions = {}) {
  if (!enabled || typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const play = () => scheduleEffect(ctx, effect, options);
  if (ctx.state === "suspended") {
    void ctx.resume().then(play).catch(() => {});
    return;
  }
  play();
}
