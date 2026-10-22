import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame,payments,select,score} from '../game-engine.js';
const cards=JSON.parse(readFileSync(new URL('../cards.json',import.meta.url)));
const boards=JSON.parse(readFileSync(new URL('../boards.json',import.meta.url)));
const building=(id,color='blue',effect={type:'points',amount:0},cost={})=>({id,name:id,color,effect,cost});
function fixture(n=3){
 const g=createGame(cards,boards,Array(n).fill('Tester'));
 for(const p of g.players)Object.assign(p,{board:{base_resource:'gems',stages:[]},cards:[],coins:20,stages:0,military:0});
 g.hands=g.players.map((_,i)=>[building(`pick-${i}`),building(`remaining-${i}`)]);
 return g;
}
function resolve(g,choices){for(let i=g.players.length-1;i>=0;i--)select(g,cards,i,choices[i]);}
const discard=(g,i)=>({cardId:g.hands[i][0].id,action:'discard',left:0,right:0});

test('bank costs disappear; left and right payments reach exactly the intended neighbors',()=>{
 for(const n of [3,4,5,6,7])for(let buyer=0;buyer<n;buyer++){
  const g=fixture(n),left=(buyer+n-1)%n,right=(buyer+1)%n;
  g.players[left].board.base_resource='wood';g.players[right].board.base_resource='ore';
  const c=building('purchase','blue',undefined,{wood:1,ore:2,coin:1});
  g.players[right].cards=[building('ore','brown',{type:'resources',resources:{ore:1}})];
  g.hands[buyer][0]=c;
  assert.deepEqual(payments(g,buyer,c),[{bank:1,left:2,right:4}]);
  const choices=g.players.map((_,i)=>discard(g,i));choices[buyer]={cardId:c.id,action:'build',left:2,right:4};
  resolve(g,choices);
  assert.deepEqual(g.players.map(p=>p.coins),g.players.map((_,i)=>i===buyer?13:23+(i===left?2:0)+(i===right?4:0)));
  assert.equal(g.players.reduce((s,p)=>s+p.coins,0),20*n+3*(n-1)-1);
 }
});

test('same-turn receipts cannot fund a choice; confirming a choice transfers nothing early',()=>{
 const g=fixture();g.players[0].coins=0;g.players[0].board.base_resource='wood';
 const income=building('income','yellow',{type:'coin',amount:5},{coin:1});g.hands[0][0]=income;
 assert.deepEqual(payments(g,0,income),[]);
 assert.throws(()=>select(g,cards,0,{cardId:income.id,action:'build',left:0,right:0}));
 g.hands[1][0]=building('buyer','blue',undefined,{wood:1});
 select(g,cards,1,{cardId:'buyer',action:'build',left:2,right:0});
 assert.deepEqual(g.players.map(p=>p.coins),[0,20,20]);
 assert.deepEqual(payments(g,0,income),[]);
 select(g,cards,0,discard(g,0));select(g,cards,2,discard(g,2));
 assert.deepEqual(g.players.map(p=>p.coins),[5,18,23]);
});

test('all catalog coin effects count simultaneous builds once and retain final point bonuses',()=>{
 for(const c of cards.filter(c=>c.effect.type==='coin'||c.effect.type.startsWith('coins_'))){
  const g=fixture();g.players[0].cards=[building('brown','brown'),building('grey','grey'),building('red','red')];
  g.players[0].stages=2;g.players[0].board.stages=Array.from({length:3},()=>({effect:{type:'points',amount:0}}));
  g.hands[0][0]={...c,cost:{}};
  g.hands[1][0]=building('new-brown','brown');g.hands[2][0]=building('new-grey','grey');
  const expected={
   coin:c.effect.amount,
   coins_per_card:c.effect.card_color==='brown'?2:4,
   coins_and_points_per_card:{red:3,yellow:1,grey:2,brown:1}[c.effect.card_color],
   coins_and_points_per_pyramid:6
  }[c.effect.type];
  resolve(g,g.hands.map(h=>({cardId:h[0].id,action:'build',left:0,right:0})));
  assert.equal(g.players[0].coins,20+expected,c.name);
  if(c.effect.type==='coins_and_points_per_card'){
   assert.equal(score(g,0).guilds,c.effect.points,c.name);
   g.players[0].cards.push(building('later',c.effect.card_color));
   assert.equal(score(g,0).guilds,2*c.effect.points,c.name);
   assert.equal(g.players[0].coins,20+expected,'later buildings do not pay old income again');
  }
  if(c.effect.type==='coins_and_points_per_pyramid')assert.equal(score(g,0).guilds,2,c.name);
 }
});

test('every catalog guild counts the correct scope, colors and completed stages',()=>{
 for(const c of cards.filter(c=>c.effect.type.startsWith('points_per_'))){
  const g=fixture(5);g.players[0].cards=[c];
  for(let i=0;i<5;i++){
   g.players[i].cards.push(...['brown','grey','blue','yellow','red','green','purple'].flatMap(color=>Array.from({length:i+1},(_,k)=>building(`${i}-${color}-${k}`,color))));
   g.players[i].board.stages=Array.from({length:3},()=>({effect:{type:'points',amount:0}}));
   g.players[i].stages=[2,1,3,3,3][i];
  }
  const expected={
   'Magazyn zasobów':7,'Magiczny staw':14,'Pomnik wodza':7,'Kapitol':7,'Akademia wojny':7,'Gildia magów':7,
   'Biblioteka':4,'todo2':6,'todo3':0
  }[c.name];
  assert.notEqual(expected,undefined,c.name);assert.equal(score(g,0).guilds,expected,c.name);
 }
});

test('full score separates coins, city and building points, military, science and guilds',()=>{
 const g=fixture(),p=g.players[0];p.coins=8;p.military=-2;p.stages=2;
 p.board.stages=[{effect:{type:'points',amount:3}},{effect:{type:'points',amount:7}}];
 p.cards=[building('points','blue',{type:'points',amount:18}),
  ...['inteligence','inteligence','wisdom','sorcery'].map((symbol,i)=>building(`science-${i}`,'green',{type:'science',symbol,amount:1})),
  building('guild','purple',{type:'points_per_card',card_colors:['green'],scope:'self',amount:1})];
 assert.deepEqual(score(g,0),{coins:2,military:-2,science:13,buildings:28,guilds:4,total:45});
 for(let coins=0;coins<12;coins++){p.coins=coins;assert.equal(score(g,0).coins,Math.floor(coins/3));}
});

test('building a stage from an older save keeps a dense Firestore-compatible week history',()=>{
 for(const history of [undefined,[],[1]]){
  const g=fixture(),p=g.players[0];g.week=2;p.stages=2;p.stageWeeks=history;
  p.board.stages=Array.from({length:3},()=>({cost:{},effect:{type:'points',amount:3}}));
  const choices=g.players.map((_,i)=>discard(g,i));choices[0].action='stage';resolve(g,choices);
  assert.deepEqual(p.stageWeeks,[history?.[0]??null,null,2]);
  assert.equal(Object.keys(p.stageWeeks).length,3);
 }
});

test('war resolves both neighbors with epoch rewards, ties and city military effects',()=>{
 for(const week of [1,2,3]){
  const g=fixture(5);g.week=week;g.round=6;
  g.players[0].board.stages=[{effect:{type:'war',amount:2}}];g.players[0].stages=1;
  g.players[1].cards=[building('army','red',{type:'war',amount:2})];
  g.players[2].cards=[building('army','red',{type:'war',amount:3})];
  const win=[0,1,3,5][week];resolve(g,g.players.map((_,i)=>discard(g,i)));
  assert.deepEqual(g.players.map(p=>p.military),[win,-1,2*win,-1,-1]);
 }
});
