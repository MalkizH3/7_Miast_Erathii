// Lay out a ring using actual panel bounds, keeping a gap between every pair.
export function townRingLayout(sizes,availableWidth,gap=32){
 const n=sizes.length;
 if(!n)return {width:availableWidth,height:0,seats:[]};
 const angles=sizes.map((_,i)=>-Math.PI/2+2*Math.PI*i/n);
 const xs=angles.map(Math.cos),ys=angles.map(Math.sin);
 const maxWidth=Math.max(...sizes.map(s=>s.width)),maxHeight=Math.max(...sizes.map(s=>s.height));
 let width=Math.max(availableWidth,maxWidth+gap*2),radiusX=(width-maxWidth)/2-gap;
 // Players sharing a horizontal row must fit side by side.
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  if(Math.abs(ys[i]-ys[j])<1e-6){
   const needed=((sizes[i].width+sizes[j].width)/2+gap)/Math.abs(xs[i]-xs[j]);
   radiusX=Math.max(radiusX,needed);
  }
 }
 width=Math.max(width,2*(radiusX+gap)+maxWidth);
 let radiusY=120;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  const horizontal=Math.abs(xs[i]-xs[j])*radiusX;
  if(horizontal+1e-6<(sizes[i].width+sizes[j].width)/2+gap){
   radiusY=Math.max(radiusY,((sizes[i].height+sizes[j].height)/2+gap)/Math.abs(ys[i]-ys[j]));
  }
 }
 const centerY=gap+maxHeight/2+radiusY;
 return {width,height:centerY+radiusY+maxHeight/2+gap,centerY,radiusX,radiusY,seats:sizes.map((_,i)=>({x:width/2+xs[i]*radiusX,y:centerY+ys[i]*radiusY}))};
}

// Panel dimensions are independent of cards, image loading and the ring's min-width.
export function fixedTownRingLayout(count,availableWidth){
 const width=count<=4?500:count<=6?460:440;
 const height=count<=4?352:count<=6?334:324;
 const size={width,height};
 return {...townRingLayout(Array.from({length:count},()=>size),Math.max(850,Math.min(1450,availableWidth))),seatSize:size};
}
export function fitTownRing(circle){
 if(!circle)return;
 const seats=[...circle.querySelectorAll('.town-seat')].sort((a,b)=>Number(a.dataset.relativeSeat)-Number(b.dataset.relativeSeat));
 const layout=fixedTownRingLayout(seats.length,circle.parentElement.clientWidth);
 seats.forEach(seat=>{
  seat.style.width=layout.seatSize.width+'px';
  seat.style.maxWidth='none';
  seat.style.height=layout.seatSize.height+'px';
 });
 circle.style.width=layout.width+'px';circle.style.minWidth=layout.width+'px';circle.style.height=layout.height+'px';
 circle.style.setProperty('--ring-center-y',layout.centerY+'px');
 circle.dataset.ringCenterY=layout.centerY;circle.dataset.ringRadiusX=layout.radiusX;circle.dataset.ringRadiusY=layout.radiusY;
 circle.style.setProperty('--ring-left',(layout.width/2-layout.radiusX)+'px');circle.style.setProperty('--ring-top',(layout.centerY-layout.radiusY)+'px');
 circle.style.setProperty('--ring-width',layout.radiusX*2+'px');circle.style.setProperty('--ring-height',layout.radiusY*2+'px');
 seats.forEach((seat,i)=>{seat.style.setProperty('--seat-x',layout.seats[i].x+'px');seat.style.setProperty('--seat-y',layout.seats[i].y+'px');});
 const center=circle.querySelector('.circle-center');if(center)center.style.top=layout.centerY+'px';
}
