import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,select,selectDiscard,discardOptions,payments} from '../game-engine.js';
import {warBattles} from '../war-animation.js';
import {createWarAnimation} from '../war-animation.js';
const cards=JSON.parse(readFileSync(new URL('../cards.json',import.meta.url)));
const boards=JSON.parse(readFileSync(new URL('../boards.json',import.meta.url)));
const player=power=>({cards:[{effect:{type:'war',amount:power}}],board:{stages:[]},stages:0});

test('battle remains locked until its intro ends and reset cancels the intro',async()=>{
 const originals={document:globalThis.document,matchMedia:globalThis.matchMedia,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 const element=()=>({append(){},setAttribute(){},remove(){}});
 globalThis.document={createElement:element};
 globalThis.matchMedia=()=>({matches:true});
 globalThis.cancelAnimationFrame=()=>{};
 let complete,signal,locked=false,calls=0,finished=0;
 const zone={style:{},inert:false};
 const root={querySelectorAll:()=>[],querySelector:selector=>selector==='.town-circle'?element():selector==='.hand-zone'?zone:null,classList:{toggle(_,value){locked=value;}}};
 try{
  const controller=createWarAnimation(root,{onFinish:()=>{finished++;},beforeBattle:s=>{calls++;signal=s;return new Promise(resolve=>{complete=resolve;});}});
  const g={week:1,status:'playing',players:[{...player(0),coins:3,military:0}]};
  controller.update(g,0);g.week=2;controller.update(g,0);
  await Promise.resolve();
  assert.equal(calls,1);assert.equal(controller.running,true);assert.equal(locked,true);
  assert.equal(zone.style.visibility,'hidden');assert.equal(zone.inert,true);assert.equal(finished,0);
  controller.update(g,0);assert.equal(calls,1);
  complete();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(controller.running,false);assert.equal(locked,false);
  assert.equal(zone.style.visibility,'');assert.equal(zone.inert,false);assert.equal(finished,1);
  g.week=3;controller.update(g,0);await Promise.resolve();
  controller.reset();assert.equal(signal.aborted,true);
  complete();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(controller.running,false);assert.equal(locked,false);
  assert.equal(finished,1);
 }finally{Object.assign(globalThis,originals);}
});

test('war tokens show enemy strength and recipient victory points for every epoch',()=>{
 for(const week of [1,2,3]){
  const battles=warBattles([player(5),player(2),player(2)],week);
  assert.equal(battles.find(b=>b.sender===0&&b.recipient===1).strength,5);
  assert.equal(battles.find(b=>b.sender===0&&b.recipient===1).points,-1);
  assert.equal(battles.find(b=>b.sender===1&&b.recipient===0).points,[0,1,3,5][week]);
  assert.equal(battles.find(b=>b.sender===1&&b.recipient===2).points,0);
 }
});
test('war animation totals match engine resolution, including final epoch and discard bonus',()=>{
 for(let n=3;n<=7;n++){
  const game=createGame(cards,boards,Array.from({length:n},(_,i)=>String(i)));
  let wars=0;
  while(game.status!=='finished'){
   const oldWeek=game.week,oldMilitary=game.players.map(p=>p.military);
   if(game.status==='discard_choice'){
    const i=game.pendingDiscard[0];selectDiscard(game,cards,i,discardOptions(game,i)[0]?.id??null);
   }else{
    const picks=game.hands.map((hand,i)=>{
     const preferred=[...hand].sort((a,b)=>(b.effect?.type==='war')-(a.effect?.type==='war'));
     for(const card of preferred){const plans=payments(game,i,card);if(plans.length)return {cardId:card.id,action:'build',...plans[0]};}
     return {cardId:hand[0].id,action:'discard',left:0,right:0};
    });
    for(let i=0;i<n;i++)select(game,cards,i,picks[i]);
   }
   if(game.week!==oldWeek||game.status==='finished'){
    wars++;
    const battles=warBattles(game.players,oldWeek);
    assert.equal(battles.length,n*2);
    for(let i=0;i<n;i++)assert.equal(battles.filter(b=>b.recipient===i).reduce((sum,b)=>sum+b.points,0),game.players[i].military-oldMilitary[i]);
   }
  }
  assert.equal(wars,3);
 }
});

test('victory counter pulses on gains and losses and survives repeated renders',async()=>{
 const {createWarAnimation}=await import('../war-animation.js');
 const original=globalThis.matchMedia;globalThis.matchMedia=()=>({matches:false});
 const number={textContent:''},pulses=[];
 const counter={querySelector:()=>number,setAttribute(){},animate(){const animation={};pulses.push(animation);return animation;}};
 const seat={dataset:{playerIndex:'0'},querySelector:()=>counter};
 const root={querySelectorAll:()=>[seat],querySelector:()=>null,classList:{toggle(){}}};
 try{
  const controller=createWarAnimation(root),g={week:1,status:'playing',players:[{...player(0),coins:3,military:0}]};
  controller.update(g,0);assert.equal(pulses.length,0);assert.equal(number.textContent,1);
  g.players[0].coins=6;controller.update(g,0);assert.equal(number.textContent,2);assert.equal(pulses.length,1);
  controller.update(g,0);assert.equal(pulses.length,2);assert(pulses[1].currentTime>=pulses[0].currentTime);
  g.players[0].coins=0;controller.update(g,0);assert.equal(number.textContent,0);assert.equal(pulses.length,3);
  controller.reset();
 }finally{globalThis.matchMedia=original;}
});
