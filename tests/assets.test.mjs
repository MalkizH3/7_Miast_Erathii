import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {preloadAssets} from '../asset-loader.js';

test('asset manifest includes every image in assets',async()=>{
 async function walk(path){
  const entries=await readdir(new URL('../'+path,import.meta.url),{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?walk(path+entry.name+'/'):/\.(png|webp|jpg|jpeg|svg|gif|avif)$/i.test(entry.name)?[path+entry.name]:[]))).flat();
 }
 const manifest=JSON.parse(await readFile(new URL('../asset-manifest.json',import.meta.url),'utf8'));
 assert.deepEqual(manifest,(await walk('assets/')).sort());
});

test('preloader waits for decoding, bounds concurrency and retries only failures',async()=>{
 const original=globalThis.Image;
 let inFlight=0,peak=0,fail=true;
 const calls=[];
 globalThis.Image=class{
  async decode(){
   calls.push(this.src);inFlight++;peak=Math.max(peak,inFlight);
   await new Promise(resolve=>setTimeout(resolve,2));inFlight--;
   if(this.src==='retry.png'&&fail)throw Error('network');
  }
 };
 try{
  const files=[...Array.from({length:12},(_,i)=>`test-${i}.png`),'retry.png'];
  const progress=[];
  await assert.rejects(preloadAssets([...files,files[0]],(done,total)=>progress.push([done,total])),/1 grafik/);
  assert.equal(inFlight,0);assert(peak<=6);assert.equal(calls.length,13);
  assert.deepEqual(progress.at(-1),[13,13]);
  fail=false;await preloadAssets(files);
  assert.equal(calls.length,14);assert.equal(calls.at(-1),'retry.png');
  await preloadAssets(files);assert.equal(calls.length,14);
 }finally{globalThis.Image=original;}
});
