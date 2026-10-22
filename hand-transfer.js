import {cloneCardSurface} from './game-visuals.js';
// Keep the last synchronized hand: online room and private hand arrive separately.
export function createHandTransfer(root){
 let previous=null,selected=null,active=null;
 const stop=()=>{active?.();active=null;root.querySelector('.table-hand')?.classList.remove('hand-in-transit');};
 function reset(){stop();previous=null;selected=null;}
 function update(g,index,synced){
  const row=root.querySelector('.table-hand');
  if(active&&row){row.classList.add('hand-in-transit');row.inert=true;}
  if(!synced||!row||g.status!=='playing')return;
  const elements=[...row.children],key=`${g.week}:${g.round}`;
  if(previous?.key===key)return;
  const old=previous;
  previous={key,week:g.week,round:g.round,cards:elements.map(el=>({id:el.dataset.cardId,surface:cloneCardSurface(el.querySelector('.play-card-crop')),rect:el.getBoundingClientRect()}))};
  const played=selected;selected=null;
  if(!old||old.week!==g.week||old.round+1!==g.round||!elements.length||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  stop();
  const direction=g.week===2?-1:1,n=g.players.length;
  const boardAt=j=>root.querySelector(`[data-player-index="${j}"] .seat-board`)?.getBoundingClientRect();
  const destination=boardAt((index+direction+n)%n),source=boardAt((index-direction+n)%n);
  if(!source||!destination)return;
  const layer=document.createElement('div');layer.className='hand-transfer-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
  row.classList.add('hand-in-transit');row.inert=true;
  const animations=[];
  const center=rect=>({x:rect.left+rect.width/2+window.scrollX,y:rect.top+rect.height/2+window.scrollY});
  const handCenter=center(row.getBoundingClientRect());
  const pose=(x,y,scale=1,angle=0)=>`translate(${x}px,${y}px) translate(-50%,-50%) rotate(${angle}deg) scale(${scale})`;
  function fly(surface,rect,frames){
   const card=document.createElement('div');card.className='hand-transfer-card';card.style.width=rect.width+'px';card.append(surface);layer.append(card);
   animations.push(card.animate(frames,{duration:2800,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'}));
  }
  old.cards.filter(c=>c.id!==played).slice(0,elements.length).forEach((c,k)=>{
   const from=center(c.rect),to=center(destination),offset=k*2;
   fly(c.surface,c.rect,[{transform:pose(from.x,from.y),opacity:1,offset:0},{transform:pose(handCenter.x+offset,handCenter.y+offset,.9,k-2),opacity:1,offset:.26},{transform:pose((handCenter.x+to.x)/2,(handCenter.y+to.y)/2-65,.72,12),opacity:1,offset:.55},{transform:pose(to.x+offset,to.y-destination.height*.35,.35,0),opacity:0,offset:.8},{transform:pose(to.x,to.y,.25),opacity:0,offset:1}]);
  });
  elements.forEach((el,k)=>{
   const rect=el.getBoundingClientRect(),to=center(rect),from=center(source),offset=k*2;
   fly(cloneCardSurface(el.querySelector('.play-card-crop')),rect,[{transform:pose(from.x+offset,from.y-source.height*.35,.35),opacity:0,offset:0},{transform:pose(from.x+offset,from.y-source.height*.35,.42,k-2),opacity:1,offset:.26},{transform:pose((from.x+handCenter.x)/2,(from.y+handCenter.y)/2-100,.72,-12),opacity:1,offset:.55},{transform:pose(handCenter.x+offset,handCenter.y+offset,.9,k-2),opacity:1,offset:.78},{transform:pose(to.x,to.y),opacity:1,offset:1}]);
  });
  const cleanup=()=>{animations.forEach(a=>a.cancel());layer.remove();const current=root.querySelector('.table-hand');current?.classList.remove('hand-in-transit');if(current)current.inert=false;};
  active=cleanup;
  Promise.allSettled(animations.map(a=>a.finished)).then(()=>{if(active===cleanup){cleanup();active=null;}});
 }
 window.addEventListener('resize',stop);
 return {update,reset,select:id=>{selected=id;}};
}
