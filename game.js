import {renderResults} from './game-results.js';
import {describeCard as describeCardDetails} from './card-description.js';
import {createWarAnimation} from './war-animation.js';
import {fitTownRing} from './town-layout.js';
import {cardBuildStatus} from './hand-status.js';
import {preloadAssets} from './asset-loader.js';
import {createStageTransfer} from './stage-transfer.js';
import {createBuildMorph} from './build-morph.js';
import {createGameSounds} from './game-sounds.js';
import {createHandTransfer} from './hand-transfer.js';
import {cardSurface,boardSurface,cardBonusSurface,cardBonusBackground,preloadGameVisuals} from './game-visuals.js';
import {createGame,select,selectDiscard,discardOptions,payments,score,resources} from './game-engine.js';
import {createOnlineClient} from './online-client.js';
import {firebaseConfig,useFirebaseEmulators} from './firebase-config.js';
const root=document.querySelector('#game-root'),status=document.querySelector('#connection'),message=document.querySelector('#game-message');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={wood:'drewno',ore:'ruda',mercury:'rtęć',sulfur:'siarka',gold:'złoto',crystal:'kryształ',gems:'klejnoty',coin:'monety',sorcery:'moc',inteligence:'inteligencja',wisdom:'mądrość'};
const list=o=>Object.entries(o||{}).map(([k,v])=>`${v} × ${labels[k]||k}`).join(', ')||'bez kosztu';
const button=(text,action,primary=false)=>`<button class="game-action ${primary?'primary':''}" data-action="${action}">${text}</button>`;
const firebaseConfigured=['apiKey','authDomain','projectId','appId'].every(k=>Boolean(firebaseConfig[k]));
const handTransfer=createHandTransfer(root);
const buildMorph=createBuildMorph(root);
const gameSounds=createGameSounds(root);
const stageTransfer=createStageTransfer(root);
const warAnimation=createWarAnimation(root,{beforeBattle:signal=>gameSounds.playBattle(signal),onMeeting:()=>gameSounds.playWarMeeting(),onFinish:()=>table()});
let connectionFailed=false;
let online=null,submittedTurn=null,hostMovesUnsub=null;
let cards,boards,game=null,hand=null,room=null,roomId=null,user=null,api=null,unsubs=[],busy=false,local=false;
let localSave;try{localSave=JSON.parse(localStorage.getItem('erathia-practice-v2'));}catch{}
function tell(e){message.textContent=e?.message||String(e||'');}
function effect(e){if(!e)return 'Efekt do uzupełnienia';switch(e.type){case 'discard_free':return 'Wybuduj za darmo kartę ze stosu odrzuconych';case 'color_free':return 'Pierwszy budynek każdego koloru jest darmowy';case 'resources':return list(e.resources);case 'resource_choice':return e.options.map(list).join(' albo ');case 'points':return `${e.amount} pkt`;case 'coin':return `${e.amount} monet`;case 'war':return `${e.amount} siły militarnej`;case 'science':return labels[e.symbol];case 'science_choice':return 'Wybrany symbol nauki';case 'trade':return `Handel za ${e.price} monetę (${e.direction==='left'?'lewy sąsiad':e.direction==='right'?'prawy sąsiad':'sąsiedzi'})`;default:return 'Premia za karty lub etapy miasta';}}
function home(){
 document.dispatchEvent(new CustomEvent('game-player-count',{detail:7}));
 handTransfer.reset();buildMorph.reset();stageTransfer.reset();warAnimation.reset();gameSounds.reset();
 hideCardTip();
 document.body.classList.remove("table-active");root.classList.remove("playing-table");
 status.textContent=api?(user?'Połączono':'Zaloguj się'):firebaseConfigured?(connectionFailed?'Połączenie niedostępne':'Łączenie…'):'Tryb lokalny dostępny';
 root.innerHTML=`<div><h3>Zaproś znajomych do Erathii</h3><p>Załóż prywatny stół, udostępnij link i rozwijaj swoje miasto. Wszyscy wybierają karty jednocześnie.</p>${!api?`<p>${firebaseConfigured?'Łączenie z usługą gry. W międzyczasie możesz rozegrać partię testową.':'Gra online czeka na podłączenie projektu Firebase. Możesz przetestować pełną partię lokalnie przeciw wybranej liczbie automatycznych graczy.'}</p>`:''}<div class="game-controls">${api?(user?button('Utwórz partię','create',true)+button('Wyloguj','logout'):button('Zaloguj przez Google','login',true)):''}${button('Rozegraj partię testową','practice',!api)}${localSave?button('Wznów partię testową','resume'):''}<a class="action" href="instrukcja.html">Jak grać ↗</a></div></div>`;
}
function choosePractice(){return new Promise(resolve=>{
 const d=document.createElement('dialog');d.className='payment-dialog practice-dialog';d.setAttribute('aria-labelledby','practice-title');
 d.innerHTML=`<form><h3 id="practice-title">Partia testowa</h3><p>Wybierz przeciwników i swoje miasto startowe.</p><label for="practice-bots">Liczba botów</label><select id="practice-bots" name="bots">${[2,3,4,5,6].map(n=>`<option value="${n}">${n}</option>`).join('')}</select><label for="practice-town">Miasto startowe</label><select id="practice-town" name="town"><option value="">Losowe</option>${boards.filter(b=>b.stages.every(s=>s.effect)).map(b=>`<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select><p>Łącznie 3–7 graczy, w tym Ty.</p><div class="game-controls"><button type="submit" class="game-action primary">Rozpocznij partię</button><button type="button" class="game-action" data-cancel>Anuluj</button></div></form>`;
 document.body.append(d);
 const finish=value=>{d.close();d.remove();resolve(value);};
 d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();finish({bots:Number(d.querySelector('[name="bots"]').value),town:d.querySelector('[name="town"]').value||null});});
 d.querySelector('[data-cancel]').addEventListener('click',()=>finish(null));
 d.addEventListener('cancel',e=>{e.preventDefault();finish(null);});d.showModal();
});}
function lobby(){document.body.classList.remove('table-active');root.classList.remove('playing-table');status.textContent='Poczekalnia';const link=new URL(location.href);link.searchParams.set('room',roomId);link.hash='game-section';
 root.innerHTML=`<h3>Twój stół · ${room.players.length}/7 graczy</h3><p>Do rozpoczęcia potrzeba przynajmniej 3 osób. Talia obsługuje 3–7 graczy. Miasta są losowane spośród siedmiu plansz. Gospodarz musi mieć otwartą stronę przez całą partię.</p><ol class="player-list">${room.players.map((p,i)=>`<li>${esc(p.name)}${room.members[i]===room.host?' · gospodarz':''}</li>`).join('')}</ol><label>Link zaproszenia<div class="game-controls"><input id="invite-link" readonly value="${esc(link.href)}" aria-label="Link zaproszenia">${button('Kopiuj link','copy')}</div></label><div class="game-controls">${room.host===user.uid?`<button class="game-action primary" data-action="start" ${room.players.length<3?'disabled':''}>Rozpocznij grę</button>`:''}${button('Opuść pokój','leave')}</div>`;
}
let cardTip=null,tipAnchor=null,tipSizeObserver=null;
function hideCardTip(){tipSizeObserver?.disconnect();tipSizeObserver=null;cardTip?.remove();cardTip=null;tipAnchor=null;}
function tradeNeighbors(direction,ownerIndex){
 const g=local?game:room;
 const i=ownerIndex??(local?0:g?.members?.indexOf(user?.uid));
 const n=g?.players?.length||0;
 const left=n&&i>=0?g.players[(i+n-1)%n].name:null;
 const right=n&&i>=0?g.players[(i+1)%n].name:null;
 if(direction==='left')return `lewego sąsiada${left?` (${left})`:''}`;
 if(direction==='right')return `prawego sąsiada${right?` (${right})`:''}`;
 return `obu sąsiadów${left&&right?` (lewy: ${left}; prawy: ${right})`:''}`;
}
function describeCard(c,ownerIndex){return describeCardDetails(c,ownerIndex,tradeNeighbors);}
document.addEventListener('atlas-card-tip',event=>{
 const {type,cardId,rect,frame}=event.detail;
 if(type==='atlas-tip-hide'){if(tipAnchor?.atlasFrame===frame)hideCardTip();return;}
 const card=cards?.find(c=>c.id===cardId);
 if(!card||!rect||!['left','top','bottom','width','height'].every(k=>Number.isFinite(rect[k])))return;
 const anchor={atlasFrame:frame,get isConnected(){return frame.isConnected;},getBoundingClientRect(){
  const bounds=frame.getBoundingClientRect();
  return {left:bounds.left+rect.left,top:bounds.top+rect.top,bottom:bounds.top+rect.bottom,width:rect.width,height:rect.height};
 }};
 showCardTip(card,anchor);
});
function positionCardTip(){
 if(!cardTip||!tipAnchor?.isConnected){hideCardTip();return;}
 const r=tipAnchor.getBoundingClientRect(),pad=12;
 const viewport=window.visualViewport;
 const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
 const width=viewport?.width||document.documentElement.clientWidth;
 const height=viewport?.height||document.documentElement.clientHeight;
 cardTip.style.maxWidth=Math.max(0,width-pad*2)+'px';
 cardTip.style.maxHeight=Math.max(0,height-pad*2)+'px';
 const w=cardTip.offsetWidth;
 const x=Math.max(left+pad,Math.min(r.left,left+width-w-pad));
 const y=r.bottom+pad;
 cardTip.style.left=x+'px';
 cardTip.style.top=y+'px';
}
function showCardTip(c,anchor,ownerIndex){
 if(tipAnchor===anchor)return;hideCardTip();tipAnchor=anchor;
 cardTip=document.createElement('aside');cardTip.id='table-card-tooltip';cardTip.className='card-info-tooltip';cardTip.setAttribute('role','tooltip');
 const category={brown:'Budowla surowcowa',grey:'Produkcja dóbr',blue:'Budowla cywilna',red:'Budowla wojskowa',green:'Budowla naukowa',yellow:'Budowla handlowa',purple:'Gildia'};
 const next=cards.filter(n=>Number(n.week)>Number(c.week)&&(n.connection_cost||[]).some(k=>(c.connections||[]).includes(k)));
 const unique=[...new Map(next.map(n=>[n.name,n])).values()];
 const previous=cards.filter(n=>(n.connections||[]).some(k=>(c.connection_cost||[]).includes(k)));
 const previousNames=[...new Set(previous.map(n=>n.name))];
 cardTip.innerHTML=`<div class="card-info-copy"><h3>${esc(c.name)}</h3><p class="card-info-category">${esc(category[c.color]||'Karta')} · tydzień ${c.week}</p><section><p>${esc(describeCard(c,ownerIndex))}</p></section><section><h4>Koszt budowy</h4><p>${esc(list(c.cost))}</p>${previousNames.length?`<p class="card-info-note">Darmowa budowa po: ${previousNames.map(esc).join(', ')}.</p>`:''}</section>${unique.length?`<section><h4>Pozwala wybudować za darmo</h4>${unique.map(n=>`<p class="card-chain-name">${esc(n.name)}</p><p class="card-info-note">${esc(describeCard(n,ownerIndex))}</p>`).join('')}</section>`:''}</div><div class="card-info-art"></div>`;
 cardTip.querySelector('.card-info-art').append(cardSurface(c));document.body.append(cardTip);positionCardTip();tipSizeObserver=new ResizeObserver(positionCardTip);tipSizeObserver.observe(cardTip);
}
window.addEventListener('scroll',positionCardTip,true);window.addEventListener('resize',positionCardTip);
window.visualViewport?.addEventListener('resize',positionCardTip);window.visualViewport?.addEventListener('scroll',positionCardTip);
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideCardTip();});
function brownCardBonus(card,isNew,ownerIndex){
 const item=document.createElement('span');item.dataset.cardId=card.id;item.className='town-brown-card'+(['grey','gray'].includes(card.color)?' town-grey-card':card.color==='yellow'?' town-yellow-card':card.color==='green'?' town-green-card':card.color==='blue'?' town-blue-card':card.color==='red'?' town-red-card':card.color==='purple'?' town-purple-card':'')+(isNew?' newly-built':'');item.tabIndex=0;
 item.setAttribute('role','img');item.setAttribute('aria-label',`${card.name}: ${effect(card.effect)}${isNew?' — nowo wybudowana':''}`);
 item.append(cardBonusBackground(card),cardBonusSurface(card));
 item.addEventListener('pointerenter',()=>showCardTip(card,item,ownerIndex));item.addEventListener('pointerleave',()=>{if(tipAnchor===item)hideCardTip();});
 item.addEventListener('focus',()=>showCardTip(card,item,ownerIndex));item.addEventListener('blur',()=>{if(tipAnchor===item)hideCardTip();});
 return item;
}
function fitTownBonuses(seat){
 const holder=seat.querySelector('.seat-board'),boardBounds=holder.getBoundingClientRect();
 const stages=seat.querySelectorAll('.board-stage');
 seat.querySelectorAll('.stage-tucked-card').forEach(back=>{const bounds=stages[Number(back.dataset.stage)].getBoundingClientRect();back.style.left=((bounds.left-boardBounds.left+bounds.width/2)/boardBounds.width*100)+'%';});
 const containers=[seat.querySelector('.town-brown-bonuses'),seat.querySelector('.town-red-bonuses'),...seat.querySelectorAll('.town-bonus-row')].filter(Boolean);
 // Restore preferred positions before recalculating, including after a resize.
 if(!seat.bonusHomes)seat.bonusHomes=[...seat.querySelectorAll('.town-brown-card')].map(item=>({item,parent:item.parentElement}));
 for(const {item,parent} of seat.bonusHomes){parent.append(item);item.style.zoom='.65';}
 seat.querySelectorAll('.town-relocated-bonuses').forEach(group=>group.remove());
 const widths=new Map(seat.bonusHomes.map(({item})=>[item,item.getBoundingClientRect().width]));
 const itemsIn=container=>[...container.querySelectorAll('.town-brown-card')];
 const available=container=>{const style=getComputedStyle(container);return Math.max(0,container.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-4);};
 const widthOf=items=>items.reduce((sum,item)=>sum+(widths.get(item)||0),0)+Math.max(0,items.length-1)*3;
 const overflow=[];
 // Keep as many cards as possible in their natural row, without overlap.
 for(const container of containers){
  const kept=[];
  const homeItems=itemsIn(container);
  const isRightBonus=item=>item.classList.contains('town-blue-card')||item.classList.contains('town-green-card');
  const priority=[...homeItems.filter(item=>!isRightBonus(item)),...homeItems.filter(isRightBonus).reverse()];
  for(const item of priority){
   if(widthOf([...kept,item])<=available(container))kept.push(item);
   else {overflow.push(item);item.remove();}
  }
 }
 const unresolved=[];
 for(const item of overflow){
  // The production strip is the first spare area, regardless of card color.
  const target=containers.find(container=>widthOf([...itemsIn(container),item])<=available(container));
  if(!target){unresolved.push(item);continue;}
  if(target.classList.contains('town-bonus-row')){
   let group=target.querySelector('.town-relocated-bonuses');
   if(!group){group=document.createElement('span');group.className='town-relocated-bonuses';target.append(group);}
   group.append(item);
  }else target.append(item);
 }
 // Only when every area is full, fit the remaining cards by reducing scale.
 for(const item of unresolved){const home=seat.bonusHomes.find(entry=>entry.item===item);home.parent.append(item);}
 for(const container of containers){
  const items=itemsIn(container),width=widthOf(items),space=available(container);
  if(width>space){const scale=space/width;items.forEach(item=>{item.style.zoom=String(.65*scale);});}
 }
}
let townLayoutObserver=null,townLayoutFrame=null;
function watchTownLayout(circle){
 townLayoutObserver?.disconnect();cancelAnimationFrame(townLayoutFrame);
 const fit=()=>{root.querySelectorAll('.town-seat').forEach(fitTownBonuses);fitTownRing(circle);};
 fit();
 townLayoutObserver=new ResizeObserver(()=>{cancelAnimationFrame(townLayoutFrame);townLayoutFrame=requestAnimationFrame(fit);});
 townLayoutObserver.observe(circle);
 circle.querySelectorAll('.town-seat').forEach(seat=>townLayoutObserver.observe(seat));
}
window.addEventListener('resize',()=>{
 const circle=root.querySelector('.town-circle');if(!circle)return;
 circle.style.minWidth='';root.querySelectorAll('.town-seat').forEach(fitTownBonuses);fitTownRing(circle);
});
function table(){
 document.dispatchEvent(new CustomEvent('game-player-count',{detail:(local?game:room).players.length}));
 townLayoutObserver?.disconnect();cancelAnimationFrame(townLayoutFrame);
 hideCardTip();
 const g=local?game:room,i=local?0:g.members.indexOf(user.uid),p=g.players[i];if(!p?.board)return;
 const synced=local||(hand?.week===g.week&&hand?.round===g.round&&hand?.phase===g.status);
 const h=local?g.hands[i]:synced?hand?.cards||[]:[],picked=local?!!g.picks[i]:!!hand?.picked||submittedTurn===g.turn;
 const enteringTable=!document.body.classList.contains('table-active');
 document.body.classList.add('table-active');root.classList.add('playing-table');
 if(enteringTable)window.scrollTo({top:0});
 status.textContent=local?'Partia testowa':'Połączono';
 const instruction=!synced?'Synchronizowanie ręki…':picked?'Wybór potwierdzony. Czekamy na pozostałych graczy.':'Najedź na kartę i wybierz swój ruch.';
 root.innerHTML=`<div class="table-status"><div><p class="eyebrow">TYDZIEŃ ${g.week} · TURA ${g.round}/6</p><h3>${g.status==='finished'?'Koniec rozgrywki':g.status==='discard_choice'?'Darmowa budowa':'Wybierz kartę do zagrania'}</h3></div><div class="table-status-actions"><span>${esc(p.name)} · ${esc(p.board.name)}</span>${local?button('Zapisz i wróć','home'):''}</div></div>${g.status==='finished'?results(g):g.status==='discard_choice'?discardPanel(g,i,synced):`<section class="hand-zone" aria-label="Twoje karty"><p class="turn-instruction" role="status">${instruction}</p><div class="table-hand"></div></section>`}<section class="town-circle-section" aria-label="Plansze graczy"><div class="table-direction">Przekazywanie kart <strong class="pass-direction-symbol${g.week===2?' reverse':''}" role="img" aria-label="${g.week===2?'Przeciwnie do ruchu wskazówek zegara':'Zgodnie z ruchem wskazówek zegara'}"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M38 16a17 17 0 1 0 2 15"/><path d="M28 16h10V6"/></svg></strong></div><div class="town-circle" style="--seat-count:${g.players.length};--circle-height:${g.players.length<=4?'900px':'1240px'}"><div class="circle-center"><span>✦</span><p>7 MIAST ERATHII</p><small>${g.players.length} graczy · tydzień ${g.week}</small></div></div></section>`;
 const row=root.querySelector('.table-hand');
 const freeBuild=g.status==='discard_choice';
 const shownCards=freeBuild?(synced?(local?discardOptions(g,i):hand?.bonusCards||[]):[]):h;
 if(row)shownCards.forEach(c=>{
  const plans=payments(g,i,c),stages=payments(g,i,c,'stage');
  const article=document.createElement('article');article.className='table-card';article.dataset.cardId=c.id;article.tabIndex=0;article.setAttribute('aria-label',`${c.name}. ${effect(c.effect)}. Koszt: ${list(c.cost)}. Wybierz akcję.`);
  const availability=cardBuildStatus(p,c,plans,freeBuild);
  const hint=document.createElement('span');hint.className=`table-card-status ${availability.tone}`;hint.textContent=availability.text;
  article.setAttribute('aria-label',`${article.getAttribute('aria-label')} ${availability.text}.`);
  article.append(hint,cardSurface(c));
  const menu=document.createElement('div');menu.className='card-action-menu';menu.innerHTML=freeBuild?`<h4>${esc(c.name)}</h4><button class="game-action primary" data-kind="build" data-bonus="${esc(c.id)}">Wybuduj za darmo</button>`:`<h4>${esc(c.name)}</h4>${pickButton(c,'build','Wybuduj',plans,picked)}${pickButton(c,'stage','Etap miasta',stages,picked)}${pickButton(c,'discard','Odrzuć · +3 monety',[{left:0,right:0}],picked)}`;
  article.append(menu);
  article.setAttribute('aria-describedby','table-card-tooltip');
  article.addEventListener('pointerenter',()=>showCardTip(c,article));
  article.addEventListener('pointerleave',()=>{if(tipAnchor===article)hideCardTip();});
  article.addEventListener('focusin',()=>showCardTip(c,article));
  article.addEventListener('focusout',e=>{if(!article.contains(e.relatedTarget))hideCardTip();});
  row.append(article);
 });
 const circle=root.querySelector('.town-circle');
 g.players.forEach((q,j)=>{
  const relative=(j-i+g.players.length)%g.players.length,angle=-Math.PI/2+2*Math.PI*relative/g.players.length;
  const seat=document.createElement('article');seat.dataset.playerIndex=j;seat.dataset.relativeSeat=relative;seat.className='town-seat'+(j===i?' own-seat':'');
  seat.style.setProperty('--seat-x',`${50+Math.cos(angle)*(g.players.length<=4?29:33)}%`);seat.style.setProperty('--seat-y',`${50+Math.sin(angle)*28}%`);
  seat.innerHTML=`<header class="seat-heading"><h3>${esc(q.name)}${j===i?' <small>Ty</small>':''}</h3><div class="seat-counters"><span class="seat-coins" aria-label="${q.coins} monet"><img src="assets/cards/resources/coin.png" alt="">${q.coins}</span><span class="seat-points" aria-label="${score(g,j).total} punktów zwycięstwa" title="Aktualne punkty zwycięstwa"><img src="assets/cards/icons/points.png" alt=""><span class="seat-points-value">${score(g,j).total}</span></span></div></header><div class="town-brown-bonuses" aria-label="Produkcja brązowych i szarych kart"></div><div class="seat-board"></div>`;
  const surface=boardSurface(q.board);surface.querySelectorAll('.board-stage').forEach((stage,k)=>{stage.classList.toggle('stage-built',k<q.stages);});
  const commerce=document.createElement('span');commerce.className='town-yellow-bonuses';commerce.setAttribute('aria-label','Bonusy żółtych kart');
  q.cards.filter(c=>c.color==='yellow').forEach(c=>commerce.append(brownCardBonus(c,(q.newCards||[]).includes(c.id),j)));
  const guilds=document.createElement('span');guilds.className='town-purple-bonuses';guilds.setAttribute('aria-label','Bonusy fioletowych kart');
  q.cards.filter(c=>c.color==='purple').forEach(c=>guilds.append(brownCardBonus(c,(q.newCards||[]).includes(c.id),j)));
  const bonusRows=document.createElement('span');bonusRows.className='town-bonus-rows';
  const upperRow=document.createElement('span');upperRow.className='town-bonus-row';
  const lowerRow=document.createElement('span');lowerRow.className='town-bonus-row';
  upperRow.append(commerce);lowerRow.append(guilds);
  for(const color of ['blue','green','red']){
   const bonuses=document.createElement('span');bonuses.className=`town-${color}-bonuses`;
   bonuses.setAttribute('aria-label',color==='green'?'Bonusy zielonych kart':color==='blue'?'Bonusy niebieskich kart':'Bonusy czerwonych kart wojennych');
   const purchased=q.cards.filter(c=>c.color===color);
   if(color==='blue'||color==='green')purchased.reverse();
   purchased.forEach(c=>bonuses.append(brownCardBonus(c,(q.newCards||[]).includes(c.id),j)));
   if(color==='red')surface.append(bonuses);else (color==='blue'?upperRow:lowerRow).append(bonuses);
  }
  bonusRows.append(upperRow,lowerRow);surface.append(bonusRows);
  const boardHolder=seat.querySelector('.seat-board');
  for(let k=0;k<q.stages;k++){
   const week=q.stageWeeks?.[k];if(!week)continue;
   const back=document.createElement('img');back.className='stage-tucked-card';back.dataset.stage=k;
   back.src=`assets/cards/backs/week${week}.png`;back.alt=`Karta z tygodnia ${week} pod etapem ${k+1}`;
   boardHolder.append(back);
  }
  boardHolder.append(surface);
  q.cards.filter(c=>['brown','grey','gray'].includes(c.color)).forEach(c=>seat.querySelector('.town-brown-bonuses').append(brownCardBonus(c,(q.newCards||[]).includes(c.id),j)));

  circle.append(seat);
  fitTownBonuses(seat);
 });
 watchTownLayout(circle);
 warAnimation.update(g,i);
 gameSounds.update(p,local?game:roomId,g.week,g.round,warAnimation.running);
 stageTransfer.update();
 buildMorph.update();
 if(!warAnimation.running)handTransfer.update(g,i,synced);
}
function discardPanel(g,i,synced){
 const active=g.pendingDiscard?.[0];
 if(active!==i)return `<p>${esc(g.players[active]?.name)} wybiera darmową kartę ze stosu odrzuconych. Rozgrywka zostanie wznowiona po wyborze.</p>`;
 if(!synced)return '<p>Wczytywanie stosu odrzuconych…</p>';
 return `<section class="hand-zone" aria-label="Karty ze stosu odrzuconych"><p class="turn-instruction" role="status">Wybierz jedną kartę ze stosu odrzuconych. Nie płacisz kosztu budowy.</p><div class="discard-hand-layout"><div class="table-hand"></div><button class="game-action discard-skip" data-bonus="skip">Pomiń bonus</button></div></section>`;
}
function localBonuses(){while(game.status==='discard_choice'&&game.pendingDiscard[0]!==0){const i=game.pendingDiscard[0];selectDiscard(game,cards,i,discardOptions(game,i)[0]?.id??null);}}
async function pickDiscard(cardId){if(cardId!==null)buildMorph.select(cardId,'build');if(local){selectDiscard(game,cards,0,cardId);localBonuses();save();table();}else await call('discard_bonus',{choice:{cardId}});}
function pickButton(c,action,text,plans,disabled){return `<button class="game-action" data-pick="${c.id}" data-kind="${action}" ${disabled||!plans.length?'disabled':''}>${text}${action!=='discard'&&plans.length&&(plans[0].bank+plans[0].left+plans[0].right)>0?` · ${plans[0].bank+plans[0].left+plans[0].right} monet`:''}</button>`;}
function results(g){return renderResults(g,score);}
function save(){try{localStorage.setItem('erathia-practice-v2',JSON.stringify(game));localSave=game;}catch{tell('Przeglądarka nie pozwala zapisać partii lokalnej.');}}
function bot(i){const h=game.hands[i];for(const c of h){const plans=payments(game,i,c);if(plans.length)return {cardId:c.id,action:'build',...plans[0]};}return {cardId:h[0].id,action:'discard',left:0,right:0};}
async function pick(id,action){const g=local?game:room,i=local?0:g.members.indexOf(user.uid),h=local?g.hands[i]:hand.cards,c=h.find(c=>c.id===id),plans=payments(g,i,c,action);if(!plans.length)return;
 let plan=plans.find(p=>p.left===0&&p.right===0)||plans[0];
 if(plan.left+plan.right>0){
  plan=await choosePlan(plans,g,i,c,action);if(!plan)return;
 }
 handTransfer.select(id);buildMorph.select(id,action);stageTransfer.select(id,action,g.week,g.players[i].stages);
 const choice={cardId:id,action,left:plan.left,right:plan.right};if(local){const choices=game.players.map((_,i)=>i?bot(i):choice);for(let j=0;j<choices.length;j++)select(game,cards,j,choices[j]);localBonuses();save();table();}else await call('pick',{choice});
 if(action==='discard')gameSounds.playDiscard();
}
function choosePlan(plans,g,playerIndex,card,action){return new Promise(resolve=>{
 hideCardTip();
 const n=g.players.length,left=g.players[(playerIndex+n-1)%n].name,right=g.players[(playerIndex+1)%n].name;
 const d=document.createElement('dialog');d.className='payment-dialog';d.setAttribute('aria-labelledby','payment-title');
 d.innerHTML=`<h3 id="payment-title">Potwierdź płatność</h3><p>${action==='stage'?'Budowa etapu miasta':`Budowa: ${esc(card.name)}`}. Własne surowce są już uwzględnione.</p><div class="payment-options">${plans.map((v,index)=>`<button class="game-action payment-option" data-plan="${index}"><span class="payment-total">${v.bank+v.left+v.right} monet</span><span>Lewy sąsiad (${esc(left)}): <strong>${v.left}</strong></span><span>Prawy sąsiad (${esc(right)}): <strong>${v.right}</strong></span><span class="payment-confirm">${plans.length>1?'Wybierz i potwierdź':'Potwierdź budowę'} →</span></button>`).join('')}</div><div class="game-controls">${button('Anuluj','cancel')}</div>`;
 document.body.append(d);
 const finish=value=>{d.close();d.remove();resolve(value);};
 d.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;finish(b.dataset.plan===undefined?null:plans[Number(b.dataset.plan)]);});
 d.addEventListener('cancel',e=>{e.preventDefault();finish(null);});d.showModal();
});}
async function call(action,extra={}){return online.request(action,{roomId,...extra});}
function stopWatching(){unsubs.forEach(f=>f());unsubs=[];hostMovesUnsub?.();hostMovesUnsub=null;submittedTurn=null;}
async function watch(id){stopWatching();roomId=id;local=false;hand=null;
 unsubs=[api.onSnapshot(api.doc(api.db,'erathiaRooms',id),s=>{if(!s.exists()){tell('Nie znaleziono pokoju.');return;}room=s.data();if(room.status==='lobby')lobby();else if(room.status==='closed'){home();tell('Pokój zamknięty.');}else table();if(room.host===user.uid){if(!hostMovesUnsub)hostMovesUnsub=api.onSnapshot(api.collection(api.db,'erathiaRooms',id,'moves'),()=>void online.process(id),tell);void online.process(id);}},tell),api.onSnapshot(api.doc(api.db,'erathiaRooms',id,'hands',user.uid),s=>{hand=s.exists()?s.data():null;if(hand?.error)tell(hand.error);if(['playing','discard_choice','finished'].includes(room?.status))table();},tell),api.onSnapshot(api.doc(api.db,'erathiaRooms',id,'moves',user.uid),s=>{submittedTurn=s.exists()?s.data().turn:null;if(['playing','discard_choice'].includes(room?.status))table();},tell)];}
root.addEventListener('click',async e=>{if(warAnimation.running&&e.target.closest('[data-pick],[data-bonus]'))return;const card=e.target.closest('.table-card');if(card&&!e.target.closest('button')){const expanded=card.classList.contains('actions-open');root.querySelectorAll('.table-card.actions-open').forEach(c=>c.classList.remove('actions-open'));card.classList.toggle('actions-open',!expanded);return;}const b=e.target.closest('button');if(!b||busy)return;busy=true;b.disabled=true;tell('');try{
 if(b.dataset.bonus){await pickDiscard(b.dataset.bonus==='skip'?null:b.dataset.bonus);return;}
 if(b.dataset.pick){await pick(b.dataset.pick,b.dataset.kind);return;}
 switch(b.dataset.action){case 'retry-assets':await initialize();break;case 'practice':{const setup=await choosePractice();if(!setup)break;const nextGame=createGame(cards,boards,['Ty',...Array.from({length:setup.bots},(_,i)=>`Komputer ${i+1}`)],setup.town);local=true;stopWatching();game=nextGame;save();table();break;}case 'resume':local=true;stopWatching();game=structuredClone(localSave);table();break;case 'home':local=false;home();break;case 'login':await api.signInWithPopup(api.auth,new api.GoogleAuthProvider());break;case 'logout':await api.signOut(api.auth);break;case 'create':{const r=await call('create');const url=new URL(location.href);url.searchParams.set('room',r.roomId);history.replaceState(null,'',url);await watch(r.roomId);break;}case 'start':await call('start');break;case 'copy':await navigator.clipboard.writeText(document.querySelector('#invite-link').value);tell('Skopiowano link zaproszenia.');break;case 'leave':await call('leave');stopWatching();room=null;roomId=null;history.replaceState(null,'',location.pathname);home();break;}
 }catch(e){tell(e);}finally{busy=false;if(b.isConnected)b.disabled=false;}});
async function connect(){
 const version='11.10.0',base=`https://www.gstatic.com/firebasejs/${version}/`;
 const [app,auth,store]=await Promise.all(['app','auth','firestore'].map(n=>import(base+`firebase-${n}.js`)));
 const instance=app.initializeApp(firebaseConfig),a=auth.getAuth(instance),db=store.getFirestore(instance);
 if(useFirebaseEmulators&&['localhost','127.0.0.1'].includes(location.hostname)){auth.connectAuthEmulator(a,'http://127.0.0.1:9099');store.connectFirestoreEmulator(db,'127.0.0.1',8080);}
 api={...auth,...store,auth:a,db};online=createOnlineClient({sdk:store,db,getUser:()=>user,cards,boards,onError:tell});auth.onAuthStateChanged(a,async u=>{user=u;if(local)return;home();const id=new URLSearchParams(location.search).get('room');if(id&&u){try{roomId=id;await call('join');await watch(id);}catch(e){tell(e);}}});
}
async function initialize(){
 tell('');status.textContent='Ładowanie grafik…';
 root.innerHTML='<div class="asset-loading" role="status" aria-live="polite"><h3>Ładowanie grafik gry…</h3><progress max="100" value="0" aria-label="Postęp ładowania grafik"></progress><p class="asset-loading-count">0%</p></div>';
 try{
  const responses=await Promise.all(['cards.json','boards.json','asset-manifest.json'].map(source=>fetch(source)));
  if(responses.some(response=>!response.ok))throw Error('Nie udało się pobrać danych gry. Spróbuj ponownie.');
  const [loadedCards,loadedBoards,assets]=await Promise.all(responses.map(response=>response.json()));
  cards=loadedCards;boards=loadedBoards;
  await preloadAssets(assets,(done,total)=>{
   const progress=root.querySelector('.asset-loading progress'),label=root.querySelector('.asset-loading-count');
   if(progress){progress.max=total;progress.value=done;}
   if(label)label.textContent=`${done} / ${total}`;
  });
  root.querySelector('.asset-loading-count').textContent='Przygotowywanie kolorów kart…';
  await preloadGameVisuals();
  home();
 }catch(error){
  status.textContent='Ładowanie przerwane';tell(error);
  root.innerHTML=`<p>Nie udało się przygotować wszystkich grafik gry.</p>${button('Spróbuj ponownie','retry-assets',true)}`;
  return;
 }
 if(firebaseConfigured){try{await connect();}catch(error){connectionFailed=true;home();tell(error);}}
}
await initialize();

