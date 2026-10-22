import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously} from 'firebase/auth';
import * as sdk from 'firebase/firestore';
import {createOnlineClient,publicGame} from '../online-client.js';
import {createGame} from '../game-engine.js';
const cards=JSON.parse(readFileSync(new URL('../cards.json',import.meta.url))),boards=JSON.parse(readFileSync(new URL('../boards.json',import.meta.url)));
const apps=[],contexts=[];
const projectId='demo-erathia';
try{
 for(let i=0;i<8;i++){
  const app=initializeApp({projectId,apiKey:'fake-api-key',appId:'emulator-test'},`test-${Date.now()}-${i}`);apps.push(app);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const db=sdk.getFirestore(app);sdk.connectFirestoreEmulator(db,'127.0.0.1',8080);
  const credential=await signInAnonymously(auth),user=credential.user;
  const errors=[];const client=createOnlineClient({sdk,db,getUser:()=>user,cards,boards,onError:e=>errors.push(e)});
  contexts.push({user,db,client,errors});
 }
 const host=contexts[0],{roomId}=await host.client.request('create');
 const ref=(c,...parts)=>sdk.doc(c.db,'erathiaRooms',roomId,...parts);
 const read=async(c,...parts)=>(await sdk.getDoc(ref(c,...parts))).data();
 // Joining preserves player order, departing preserves the rest of the roster.
 for(const c of contexts.slice(1,7))await c.client.request('join',{roomId});
 await assert.rejects(contexts[7].client.request('join',{roomId}),/pełny/);
 await contexts[6].client.request('leave',{roomId});
 assert.equal((await read(host)).members.length,6);
 await contexts[6].client.request('join',{roomId});
 await assert.rejects(contexts[1].client.request('start',{roomId}),/gospodarz/);
 await host.client.request('start',{roomId});
 await assert.rejects(sdk.getDoc(ref(contexts[7])));
 await assert.rejects(sdk.getDoc(ref(contexts[1],'hands',host.user.uid)));
 await assert.rejects(sdk.getDoc(sdk.doc(contexts[1].db,'erathiaState',roomId)));
 await assert.rejects(sdk.updateDoc(ref(contexts[1]),{status:'finished'}));
 await assert.rejects(sdk.setDoc(ref(contexts[1],'hands',contexts[1].user.uid),{cards:[]}),{code:'permission-denied'});
 await assert.rejects(sdk.setDoc(sdk.doc(contexts[1].db,'erathiaState',roomId),{game:{}}),{code:'permission-denied'});
 await assert.rejects(sdk.getDocs(sdk.collection(contexts[1].db,'erathiaRooms')),{code:'permission-denied'});
 await assert.rejects(sdk.getDocs(sdk.collection(contexts[1].db,'erathiaRooms',roomId,'hands')),{code:'permission-denied'});
 await assert.rejects(sdk.getDocs(sdk.collection(contexts[1].db,'erathiaRooms',roomId,'moves')),{code:'permission-denied'});
 const firstHand=await read(contexts[1],'hands',contexts[1].user.uid);
 const ownMove=ref(contexts[1],'moves',contexts[1].user.uid),initialRoom=await read(host);
 const validMove={turn:initialRoom.turn,kind:'pick',choice:{cardId:firstHand.cards[0].id,action:'discard',left:0,right:0}};
 for(const invalid of [
  {...validMove,turn:'old-turn'},
  {...validMove,extra:true},
  {...validMove,choice:{...validMove.choice,cardId:'not-in-hand'}},
  {...validMove,choice:{...validMove.choice,left:-1}},
  {...validMove,choice:{...validMove.choice,right:0.5}},
  {...validMove,choice:{...validMove.choice,action:'cheat'}},
  {...validMove,choice:{...validMove.choice,bank:0}},
  {...validMove,kind:'discard_bonus',choice:{cardId:null}}
 ])await assert.rejects(sdk.setDoc(ownMove,invalid),{code:'permission-denied'});
 await assert.rejects(sdk.setDoc(ref(contexts[1],'moves',host.user.uid),{turn:'bad',kind:'pick',choice:{cardId:'bad',action:'discard',left:0,right:0}}));
 let moves=0;
 for(let round=0;round<18;round++){
  const room=await read(host);assert.equal(room.status,'playing');assert.equal(room.week,Math.floor(round/6)+1);assert.equal(room.round,round%6+1);
  const choices=await Promise.all(contexts.slice(0,7).map(async c=>{const h=await read(c,'hands',c.user.uid);assert.equal(h.cards.length,7-round%6);return {cardId:h.cards[0].id,action:'discard',left:0,right:0};}));
  if(round===0){await assert.rejects(contexts[1].client.request('pick',{roomId,choice:{...choices[1],left:-1}}));}
  await Promise.all(contexts.slice(0,7).map((c,i)=>c.client.request('pick',{roomId,choice:choices[i]})));moves+=7;
  if(round===0){await assert.rejects(host.client.request('pick',{roomId,choice:choices[0]}),/wysłany/);}
  if(round===0){
   // Bypassing the UI must not allow replacing an already confirmed move.
   await assert.rejects(sdk.setDoc(ref(contexts[1],'moves',contexts[1].user.uid),{
    turn:room.turn,kind:'pick',choice:{...choices[1],action:'build'}
   }),{code:'permission-denied'});
  }
  await host.client.process(roomId);assert.deepEqual(host.errors,[]);
 }
 const finished=await read(host);assert.equal(finished.status,'finished');assert.deepEqual(finished.scores.map(s=>s.total),Array(7).fill(19));
 console.log(`PASS: no Cloud Functions; 7 clients, ${moves} moves, 3 weeks, scores, joins/leaves, room capacity, private hands and host-only state/writes.`);
 // Host seeds a local-only scenario to exercise Bastion's additional choice.
 const g=createGame(cards,boards,Array(7).fill('Tester'));g.players[0].board=boards.find(b=>b.id==='rampart');g.players[0].stages=1;
 g.players[0].cards=[{id:'test-production',name:'Test production',color:'brown',effect:{type:'resources',resources:{gems:1,gold:1}},cost:{}}];
 g.discard=[{id:'test-discard',name:'Test discarded card',color:'yellow',cost:{coin:100},effect:{type:'coin',amount:5},artwork:'assets/cards/artwork/example.png'}];
 const members=contexts.slice(0,7).map(c=>c.user.uid),batch=sdk.writeBatch(host.db);
 batch.set(sdk.doc(host.db,'erathiaState',roomId),{game:{...g,hands:g.hands.map(cards=>({cards}))}});batch.set(ref(host),publicGame(g,members,host.user.uid));
 members.forEach((uid,i)=>batch.set(ref(host,'hands',uid),{cards:g.hands[i],cardIds:g.hands[i].map(c=>c.id),phase:g.status,turn:publicGame(g,members,host.user.uid).turn,bonusIds:[],bonusCards:[],picked:false,week:g.week,round:g.round,error:''}));await batch.commit();
 await Promise.all(contexts.slice(0,7).map((c,i)=>c.client.request('pick',{roomId,choice:{cardId:g.hands[i][0].id,action:i===0?'stage':'discard',left:0,right:0}})));
 await host.client.process(roomId);assert.deepEqual(host.errors,[]);
 const bonusRoom=await read(host);assert.equal(bonusRoom.status,'discard_choice');assert.deepEqual(bonusRoom.pendingDiscard,[0]);
 const bonusHand=await read(host,'hands',host.user.uid);assert.ok(bonusHand.bonusCards.some(c=>c.id==='test-discard'));
 const otherHand=await read(contexts[1],'hands',contexts[1].user.uid);assert.equal(otherHand.bonusCards.length,0);
 await assert.rejects(contexts[1].client.request('discard_bonus',{roomId,choice:{cardId:'test-discard'}}));
 await host.client.request('discard_bonus',{roomId,choice:{cardId:'test-discard'}});
 await assert.rejects(sdk.setDoc(ref(host,'moves',host.user.uid),{
  turn:bonusRoom.turn,kind:'discard_bonus',choice:{cardId:null}
 }),{code:'permission-denied'});
 await host.client.process(roomId);
 const resumed=await read(host);assert.equal(resumed.status,'playing');assert.equal(resumed.round,2);assert.equal(resumed.players[0].coins,8);
 assert.deepEqual(host.errors,[]);console.log('PASS: Bastion bonus, private options, rejected unauthorized choice, free build, resumed draft.');
 // Host can leave a lobby, transferring ownership to the next player.
 const second=await host.client.request('create');await contexts[1].client.request('join',{roomId:second.roomId});await host.client.request('leave',{roomId:second.roomId});
 const transferred=(await sdk.getDoc(sdk.doc(contexts[1].db,'erathiaRooms',second.roomId))).data();assert.equal(transferred.host,contexts[1].user.uid);
 console.log('PASS: lobby host transfer.');
}finally{for(const c of contexts)await sdk.terminate(c.db);for(const app of apps)await deleteApp(app);}
