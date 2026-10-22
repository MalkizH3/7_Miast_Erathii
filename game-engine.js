export const resources=['wood','ore','mercury','sulfur','gold','crystal','gems'];
const sum=(a,b)=>Object.fromEntries(resources.map(r=>[r,(a[r]||0)+(b[r]||0)]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a};
export function createGame(cards,boards,names,startingTownId=null){
 if(names.length<3||names.length>7)throw Error('Gra wymaga 3–7 graczy.');
 for(let week=1;week<=3;week++){const probe={week,players:names};deal(probe,cards);}
 const towns=shuffle(boards.filter(b=>b.stages.every(s=>s.effect)));
 if(towns.length<names.length)throw Error('Brakuje miast z kompletnymi efektami etapów.');
 if(startingTownId!==null){
  const index=towns.findIndex(town=>town.id===startingTownId);
  if(index<0)throw Error('Wybrane miasto startowe jest niedostępne.');
  [towns[0],towns[index]]=[towns[index],towns[0]];
 }
 const game={week:1,round:1,status:'playing',players:names.map((name,i)=>({name,board:towns[i],coins:3,cards:[],stages:0,stageWeeks:[],military:0})),hands:[],picks:{},discard:[],log:[]};deal(game,cards);return game;
}
function deal(g,cards){
 const n=g.players.length;
 let deck=cards.filter(c=>Number(c.week)===g.week&&(c.color==='purple'||Number(c.players)<=n));
 if(g.week===3)deck=[...deck.filter(c=>c.color!=='purple'),...shuffle(deck.filter(c=>c.color==='purple')).slice(0,n+2)];
 if(deck.length!==n*7)throw Error(`Tydzień ${g.week}: talia ma ${deck.length} kart, potrzeba ${n*7}. Sprawdź dane kart.`);
 deck=shuffle(deck);g.hands=Array.from({length:n},(_,i)=>deck.slice(i*7,i*7+7));
}
export function effects(p){return [...p.cards.map(c=>c.effect),...p.board.stages.slice(0,p.stages).map(s=>s.effect)].filter(Boolean)}
function production(p,trade=false){
 let variants=[{[p.board.base_resource]:1}];
 const es=trade?p.cards.filter(c=>['brown','grey'].includes(c.color)).map(c=>c.effect):effects(p);
 for(const e of es){const choices=e.type==='resources'?[e.resources]:e.type==='resource_choice'?e.options:null;if(choices)variants=variants.flatMap(v=>choices.map(c=>sum(v,c)));}
 const unique=new Map(variants.map(v=>[resources.map(r=>v[r]||0).join(','),v]));return [...unique.values()];
}
function rate(p,d,r){return Math.min(2,...effects(p).filter(e=>e.type==='trade'&&(e.direction===d||e.direction==='both')&&e.resources.includes(r)).map(e=>e.price));}
export function payments(g,i,card,action='build'){
 const p=g.players[i],n=g.players.length;
 if(action==='discard')return [{bank:0,left:0,right:0}];
 if(action==='build'&&p.cards.some(c=>c.name===card.name))return [];
 const target=action==='stage'?p.board.stages[p.stages]:card;if(!target||!target.effect)return [];
 if(action==='build'&&effects(p).some(e=>e.type==='color_free')&&!p.cards.some(c=>c.color===card.color))return [{bank:0,left:0,right:0}];
 if(action==='build'&&(card.connection_cost||[]).some(s=>p.cards.some(c=>(c.connections||[]).includes(s))))return [{bank:0,left:0,right:0}];
 const cost=target.cost||{},bank=cost.coin||0,answers=new Map();
 for(const own of production(p))for(const l of production(g.players[(i+n-1)%n],true))for(const r of production(g.players[(i+1)%n],true)){
  let plans=[{bank,left:0,right:0}];
  for(const res of resources){const need=Math.max(0,(cost[res]||0)-(own[res]||0)),options=[];for(let a=0;a<=need;a++){if(a<=(l[res]||0)&&need-a<=(r[res]||0))options.push({left:a*rate(p,'left',res),right:(need-a)*rate(p,'right',res)});}plans=plans.flatMap(v=>options.map(o=>({bank,left:v.left+o.left,right:v.right+o.right})));}
  for(const v of plans)if(v.bank+v.left+v.right<=p.coins)answers.set(`${v.left},${v.right}`,v);
 }
 const plans=[...answers.values()];
 // Keep a split only when no alternative costs less without paying either neighbor more.
 return plans.filter(plan=>!plans.some(other=>other.left<=plan.left&&other.right<=plan.right&&(other.left<plan.left||other.right<plan.right)))
  .sort((a,b)=>a.left+a.right-b.left-b.right);
}
function targets(g,i,scope){const n=g.players.length;return (scope==='neighbors'?[(i+n-1)%n,(i+1)%n]:scope==='self_and_neighbors'?[(i+n-1)%n,i,(i+1)%n]:[i]).map(j=>g.players[j]);}
function count(g,i,e){const ps=targets(g,i,e.scope);if(e.target==='stage')return ps.reduce((s,p)=>s+p.stages,0);if(e.target==='completed')return ps.filter(p=>p.stages===p.board.stages.length).length;if(e.target==='pyramid')return ps.filter(p=>p.stages>0).length;return ps.reduce((s,p)=>s+p.cards.filter(c=>(e.card_colors||[e.card_color]).includes(c.color)).length,0);}
export function select(g,cards,i,choice){
 if(g.status!=='playing'||g.picks[i])throw Error('Wybór został już potwierdzony.');
 const card=g.hands[i].find(c=>c.id===choice.cardId);if(!card)throw Error('Nie masz tej karty w ręce.');
 const valid=payments(g,i,card,choice.action);if(!['build','discard','stage'].includes(choice.action)||!valid.some(v=>v.left===choice.left&&v.right===choice.right))throw Error('Nie można wykonać tego ruchu.');
 g.picks[i]={...choice,bank:valid.find(v=>v.left===choice.left&&v.right===choice.right).bank};
 if(Object.keys(g.picks).length===g.players.length)resolve(g,cards);
 return g;
}
function resolve(g,cards){
 const n=g.players.length,trigger=[];
 g.players.forEach(p=>{p.newCards=[];});
 for(let i=0;i<n;i++){
  const pick=g.picks[i],p=g.players[i],card=g.hands[i].find(c=>c.id===pick.cardId);
  g.hands[i]=g.hands[i].filter(c=>c.id!==pick.cardId);
  if(pick.action==='discard'){p.coins+=3;g.discard.push(card);continue;}
  p.coins-=pick.bank+pick.left+pick.right;g.players[(i+n-1)%n].coins+=pick.left;g.players[(i+1)%n].coins+=pick.right;
  if(pick.action==='build'){p.cards.push(card);p.newCards.push(card.id);trigger.push([i,card.effect]);}else{
   // Older saves may have stages without recorded weeks. Firestore rejects sparse arrays.
   p.stageWeeks=Array.from({length:p.stages},(_,k)=>p.stageWeeks?.[k]??null);
   p.stageWeeks.push(g.week);trigger.push([i,p.board.stages[p.stages++].effect]);
  }
 }
 for(const [i,e]of trigger)applyImmediate(g,i,e);
 g.log.push(`Tydzień ${g.week}, tura ${g.round}: wszyscy gracze wykonali ruch.`);g.picks={};
 if(g.round===6){g.discard.push(...g.hands.flat());g.hands=g.players.map(()=>[]);}
 g.pendingDiscard=trigger.filter(([,e])=>e.type==='discard_free').map(([i])=>i);
 continueDiscard(g,cards);
}
function applyImmediate(g,i,e){
 if(e.type==='coin')g.players[i].coins+=e.amount;
 else if(e.type.startsWith('coins_'))g.players[i].coins+=(e.coins??e.amount)*count(g,i,e);
}
export function discardOptions(g,i){return g.discard.filter(c=>!g.players[i].cards.some(b=>b.name===c.name));}
function continueDiscard(g,cards){
 while(g.pendingDiscard.length&&!discardOptions(g,g.pendingDiscard[0]).length)g.pendingDiscard.shift();
 if(g.pendingDiscard.length){g.status='discard_choice';return;}
 g.status='playing';advanceTurn(g,cards);
}
export function selectDiscard(g,cards,i,cardId){
 if(g.status!=='discard_choice'||g.pendingDiscard?.[0]!==i)throw Error('Nie możesz teraz wybrać karty ze stosu odrzuconych.');
 if(cardId!==null){
  const card=discardOptions(g,i).find(c=>c.id===cardId);if(!card)throw Error('Nie można wybudować tej karty ze stosu odrzuconych.');
  g.discard=g.discard.filter(c=>c.id!==cardId);g.players[i].cards.push(card);(g.players[i].newCards??=[]).push(card.id);applyImmediate(g,i,card.effect);
 }
 g.pendingDiscard.shift();continueDiscard(g,cards);return g;
}
function advanceTurn(g,cards){
 const n=g.players.length;
 if(g.round===6){
  for(let i=0;i<n;i++){const power=p=>effects(p).filter(e=>e.type==='war').reduce((s,e)=>s+e.amount,0);for(const j of [(i+n-1)%n,(i+1)%n])g.players[i].military+=power(g.players[i])>power(g.players[j])?[0,1,3,5][g.week]:power(g.players[i])<power(g.players[j])?-1:0;}
  if(g.week===3){g.status='finished';g.hands=g.players.map(()=>[]);g.scores=g.players.map((_,i)=>score(g,i));return;}
  g.week++;g.round=1;deal(g,cards);
 }else{g.round++;const direction=g.week===2?-1:1;g.hands=g.hands.map((_,i)=>g.hands[(i-direction+n)%n]);}
}
function science(es){let states=[[0,0,0]];const symbols=['sorcery','inteligence','wisdom'];for(const e of es){if(!['science','science_choice'].includes(e.type))continue;for(let k=0;k<(e.amount||1);k++)states=states.flatMap(s=>(e.type==='science'?[e.symbol]:e.options).map(sym=>s.map((v,i)=>v+(symbols.indexOf(sym)===i?1:0))));}return Math.max(...states.map(s=>s.reduce((a,v)=>a+v*v,0)+7*Math.min(...s)));}
export function score(g,i){const p=g.players[i],es=effects(p);const result={coins:Math.floor(p.coins/3),military:p.military,science:science(es),buildings:es.filter(e=>e.type==='points').reduce((s,e)=>s+e.amount,0),guilds:0};for(const e of es)if(e.type.startsWith('points_per_')||e.type.startsWith('coins_and_points_'))result.guilds+=(e.points??e.amount)*count(g,i,e);result.total=Object.values(result).reduce((a,b)=>a+b,0);return result;}
