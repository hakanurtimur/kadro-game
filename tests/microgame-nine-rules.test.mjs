import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {importTs} from './transpile-import.mjs';
const rules=JSON.parse(fs.readFileSync('firebase/database.rules.json','utf8')).rules;
const engine=await importTs('lib/microgame/engine.ts'),skills=await importTs('lib/microgame/skill-engine.ts'),model=await importTs('lib/microgame/skill-model.ts');
// Semantic checks for the expressions we changed. This is not a Firebase emulator.
class Snapshot{
 constructor(root,path=[]){this.root=root;this.path=path;}
 val(){let node=this.root;for(const p of this.path)node=node?.[p];return node??null;}
 child(key){return new Snapshot(this.root,[...this.path,...String(key).split('/')]);}
 parent(){return new Snapshot(this.root,this.path.slice(0,-1));}
 exists(){return this.val()!==null;}
 hasChildren(keys){return keys.every(k=>this.child(k).exists());}
 isNumber(){return typeof this.val()==='number'&&Number.isFinite(this.val());}
 isString(){return typeof this.val()==='string';}
}
function validate(expr,room,subpath=[]){const root={microgameRooms:{MCR22:room}};return Function('newData','data','root','auth','$code','$uid',`return (${expr});`)(new Snapshot(root,['microgameRooms','MCR22',...subpath]),new Snapshot(root),new Snapshot(root),{uid:'p1'},'MCR22',subpath.at(-1));}
function room(){let r=engine.createMicrogameRoom({code:'MCR22',hostUid:'p1',nickname:'A',now:1});return engine.joinMicrogamePlayer(r,{uid:'p2',nickname:'B',now:2});}
const roundRule=rules.microgameRooms.$code.round['.validate'];
for(const game of model.SKILL_IDS){test(`${game}: Firebase round and bounded score expressions accept actual engine state`,()=>{let r=skills.startSkillTest(room(),'p1',game,1000);assert.equal(validate(roundRule,r,['round']),true);assert.equal(validate(rules.microgameRooms.$code.activeGameId['.validate'],r,['activeGameId']),true);r.round.submissions.p1={score:100,note:'Doğru',submittedAt:r.round.endsAt};assert.equal(validate(rules.microgameRooms.$code.round.submissions.$uid['.validate'],r,['round','submissions','p1']),true);r.round.submissions.p1.score=101;assert.equal(validate(rules.microgameRooms.$code.round.submissions.$uid['.validate'],r,['round','submissions','p1']),false);});}
test('new round rules reject bad IDs, bad seed and broken timing without changing Bomb/Shrink acceptance',()=>{for(const start of [engine.startBombPassTest,engine.startShrinkArenaTest])assert.equal(validate(roundRule,start(room(),'p1',1000),['round']),true);for(const mutate of [r=>r.round.gameId='bad',r=>r.round.seed=-1,r=>r.round.startsAt=r.round.instructionsUntil,r=>r.round.endsAt=r.round.startsAt]){let r=skills.startSkillTest(room(),'p1','freeze-dance',1000);mutate(r);assert.equal(validate(roundRule,r,['round']),false);}});
test('unknown participant and fractional score cannot validate a submission',()=>{const r=skills.startSkillTest(room(),'p1','memory-spot',1000);r.round.submissions.spy={score:10,note:'x',submittedAt:100};const expression=rules.microgameRooms.$code.round.submissions.$uid['.validate'];assert.equal(validate(expression,r,['round','submissions','spy']),false);r.round.submissions.p1={score:10.5,note:'x',submittedAt:100};assert.equal(validate(expression,r,['round','submissions','p1']),false);});
