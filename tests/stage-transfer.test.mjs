import test from 'node:test';
import assert from 'node:assert/strict';

test('stage card hides its front and tucks under the live board after a rerender',async()=>{
 const originals=Object.fromEntries(['document','Image','matchMedia','requestAnimationFrame','cancelAnimationFrame','scrollX','scrollY'].map(key=>[key,globalThis[key]]));
 class Element{
  constructor(){this.children=[];this.style={};this.dataset={};const names=new Set();this.classList={add:n=>names.add(n),remove:n=>names.delete(n),contains:n=>names.has(n)};}
  append(...elements){for(const el of elements){el.remove();el.parentElement=this;this.children.push(el);}}
  prepend(el){el.remove();el.parentElement=this;this.children.unshift(el);}
  remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(el=>el!==this);this.parentElement=null;}}
  setAttribute(){}
  querySelectorAll(){return [];}
  cloneNode(){return new Element();}
 }
 const body=new Element(),callbacks=new Map();let id=0;
 Object.assign(globalThis,{document:{createElement:()=>new Element(),body},Image:Element,matchMedia:()=>({matches:false}),scrollX:0,scrollY:0,requestAnimationFrame:fn=>{callbacks.set(++id,fn);return id;},cancelAnimationFrame:i=>callbacks.delete(i)});
 try{
  const {createStageTransfer}=await import('../stage-transfer.js');
  const surface=new Element(),card=new Element();card.dataset.cardId='card';card.querySelector=()=>surface;card.getBoundingClientRect=()=>({left:50,top:100,width:150,height:230});
  let rect={left:400,top:450,width:80,height:120};
  const makeTarget=()=>{const target=new Element();target.getBoundingClientRect=()=>rect;return target;};
  let target=makeTarget(),holder=new Element();holder.getBoundingClientRect=()=>({left:200,top:300,width:500,height:240});
  const root={querySelectorAll:()=>[card],querySelector:selector=>selector.includes('stage-tucked-card')?target:holder};
  const controller=createStageTransfer(root),start=performance.now();
  controller.select('card','stage',1,0);controller.update();
  const layer=body.children[0],frame=layer.children[0],flip=frame.children[0],front=flip.children[0],back=flip.children[1];
  const advance=elapsed=>{const current=[...callbacks.values()];callbacks.clear();current.forEach(fn=>fn(start+elapsed));};
  advance(600);assert.equal(front.style.display,'none');assert.equal(back.style.display,'block');
  advance(1800);
  rect={left:440,top:550,width:85,height:130};target=makeTarget();
  const replacement=new Element();replacement.getBoundingClientRect=()=>({left:230,top:400,width:500,height:240});holder=replacement;
  controller.update();advance(2100);advance(3300);
  assert.equal(frame.parentElement,holder);assert(target.classList.contains('stage-transfer-hidden'));
    advance(3600);
  assert(Math.abs(parseFloat(frame.style.height)/parseFloat(frame.style.width)-130/85)<1e-6);
  assert(parseFloat(frame.style.top)<150); // Direct approach to the final slot, no detour below the board.
  advance(4100);assert.equal(frame.parentElement,null);assert.equal(body.children.length,0);assert(!target.classList.contains('stage-transfer-hidden'));
 }finally{for(const [key,value]of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
