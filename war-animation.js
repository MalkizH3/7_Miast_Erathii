import {effects,score} from './game-engine.js';

export function warBattles(players,week){
 const strengths=players.map(player=>effects(player).filter(effect=>effect.type==='war').reduce((sum,effect)=>sum+effect.amount,0));
 return players.flatMap((_,sender)=>[-1,1].map(direction=>{
  const recipient=(sender+direction+players.length)%players.length;
  const points=strengths[recipient]===strengths[sender]?0:strengths[recipient]>strengths[sender]?[0,1,3,5][week]:-1;
  return {sender,recipient,direction,strength:strengths[sender],points};
 }));
}

export function createWarAnimation(root,{beforeBattle,onMeeting,onFinish}={}){
 let previous=null,active=null,shown=[];
 const pulses=new Map();
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function renderScores(totals,animate=true){
  root.querySelectorAll('.town-seat').forEach(seat=>{
   const i=Number(seat.dataset.playerIndex),counter=seat.querySelector('.seat-points'),number=counter?.querySelector('.seat-points-value');
   if(!number)return;
   number.textContent=totals[i];counter.setAttribute('aria-label',`${totals[i]} punktów zwycięstwa`);
   if(animate&&shown[i]!==undefined&&shown[i]!==totals[i]&&!reduced())pulses.set(i,performance.now());
   const started=pulses.get(i),elapsed=started===undefined?650:performance.now()-started;
   if(elapsed<650&&!reduced()){
    const pulse=counter.animate([{transform:'scale(1)'},{transform:'scale(1.65)',offset:.3},{transform:'scale(.85)',offset:.65},{transform:'scale(1)'}],{duration:650,easing:'ease-out'});
    pulse.currentTime=elapsed;
   }else pulses.delete(i);
  });
  shown=[...totals];
 }
 function lock(locked){
  root.classList.toggle('war-resolving',locked);
  const hand=root.querySelector('.table-hand');if(hand)hand.inert=locked;
  const zone=root.querySelector('.hand-zone');if(zone){zone.style.visibility=locked?'hidden':'';zone.inert=locked;}
 }
 function finish(){
  if(!active)return;
  active.abort?.abort();cancelAnimationFrame(active.raf);active.layer.remove();
  const totals=active.totals;active=null;lock(false);renderScores(totals);
  onFinish?.();
 }
 function reset(){if(active){active.abort?.abort();cancelAnimationFrame(active.raf);active.layer.remove();active=null;}lock(false);previous=null;shown=[];pulses.clear();}
 function update(g,ownIndex){
  const totals=g.players.map((_,i)=>score(g,i).total);
  const snapshot={week:g.week,status:g.status,military:g.players.map(p=>p.military||0)};
  const ended=previous&&previous.status!=='finished'&&(g.week===previous.week+1||(g.week===3&&g.status==='finished'));
  if(active){
   active.totals=totals;
   root.querySelector('.town-circle')?.append(active.layer);
   lock(true);renderScores(totals.map((value,i)=>value-active.deltas[i]));
  }else if(ended&&(!reduced()||beforeBattle)){
   const battles=warBattles(g.players,previous.week),deltas=snapshot.military.map((value,i)=>value-previous.military[i]);
   const layer=document.createElement('div');layer.className='war-animation-layer';layer.setAttribute('aria-hidden','true');
   const banner=document.createElement('div');banner.className='war-banner';banner.textContent=`Wojna · koniec epoki ${previous.week}`;layer.append(banner);
   const tokens=battles.map(battle=>{
    const token=document.createElement('div');token.className='war-token';
    const icon=document.createElement('img');icon.src='assets/cards/icons/war.png';icon.alt='';
    const number=document.createElement('span');number.textContent=battle.strength;
    token.append(icon,number);layer.append(token);return {...battle,token,icon,number};
   });
   const current={layer,deltas,totals,raf:null,start:performance.now(),converted:false,abort:new AbortController()};active=current;
   root.querySelector('.town-circle').append(layer);lock(true);
   renderScores(totals.map((value,i)=>value-deltas[i]));
   function tick(now){
    if(active!==current)return;
    const circle=root.querySelector('.town-circle');if(!circle){finish();return;}
    const t=now-current.start;
    // Both armies meet halfway, turn into victory points, then return to their recipients.
    const progress=t<2400?.5*(t/2400):t<3100?.5:Math.min(1,.5+.5*((t-3100)/2400));
    const cx=circle.clientWidth/2,cy=Number(circle.dataset.ringCenterY),rx=Number(circle.dataset.ringRadiusX),ry=Number(circle.dataset.ringRadiusY);
    tokens.forEach(({sender,direction,token,icon,number,points})=>{
     const relative=(sender-ownIndex+g.players.length)%g.players.length;
     const angle=-Math.PI/2+2*Math.PI*(relative+direction*progress)/g.players.length;
          // Separate the two results at the meeting point so both scores remain readable.
     const lane=t>=2400?direction*27*Math.min(1,(t-2400)/300)*Math.sin(Math.PI*progress):0;
     token.style.left=(cx+Math.cos(angle)*(rx+lane))+'px';token.style.top=(cy+Math.sin(angle)*(ry+lane))+'px';
     if(t>=2400&&!current.converted){
      icon.src='assets/cards/icons/points.png';number.textContent=points>0?`+${points}`:String(points);
      token.classList.add('war-token-result');token.classList.toggle('war-token-loss',points<0);
      token.animate([{transform:'translate(-50%,-50%) scale(1)'},{transform:'translate(-50%,-50%) scale(1.45)',offset:.45},{transform:'translate(-50%,-50%) scale(1)'}],{duration:600,easing:'ease-out'});
     }
    });
    if(t>=2400&&!current.converted){current.converted=true;onMeeting?.();}
    if(progress===1){finish();return;}
    current.raf=requestAnimationFrame(tick);
   }
   function start(){
    if(active!==current)return;
    if(reduced()){finish();return;}
    layer.hidden=false;current.start=performance.now();tick(current.start);
   }
   if(beforeBattle){
    layer.hidden=true;
    Promise.resolve().then(()=>beforeBattle(current.abort.signal)).catch(()=>{}).then(start);
   }else start();
  }else renderScores(totals);
  previous=snapshot;
 }
 return {update,reset,get running(){return !!active;}};
}
