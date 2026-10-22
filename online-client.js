import {createGame,select,selectDiscard,discardOptions,payments} from './game-engine.js';
export const turnKey=g=>`${g.week}-${g.round}-${g.status}-${g.pendingDiscard?.[0]??''}`;
export function publicGame(g,members,host){return {status:g.status,week:g.week,round:g.round,turn:turnKey(g),players:g.players,members,host,picked:Object.keys(g.picks).map(Number),pickedUids:Object.keys(g.picks).map(i=>members[Number(i)]),scores:g.scores||null,pendingDiscard:g.pendingDiscard||[],log:g.log.slice(-6)};}
// Gospodarz rozpatruje ruchy. Pozostali uczestnicy zapisują tylko własny wybór.
export function createOnlineClient({sdk,db,getUser,cards,boards,onError=()=>{}}){
 const roomRef=id=>sdk.doc(db,'erathiaRooms',id);
 const stateRef=id=>sdk.doc(db,'erathiaState',id);
 const moveRef=(id,uid)=>sdk.doc(db,'erathiaRooms',id,'moves',uid);
 function publish(tx,ref,g,members,host,errors={}){
  tx.set(stateRef(ref.id),{game:{...g,hands:g.hands.map(cards=>({cards}))}});
  tx.set(ref,publicGame(g,members,host));
  members.forEach((uid,i)=>tx.set(sdk.doc(db,'erathiaRooms',ref.id,'hands',uid),{cards:g.hands[i],cardIds:g.hands[i].map(c=>c.id),phase:g.status,turn:turnKey(g),bonusIds:g.status==='discard_choice'&&g.pendingDiscard[0]===i?discardOptions(g,i).map(c=>c.id):[],bonusCards:g.status==='discard_choice'&&g.pendingDiscard[0]===i?discardOptions(g,i):[],picked:!!g.picks[i],week:g.week,round:g.round,error:errors[i]||''}));
 }
 async function request(action,{roomId,choice}={}){
  const user=getUser();if(!user)throw Error('Zaloguj się, aby grać.');
  const uid=user.uid,name=(user.displayName||'Gracz').slice(0,50);
  if(action==='create'){
   const id=Array.from(crypto.getRandomValues(new Uint8Array(12)),n=>n.toString(16).padStart(2,'0')).join('');
   await sdk.setDoc(roomRef(id),{status:'lobby',host:uid,members:[uid],players:[{name,uid}],picked:[],pickedUids:[]});return {roomId:id};
  }
  if(typeof roomId!=='string'||!/^[a-f0-9]{24}$/.test(roomId))throw Error('Niepoprawny link pokoju.');
  const ref=roomRef(roomId);
  return sdk.runTransaction(db,async tx=>{
   const snap=await tx.get(ref);
   if(!snap.exists()){
    if(action==='close')return {closed:true};
    throw Error('Nie znaleziono pokoju.');
   }
   const r=snap.data();
   if(action==='join'){
    if(r.members.includes(uid))return {roomId};
    if(r.status!=='lobby'||r.members.length>=7)throw Error('Pokój jest pełny lub gra już trwa.');
    r.members.push(uid);r.players.push({name,uid});tx.set(ref,r);return {roomId};
   }
   const i=r.members.indexOf(uid);if(i<0)throw Error('Nie należysz do tego pokoju.');
   if(action==='close'){
    if(!['playing','discard_choice','finished'].includes(r.status))throw Error('Partia jeszcze się nie rozpoczęła.');
    tx.set(sdk.doc(db,'erathiaClosures',roomId),{
     memberUids:r.members,closedByUid:uid,closedByIndex:i,
     closedByName:r.players[i].name,closedAt:sdk.serverTimestamp()
    });
    for(const member of r.members){
     tx.delete(sdk.doc(db,'erathiaRooms',roomId,'hands',member));
     tx.delete(moveRef(roomId,member));
    }
    tx.delete(stateRef(roomId));tx.delete(ref);
    return {closed:true};
   }
   if(action==='leave'){
    if(r.status!=='lobby')throw Error('Możesz opuścić pokój przed rozpoczęciem partii.');
    r.members.splice(i,1);r.players.splice(i,1);r.host=r.members[0]||'';r.status=r.members.length?'lobby':'closed';r.leaveIndex=i;tx.set(ref,r);return {left:true};
   }
   if(action==='start'){
    if(r.host!==uid||r.status!=='lobby')throw Error('Tylko gospodarz może rozpocząć partię.');
    const g=createGame(cards,boards,r.players.map(p=>p.name));publish(tx,ref,g,r.members,r.host);return {roomId};
   }
   if(action==='pick'||action==='discard_bonus'){
    const hand=await tx.get(sdk.doc(db,'erathiaRooms',roomId,'hands',uid));
    const pending=await tx.get(moveRef(roomId,uid));
    if(pending.exists()&&pending.data().turn===r.turn)throw Error('Wybór został już wysłany.');
    if(action==='pick'){
     if(r.status!=='playing'||r.picked.includes(i))throw Error('Nie możesz teraz wybrać karty.');
     const c=hand.data().cards.find(c=>c.id===choice?.cardId);
     if(!c||!['build','stage','discard'].includes(choice.action)||!payments(r,i,c,choice.action).some(p=>p.left===choice.left&&p.right===choice.right))throw Error('Nie można wykonać tego ruchu.');
    }else if(r.status!=='discard_choice'||r.pendingDiscard[0]!==i||choice.cardId!==null&&!hand.data().bonusCards.some(c=>c.id===choice.cardId))throw Error('Nie można wybrać tej karty ze stosu.');
    tx.set(moveRef(roomId,uid),{turn:r.turn,kind:action,choice});return {roomId};
   }
   throw Error('Nieznana akcja.');
  });
 }
 let processing=false,again=false;
 async function process(roomId){
  if(processing){again=true;return;}processing=true;
  try{do{again=false;await sdk.runTransaction(db,async tx=>{
   const ref=roomRef(roomId),snap=await tx.get(ref);if(!snap.exists())return;const r=snap.data();
   if(r.host!==getUser()?.uid||!['playing','discard_choice'].includes(r.status))return;
   const ss=await tx.get(stateRef(roomId));if(!ss.exists())return;
   const moves=[];for(const uid of r.members)moves.push(await tx.get(moveRef(roomId,uid)));
   const g=ss.data().game;g.hands=g.hands.map(h=>h.cards);let changed=false;const errors={};
   for(let i=0;i<moves.length;i++){
    const move=moves[i];if(!move.exists())continue;changed=true;tx.delete(moveRef(roomId,r.members[i]));
    const m=move.data();if(m.turn!==turnKey(g))continue;
    try{if(m.kind==='discard_bonus')selectDiscard(g,cards,i,m.choice.cardId);else select(g,cards,i,m.choice);}catch(e){errors[i]=e.message;}
   }
   if(changed)publish(tx,ref,g,r.members,r.host,errors);
  });}while(again);}catch(e){onError(e);}finally{processing=false;}
 }
 return {request,process};
}
