import {cloneCardSurface} from './game-visuals.js';

const FLIP=850,FLIGHT=2900;
const smooth=t=>t*t*(3-2*t);
export function stageTransferProgress(elapsed){
 const flip=Math.min(1,Math.max(0,elapsed/FLIP));
 return {back:flip>=.5,flipScale:Math.max(.001,Math.abs(Math.cos(Math.PI*flip))),
  flight:smooth(Math.min(1,Math.max(0,(elapsed-FLIP)/FLIGHT))),
  inserting:elapsed>=FLIP+FLIGHT*.75,finished:elapsed>=FLIP+FLIGHT};
}

export function createStageTransfer(root){
 let pending=null,active=null;
 const targetFor=stage=>root.querySelector(`.own-seat .stage-tucked-card[data-stage="${stage}"]`);
 const bounds=el=>{const r=el.getBoundingClientRect();return {left:r.left+scrollX,top:r.top+scrollY,width:r.width,height:r.height};};
 function stop(){active?.cleanup();active=null;}
 function reset(){stop();pending=null;}
 function select(id,action,week,stage){
  pending=null;
  if(action!=='stage')return;
  const card=[...root.querySelectorAll('.table-card')].find(el=>el.dataset.cardId===String(id));
  if(!card)return;
  const back=new Image();back.src=`assets/cards/backs/week${week}.png`;
  pending={stage,back,surface:cloneCardSurface(card.querySelector('.play-card-crop')),from:bounds(card)};
 }
 function update(){
  if(active)targetFor(active.stage)?.classList.add('stage-transfer-hidden');
  if(!pending)return;
  const target=targetFor(pending.stage),holder=root.querySelector('.own-seat .seat-board');
  if(!target||!holder)return;
  const move=pending;pending=null;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  stop();
  const layer=document.createElement('div');layer.className='hand-transfer-layer stage-transfer-layer';layer.setAttribute('aria-hidden','true');
  const frame=document.createElement('div');frame.className='stage-transfer-frame';frame.setAttribute('aria-hidden','true');
  const flip=document.createElement('div');flip.className='stage-transfer-flip';
  const front=document.createElement('div');front.className='stage-transfer-front';front.append(move.surface);
  move.back.className='stage-transfer-back';move.back.style.transform='none';
  flip.append(front,move.back);frame.append(flip);layer.append(frame);document.body.append(layer);
  target.classList.add('stage-transfer-hidden');
  const cleanup=()=>{cancelAnimationFrame(current.raf);frame.remove();layer.remove();targetFor(move.stage)?.classList.remove('stage-transfer-hidden');};
  const current={stage:move.stage,cleanup,raf:null,start:performance.now()};active=current;
  let lastGoal=null,segmentFrom=move.from,segmentStart=0,position=move.from;
  function tick(now){
   if(active!==current)return;
   const destination=targetFor(move.stage),boardHolder=root.querySelector('.own-seat .seat-board');
   if(!destination||!boardHolder){stop();return;}
   destination.classList.add('stage-transfer-hidden');
   const elapsed=now-current.start,phase=stageTransferProgress(elapsed);
   const to=bounds(destination),board=bounds(boardHolder);
   front.style.display=phase.back?'none':'block';move.back.style.display=phase.back?'block':'none';
   flip.style.transform=`scaleX(${phase.flipScale})`;
   if(elapsed<FLIP)position=move.from;
   else{
    if(lastGoal&&Object.keys(to).some(key=>Math.abs(to[key]-lastGoal[key])>.25)){
     segmentFrom=position;segmentStart=elapsed-FLIP;
    }
    const duration=Math.max(1,FLIGHT-segmentStart);
    const progress=smooth(Math.min(1,Math.max(0,(elapsed-FLIP-segmentStart)/duration)));
    position=Object.fromEntries(Object.keys(to).map(key=>[key,segmentFrom[key]+(to[key]-segmentFrom[key])*progress]));
    lastGoal=to;
   }
   // Preserve the reverse's aspect ratio throughout the flight, rather than
   // interpolating height independently and flattening the card.
   const height=phase.back?position.width*to.height/to.width:position.height;
   if(phase.inserting){
    if(frame.parentElement!==boardHolder)boardHolder.prepend(frame);
    frame.style.left=(position.left-board.left)+'px';frame.style.top=(position.top-board.top)+'px';
   }else{
    if(frame.parentElement!==layer)layer.append(frame);
    frame.style.left=position.left+'px';frame.style.top=position.top+'px';
   }
   frame.style.width=position.width+'px';frame.style.height=height+'px';
   if(phase.finished){stop();return;}
   current.raf=requestAnimationFrame(tick);
  }
  tick(current.start);
 }
 return {select,update,reset};
}
