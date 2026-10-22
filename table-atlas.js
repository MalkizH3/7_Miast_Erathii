const frames=[...document.querySelectorAll('.table-atlas-frame')];
let players=7;
const sync=frame=>frame.contentWindow?.postMessage({type:'atlas-players',players},location.origin);
document.addEventListener('game-player-count',event=>{
 players=event.detail;
 frames.forEach(sync);
});
frames.forEach(frame=>frame.addEventListener('load',()=>sync(frame)));
window.addEventListener('message',event=>{
 if(event.origin!==location.origin)return;
 const frame=frames.find(item=>item.contentWindow===event.source);
 if(!frame)return;
 if(event.data?.type==='atlas-tip-show'||event.data?.type==='atlas-tip-hide'){
  document.dispatchEvent(new CustomEvent('atlas-card-tip',{detail:{...event.data,frame}}));
  return;
 }
 if(event.data?.type!=='atlas-height')return;
 const height=event.data.height;
 if(Number.isFinite(height)&&height>0&&height<10000)frame.style.height=Math.ceil(height)+'px';
 sync(frame);
});
