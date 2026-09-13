import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';
const cat=await importTs('lib/character-catalog.ts');
test('every canonical character has a bounded editorial profile with strengths and a weakness',async()=>{
 const p=await importTs('lib/character-profiles.ts');
 for(const c of cat.catalogCharacters('Türk Dizi Evreni')) {
  const profile=p.getCharacterProfile(c);assert.ok(profile,c.name);
  assert.equal(profile.strengths.length,2);assert.ok(profile.weakness);assert.ok(profile.description.length<=170);
  assert.equal(profile.power,undefined);
 }
 assert.equal(p.getCharacterProfile({name:'made-up',source:'Muhteşem Yüzyıl'}),null);
});
test('presentation themes are derived from task and fallback safely',async()=>{
 const p=await importTs('lib/presentation.ts');assert.equal(p.sceneTheme('Sarayda entrika'),'palace');assert.equal(p.sceneTheme('Zombi istilasından kaç'),'survival');assert.equal(p.sceneTheme('Otel işlet'),'service');assert.equal(p.sceneTheme(''),'festival');
});
test('awards use original purchase receipts, not balances modified by chaos',async()=>{
 const p=await importTs('lib/presentation.ts');
 const room={players:{a:{uid:'a',nickname:'A',balance:0,team:[{}]},b:{uid:'b',nickname:'B',balance:500,team:[{}]}},slots:1,sales:[{characterId:'x',name:'X',buyerUid:'a',price:2},{characterId:'y',name:'Y',buyerUid:'b',price:20}]};
 const awards=p.auctionAwards(room);assert.match(awards[0].detail,/Y/);assert.match(awards[1].detail,/A/);
});
test('guide explicitly separates moderator from players and does not introduce captain/tactics',async()=>{
 const g=await importTs('lib/game-guide.ts');const copy=g.GUIDE_SECTIONS.map(s=>s.text).join(' ');
 assert.match(copy,/moderatör/i);assert.match(copy,/50/);assert.match(copy,/30/);assert.match(copy,/20/);assert.doesNotMatch(copy,/[Kk]aptan/);
});
