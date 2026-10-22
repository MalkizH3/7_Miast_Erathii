import test from 'node:test';
import assert from 'node:assert/strict';
import {townRingLayout,fixedTownRingLayout,fitTownRing} from '../town-layout.js';

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

test('fixed panels fit 3–7 players without overlap at mobile and desktop widths',()=>{
 for(let count=3;count<=7;count++)for(const width of [360,850,1024,1450,1700]){
  const layout=fixedTownRingLayout(count,width),size=layout.seatSize;
  assert.equal(size.width,count<=4?500:count<=6?460:440);
  assert(size.height>=(size.width-20)*2992/6400+120);
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
   const a=layout.seats[i],b=layout.seats[j];
   assert(Math.abs(a.x-b.x)-size.width>=32-1e-6||Math.abs(a.y-b.y)-size.height>=32-1e-6);
  }
 }
});
test('repeated fitting never feeds expanded ring width or transient panel bounds into layout',()=>{
 const style=()=>({setProperty(name,value){this[name]=value;}});
 const seats=Array.from({length:7},(_,i)=>({dataset:{relativeSeat:i},style:style(),getBoundingClientRect(){throw Error('Must not measure changing content');}}));
 const circle={parentElement:{clientWidth:1024},style:style(),dataset:{},querySelectorAll:()=>seats,querySelector:()=>null};
 Object.defineProperty(circle,'clientWidth',{get(){throw Error('Must not reuse expanded ring width');}});
 fitTownRing(circle);
 const first=JSON.stringify([circle.style,circle.dataset,seats.map(s=>s.style)]);
 for(let i=0;i<5;i++)fitTownRing(circle);
 assert.equal(JSON.stringify([circle.style,circle.dataset,seats.map(s=>s.style)]),first);
});
