import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './transpile-import.mjs';
const e = await importTs('lib/game-engine.ts');
const catalog = await importTs('lib/character-catalog.ts');
const seeds = catalog.catalogCharacters('Türk Dizi Evreni');
function lobby(n = 2, rounds = 1) {
  let r = e.createModeratedRoom({ code:'ABCDE', hostUid:'mod', nickname:'Sunucu', budget:20, slots:3, now:1 });
  r = e.configureSeries(r, 'mod', rounds, 2);
  for (let i = 0; i < n; i++) r = e.joinPlayer(r, { uid:`p${i}`, nickname:`Oyuncu ${i}`, now:3+i });
  return r;
}
function start(r = lobby()) {
  r = e.applyRoundPreview(r, 'mod', {scenario:'Entrika', characterCategory:'Türk Dizi Evreni',characters:seeds.slice(0, Object.keys(r.players).length*3+4),source:'demo'},100);
  return e.startAuction(r,'mod',200);
}
function completed(r = start()) {
  // Legal integration path: sell every slot for one coin to an eligible player.
  let guard = 0;
  while(r.status === 'auction' && guard++<100) {
    const p = Object.values(r.players).find(p => p.team.length < r.slots);
    const at = Math.max(r.auction.startsAt || 0, r.updatedAt)+1;
    r = e.placeBid(r,p.uid,1,at);
    r = e.closeAuction(r,'mod',r.characters[r.auction.index].id,r.auction.endsAt+1);
  }
  assert.equal(r.status,'results'); return r;
}
function judgement(r, tie = false) {
  return {source:'groq',winnerUid:'p0',winnerUids:['p0'],summary:'Ekipler değerlendirildi.',rankings:Object.keys(r.players).map((uid,i)=>({playerUid:uid,score:99,criteria:{fit:80-(tie?0:i)*10,synergy:80,versatility:80},comment:'Tutarlı bir takım.',strength:'Birlikte çalışabilir.',weakness:'Kaynakları sınırlı.',starCharacterId:r.players[uid].team[0].characterId,starReason:'Ekibe katkı sağlıyor.'}))};
}
test('moderator has identity but no balance, team or competitive seat',()=>{
  const r=e.createModeratedRoom({code:'ABCDE',hostUid:'mod',nickname:'Sunucu',budget:20,slots:3,now:1});
  assert.equal(r.schemaVersion,2); assert.equal(r.moderator.uid,'mod'); assert.deepEqual(r.players,{});
  assert.equal(r.moderator.balance,undefined); assert.equal(r.moderator.team,undefined);
});
test('two competitors plus a moderator are required, and moderator cannot join as player',()=>{
  let r=lobby(1); assert.throws(()=>start(r), /2 oyuncu/);
  assert.deepEqual(e.joinPlayer(r,{uid:'mod',nickname:'Sunucu'}).players,r.players);
  assert.equal(Object.keys(lobby(8).players).length,8);
});
test('moderator cannot bid, play RPS or draft a leftover',()=>{
  const r=start(); assert.throws(()=>e.placeBid(r,'mod',1,201), /[Mm]oderatör/);
  assert.throws(()=>e.submitRpsChoice({...r,status:'rps'},'mod','rock'), /[Mm]oderatör/);
  assert.throws(()=>e.pickLeftover({...r,status:'leftovers'},'mod','x'), /[Mm]oderatör/);
});
test('existing players and moderator can reconnect midgame, newcomers cannot',()=>{
  const r=start(); assert.equal(e.joinPlayer(r,{uid:'mod',nickname:'Sunucu'}).status,'auction');
  assert.equal(e.joinPlayer(r,{uid:'p0',nickname:'Yeniden'}).players.p0.nickname,'Oyuncu 0');
  assert.throws(()=>e.joinPlayer(r,{uid:'other',nickname:'Yeni'}));
});
test('series settings are moderator-only and locked at first preview',()=>{
  const r=lobby(); assert.throws(()=>e.configureSeries(r,'p0',3));
  assert.throws(()=>e.configureSeries(r,'mod',2));
  assert.throws(()=>e.configureSeries(start(r),'mod',3));
});
test('withdrawal cannot cancel a winning bid and blocks re-entry into the same auction',()=>{
  let r=start(); const id=r.characters[0].id;
  r=e.placeBid(r,'p0',1,201,id);
  assert.throws(()=>e.withdrawAuction(r,'p0',id,202));
  r=e.withdrawAuction(r,'p1',id,202);
  assert.equal(e.auctionCanClose(r,202),true);
  assert.throws(()=>e.placeBid(r,'p1',2,203,id));
  r=e.closeAuction(r,'mod',id,203);
  assert.equal(r.players.p0.balance,19);
  r=e.placeBid(r,'p1',1,204,r.characters[r.auction.index].id);
  assert.equal(r.auction.bidderUid,'p1');
});
test('stale card bids and withdrawals cannot affect the next auction',()=>{
  let r=start(); const old=r.characters[0].id;
  r=e.closeAuction(r,'mod',old,r.auction.endsAt+1);
  assert.throws(()=>e.placeBid(r,'p0',1,r.auction.startsAt+1,old));
  assert.throws(()=>e.withdrawAuction(r,'p0',old,r.auction.startsAt+1));
});
test('when everyone is out of coins queued cards become free leftovers without waiting',()=>{
  let r=start(); r=e.placeBid(r,'p0',20,201); r=e.closeAuction(r,'mod',r.characters[0].id,r.auction.endsAt+1);
  r=e.placeBid(r,'p1',20,r.auction.startsAt+1); r=e.closeAuction(r,'mod',r.characters[1].id,r.auction.endsAt+1);
  assert.equal(r.status,'rps'); assert.equal(r.rps.contenders.includes('mod'),false);
  assert.equal(r.characters.filter(c=>c.status==='queued').length,0);
});
test('AI score and winner fields cannot override weighted criteria; result saves only once',()=>{
  const r=completed(); const j=judgement(r); j.winnerUid='p1';
  const saved=e.saveJudge(r,'mod',j,10000,r.roundId);
  assert.equal(saved.judge.rankings[0].score,80); assert.equal(saved.judge.winnerUid,'p0');
  assert.equal(Object.keys(saved.series.completed).length,1);
  assert.deepEqual(e.saveJudge(saved,'mod',judgement(r,true),10001,r.roundId),saved);
});
test('series rounds reset coins and teams but preserve standings, moderator excluded',()=>{
  let r=completed(start(lobby(2,3))); r=e.saveJudge(r,'mod',judgement(r),10000,r.roundId);
  r=e.nextSeriesRound(r,'mod',10001);
  assert.equal(r.series.currentRound,2); assert.equal(r.status,'lobby');
  assert.equal(Object.keys(r.series.completed).length,1);
  for(const p of Object.values(r.players)){assert.equal(p.balance,20);assert.deepEqual(p.team,[]);}
  assert.throws(()=>e.joinPlayer(r,{uid:'new',nickname:'Yeni'}));
  assert.throws(()=>e.nextSeriesRound(r,'mod'));
});
test('judge request leases are exclusive, retryable on expiry and bound to round identity',()=>{
  const r=completed(); const c=e.claimJudging(r,'mod','req1',10000);
  assert.throws(()=>e.claimJudging(c,'mod','req2',10001));
  const d=e.claimJudging(c,'mod','req2',80001); assert.equal(d.judgeRequest.id,'req2');
  assert.throws(()=>e.saveJudge(d,'mod',judgement(d),80002,'old','req2'));
  assert.throws(()=>e.saveJudge(d,'mod',judgement(d),80002,d.roundId,'req1'));
});
test('result presentation advances globally only by moderator and never regenerates judgement',()=>{
  let r=completed(); r=e.saveJudge(r,'mod',judgement(r),10000,r.roundId);
  assert.equal(r.presentationStep,0); const j=structuredClone(r.judge);
  assert.throws(()=>e.advancePresentation(r,'p0',1));
  r=e.advancePresentation(r,'mod',4); assert.equal(r.presentationStep,4); assert.deepEqual(r.judge,j);
});

test('all withdrawals close an unsold card, reset per card and leave balances unchanged',()=>{
 let r=start();const id=r.characters[0].id;
 r=e.withdrawAuction(r,'p0',id,201);assert.equal(e.auctionCanClose(r,201),false);
 r=e.withdrawAuction(r,'p1',id,202);assert.equal(e.auctionCanClose(r,202),true);
 r=e.closeAuction(r,'mod',id,203);
 assert.equal(r.characters[0].status,'unsold');assert.equal(r.players.p0.balance,20);assert.deepEqual(r.auction.withdrawn??{},{});
});
test('moderator cannot prematurely settle an auction while eligible rivals can bid',()=>{
 const r=start();assert.throws(()=>e.closeAuction(r,'mod',r.characters[0].id,201),/teklif|kapan/i);
});
test('three-round classic and chaos series for 2, 3 and 8 competitors complete without moderator participation',()=>{
 for(const mode of ['classic','chaos'])for(const count of [2,3,8]){
  let r=e.setGameMode(lobby(count,3),'mod',mode,9);let at=100;
  for(let round=1;round<=3;round++){
   r=e.applyRoundPreview(r,'mod',{scenario:'Entrika',characterCategory:'Türk Dizi Evreni',characters:seeds.slice(0,count*3+4),source:'demo'},at++);
   r=e.startAuction(r,'mod',at++);let guard=0;
   while(r.status==='auction'&&guard++<100){at=r.auction.endsAt+1;r=e.closeAuction(r,'mod',r.characters[r.auction.index].id,at);}
   if(r.status==='rps'){
    const contenders=[...r.rps.contenders];for(let i=0;i<contenders.length;i++)r=e.submitRpsChoice(r,contenders[i],i===0?'rock':'scissors',++at);
   }
   while(r.status==='leftovers'&&guard++<200)r=e.pickLeftover(r,r.draftTurnUid,r.characters.find(c=>c.status==='unsold').id,++at);
   assert.equal(r.status,'results');assert.ok(guard<200);assert.equal(r.players.mod,undefined);
   for(const p of Object.values(r.players))assert.equal(p.team.length,3);
   const oldId=r.roundId;r=e.saveJudge(r,'mod',judgement(r,true),++at,oldId);
   assert.equal(Object.keys(r.series.completed).length,round);assert.equal(r.judge.winnerUids.length,count);
   for(const value of Object.values(r.series.completed[`r${round}`].points))assert.equal(value,count);
   if(round<3){r=e.nextSeriesRound(r,'mod',++at);assert.notEqual(r.roundId,oldId);}
  }
  assert.throws(()=>e.nextSeriesRound(r,'mod',++at));
  const old=r.series.id;r=e.resetSeries(r,'mod',++at);
  assert.equal(r.status,'lobby');assert.equal(r.series.currentRound,1);assert.deepEqual(r.series.completed,{});assert.notEqual(old,r.series.id);
  assert.equal(r.series.locked,false);for(const p of Object.values(r.players)){assert.equal(p.balance,20);assert.equal(p.team.length,0);}
 }
});
