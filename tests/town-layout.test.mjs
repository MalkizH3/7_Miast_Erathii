import test from 'node:test';
import assert from 'node:assert/strict';
import {townRingLayout} from '../town-layout.js';

test('town panels keep a gap for 3–7 players and varying panel heights',()=>{
 for(let n=3;n<=7;n++)for(const width of [850,1024,1274,1450]){
  const sizes=Array.from({length:n},(_,i)=>({width:Math.min(n<=4?500:n<=6?460:440,width*(n<=4?.4:n<=6?.34:.32)),height:300+(i%3)*47}));
  const layout=townRingLayout(sizes,width);
  for(let i=0;i<n;i++){
   const a=layout.seats[i];
   assert(a.x-sizes[i].width/2>=0);assert(a.x+sizes[i].width/2<=layout.width);
   assert(a.y-sizes[i].height/2>=0);assert(a.y+sizes[i].height/2<=layout.height);
   for(let j=i+1;j<n;j++){
    const b=layout.seats[j];
    const dx=Math.abs(a.x-b.x)-(sizes[i].width+sizes[j].width)/2;
    const dy=Math.abs(a.y-b.y)-(sizes[i].height+sizes[j].height)/2;
    assert(dx>=32-1e-6||dy>=32-1e-6,`${n} players at ${width}px: ${i} and ${j} overlap`);
   }
  }
 }
});
test('a taller city expands the ring without pushing panels into each other',()=>{
 const sizes=[{width:500,height:400},{width:500,height:380},{width:500,height:370}];
 assert(townRingLayout(sizes.map(s=>({...s,height:s.height+150})),1274).height>townRingLayout(sizes,1274).height);
});
