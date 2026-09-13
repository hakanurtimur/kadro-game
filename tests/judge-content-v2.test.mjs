import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';
const cat=await importTs('lib/character-catalog.ts');
function body(){const chars=cat.catalogCharacters('Muhteşem Yüzyıl').slice(0,6);return {scenario:'Entrika',characterCategory:'Muhteşem Yüzyıl',slots:3,moderatorUid:'mod',teams:['a','b'].map((uid,i)=>({playerUid:uid,nickname:uid,characters:chars.slice(i*3,i*3+3).map((c,k)=>({...c,characterId:`c${i}-${k}`,price:1,acquisition:'auction'}))}))};}
test('jury service uses catalog data, rejects moderator and duplicate characters',async()=>{
 const m=await importTs('lib/ai/judge-content.ts');const b=body();const valid=m.validateJudgeInput(b);assert.equal(valid.teams.length,2);
 b.teams[0].playerUid='mod';assert.throws(()=>m.validateJudgeInput(b));
 const d=body();d.teams[1].characters[0]=d.teams[0].characters[0];assert.throws(()=>m.validateJudgeInput(d));
});
test('jury never invents AI scores after provider failure',async()=>{
 const m=await importTs('lib/ai/judge-content.ts');await assert.rejects(()=>m.judgeContent(body(),async()=>{throw Error('network');}),/network/);
});
test('one successful jury call returns validated weighted scores for each actual team',async()=>{
 const m=await importTs('lib/ai/judge-content.ts');const b=body();let calls=0;
 const r=await m.judgeContent(b,async(input)=>{calls++;assert.ok(input.prompt.includes('Göreve'));return {summary:'Özet',rankings:b.teams.map(t=>({playerUid:t.playerUid,criteria:{fit:70,synergy:80,versatility:90},comment:'Yorum',strength:'Artı',weakness:'Eksi',starCharacterId:t.characters[0].characterId,starReason:'Yıldız'}))};});
 assert.equal(calls,1);assert.equal(r.rankings[0].score,77);assert.equal(r.source,'groq');
});
