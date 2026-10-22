import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../gallery.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('const pendingCardColors'),source.indexOf('function costEntries'));
function surface(images){return {querySelectorAll:()=>images,cloneNode:()=>surface(images.map(image=>({src:image.src,style:{...image.style}})))};}
test('atlas bonus clones receive their asynchronously generated card colors',async()=>{
 for(const color of ['red','green','yellow','purple','grey']){
  let finish;
  const context={WeakMap,console,colorFilters:{},cardSpriteSource:()=>new Promise(resolve=>{finish=resolve;})};
  vm.createContext(context);vm.runInContext(helpers,context);
  const image={src:'blue.png',style:{},getAttribute(){return this.src;}};
  context.applyCardColor(image,color);
  const clone=context.cloneColoredSurface(surface([image]));
  const secondClone=context.cloneColoredSurface(clone);
  finish(`${color}.png`);await Promise.resolve();
  assert.equal(image.src,`${color}.png`);
  assert.equal(clone.querySelectorAll()[0].src,`${color}.png`);
  assert.equal(secondClone.querySelectorAll()[0].src,`${color}.png`);
  assert.equal(context.cloneColoredSurface(clone).querySelectorAll()[0].src,`${color}.png`);
 }
});
