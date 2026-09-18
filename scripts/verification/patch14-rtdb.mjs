// Run against an explicitly local emulator. Test dependencies may live outside the app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {importTs} from '../../tests/transpile-import.mjs';
const require=createRequire(process.env.FIREBASE_TEST_DEPENDENCIES ? path.resolve(process.env.FIREBASE_TEST_DEPENDENCIES,'package.json') : import.meta.url);
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {ref,set}=require('firebase/database');
const l=await importTs('lib/ludo/engine.ts'),e=await importTs('lib/microgame/engine.ts'),m=await importTs('lib/microgame/match-engine.ts');
const env=await initializeTestEnvironment({projectId:'demo-dumbuk',database:{host:'127.0.0.1',port:9010,rules:fs.readFileSync('firebase/database.rules.json','utf8')}});
const write=(uid,key,value)=>set(ref(env.authenticatedContext(uid).database(),key),value);
try {
 await env.clearDatabase();
 let r=l.createLudoRoom({code:'LUD22',hostUid:'a',nickname:'Ada',now:1});
 await assertSucceeds(write('a','ludoRooms/LUD22',r));
 r=l.joinLudoPlayer(r,{uid:'b',nickname:'Bora',now:2});await assertSucceeds(write('b','ludoRooms/LUD22',r));
 r=l.setLudoColor(r,'a','blue',3);await assertSucceeds(write('a','ludoRooms/LUD22',r));
 await assertFails(write('b','ludoRooms/LUD22',l.setLudoColor(r,'a','yellow',4)));
 const bad=structuredClone(r);bad.hostUid='b';await assertFails(write('b','ludoRooms/LUD22',bad));
 r=l.startLudoGame(r,'a',5);await assertSucceeds(write('a','ludoRooms/LUD22',r));
 r=l.leaveLudoPlayer(r,'a',6);await assertSucceeds(write('a','ludoRooms/LUD22',r));
 assert.equal(r.winnerUid,'b');assert.equal(r.hostUid,'b');
 await assertFails(write('a','ludoRooms/LUD22',r));
 r=l.leaveLudoPlayer(r,'b',7);await assertSucceeds(write('b','ludoRooms/LUD22',r));
 console.log('Ludo: color ownership, host transfer, departure, empty room and former-player rejection passed.');
 let g=e.createMicrogameRoom({code:'MCR22',hostUid:'a',nickname:'Ada',now:10});await assertSucceeds(write('a','microgameRooms/MCR22',g));
 g=e.joinMicrogamePlayer(g,{uid:'b',nickname:'Bora',now:20});await assertSucceeds(write('b','microgameRooms/MCR22',g));
 g=m.startMicrogameMatch(g,'a',0,1000);await assertSucceeds(write('a','microgameRooms/MCR22',g));
 const seen=[];
 for(let i=0;i<8;i++){
  seen.push(g.activeGameId);
  g=m.settleMicrogameMatchRound(g,'b',g.roundNumber,{},m.matchSettleAt(g)+1);await assertSucceeds(write('b','microgameRooms/MCR22',g));
  if(i<7){g=m.advanceMicrogameMatch(g,'b',g.roundNumber,g.match.nextAt);await assertSucceeds(write('b','microgameRooms/MCR22',g));}
 }
 assert.equal(new Set(seen).size,8);assert.equal(g.match.status,'finished');
 const replay=m.startMicrogameMatch(g,'a',g.roundNumber,g.updatedAt+1);
 await assertFails(write('b','microgameRooms/MCR22',replay));await assertSucceeds(write('a','microgameRooms/MCR22',replay));
 assert.ok(Object.values(replay.players).every(p=>p.score===0));
 console.log('Microgame: eight distinct rounds, guest-driven settlement/advancement, final and host rematch with zero scores passed.');
} finally {await env.cleanup();}
