import {cloneCardSurface} from './game-visuals.js';

export function createBuildMorph(root){
 let pending=null,active=null;
 const targetFor=id=>[...root.querySelectorAll('.own-seat .town-brown-card')].find(el=>el.dataset.cardId===id);
 const bounds=el=>{const r=el.getBoundingClientRect();return {left:r.left+scrollX,top:r.top+scrollY,width:r.width,height:r.height};};
 function stop(){active?.cleanup();active=null;}
 function reset(){stop();pending=null;}
 function select(id,action){
  pending=null;
  if(action!=='build')return;
  const card=[...root.querySelectorAll('.table-card')].find(el=>el.dataset.cardId===String(id));
  if(card)pending={id:String(id),surface:cloneCardSurface(card.querySelector('.play-card-crop')),rect:bounds(card)};
 }
 function update(){
  if(active)targetFor(active.id)?.classList.add('build-morph-hidden');
  if(!pending)return;
  const target=targetFor(pending.id);
  if(!target)return;
  const purchase=pending;pending=null;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  stop();
  const from=purchase.rect;
  let goal=bounds(target),segmentFrom=from,position=from,segmentStart=performance.now(),segmentDuration=1700,curved=true,raf;
  const deadline=segmentStart+1700;
  const layer=document.createElement('div');layer.className='hand-transfer-layer build-morph-layer';layer.setAttribute('aria-hidden','true');
  const frame=document.createElement('div');frame.className='build-morph-frame';
  const face=document.createElement('div');face.className='build-morph-face';face.style.width=from.width+'px';face.append(purchase.surface);
  const bonus=cloneCardSurface(target);bonus.classList.remove('newly-built','build-morph-hidden');bonus.classList.add('build-morph-bonus');
  // Preserve styles inherited from the destination's bonus row, including yellow cards.
  const style=getComputedStyle(target);
  for(const key of ['background','borderColor','borderWidth','borderStyle','borderRadius','padding'])bonus.style[key]=style[key];
  Object.assign(bonus.style,{zoom:'1',width:target.offsetWidth+'px',height:target.offsetHeight+'px',animation:'none'});
  frame.append(face,bonus);layer.append(frame);document.body.append(layer);
  target.classList.add('build-morph-hidden');
  const options={duration:1700,easing:'cubic-bezier(.22,.68,.25,1)',fill:'both'};
  const animations=[
   face.animate([{opacity:1,offset:0},{opacity:1,offset:.5},{opacity:0,offset:.92},{opacity:0,offset:1}],options),
   bonus.animate([{opacity:0,offset:0},{opacity:0,offset:.5},{opacity:1,offset:.92},{opacity:1,offset:1}],options)
  ];
  const cleanup=()=>{cancelAnimationFrame(raf);animations.forEach(a=>a.cancel());layer.remove();targetFor(purchase.id)?.classList.remove('build-morph-hidden');};
  const current={id:purchase.id,cleanup};active=current;
  function tick(now){
   if(active!==current)return;
   const destination=targetFor(purchase.id);
   if(!destination){stop();return;}
   destination.classList.add('build-morph-hidden');
   const latest=bounds(destination);
   // Online renders, loaded artwork and bonus fitting can all move the destination.
   // Continue from the current position instead of revealing a symbol elsewhere.
   if(Object.keys(goal).some(key=>Math.abs(goal[key]-latest[key])>.25)){
    segmentFrom=position;goal=latest;segmentStart=now;segmentDuration=Math.max(200,deadline-now);curved=false;
   }
   const progress=Math.min(1,(now-segmentStart)/segmentDuration),eased=progress*progress*(3-2*progress);
   position=Object.fromEntries(Object.keys(goal).map(key=>[key,segmentFrom[key]+(goal[key]-segmentFrom[key])*eased]));
   if(curved)position.top-=Math.sin(Math.PI*progress)*50;
   for(const [key,value] of Object.entries(position))frame.style[key]=value+'px';
   frame.style.borderRadius=(7-4*eased)+'px';
   bonus.style.transform=`scale(${goal.width/destination.offsetWidth},${goal.height/destination.offsetHeight})`;
   if(progress===1){cleanup();active=null;return;}
   raf=requestAnimationFrame(tick);
  }
  tick(segmentStart);
 }
 return {select,update,reset};
}
