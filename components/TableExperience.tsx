"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useTableExperience() {
 const [sound,setSound]=useState(false);const [reducedMotion,setReducedMotion]=useState(false);
 const audio=useRef<AudioContext|null>(null);
 useEffect(()=>{
  try {setReducedMotion(localStorage.getItem('kadro:reduced-motion')==='1'||window.matchMedia('(prefers-reduced-motion: reduce)').matches);} catch { /* storage is optional */ }
  return ()=>{void audio.current?.close();};
 },[]);
 const play=useCallback((kind:'bid'|'sale'|'win')=>{
  const ctx=audio.current;if(!sound||!ctx||ctx.state!=='running')return;
  const gain=ctx.createGain();const osc=ctx.createOscillator();
  osc.type='sine';osc.frequency.setValueAtTime(kind==='win'?660:kind==='sale'?520:360,ctx.currentTime);
  gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(0.05,ctx.currentTime+0.01);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.18);
  osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+0.2);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
 },[sound]);
 async function toggleSound(){
  if(sound){setSound(false);return;}
  try {audio.current??=new AudioContext();await audio.current.resume();setSound(true);} catch {setSound(false);}
 }
 function toggleMotion(){setReducedMotion(v=>{try{localStorage.setItem('kadro:reduced-motion',v?'0':'1');}catch{}return !v;});}
 return {sound,reducedMotion,play,toggleSound,toggleMotion};
}
export function ExperienceControls({experience}:{experience:ReturnType<typeof useTableExperience>}) {
 return <div className="experience-controls" role="group" aria-label="Ses ve hareket ayarları"><button type="button" aria-pressed={experience.sound} onClick={experience.toggleSound}>Ses {experience.sound?'açık':'kapalı'}</button><button type="button" aria-pressed={experience.reducedMotion} onClick={experience.toggleMotion}>{experience.reducedMotion?'Sakin görünüm':'Hareketler açık'}</button></div>;
}
