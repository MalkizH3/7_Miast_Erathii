import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,payments,select,selectDiscard,discardOptions,score} from '../game-engine.js';
const cards=JSON.parse(readFileSync(new URL('../cards.json',import.meta.url)));
const boards=JSON.parse(readFileSync(new URL('../boards.json',import.meta.url)));
const base=()=>createGame(cards,boards,['A','B','C']);
const card=(id,effect={type:'points',amount:1},cost={})=>({id,name:id,color:'blue',cost,effect,connections:[],connection_cost:[]});

test('chosen starting town belongs to the human for every supported bot count',()=>{
 for(let bots=2;bots<=6;bots++)for(const town of boards){
  const g=createGame(cards,boards,Array(bots+1).fill('Player'),town.id);
  assert.equal(g.players[0].board.id,town.id);
  assert.equal(new Set(g.players.map(p=>p.board.id)).size,bots+1);
  assert.equal(g.hands.length,bots+1);
  assert.ok(g.hands.every(h=>h.length===7));
 }
 assert.throws(()=>createGame(cards,boards,['A','B','C'],'missing'),/miasto/);
});
test('complete 3–7 player games resolve 18 simultaneous turns',()=>{
 for(const n of [3,4,5,6,7])for(let run=0;run<4;run++){
  const g=createGame(cards,boards,Array.from({length:n},(_,i)=>String(i)));let turns=0;
  while(g.status==='playing'){
   const picks=g.hands.map((h,i)=>{for(const c of h){const ps=payments(g,i,c);if(ps.length)return {cardId:c.id,action:'build',...ps[0]};}return {cardId:h[0].id,action:'discard',left:0,right:0};});
   for(let i=0;i<n;i++)select(g,cards,i,picks[i]);turns++;assert.ok(g.players.every(p=>p.coins>=0));
  }
  assert.equal(turns,18);assert.equal(g.scores.length,n);assert.ok(g.scores.every(s=>Number.isFinite(s.total)));
 }
});
test('incomplete decks fail before play starts',()=>{const incomplete=cards.filter(c=>!(c.name==='Smocza jaskinia'&&c.players===5));for(const n of [5,6,7])assert.throws(()=>createGame(incomplete,boards,Array(n).fill('A')),/talia/);});
test('hands rotate and last cards are discarded',()=>{const g=base(),old=g.hands.map(h=>h.map(c=>c.id));for(let i=0;i<3;i++)select(g,cards,i,{cardId:old[i][0],action:'discard',left:0,right:0});assert.deepEqual(g.hands[1].map(c=>c.id),old[0].slice(1));assert.equal(g.round,2);assert.equal(g.players[0].coins,6);});
test('repeat and unknown picks are rejected',()=>{const g=base(),c=g.hands[0][0];assert.throws(()=>select(g,cards,0,{cardId:'missing',action:'discard',left:0,right:0}));select(g,cards,0,{cardId:c.id,action:'discard',left:0,right:0});assert.throws(()=>select(g,cards,0,{cardId:c.id,action:'discard',left:0,right:0}));});
test('chains waive costs but duplicate buildings remain forbidden',()=>{const g=base(),p=g.players[0];p.cards=[{...card('source'),connections:['chain']}];const c={...card('target',undefined,{wood:99}),connection_cost:['chain']};assert.deepEqual(payments(g,0,c),[{bank:0,left:0,right:0}]);p.cards.push(c);assert.deepEqual(payments(g,0,c),[]);});
test('choice production cannot provide both alternatives',()=>{const g=base();for(const p of g.players){p.board={base_resource:'gold',stages:[]};p.cards=[];}g.players[0].cards=[card('choice',{type:'resource_choice',options:[{wood:1},{ore:1}]})];assert.equal(payments(g,0,card('need',undefined,{wood:1,ore:1})).length,0);});
test('neighbors sell brown production, not yellow production',()=>{const g=base();for(const p of g.players){p.board={base_resource:'gold',stages:[]};p.cards=[];}g.players[2].cards=[{...card('wood',{type:'resources',resources:{wood:1}}),color:'brown'}];const c=card('need',undefined,{wood:1});assert.deepEqual(payments(g,0,c),[{bank:0,left:2,right:0}]);g.players[2].cards[0].color='yellow';assert.deepEqual(payments(g,0,c),[]);});
test('trade discounts and beginning-of-turn affordability',()=>{const g=base();for(const p of g.players){p.board={base_resource:'wood',stages:[]};p.cards=[];}g.players[0].board.base_resource='gold';g.players[0].coins=1;const c=card('need',undefined,{wood:1});assert.equal(payments(g,0,c).length,0);g.players[0].cards=[card('trade',{type:'trade',direction:'left',resources:['wood'],price:1})];assert.deepEqual(payments(g,0,c),[{bank:0,left:1,right:0}]);});
test('scientific wildcard maximizes sets and squares',()=>{const g=base(),p=g.players[0];p.board={base_resource:'wood',stages:[]};p.cards=['sorcery','inteligence'].map(s=>card(s,{type:'science',symbol:s,amount:1}));p.cards.push(card('wild',{type:'science_choice',options:['sorcery','inteligence','wisdom'],amount:1}));assert.equal(score(g,0).science,10);});
test('completed-city guild scores only a completed city',()=>{const g=base(),p=g.players[0];p.cards=[card('guild',{type:'points_per_pyramid',target:'completed',amount:7,scope:'self'})];p.stages=0;assert.equal(score(g,0).guilds,0);p.stages=p.board.stages.length;assert.equal(score(g,0).guilds,7);});

test('catalog IDs are sequential and dragon cave 5+ follows 3+',()=>{assert.equal(cards.length,148);assert.deepEqual(cards.map(c=>c.id),cards.map((_,i)=>String(i+1).padStart(3,'0')));const i=cards.findIndex(c=>c.name==='Smocza jaskinia'&&c.players===3);assert.equal(cards[i+1].name,'Smocza jaskinia');assert.equal(cards[i+1].players,5);});
test('seven-player game includes every town',()=>{const g=createGame(cards,boards,Array(7).fill('A'));assert.deepEqual(g.players.map(p=>p.board.id).sort(),boards.map(b=>b.id).sort());});
test('color_free waives first color including coin costs, not subsequent colors or stages',()=>{const g=base(),p=g.players[0];p.cards=[];p.board={base_resource:'gold',stages:[{effect:{type:'color_free'},cost:{}},{effect:{type:'points',amount:3},cost:{wood:99}}]};p.stages=1;p.coins=0;const c=card('first',undefined,{wood:99,coin:99});assert.deepEqual(payments(g,0,c),[{bank:0,left:0,right:0}]);assert.deepEqual(payments(g,0,c,'stage'),[]);p.cards=[card('already-blue')];assert.deepEqual(payments(g,0,c),[]);});
function bonusGame(round=1){const g=base();g.round=round;g.discard=[card('old-discard',{type:'coin',amount:5},{coin:99})];g.players.forEach((p,i)=>{p.cards=[];p.board={base_resource:'gold',stages:[{cost:{},effect:i===0?{type:'discard_free'}:{type:'points',amount:3}}]};p.stages=0;});g.hands=g.players.map((_,i)=>[card('pick-'+i),card('leftover-'+i)]);return g;}
function triggerBonus(g){for(let i=0;i<3;i++)select(g,cards,i,{cardId:'pick-'+i,action:i===0?'stage':'discard',left:0,right:0});}
test('Bastion pauses draft, includes same-turn discards and excludes buried stage card',()=>{const g=bonusGame();triggerBonus(g);assert.equal(g.status,'discard_choice');assert.equal(g.round,1);assert.deepEqual(discardOptions(g,0).map(c=>c.id),['old-discard','pick-1','pick-2']);assert.throws(()=>selectDiscard(g,cards,1,'old-discard'));assert.throws(()=>selectDiscard(g,cards,0,'pick-0'));selectDiscard(g,cards,0,'old-discard');assert.equal(g.players[0].coins,8);assert.equal(g.players[0].cards[0].id,'old-discard');assert.equal(g.status,'playing');assert.equal(g.round,2);assert.ok(!g.discard.some(c=>c.id==='old-discard'));});
test('Bastion can choose final unplayed card before military resolution',()=>{const g=bonusGame(6);g.hands[1][1].effect={type:'war',amount:3};triggerBonus(g);assert.equal(g.week,1);assert.ok(discardOptions(g,0).some(c=>c.id==='leftover-1'));selectDiscard(g,cards,0,'leftover-1');assert.equal(g.players[0].military,2);assert.equal(g.week,2);assert.equal(g.round,1);assert.equal(g.hands[0].length,7);});
test('Bastion cannot construct a duplicate name and skips an empty pile',()=>{const g=bonusGame();g.players[0].cards=[card('owned')];g.discard=[card('owned')];g.hands=g.players.map((_,i)=>[card('pick-'+i),card('leftover-'+i)]);for(let i=0;i<3;i++)select(g,cards,i,{cardId:'pick-'+i,action:'stage',left:0,right:0});assert.equal(g.status,'playing');assert.equal(g.round,2);});

test('final scoring waits for Bastion bonus',()=>{const g=bonusGame(6);g.week=3;triggerBonus(g);assert.equal(g.status,'discard_choice');assert.equal(g.scores,undefined);selectDiscard(g,cards,0,'old-discard');assert.equal(g.status,'finished');assert.equal(g.scores[0].coins,2);assert.equal(g.players[0].coins,8);});

test('own choice production builds without paying neighbors even when trading is possible',()=>{
 const g=base();g.players.forEach(p=>{p.cards=[];p.board={base_resource:'gems',stages:[]};});
 const p=g.players[0];p.cards=[card('ore-or-sulfur',{type:'resource_choice',options:[{ore:1},{sulfur:1}]}),card('eastern-trade',{type:'trade',direction:'right',resources:['ore'],price:1})];
 g.players[1].board.base_resource='ore';const building=card('military',{type:'war',amount:1},{ore:1});
 const options=payments(g,0,building);assert.deepEqual(options,[{bank:0,left:0,right:0}]);
 g.hands[0]=[building];const coins=g.players.map(p=>p.coins);
 select(g,cards,0,{cardId:building.id,action:'build',left:0,right:0});
 for(let i=1;i<3;i++)select(g,cards,i,{cardId:g.hands[i][0].id,action:'discard',left:0,right:0});
 assert.equal(p.cards.at(-1).id,building.id);assert.equal(p.coins,coins[0]);
});

test('payments omit dominated neighbor splits and keep useful tradeoffs for cards and stages',()=>{
 const g=base();
 for(const p of g.players){p.board={base_resource:'gems',stages:[]};p.cards=[];p.coins=20;}
 g.players[0].cards=[
  card('choice',{type:'resource_choice',options:[{wood:1},{ore:1}]}),
  card('discount',{type:'trade',direction:'left',resources:['wood'],price:1})
 ];
 for(const i of [1,2])g.players[i].cards=[{...card('supply',{type:'resources',resources:{wood:2,ore:1}}),color:'brown'}];
 const target=card('target',undefined,{wood:2,ore:1,coin:1});
 const expected=[{bank:1,left:2,right:0},{bank:1,left:1,right:2},{bank:1,left:0,right:4}];
 assert.deepEqual(payments(g,0,target),expected);
 g.players[0].board.stages=[target];
 assert.deepEqual(payments(g,0,target,'stage'),expected);
 // Production can cover the full cost: paying either neighbor is now unnecessary.
 g.players[0].cards.push(card('own-supply',{type:'resources',resources:{wood:2,ore:1}}));
 assert.deepEqual(payments(g,0,target),[{bank:1,left:0,right:0}]);
});
